import type { Shape } from "./types";
import { getTextBounds } from "./bounds";
import { persistShapeDeletes } from "./sync";

export function markShapesForEraser(args: {
  shapes: Shape[];
  ctx: CanvasRenderingContext2D;
  worldX: number;
  worldY: number;
  radiusWorld: number;
  markedIndices: Set<number>;
}) {
  const {
    shapes,
    ctx,
    worldX: x,
    worldY: y,
    radiusWorld,
    markedIndices,
  } = args;

  shapes.forEach((shape, index) => {
    let shouldMark = false;

    if (shape.type === "rect") {
      if (
        x + radiusWorld > shape.x &&
        x - radiusWorld < shape.x + shape.width &&
        y + radiusWorld > shape.y &&
        y - radiusWorld < shape.y + shape.height
      ) {
        shouldMark = true;
      }
    } else if (shape.type === "circle") {
      const distance = Math.sqrt(
        Math.pow(x - shape.centerX, 2) + Math.pow(y - shape.centerY, 2)
      );
      if (distance < radiusWorld + shape.radius) {
        shouldMark = true;
      }
    } else if (shape.type === "pencil") {
      for (const point of shape.points) {
        const distance = Math.sqrt(
          Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2)
        );
        if (distance < radiusWorld) {
          shouldMark = true;
          break;
        }
      }
    } else if (shape.type === "text") {
      const b = getTextBounds(ctx, shape);
      if (
        x + radiusWorld > b.x1 &&
        x - radiusWorld < b.x2 &&
        y + radiusWorld > b.y1 &&
        y - radiusWorld < b.y2
      ) {
        shouldMark = true;
      }
    }

    if (shouldMark) markedIndices.add(index);
  });
}

export function drawEraserCursor(args: {
  ctx: CanvasRenderingContext2D;
  screenX: number;
  screenY: number;
  radiusPx: number;
}) {
  const { ctx, screenX, screenY, radiusPx } = args;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.strokeStyle = "red";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(screenX, screenY, radiusPx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function commitEraserStroke(args: {
  shapes: Shape[];
  markedIndices: Set<number>;
  socket: WebSocket;
  roomId: string;
}) {
  const { shapes, markedIndices, socket, roomId } = args;
  if (markedIndices.size === 0) return;

  const messageIdsToDelete: number[] = [];
  const indicesToRemove = Array.from(markedIndices).sort((a, b) => b - a);

  indicesToRemove.forEach((index) => {
    const shape = shapes[index];
    if (shape?.id) messageIdsToDelete.push(shape.id);
  });

  indicesToRemove.forEach((index) => {
    shapes.splice(index, 1);
  });

  if (messageIdsToDelete.length > 0) {
    persistShapeDeletes(messageIdsToDelete.map(String)).catch((err) => {
      console.error("Failed to delete messages:", err);
    });

    socket.send(
      JSON.stringify({
        type: "erase",
        messageIds: messageIdsToDelete,
        roomId,
      })
    );
  }

  markedIndices.clear();
}
