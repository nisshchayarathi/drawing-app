import type { Shape } from "./types";
import { getSelectionBounds, getShapeBounds, isPointInBounds } from "./bounds";
import {
  cursorForResizeHandle,
  getBoundsBorderResizeHandleAtPoint,
} from "./selectionBox";
import {
  circleHandleFromPoint,
  isPointOnShapeOutline,
  isPointOnTrueCircleOutline,
} from "./hitTest";

export function updateSelectionHoverCursor(args: {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  worldX: number;
  worldY: number;
  shapes: Shape[];
  selectedShapeIndices: Set<number>;
  primarySelectedShapeIndex: number | null;
}) {
  const {
    canvas,
    ctx,
    worldX: x,
    worldY: y,
    shapes,
    selectedShapeIndices,
    primarySelectedShapeIndex,
  } = args;

  // Group selection hover (handles + bounds)
  if (selectedShapeIndices.size > 1) {
    const bounds = getSelectionBounds(ctx, shapes, selectedShapeIndices);
    if (bounds) {
      const handle = getBoundsBorderResizeHandleAtPoint(x, y, bounds);
      if (handle) {
        canvas.style.cursor = cursorForResizeHandle(handle);
        return true;
      }
      if (isPointInBounds(x, y, bounds, 0)) {
        canvas.style.cursor = "move";
        return true;
      }
    }
  }

  // 1) If a primary shape is selected, prioritize its resize handles.
  if (primarySelectedShapeIndex !== null) {
    const selectedShape = shapes[primarySelectedShapeIndex];
    if (selectedShape) {
      const b = getShapeBounds(ctx, selectedShape);
      const handle = getBoundsBorderResizeHandleAtPoint(x, y, b);
      if (handle) {
        canvas.style.cursor = cursorForResizeHandle(handle);
        return true;
      }

      // Special-case: show resize cursor on the true circle outline too.
      if (
        selectedShape.type === "circle" &&
        isPointOnTrueCircleOutline(x, y, selectedShape)
      ) {
        canvas.style.cursor = cursorForResizeHandle(
          circleHandleFromPoint(x, y, selectedShape)
        );
        return true;
      }

      // Move only from inside the selection bounds (border is resize-only).
      if (isPointInBounds(x, y, b, 0)) {
        canvas.style.cursor = "move";
        return true;
      }
    }
  }

  // 2) Otherwise, move cursor when hovering any shape outline (topmost first).
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i];
    if (isPointOnShapeOutline(ctx, x, y, shape)) {
      canvas.style.cursor = "move";
      return true;
    }
  }

  return false;
}
