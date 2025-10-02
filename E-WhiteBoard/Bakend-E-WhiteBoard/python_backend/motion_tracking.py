import cv2
import mediapipe as mp
import socketio
import base64
import math

# Connect to the Express Socket.IO server
sio = socketio.Client()

try:
    sio.connect(process.env.SOCKET_IO_SERVER_URL or 'http://localhost:5000')
    print("Connected to Socket.IO server")
except Exception as e:
    print(f"Error connecting to Socket.IO server: {e}")

@sio.on('connect')
def on_connect():
    print("Successfully connected to the server!")

@sio.on('disconnect')
def on_disconnect():
    print("Disconnected from the server.")
# Initialize MediaPipe for hand tracking
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(min_detection_confidence=0.8, min_tracking_confidence=0.8)


def calculate_distance(point1, point2):
    return math.sqrt((point1.x - point2.x)**2 + (point1.y - point2.y)**2)

mp_drawing = mp.solutions.drawing_utils

# Capture video input (use webcam)
cap = cv2.VideoCapture(0)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # Flip the frame horizontally for a mirror view
    frame = cv2.flip(frame, 1)

    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Process the frame to detect hands
    results = hands.process(rgb_frame)

    # If hands are detected, draw landmarks
    if results.multi_hand_landmarks:
        for landmarks in results.multi_hand_landmarks:
            # Draw landmarks on the frame
            mp_drawing.draw_landmarks(frame, landmarks, mp_hands.HAND_CONNECTIONS)

            thumb_tip = landmarks.landmark[mp_hands.HandLandmark.THUMB_TIP]
            thumb_base = landmarks.landmark[mp_hands.HandLandmark.THUMB_CMC]
            index_tip = landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP]
            index_base = landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_MCP]
            middle_tip = landmarks.landmark[mp_hands.HandLandmark.MIDDLE_FINGER_TIP]
            middle_base = landmarks.landmark[mp_hands.HandLandmark.MIDDLE_FINGER_MCP]
            
            # Calculate distances
            thumb_distance = calculate_distance(thumb_tip, thumb_base)
            index_distance = calculate_distance(index_tip, index_base)
            middle_distance = calculate_distance(middle_tip, middle_base)

            x = int(index_tip.x * frame.shape[1])
            y = int(index_tip.y * frame.shape[0])
            # Distinguish between 'draw' and 'erase' based on a condition (e.g., open hand for erase)
            # action = 'eraser' if (thumb_distance < 0.05 and index_distance < 0.05 and middle_distance < 0.05) else 'draw'
            action = 'eraser' if (index_distance < 0.05 and middle_distance < 0.05) else 'draw'
            sio.emit('draw', {'x': x, 'y': y, 'action': action})

    # Encode the frame as JPEG and send to the frontend
    _, buffer = cv2.imencode('.jpg', frame)
    encoded_frame = base64.b64encode(buffer).decode('utf-8')
    sio.emit('video_frame', {'frame': encoded_frame})

    # Display the processed frame locally (for debugging)
    cv2.imshow('Hand Tracking with Landmarks', frame)

    # Exit the loop on pressing 'q'
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
sio.disconnect()
