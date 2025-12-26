import { IconButton } from "@/app/components/IconButton";
import { initDraw } from "@/draw";
import { Shape } from "@/draw/types";
import {
  Circle,
  Eraser,
  Hand,
  MousePointer2,
  Pencil,
  RectangleHorizontal,
  Type,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type CanvasProps = {
  roomId: string;
  socket: WebSocket;
};

type Shapes =
  | "circle"
  | "pencil"
  | "rectangle"
  | "eraser"
  | "selection"
  | "pan"
  | "text";

export function Canvas(props: CanvasProps) {
  const { roomId, socket } = props;
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const existingShapesRef = useRef<Shape[]>([]); // ✅ Add this
  const [selectedTool, setSelectedTool] = useState<Shapes>("selection");
  // Set canvas size on client
  useEffect(() => {
    const updateSize = () => {
      setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const selectedToolRef = useRef<Shapes>("selection");

  useEffect(() => {
    selectedToolRef.current = selectedTool;
  }, [selectedTool]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const fn = await initDraw(
        canvas,
        isDrawingRef,
        startPointRef,
        existingShapesRef,
        roomId,
        socket,
        selectedToolRef
      );
      if (disposed) {
        fn();
        return;
      }
      cleanup = fn;
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [canvasSize, roomId, socket]); // re-run if size changes

  return (
    <div
      style={{
        position: "relative", // 🔑 important
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          display: "block",
        }}
      />
      <TopBar setSelectedTool={setSelectedTool} selectedTool={selectedTool} />
    </div>
  );
}

function TopBar({
  selectedTool,
  setSelectedTool,
}: {
  selectedTool: Shapes;
  setSelectedTool: (s: Shapes) => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50, // 🔑 above canvas
        background: "rgba(64, 63, 63, 0.7)",
        borderRadius: "6px",
      }}
    >
      <div className="flex ">
        <IconButton
          activated={selectedTool === "selection"}
          icon={<MousePointer2 />}
          onClick={() => {
            setSelectedTool("selection");
          }}
        />
        <IconButton
          activated={selectedTool === "pan"}
          icon={<Hand />}
          onClick={() => {
            setSelectedTool("pan");
          }}
        />
        <IconButton
          activated={selectedTool === "pencil"}
          icon={<Pencil />}
          onClick={() => {
            setSelectedTool("pencil");
          }}
        />
        <IconButton
          activated={selectedTool === "rectangle"}
          icon={<RectangleHorizontal />}
          onClick={() => {
            setSelectedTool("rectangle");
          }}
        />
        <IconButton
          activated={selectedTool === "circle"}
          icon={<Circle />}
          onClick={() => {
            setSelectedTool("circle");
          }}
        />
        <IconButton
          activated={selectedTool === "text"}
          icon={<Type />}
          onClick={() => {
            setSelectedTool("text");
          }}
        />
        <IconButton
          activated={selectedTool === "eraser"}
          icon={<Eraser />}
          onClick={() => {
            setSelectedTool("eraser");
          }}
        />
      </div>
    </div>
  );
}
