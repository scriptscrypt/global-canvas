"use client";

import { Button } from "@/components/ui/button";
import {
  Circle,
  FileText,
  Image,
  Minus,
  Settings,
  Square,
  Type,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { v4 as uuidv4 } from "uuid";
type ElementType = "rectangle" | "circle" | "text" | "connector";

interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  startElement?: string;
  endElement?: string;
}

const InfiniteCanvas = () => {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedTool, setSelectedTool] = useState<ElementType | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const canvasRef = useRef<HTMLDivElement>(null);
  const [undoStack, setUndoStack] = useState<CanvasElement[][]>([]);
  const [redoStack, setRedoStack] = useState<CanvasElement[][]>([]);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const [activeBottomSheet, setActiveBottomSheet] = useState<string | null>(
    null
  );
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const savedCanvas = localStorage.getItem("canvasElements");
    if (savedCanvas) {
      setElements(JSON.parse(savedCanvas));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("canvasElements", JSON.stringify(elements));
  }, [elements]);

  const bottomBarItems = [
    { icon: Settings, label: "Settings" },
    { icon: Users, label: "Collaborators" },
    { icon: Image, label: "Images" },
    { icon: FileText, label: "Documents" },
  ];

  const handleAddElement = useCallback(
    (type: ElementType, x: number, y: number) => {
      const newElement: CanvasElement = {
        id: uuidv4(),
        type,
        x,
        y,
        width: 100,
        height: type === "connector" ? 2 : 100,
        text: type === "text" ? "Edit text" : undefined,
      };
      setElements((prevElements) => [...prevElements, newElement]);
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (selectedTool) {
        const { left, top } = canvasRef.current!.getBoundingClientRect();
        const x = e.clientX - left;
        const y = e.clientY - top;
        setIsDrawing(true);
        setStartPoint({ x, y });
        if (selectedTool !== "connector") {
          handleAddElement(selectedTool, x, y);
        }
      }
    },
    [selectedTool, handleAddElement]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDrawing && selectedTool === "connector" && startPoint) {
        const { left, top } = canvasRef.current!.getBoundingClientRect();
        const x = e.clientX - left;
        const y = e.clientY - top;
        setElements((prevElements) => {
          const lastElement = prevElements[prevElements.length - 1];
          if (lastElement && lastElement.type === "connector") {
            return [
              ...prevElements.slice(0, -1),
              {
                ...lastElement,
                width: x - startPoint.x,
                height: y - startPoint.y,
              },
            ];
          }
          return [
            ...prevElements,
            {
              id: uuidv4(),
              type: "connector",
              x: startPoint.x,
              y: startPoint.y,
              width: x - startPoint.x,
              height: y - startPoint.y,
            },
          ];
        });
      }
    },
    [isDrawing, selectedTool, startPoint]
  );

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    setStartPoint(null);
    setSelectedTool(null);
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === canvasRef.current) {
        setSelectedElement(null);
      }
    },
    []
  );

  const handleElementDrag = useCallback(
    (id: string, dx: number, dy: number) => {
      setElements((prevElements) =>
        prevElements.map((el) =>
          el.id === id ? { ...el, x: el.x + dx, y: el.y + dy } : el
        )
      );
    },
    []
  );

  const handleElementResize = useCallback(
    (id: string, width: number, height: number) => {
      setElements((prevElements) =>
        prevElements.map((el) => (el.id === id ? { ...el, width, height } : el))
      );
    },
    []
  );

  const handleTextEdit = useCallback((id: string, text: string) => {
    setElements((prevElements) =>
      prevElements.map((el) => (el.id === id ? { ...el, text } : el))
    );
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack((prevStack) => [...prevStack, elements]);
      setElements(previousState);
      setUndoStack((prevStack) => prevStack.slice(0, -1));
    }
  }, [elements, undoStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      setUndoStack((prevStack) => [...prevStack, elements]);
      setElements(nextState);
      setRedoStack((prevStack) => prevStack.slice(0, -1));
    }
  }, [elements, redoStack]);

  const handleElementClick = useCallback(
    (id: string) => {
      setSelectedElement(id);
      const element = elements.find((el) => el.id === id);
      if (element && element.type === "text") {
        setEditingTextId(id);
      }
    },
    [elements]
  );

  const handleTextChange = useCallback((id: string, newText: string) => {
    setElements((prevElements) =>
      prevElements.map((el) => (el.id === id ? { ...el, text: newText } : el))
    );
  }, []);

  const handleTextBlur = useCallback(() => {
    setEditingTextId(null);
  }, []);

  const renderElement = useCallback(
    (element: CanvasElement) => {
      const isSelected = element.id === selectedElement;
      const commonStyles = {
        position: "absolute" as const,
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
        border: isSelected ? "2px solid blue" : "1px solid black",
        backgroundColor: "white",
      };

      switch (element.type) {
        case "rectangle":
          return (
            <div
              style={commonStyles}
              onClick={() => handleElementClick(element.id)}
            />
          );
        case "circle":
          return (
            <div
              style={{ ...commonStyles, borderRadius: "50%" }}
              onClick={() => handleElementClick(element.id)}
            />
          );
        case "text":
          return (
            <div
              style={commonStyles}
              onClick={() => handleElementClick(element.id)}
            >
              {editingTextId === element.id ? (
                <textarea
                  ref={textInputRef}
                  value={element.text}
                  onChange={(e) => handleTextChange(element.id, e.target.value)}
                  onBlur={handleTextBlur}
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    resize: "none",
                    background: "transparent",
                  }}
                  autoFocus
                />
              ) : (
                <div>{element.text}</div>
              )}
            </div>
          );
        case "connector":
          return (
            <div
              style={{
                ...commonStyles,
                backgroundColor: "black",
                transform: `rotate(${Math.atan2(
                  element.height,
                  element.width
                )}rad)`,
                transformOrigin: "0 0",
              }}
              onClick={() => handleElementClick(element.id)}
            />
          );
        default:
          return null;
      }
    },
    [
      selectedElement,
      handleElementClick,
      editingTextId,
      handleTextChange,
      handleTextBlur,
    ]
  );

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1000 }}>
        <Button onClick={() => setSelectedTool("rectangle")}>
          <Square />
        </Button>
        <Button onClick={() => setSelectedTool("circle")}>
          <Circle />
        </Button>
        <Button onClick={() => setSelectedTool("text")}>
          <Type />
        </Button>
        <Button onClick={() => setSelectedTool("connector")}>
          <Minus />
        </Button>
        <Button onClick={handleUndo}>Undo</Button>
        <Button onClick={handleRedo}>Redo</Button>
      </div>
      <TransformWrapper
        smooth={true}
        minScale={0.5}
        maxScale={3}
        initialScale={1}
      >
        <TransformComponent>
          <div
            ref={canvasRef}
            style={{ width: "5000px", height: "5000px", position: "relative" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleCanvasClick}
          >
            {elements.map(renderElement)}
          </div>
        </TransformComponent>
      </TransformWrapper>
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "60px",
          backgroundColor: "white",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
          zIndex: 1000,
        }}
      >
        {bottomBarItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            size="icon"
            onClick={() =>
              setActiveBottomSheet(
                activeBottomSheet === item.label ? null : item.label
              )
            }
          >
            <item.icon className="h-6 w-6" />
          </Button>
        ))}
      </div>
      {activeBottomSheet && (
        <div
          style={{
            position: "fixed",
            bottom: "60px",
            left: 0,
            right: 0,
            height: "300px",
            backgroundColor: "white",
            boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
            zIndex: 999,
            padding: "20px",
            overflowY: "auto",
          }}
        >
          <h2>{activeBottomSheet}</h2>
          {/* Content for the bottom sheet */}
          This is the content for the {activeBottomSheet} bottom sheet.
        </div>
      )}
    </div>
  );
};

export default function Home() {
  return (
    <main style={{ width: "100vw", height: "100vh" }}>
      <InfiniteCanvas />
    </main>
  );
}
