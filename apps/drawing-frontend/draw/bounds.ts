import type { Shape } from "./types";

export type Bounds = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
  h: number;
};

export function getRectBounds(rect: Extract<Shape, { type: "rect" }>): Bounds {
  const x1 = Math.min(rect.x, rect.x + rect.width);
  const x2 = Math.max(rect.x, rect.x + rect.width);
  const y1 = Math.min(rect.y, rect.y + rect.height);
  const y2 = Math.max(rect.y, rect.y + rect.height);
  return { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1 };
}

export function getCircleBounds(
  circle: Extract<Shape, { type: "circle" }>
): Bounds {
  const x1 = circle.centerX - circle.radius;
  const x2 = circle.centerX + circle.radius;
  const y1 = circle.centerY - circle.radius;
  const y2 = circle.centerY + circle.radius;
  return { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1 };
}

export function getPencilBounds(
  pencil: Extract<Shape, { type: "pencil" }>
): Bounds {
  if (pencil.points.length === 0) {
    return { x1: 0, y1: 0, x2: 0, y2: 0, w: 0, h: 0 };
  }
  let x1 = pencil.points[0].x;
  let x2 = pencil.points[0].x;
  let y1 = pencil.points[0].y;
  let y2 = pencil.points[0].y;
  for (let i = 1; i < pencil.points.length; i++) {
    const p = pencil.points[i];
    if (p.x < x1) x1 = p.x;
    if (p.x > x2) x2 = p.x;
    if (p.y < y1) y1 = p.y;
    if (p.y > y2) y2 = p.y;
  }
  return { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1 };
}

export function getTextBounds(
  ctx: CanvasRenderingContext2D,
  text: Extract<Shape, { type: "text" }>
): Bounds {
  // Keep measureText consistent with the drawCanvas font.
  ctx.save();
  ctx.font = `${text.fontSize}px sans-serif`;
  const width = ctx.measureText(text.text || "").width;
  ctx.restore();
  const x1 = text.x;
  const y1 = text.y;
  const x2 = text.x + width;
  const y2 = text.y + text.fontSize;
  return { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1 };
}

export function getShapeBounds(
  ctx: CanvasRenderingContext2D,
  shape: Shape
): Bounds {
  if (shape.type === "rect") return getRectBounds(shape);
  if (shape.type === "circle") return getCircleBounds(shape);
  if (shape.type === "text") return getTextBounds(ctx, shape);
  return getPencilBounds(shape);
}

export function getSelectionBounds(
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  indices: Iterable<number>
): Bounds | null {
  let bounds: Bounds | null = null;
  for (const idx of indices) {
    const s = shapes[idx];
    if (!s) continue;
    const b = getShapeBounds(ctx, s);
    if (!bounds) {
      bounds = { ...b };
    } else {
      bounds.x1 = Math.min(bounds.x1, b.x1);
      bounds.y1 = Math.min(bounds.y1, b.y1);
      bounds.x2 = Math.max(bounds.x2, b.x2);
      bounds.y2 = Math.max(bounds.y2, b.y2);
      bounds.w = bounds.x2 - bounds.x1;
      bounds.h = bounds.y2 - bounds.y1;
    }
  }
  return bounds;
}

export function isPointInBounds(x: number, y: number, b: Bounds, tol = 0) {
  return (
    x >= b.x1 - tol && x <= b.x2 + tol && y >= b.y1 - tol && y <= b.y2 + tol
  );
}

export function normalizeRectInPlace(rect: Extract<Shape, { type: "rect" }>) {
  const { x1, y1, w, h } = getRectBounds(rect);
  rect.x = x1;
  rect.y = y1;
  rect.width = w;
  rect.height = h;
}
