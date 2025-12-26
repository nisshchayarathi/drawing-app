import type { Bounds } from "./bounds";

export function getBoundsHandlePoints(bounds: Bounds) {
  const cx = (bounds.x1 + bounds.x2) / 2;
  const cy = (bounds.y1 + bounds.y2) / 2;
  return [
    { x: bounds.x1, y: bounds.y1, name: "tl" },
    { x: bounds.x2, y: bounds.y1, name: "tr" },
    { x: bounds.x1, y: bounds.y2, name: "bl" },
    { x: bounds.x2, y: bounds.y2, name: "br" },
    { x: cx, y: bounds.y1, name: "t" },
    { x: cx, y: bounds.y2, name: "b" },
    { x: bounds.x1, y: cy, name: "l" },
    { x: bounds.x2, y: cy, name: "r" },
  ] as const;
}

export function drawBoundsSelection(
  ctx: CanvasRenderingContext2D,
  bounds: Bounds
) {
  const handleSize = 8;
  ctx.save();
  ctx.setLineDash([]);
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 2;
  ctx.strokeRect(bounds.x1, bounds.y1, bounds.w, bounds.h);

  ctx.fillStyle = "#3b82f6";
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1;
  const handles = getBoundsHandlePoints(bounds);
  handles.forEach((h) => {
    ctx.fillRect(
      h.x - handleSize / 2,
      h.y - handleSize / 2,
      handleSize,
      handleSize
    );
    ctx.strokeRect(
      h.x - handleSize / 2,
      h.y - handleSize / 2,
      handleSize,
      handleSize
    );
  });
  ctx.restore();
}

export function getBoundsBorderResizeHandleAtPoint(
  x: number,
  y: number,
  bounds: Bounds
): string | null {
  // Any point along the border should resize (Excalidraw-like).
  const tol = 6;
  const { x1, y1, x2, y2 } = bounds;

  const withinX = x >= x1 - tol && x <= x2 + tol;
  const withinY = y >= y1 - tol && y <= y2 + tol;

  const nearLeft = Math.abs(x - x1) <= tol && withinY;
  const nearRight = Math.abs(x - x2) <= tol && withinY;
  const nearTop = Math.abs(y - y1) <= tol && withinX;
  const nearBottom = Math.abs(y - y2) <= tol && withinX;

  // Prefer corners when close to both edges.
  if (nearLeft && nearTop) return "tl";
  if (nearRight && nearTop) return "tr";
  if (nearLeft && nearBottom) return "bl";
  if (nearRight && nearBottom) return "br";

  if (nearLeft) return "l";
  if (nearRight) return "r";
  if (nearTop) return "t";
  if (nearBottom) return "b";

  return null;
}

export function computeResizedBounds(
  start: Bounds,
  handle: string,
  x: number,
  y: number
): Bounds {
  let x1 = start.x1;
  let y1 = start.y1;
  let x2 = start.x2;
  let y2 = start.y2;

  // Corners
  if (handle === "br") {
    x2 = x;
    y2 = y;
  } else if (handle === "bl") {
    x1 = x;
    y2 = y;
  } else if (handle === "tr") {
    x2 = x;
    y1 = y;
  } else if (handle === "tl") {
    x1 = x;
    y1 = y;
  }

  // Edges
  if (handle === "l") x1 = x;
  if (handle === "r") x2 = x;
  if (handle === "t") y1 = y;
  if (handle === "b") y2 = y;

  const nx1 = Math.min(x1, x2);
  const nx2 = Math.max(x1, x2);
  const ny1 = Math.min(y1, y2);
  const ny2 = Math.max(y1, y2);
  return { x1: nx1, y1: ny1, x2: nx2, y2: ny2, w: nx2 - nx1, h: ny2 - ny1 };
}

export function cursorForResizeHandle(handle: string): string {
  // Corners
  if (handle === "tl" || handle === "br") return "nwse-resize";
  if (handle === "tr" || handle === "bl") return "nesw-resize";
  // Edges
  if (handle === "l" || handle === "r") return "ew-resize";
  if (handle === "t" || handle === "b") return "ns-resize";
  return "nwse-resize";
}
