import type { Shape } from "./types";
import { getCircleBounds, getRectBounds, getTextBounds } from "./bounds";

export function isPointInShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  shape: Shape
): boolean {
  if (shape.type === "rect") {
    const { x1, y1, x2, y2 } = getRectBounds(shape);
    return x >= x1 && x <= x2 && y >= y1 && y <= y2;
  }

  if (shape.type === "circle") {
    const distance = Math.sqrt(
      Math.pow(x - shape.centerX, 2) + Math.pow(y - shape.centerY, 2)
    );
    return distance <= shape.radius;
  }

  if (shape.type === "text") {
    const { x1, y1, x2, y2 } = getTextBounds(ctx, shape);
    return x >= x1 && x <= x2 && y >= y1 && y <= y2;
  }

  if (shape.type === "pencil") {
    for (const point of shape.points) {
      const distance = Math.sqrt(
        Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2)
      );
      if (distance < 10) return true;
    }
  }

  return false;
}

function distancePointToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLen2 = abx * abx + aby * aby;
  if (abLen2 === 0) {
    return Math.sqrt(apx * apx + apy * apy);
  }
  let t = (apx * abx + apy * aby) / abLen2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  const dx = px - cx;
  const dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isPointOnShapeOutline(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  shape: Shape
): boolean {
  const baseTol = 6;

  if (shape.type === "rect") {
    const { x1, y1, x2, y2, w, h } = getRectBounds(shape);

    // Treat the outline as a "ring": inside the expanded rect but outside the inset rect.
    // Also shrink tolerance for small rectangles so clicks inside don't get misclassified.
    const tol = Math.min(baseTol, Math.max(1, Math.min(w, h) / 2 - 1));

    const inOuter =
      x >= x1 - tol && x <= x2 + tol && y >= y1 - tol && y <= y2 + tol;

    const innerExists = w > 2 * tol && h > 2 * tol;
    const inInner =
      innerExists &&
      x >= x1 + tol &&
      x <= x2 - tol &&
      y >= y1 + tol &&
      y <= y2 - tol;

    return inOuter && !inInner;
  }

  if (shape.type === "circle") {
    // Rectangular selection for circles (bounding-box ring)
    const { x1, y1, x2, y2, w, h } = getCircleBounds(shape);
    const tol = Math.min(baseTol, Math.max(1, Math.min(w, h) / 2 - 1));
    const inOuter =
      x >= x1 - tol && x <= x2 + tol && y >= y1 - tol && y <= y2 + tol;
    const innerExists = w > 2 * tol && h > 2 * tol;
    const inInner =
      innerExists &&
      x >= x1 + tol &&
      x <= x2 - tol &&
      y >= y1 + tol &&
      y <= y2 - tol;
    return inOuter && !inInner;
  }

  if (shape.type === "pencil") {
    const tol = 10;
    if (shape.points.length === 0) return false;
    if (shape.points.length === 1) {
      const dx = x - shape.points[0].x;
      const dy = y - shape.points[0].y;
      return Math.sqrt(dx * dx + dy * dy) <= tol;
    }
    for (let i = 1; i < shape.points.length; i++) {
      const a = shape.points[i - 1];
      const b = shape.points[i];
      if (distancePointToSegment(x, y, a.x, a.y, b.x, b.y) <= tol) {
        return true;
      }
    }
    return false;
  }

  if (shape.type === "text") {
    const { x1, y1, x2, y2, w, h } = getTextBounds(ctx, shape);
    const tol = Math.min(baseTol, Math.max(1, Math.min(w, h) / 2 - 1));
    const inOuter =
      x >= x1 - tol && x <= x2 + tol && y >= y1 - tol && y <= y2 + tol;
    const innerExists = w > 2 * tol && h > 2 * tol;
    const inInner =
      innerExists &&
      x >= x1 + tol &&
      x <= x2 - tol &&
      y >= y1 + tol &&
      y <= y2 - tol;
    return inOuter && !inInner;
  }

  return false;
}

export function isShapeInBox(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  boxX: number,
  boxY: number,
  boxWidth: number,
  boxHeight: number
): boolean {
  const minX = Math.min(boxX, boxX + boxWidth);
  const maxX = Math.max(boxX, boxX + boxWidth);
  const minY = Math.min(boxY, boxY + boxHeight);
  const maxY = Math.max(boxY, boxY + boxHeight);

  if (shape.type === "rect") {
    const { x1, y1, x2, y2 } = getRectBounds(shape);
    // Check if rectangles overlap
    return !(x2 < minX || x1 > maxX || y2 < minY || y1 > maxY);
  }

  if (shape.type === "circle") {
    // Check if circle center is in box
    return (
      shape.centerX >= minX &&
      shape.centerX <= maxX &&
      shape.centerY >= minY &&
      shape.centerY <= maxY
    );
  }

  if (shape.type === "pencil") {
    // Check if any point is in the box
    return shape.points.some(
      (point) =>
        point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
    );
  }

  if (shape.type === "text") {
    const { x1, y1, x2, y2 } = getTextBounds(ctx, shape);
    return !(x2 < minX || x1 > maxX || y2 < minY || y1 > maxY);
  }

  return false;
}

export function isPointOnTrueCircleOutline(
  x: number,
  y: number,
  circle: Extract<Shape, { type: "circle" }>
) {
  const tol = 6;
  const dx = x - circle.centerX;
  const dy = y - circle.centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return Math.abs(distance - circle.radius) <= tol;
}

export function circleHandleFromPoint(
  x: number,
  y: number,
  circle: Extract<Shape, { type: "circle" }>
): string {
  const dx = x - circle.centerX;
  const dy = y - circle.centerY;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);

  // Prefer pure horizontal/vertical when clearly closer.
  const AXIS_DOMINANCE = 1.5;
  if (adx > ady * AXIS_DOMINANCE) return dx < 0 ? "l" : "r";
  if (ady > adx * AXIS_DOMINANCE) return dy < 0 ? "t" : "b";

  // Otherwise treat as corners.
  if (dx < 0 && dy < 0) return "tl";
  if (dx > 0 && dy < 0) return "tr";
  if (dx < 0 && dy > 0) return "bl";
  return "br";
}
