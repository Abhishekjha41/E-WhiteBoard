import React, { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";

// Connect to the Express server
const socket = io(process.env.SOCKET_IO_SERVER_URL || "http://localhost:5000");

const Whiteboard = () => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [color, setColor] = useState("black");
  const [lineWidth, setLineWidth] = useState(5);
  const [videoFrame, setVideoFrame] = useState(null);
  const [shapes, setShapes] = useState([]);
  const [currentShape, setCurrentShape] = useState(null);
  const [fill, setFill] = useState(true);
  const [image, setImage] = useState(null);
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
  const [readyToPlaceImage, setReadyToPlaceImage] = useState(false);
  const [isErasing, setIsErasing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    context.lineCap = "round";
    contextRef.current = context;

    socket.on("draw", (data) => {
      var { x, y, action } = data;
      x = 2 * x;
      y = 2 * y;

      if (action === "draw") {
        contextRef.current.lineTo(x, y);
        contextRef.current.stroke();
        contextRef.current.beginPath();
        contextRef.current.moveTo(x, y);
        setIsErasing(false);
      } else if (action === "eraser") {
        setIsErasing(true);
        contextRef.current.clearRect(x, y, 50, 50); // Clear a small area
      } else if (action === "clear") {
        setImage(null);
        setShapes([]);
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    return () => socket.off("draw");
  }, []); // Runs only once during the component's mount

  // Separate useEffect to update only the strokeStyle and lineWidth
  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = lineWidth;
    }
  }, [color, lineWidth]);

  useEffect(() => {
    socket.on("video_frame", (data) => {
      if (data && data.frame) {
        setVideoFrame(data.frame);
      }
    });

    return () => socket.off("video_frame");
  }, []);

  const handleMouseDown = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;

    // Place the image if it's ready
    if (readyToPlaceImage && image) {
      setImagePosition({ x: offsetX - 150, y: offsetY - 150 }); // Adjust position to center the image
      setReadyToPlaceImage(false); // Reset the ready state
      return;
    }

    // Check if any shape is clicked
    const clickedShapeIndex = shapes.findIndex(
      (shape) =>
        offsetX >= shape.x &&
        offsetX <= shape.x + (shape.width || shape.size || shape.radius * 2) &&
        offsetY >= shape.y &&
        offsetY <= shape.y + (shape.height || shape.size || shape.radius * 2)
    );

    if (clickedShapeIndex !== -1) {
      setSelectedObject({ type: "shape", index: clickedShapeIndex });
      return;
    }

    // If no object is clicked, draw a new shape
    if (currentShape) {
      createShape(offsetX, offsetY);
    }
  };

  const handleMouseUp = (e) => {
    if (selectedObject) {
      const { offsetX, offsetY } = e.nativeEvent;

      if (selectedObject.type === "image") {
        setImagePosition({ x: offsetX - 150, y: offsetY - 150 });
      } else if (selectedObject.type === "shape") {
        const index = selectedObject.index;
      }

      setSelectedObject(null);
    }
  };

  const createShape = (x, y) => {
    const size = 100; // Default size
    const shape =
      currentShape === "circle"
        ? { type: "circle", x, y, radius: 50, color, fill }
        : currentShape === "rectangle"
        ? {
            type: "rectangle",
            x,
            y,
            width: size + 100,
            height: size,
            color,
            fill,
          }
        : currentShape === "square"
        ? { type: "square", x, y, size, color, fill }
        : currentShape === "triangle"
        ? { type: "triangle", x, y, size, color, fill }
        : null;

    if (shape) {
      setShapes([shape]);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result); // Set the image data URL
        setReadyToPlaceImage(true); // Mark image as ready to place
      };
      reader.readAsDataURL(file);
      setImage(null);
    }
  };

  const drawShapes = () => {
    const context = contextRef.current;
    shapes.forEach((shape) => {
      context.beginPath();
      if (shape.type === "circle") {
        context.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
      } else if (shape.type === "rectangle" || shape.type === "square") {
        context.rect(
          shape.x,
          shape.y,
          shape.width || shape.size,
          shape.height || shape.size
        );
      } else if (shape.type === "triangle") {
        context.moveTo(shape.x, shape.y);
        context.lineTo(shape.x + shape.size / 2, shape.y + shape.size);
        context.lineTo(shape.x - shape.size / 2, shape.y + shape.size);
        context.closePath();
      }

      if (shape.fill) {
        context.fillStyle = shape.color;
        context.fill();
      } else {
        context.strokeStyle = shape.color;
        context.stroke();
      }
    });
  };

  const drawImage = () => {
    if (image) {
      const img = new Image();
      img.src = image;
      img.onload = () => {
        contextRef.current.drawImage(
          img,
          (imagePosition.x = 50),
          (imagePosition.y = 50),
          350,
          300
        );
      };
    }
    setImage(null);
  };

  useEffect(() => {
    const context = contextRef.current;
    // context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    drawShapes();
    drawImage();
  }, [shapes, imagePosition]);

  return (
    <div
      style={{
        position: "fixed",
        right: 10,
        bottom: 10,
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 40,
          transform: "translateY(-50%)",
          zIndex: 3,
          display: "flex",
          flexDirection: "column", // Vertical arrangement
        }}
      >
        {["black", "red", "blue", "green", "yellow"].map((btnColor) => (
          <button
            key={btnColor}
            onClick={() => setColor(btnColor)}
            style={{
              backgroundColor: btnColor,
              color: "white",
              width: "60px",
              height: "60px",
              margin: "10px 0",
              border: "2px solid white",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          ></button>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          top: "50%",
          right: 40,
          transform: "translateY(-50%)",
          zIndex: 3,
          display: "flex",
          flexDirection: "column", // Vertical arrangement
        }}
      >
        {[5, 10, 20, 30].map((size) => (
          <button
            key={size}
            onClick={() => setLineWidth(size)}
            style={{
              backgroundColor: "gray",
              color: "white",
              width: "60px",
              height: "60px",
              margin: "10px 0",
              border: "2px solid white",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            {size}
          </button>
        ))}
      </div>

      {videoFrame && (
        <img
          src={`data:image/jpeg;base64,${videoFrame}`}
          alt="Processed Video"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 1,
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 3,
          display: "flex",
          gap: "10px",
        }}
      >
        {["Circle", "Rectangle", "Square", "Triangle"].map((shape) => (
          <button
            key={shape}
            onClick={() => setCurrentShape(shape.toLowerCase())}
            style={{
              padding: "10px",
              backgroundColor: "skyblue",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            <img
              src={`src/icons/${shape}.png`}
              alt={shape}
              width={"25px"}
              height={"20px"}
            />
          </button>
        ))}
        <button
          onClick={() => setFill(!fill)}
          style={{
            padding: "10px",
            backgroundColor: fill ? "green" : "red",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {fill ? (
            <img
              src="src\icons\filled.png"
              alt="filled"
              width={"25px"}
              height={"20px"}
            />
          ) : (
            <img
              src="src\icons\outlined.png"
              alt="outlined"
              width={"25px"}
              height={"20px"}
            />
          )}
        </button>
        <button
          style={{
            padding: "10px",
            backgroundColor: isErasing ? "orange" : "grey",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
            width: "80px",
          }}
        >
          {isErasing ? "Erasing" : "Drawing"}
        </button>
        <button
          onClick={() => socket.emit("draw", { action: "clear" })}
          style={{
            padding: "10px",
            backgroundColor: "red",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Clear
        </button>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ margin: "10px 0" }}
        />
      </div>

      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: "60px",
          left: "180px",
          width: "calc(100% - 350px)",
          height: "calc(100% - 100px)",
          border: "2px solid gray",
          zIndex: 2,
          backgroundColor: "rgba(200, 200, 200, 0.3)",
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      />
    </div>
  );
};

export default Whiteboard;
