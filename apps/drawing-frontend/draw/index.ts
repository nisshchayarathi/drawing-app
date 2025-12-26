import { Shape } from "./types";
import {
  persistShapeUpdate,
  getExistingShapes,
  installSocketHandlers,
} from "./sync";
import type { Bounds } from "./bounds";
import {
  getPencilBounds,
  getRectBounds,
  isPointInBounds,
  getSelectionBounds,
  getShapeBounds,
  getTextBounds,
  normalizeRectInPlace,
} from "./bounds";
import {
  computeResizedBounds,
  cursorForResizeHandle,
  drawBoundsSelection,
  getBoundsBorderResizeHandleAtPoint,
} from "./selectionBox";
import {
  circleHandleFromPoint,
  isPointInShape,
  isPointOnShapeOutline,
  isPointOnTrueCircleOutline,
  isShapeInBox,
} from "./hitTest";
import { createInlineTextEditor } from "./textEditor";
import {
  commitEraserStroke,
  drawEraserCursor,
  markShapesForEraser,
} from "./eraserTool";
import { updateSelectionHoverCursor } from "./selectionHover";

export async function initDraw(
  canvas: HTMLCanvasElement,
  isDrawingRef: { current: boolean },
  startPointRef: { current: { x: number; y: number } | null },
  existingShapesRef: { current: Shape[] },
  roomId: string,
  socket: WebSocket,
  selectedToolRef: {
    current:
      | "circle"
      | "pencil"
      | "rectangle"
      | "eraser"
      | "selection"
      | "pan"
      | "text";
  }
): Promise<() => void> {
  const currentPencilPoints: { x: number; y: number }[] = [];
  const shapesToEraseRef: Set<number> = new Set();
  let selectedShapeIndices: Set<number> = new Set();
  let primarySelectedShapeIndex: number | null = null;
  let resizeHandle: string | null = null; // 'tl', 'tr', 'bl', 'br', 'l', 'r', 't', 'b'
  let resizeMode: "single" | "group" | null = null;
  let singleResizeStart: { bounds: Bounds; shapeSnapshot: Shape } | null = null;
  let groupResizeStart: {
    bounds: Bounds;
    shapesSnapshot: Map<number, Shape>;
  } | null = null;
  let dragOffset = { x: 0, y: 0 };
  let isMovingSelection = false;
  let moveMode: "single" | "group" | null = null;
  let lastMovePoint = { x: 0, y: 0 };
  let isBoxSelecting = false;
  let isPanning = false;
  let panStart: {
    screenX: number;
    screenY: number;
    cameraX: number;
    cameraY: number;
  } | null = null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const ctx2 = ctx;

  // Infinite canvas: camera transforms between screen (canvas pixels) and world coordinates.
  const camera = {
    x: 0,
    y: 0,
    scale: 1,
  };

  function getScreenPoint(e: PointerEvent | WheelEvent) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      rect,
    };
  }

  function screenToWorld(screenX: number, screenY: number) {
    return {
      x: (screenX - camera.x) / camera.scale,
      y: (screenY - camera.y) / camera.scale,
    };
  }

  const textEditor = createInlineTextEditor({
    measureCtx: ctx2,
    camera,
    existingShapesRef,
    socket,
    roomId,
    drawCanvas,
  });

  function clearSelection() {
    selectedShapeIndices = new Set();
    primarySelectedShapeIndex = null;
  }

  function selectSingle(index: number | null) {
    selectedShapeIndices = new Set();
    if (index !== null) selectedShapeIndices.add(index);
    primarySelectedShapeIndex = index;
  }

  function selectMany(indices: number[]) {
    selectedShapeIndices = new Set(indices);
    primarySelectedShapeIndex =
      indices.length > 0 ? Math.max(...indices) : null;
  }

  function cloneShape(shape: Shape): Shape {
    if (shape.type === "pencil") {
      return {
        ...shape,
        points: shape.points.map((p) => ({ x: p.x, y: p.y })),
      };
    }
    return { ...shape };
  }

  const shapes = await getExistingShapes(roomId);
  existingShapesRef.current = shapes;
  drawCanvas(ctx); // render them once at the start

  installSocketHandlers({
    socket,
    draw: () => drawCanvas(ctx),
    onShape: (shape) => {
      existingShapesRef.current.push(shape);
    },
    onErase: (messageIds) => {
      if (!Array.isArray(messageIds)) return;
      const idsToRemove = new Set(messageIds);
      existingShapesRef.current = existingShapesRef.current.filter(
        (shape) => !shape.id || !idsToRemove.has(shape.id)
      );
    },
    onUpdate: (shape) => {
      if (!shape || typeof shape !== "object") return;
      const s = shape as Shape;
      if (!s.id) return;
      const shapeIndex = existingShapesRef.current.findIndex(
        (x) => x.id === s.id
      );
      if (shapeIndex !== -1) existingShapesRef.current[shapeIndex] = s;
    },
  });

  // Helper function to draw all shapes
  function drawCanvas(ctx: CanvasRenderingContext2D) {
    ctx.save();
    // Clear in screen space.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw in world space.
    ctx.setTransform(camera.scale, 0, 0, camera.scale, camera.x, camera.y);

    // Draw all saved shapes
    existingShapesRef.current.forEach((shape, index) => {
      const isMarkedForDeletion = shapesToEraseRef.has(index);
      const isSelected = selectedShapeIndices.has(index);

      if (shape.type === "rect") {
        const { x1, y1, w, h } = getRectBounds(shape);
        ctx.strokeStyle = isMarkedForDeletion
          ? "rgba(128, 128, 128, 0.3)"
          : isSelected
            ? "#3b82f6"
            : "white";
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeRect(x1, y1, w, h);
      } else if (shape.type === "circle") {
        ctx.strokeStyle = isMarkedForDeletion
          ? "rgba(128, 128, 128, 0.3)"
          : isSelected
            ? "#3b82f6"
            : "white";
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.beginPath();
        ctx.arc(shape.centerX, shape.centerY, shape.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (shape.type === "pencil") {
        if (shape.points.length < 2) return;
        ctx.strokeStyle = isMarkedForDeletion
          ? "rgba(128, 128, 128, 0.3)"
          : isSelected
            ? "#3b82f6"
            : "white";
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
          ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        ctx.stroke();
      } else if (shape.type === "text") {
        ctx.save();
        ctx.fillStyle = isMarkedForDeletion
          ? "rgba(128, 128, 128, 0.3)"
          : isSelected
            ? "#3b82f6"
            : "white";
        ctx.font = `${shape.fontSize}px sans-serif`;
        ctx.textBaseline = "top";
        ctx.fillText(shape.text, shape.x, shape.y);
        ctx.restore();
      }
    });

    // Draw selection handles
    if (
      selectedToolRef.current === "selection" &&
      selectedShapeIndices.size > 0
    ) {
      if (
        selectedShapeIndices.size === 1 &&
        primarySelectedShapeIndex !== null
      ) {
        const shape = existingShapesRef.current[primarySelectedShapeIndex];
        if (shape) {
          // Single selection: draw a rectangular selection bounds + 8 handles (Excalidraw-like)
          const bounds = getShapeBounds(ctx, shape);
          drawBoundsSelection(ctx, bounds);
        }
      } else if (selectedShapeIndices.size > 1) {
        const bounds = getSelectionBounds(
          ctx,
          existingShapesRef.current,
          selectedShapeIndices
        );
        if (bounds) drawBoundsSelection(ctx, bounds);
      }
    }

    ctx.restore();
  }

  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    const { x: screenX, y: screenY, rect } = getScreenPoint(e);
    const { x, y } = screenToWorld(screenX, screenY);

    if (selectedToolRef.current === "pan") {
      textEditor.teardown();
      clearSelection();
      isPanning = true;
      panStart = {
        screenX,
        screenY,
        cameraX: camera.x,
        cameraY: camera.y,
      };
      canvas.style.cursor = "grabbing";
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
      return;
    }

    if (selectedToolRef.current === "text") {
      // Text is click-to-type (no drag gesture)
      textEditor.begin({
        screenX,
        screenY,
        canvasRect: rect,
        worldX: x,
        worldY: y,
      });
      isDrawingRef.current = false;
      startPointRef.current = null;
      return;
    }

    isDrawingRef.current = true;
    startPointRef.current = { x, y };
    canvas.setPointerCapture(e.pointerId);

    // Clear shapes to erase when starting a new eraser stroke
    if (selectedToolRef.current === "eraser") {
      shapesToEraseRef.clear();
    }

    // Handle selection mode
    if (selectedToolRef.current === "selection") {
      // If multiple shapes are selected, prefer group handles / group move.
      if (selectedShapeIndices.size > 1) {
        const bounds = getSelectionBounds(
          ctx,
          existingShapesRef.current,
          selectedShapeIndices
        );
        if (bounds) {
          const groupHandle = getBoundsBorderResizeHandleAtPoint(x, y, bounds);
          if (groupHandle) {
            resizeHandle = groupHandle;
            resizeMode = "group";
            canvas.style.cursor = cursorForResizeHandle(groupHandle);
            groupResizeStart = {
              bounds,
              shapesSnapshot: new Map(
                Array.from(selectedShapeIndices).map((idx) => [
                  idx,
                  cloneShape(existingShapesRef.current[idx]),
                ])
              ),
            };
            singleResizeStart = null;
            dragOffset = { x: 0, y: 0 };
            isMovingSelection = false;
            moveMode = null;
            isBoxSelecting = false;
            drawCanvas(ctx);
            return;
          }

          // Move group by dragging within the group bounds (or any selected shape).
          if (isPointInBounds(x, y, bounds, 0)) {
            resizeHandle = null;
            resizeMode = null;
            groupResizeStart = null;
            isBoxSelecting = false;
            isMovingSelection = true;
            moveMode = "group";
            lastMovePoint = { x, y };
            dragOffset = { x: 0, y: 0 };
            drawCanvas(ctx);
            return;
          }
        }
      }

      // Check if clicking on a resize handle of the currently selected shape (single-selection only)
      if (
        selectedShapeIndices.size === 1 &&
        primarySelectedShapeIndex !== null
      ) {
        const shape = existingShapesRef.current[primarySelectedShapeIndex];
        if (shape) {
          const bounds = getShapeBounds(ctx, shape);
          const handle = getBoundsBorderResizeHandleAtPoint(x, y, bounds);
          if (handle) {
            resizeHandle = handle;
            resizeMode = "single";
            canvas.style.cursor = cursorForResizeHandle(handle);
            groupResizeStart = null;
            singleResizeStart = {
              bounds,
              shapeSnapshot: cloneShape(shape),
            };
            dragOffset = { x: 0, y: 0 };
            isMovingSelection = false;
            moveMode = null;
            isBoxSelecting = false;
            drawCanvas(ctx);
            return;
          }

          // Special-case for circles: allow resize from the actual circular outline too.
          // This prevents "dragging outward from the boundary moves instead of resizes".
          if (
            shape.type === "circle" &&
            isPointOnTrueCircleOutline(x, y, shape)
          ) {
            const h = circleHandleFromPoint(x, y, shape);
            resizeHandle = h;
            resizeMode = "single";
            canvas.style.cursor = cursorForResizeHandle(h);
            groupResizeStart = null;
            singleResizeStart = {
              bounds,
              shapeSnapshot: cloneShape(shape),
            };
            dragOffset = { x: 0, y: 0 };
            isMovingSelection = false;
            moveMode = null;
            isBoxSelecting = false;
            drawCanvas(ctx);
            return;
          }

          // Move single selection by dragging from inside the selection bounds.
          if (isPointInBounds(x, y, bounds, 0)) {
            resizeHandle = null;
            resizeMode = null;
            groupResizeStart = null;
            singleResizeStart = null;
            isBoxSelecting = false;
            isMovingSelection = true;
            moveMode = "single";
            if (shape.type === "rect") {
              normalizeRectInPlace(shape);
              dragOffset = { x: x - shape.x, y: y - shape.y };
            } else if (shape.type === "circle") {
              dragOffset = { x: x - shape.centerX, y: y - shape.centerY };
            } else if (shape.type === "text") {
              dragOffset = { x: x - shape.x, y: y - shape.y };
            } else if (shape.type === "pencil") {
              dragOffset = { x, y };
            } else {
              dragOffset = { x: 0, y: 0 };
            }
            drawCanvas(ctx);
            return;
          }
        }
      }

      // If clicking on any selected shape (but not on a handle), start move.
      if (selectedShapeIndices.size > 0) {
        for (const idx of selectedShapeIndices) {
          const s = existingShapesRef.current[idx];
          if (!s) continue;
          const b = getShapeBounds(ctx, s);
          const borderHandle = getBoundsBorderResizeHandleAtPoint(x, y, b);
          if (borderHandle) continue;
          if (isPointInBounds(x, y, b, 0)) {
            resizeHandle = null;
            resizeMode = null;
            groupResizeStart = null;
            singleResizeStart = null;
            isBoxSelecting = false;
            isMovingSelection = true;
            moveMode = selectedShapeIndices.size > 1 ? "group" : "single";
            if (moveMode === "group") {
              lastMovePoint = { x, y };
              dragOffset = { x: 0, y: 0 };
            } else if (primarySelectedShapeIndex !== null) {
              const primary =
                existingShapesRef.current[primarySelectedShapeIndex];
              if (primary?.type === "rect") {
                normalizeRectInPlace(primary);
                dragOffset = { x: x - primary.x, y: y - primary.y };
              } else if (primary?.type === "circle") {
                dragOffset = { x: x - primary.centerX, y: y - primary.centerY };
              } else if (primary?.type === "text") {
                dragOffset = { x: x - primary.x, y: y - primary.y };
              } else if (primary?.type === "pencil") {
                dragOffset = { x, y };
              }
            }
            drawCanvas(ctx);
            return;
          }
        }
      }

      // Check if clicking on a different shape
      for (let i = existingShapesRef.current.length - 1; i >= 0; i--) {
        if (selectedShapeIndices.has(i)) continue; // Skip already selected shapes
        const shape = existingShapesRef.current[i];
        if (isPointOnShapeOutline(ctx, x, y, shape)) {
          selectSingle(i);
          resizeHandle = null;
          // Start move immediately on click-drag (no extra click required)
          isMovingSelection = true;
          moveMode = "single";
          if (shape.type === "rect") {
            normalizeRectInPlace(shape);
            dragOffset = { x: x - shape.x, y: y - shape.y };
          } else if (shape.type === "circle") {
            dragOffset = { x: x - shape.centerX, y: y - shape.centerY };
          } else if (shape.type === "text") {
            dragOffset = { x: x - shape.x, y: y - shape.y };
          } else if (shape.type === "pencil") {
            dragOffset = { x, y };
          } else {
            dragOffset = { x: 0, y: 0 };
          }
          drawCanvas(ctx);
          return;
        }
      }

      // Clicked on empty space - deselect and start box selection
      clearSelection();
      resizeHandle = null;
      resizeMode = null;
      groupResizeStart = null;
      isMovingSelection = false;
      moveMode = null;
      isBoxSelecting = true;
      drawCanvas(ctx);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (isPanning && panStart) {
      e.preventDefault();
      const { x: screenX, y: screenY } = getScreenPoint(e);
      camera.x = panStart.cameraX + (screenX - panStart.screenX);
      camera.y = panStart.cameraY + (screenY - panStart.screenY);
      drawCanvas(ctx2);
      return;
    }

    if (!isDrawingRef.current || !startPointRef.current) {
      // Update cursor style when hovering (not dragging)
      if (selectedToolRef.current === "text") {
        canvas.style.cursor = "text";
        return;
      }

      if (selectedToolRef.current === "pan") {
        canvas.style.cursor = "grab";
        return;
      }

      if (selectedToolRef.current === "selection") {
        const { x: screenX, y: screenY } = getScreenPoint(e);
        const { x, y } = screenToWorld(screenX, screenY);

        if (
          updateSelectionHoverCursor({
            canvas,
            ctx: ctx2,
            worldX: x,
            worldY: y,
            shapes: existingShapesRef.current,
            selectedShapeIndices,
            primarySelectedShapeIndex,
          })
        ) {
          return;
        }
      }

      canvas.style.cursor = "default";
      return;
    }

    const { x: screenX, y: screenY } = getScreenPoint(e);
    const { x, y } = screenToWorld(screenX, screenY);
    const { x: startX, y: startY } = startPointRef.current;

    // Handle selection mode - move or resize
    if (selectedToolRef.current === "selection") {
      // Moving or resizing a selected shape (check this first!)
      if (
        (resizeHandle || isMovingSelection) &&
        (selectedShapeIndices.size > 0 || primarySelectedShapeIndex !== null)
      ) {
        if (resizeHandle) {
          // Resize
          if (resizeMode === "group" && groupResizeStart) {
            const startB = groupResizeStart.bounds;
            const newB = computeResizedBounds(startB, resizeHandle, x, y);

            const sx = startB.w > 0 ? newB.w / startB.w : 1;
            const sy = startB.h > 0 ? newB.h / startB.h : 1;

            for (const idx of selectedShapeIndices) {
              const snap = groupResizeStart.shapesSnapshot.get(idx);
              const target = existingShapesRef.current[idx];
              if (!snap || !target) continue;

              if (snap.type === "rect" && target.type === "rect") {
                const rb = getRectBounds(snap);
                const nx1 = newB.x1 + (rb.x1 - startB.x1) * sx;
                const ny1 = newB.y1 + (rb.y1 - startB.y1) * sy;
                const nx2 = newB.x1 + (rb.x2 - startB.x1) * sx;
                const ny2 = newB.y1 + (rb.y2 - startB.y1) * sy;
                target.x = Math.min(nx1, nx2);
                target.y = Math.min(ny1, ny2);
                target.width = Math.abs(nx2 - nx1);
                target.height = Math.abs(ny2 - ny1);
              } else if (snap.type === "circle" && target.type === "circle") {
                // Keep circles as circles. Important: edge-resize should still change radius.
                // Using min(newW,newH) can make radius unchanged when resizing only one axis.
                target.centerX = newB.x1 + (snap.centerX - startB.x1) * sx;
                target.centerY = newB.y1 + (snap.centerY - startB.y1) * sy;
                const scale = (Math.abs(sx) + Math.abs(sy)) / 2;
                target.radius = Math.max(1, snap.radius * scale);
              } else if (snap.type === "pencil" && target.type === "pencil") {
                target.points = snap.points.map((p) => ({
                  x: newB.x1 + (p.x - startB.x1) * sx,
                  y: newB.y1 + (p.y - startB.y1) * sy,
                }));
              } else if (snap.type === "text" && target.type === "text") {
                const tb = getTextBounds(ctx2, snap);
                const nx1 = newB.x1 + (tb.x1 - startB.x1) * sx;
                const ny1 = newB.y1 + (tb.y1 - startB.y1) * sy;
                const scale = (Math.abs(sx) + Math.abs(sy)) / 2;
                target.x = nx1;
                target.y = ny1;
                target.fontSize = Math.max(6, snap.fontSize * scale);
              }
            }
          } else if (
            resizeMode === "single" &&
            singleResizeStart &&
            primarySelectedShapeIndex !== null
          ) {
            const target = existingShapesRef.current[primarySelectedShapeIndex];
            if (!target) return;

            const startB = singleResizeStart.bounds;
            const newB = computeResizedBounds(startB, resizeHandle, x, y);
            const sx = startB.w > 0 ? newB.w / startB.w : 1;
            const sy = startB.h > 0 ? newB.h / startB.h : 1;
            const snap = singleResizeStart.shapeSnapshot;

            if (snap.type === "rect" && target.type === "rect") {
              const rb = getRectBounds(snap);
              const nx1 = newB.x1 + (rb.x1 - startB.x1) * sx;
              const ny1 = newB.y1 + (rb.y1 - startB.y1) * sy;
              const nx2 = newB.x1 + (rb.x2 - startB.x1) * sx;
              const ny2 = newB.y1 + (rb.y2 - startB.y1) * sy;
              target.x = Math.min(nx1, nx2);
              target.y = Math.min(ny1, ny2);
              target.width = Math.abs(nx2 - nx1);
              target.height = Math.abs(ny2 - ny1);
            } else if (snap.type === "circle" && target.type === "circle") {
              target.centerX = newB.x1 + (snap.centerX - startB.x1) * sx;
              target.centerY = newB.y1 + (snap.centerY - startB.y1) * sy;
              const scale = (Math.abs(sx) + Math.abs(sy)) / 2;
              target.radius = Math.max(1, snap.radius * scale);
            } else if (snap.type === "pencil" && target.type === "pencil") {
              target.points = snap.points.map((p) => ({
                x: newB.x1 + (p.x - startB.x1) * sx,
                y: newB.y1 + (p.y - startB.y1) * sy,
              }));
            } else if (snap.type === "text" && target.type === "text") {
              const tb = getTextBounds(ctx2, snap);
              const nx1 = newB.x1 + (tb.x1 - startB.x1) * sx;
              const ny1 = newB.y1 + (tb.y1 - startB.y1) * sy;
              const scale = (Math.abs(sx) + Math.abs(sy)) / 2;
              target.x = nx1;
              target.y = ny1;
              target.fontSize = Math.max(6, snap.fontSize * scale);
            }
          } else {
            // Single-shape resize
            if (primarySelectedShapeIndex === null) return;
            const shape = existingShapesRef.current[primarySelectedShapeIndex];
            if (!shape) return;

            if (shape.type === "rect") {
              let newX = shape.x;
              let newY = shape.y;
              let newWidth = shape.width;
              let newHeight = shape.height;

              if (resizeHandle === "br") {
                newWidth = x - shape.x;
                newHeight = y - shape.y;
              } else if (resizeHandle === "bl") {
                newWidth = shape.x + shape.width - x;
                newHeight = y - shape.y;
                newX = x;
              } else if (resizeHandle === "tr") {
                newWidth = x - shape.x;
                newHeight = shape.y + shape.height - y;
                newY = y;
              } else if (resizeHandle === "tl") {
                newWidth = shape.x + shape.width - x;
                newHeight = shape.y + shape.height - y;
                newX = x;
                newY = y;
              }

              // Normalize negative dimensions
              if (newWidth < 0) {
                newX = newX + newWidth;
                newWidth = -newWidth;
              }
              if (newHeight < 0) {
                newY = newY + newHeight;
                newHeight = -newHeight;
              }

              shape.x = newX;
              shape.y = newY;
              shape.width = newWidth;
              shape.height = newHeight;
            } else if (shape.type === "circle") {
              const distance = Math.sqrt(
                Math.pow(x - shape.centerX, 2) + Math.pow(y - shape.centerY, 2)
              );
              shape.radius = distance;
            } else if (shape.type === "pencil") {
              const oldB = getPencilBounds(shape);
              let newMinX = oldB.x1;
              let newMaxX = oldB.x2;
              let newMinY = oldB.y1;
              let newMaxY = oldB.y2;

              if (resizeHandle === "br") {
                newMaxX = x;
                newMaxY = y;
              } else if (resizeHandle === "bl") {
                newMinX = x;
                newMaxY = y;
              } else if (resizeHandle === "tr") {
                newMaxX = x;
                newMinY = y;
              } else if (resizeHandle === "tl") {
                newMinX = x;
                newMinY = y;
              }

              const x1 = Math.min(newMinX, newMaxX);
              const x2 = Math.max(newMinX, newMaxX);
              const y1 = Math.min(newMinY, newMaxY);
              const y2 = Math.max(newMinY, newMaxY);

              const oldW = oldB.w;
              const oldH = oldB.h;
              const newW = x2 - x1;
              const newH = y2 - y1;

              const sx = oldW > 0 ? newW / oldW : 1;
              const sy = oldH > 0 ? newH / oldH : 1;

              shape.points = shape.points.map((p) => ({
                x: x1 + (p.x - oldB.x1) * sx,
                y: y1 + (p.y - oldB.y1) * sy,
              }));
            } else if (shape.type === "text") {
              const startB = getTextBounds(ctx2, shape);
              const newB = computeResizedBounds(startB, resizeHandle, x, y);
              const sx = startB.w > 0 ? newB.w / startB.w : 1;
              const sy = startB.h > 0 ? newB.h / startB.h : 1;
              const scale = (Math.abs(sx) + Math.abs(sy)) / 2;
              shape.x = newB.x1;
              shape.y = newB.y1;
              shape.fontSize = Math.max(6, shape.fontSize * scale);
            }
          }
        } else {
          // Move shape
          if (moveMode === "group") {
            const dx = x - lastMovePoint.x;
            const dy = y - lastMovePoint.y;
            for (const idx of selectedShapeIndices) {
              const s = existingShapesRef.current[idx];
              if (!s) continue;
              if (s.type === "rect") {
                normalizeRectInPlace(s);
                s.x += dx;
                s.y += dy;
              } else if (s.type === "circle") {
                s.centerX += dx;
                s.centerY += dy;
              } else if (s.type === "text") {
                s.x += dx;
                s.y += dy;
              } else if (s.type === "pencil") {
                s.points = s.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
              }
            }
            lastMovePoint = { x, y };
          } else {
            if (primarySelectedShapeIndex === null) return;
            const shape = existingShapesRef.current[primarySelectedShapeIndex];
            if (!shape) return;
            if (shape.type === "rect") {
              normalizeRectInPlace(shape);
              shape.x = x - dragOffset.x;
              shape.y = y - dragOffset.y;
            } else if (shape.type === "circle") {
              shape.centerX = x - dragOffset.x;
              shape.centerY = y - dragOffset.y;
            } else if (shape.type === "text") {
              shape.x = x - dragOffset.x;
              shape.y = y - dragOffset.y;
            } else if (shape.type === "pencil") {
              const dx = x - dragOffset.x;
              const dy = y - dragOffset.y;
              shape.points = shape.points.map((p) => ({
                x: p.x + dx,
                y: p.y + dy,
              }));
              dragOffset = { x, y };
            }
          }
        }

        drawCanvas(ctx);
        return;
      }

      // Box selection - show selection rectangle (only if not moving/resizing)
      if (isBoxSelecting) {
        drawCanvas(ctx);

        // Draw selection box
        ctx.save();
        ctx.setTransform(camera.scale, 0, 0, camera.scale, camera.x, camera.y);
        ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
        ctx.fillRect(startX, startY, x - startX, y - startY);
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(startX, startY, x - startX, y - startY);
        ctx.restore();
        return;
      }
    }

    // Draw preview based on selected tool
    drawCanvas(ctx);

    ctx.save();
    ctx.setTransform(camera.scale, 0, 0, camera.scale, camera.x, camera.y);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;

    if (selectedToolRef.current === "rectangle") {
      ctx.strokeRect(startX, startY, x - startX, y - startY);
    } else if (selectedToolRef.current === "circle") {
      const radius = Math.sqrt(
        Math.pow(x - startX, 2) + Math.pow(y - startY, 2)
      );
      ctx.beginPath();
      ctx.arc(startX, startY, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (selectedToolRef.current === "pencil") {
      currentPencilPoints.push({ x, y });
      if (currentPencilPoints.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(currentPencilPoints[0].x, currentPencilPoints[0].y);
        for (let i = 1; i < currentPencilPoints.length; i++) {
          ctx.lineTo(currentPencilPoints[i].x, currentPencilPoints[i].y);
        }
        ctx.stroke();
      }
    } else if (selectedToolRef.current === "eraser") {
      ctx.restore();
      // Show eraser cursor and mark shapes for deletion
      const eraserRadius = 20;
      const eraserRadiusWorld = eraserRadius / camera.scale;

      markShapesForEraser({
        shapes: existingShapesRef.current,
        ctx,
        worldX: x,
        worldY: y,
        radiusWorld: eraserRadiusWorld,
        markedIndices: shapesToEraseRef,
      });

      drawCanvas(ctx);

      drawEraserCursor({
        ctx,
        screenX,
        screenY,
        radiusPx: eraserRadius,
      });
      return;
    }

    ctx.restore();
  };

  const onPointerUp = (e: PointerEvent) => {
    if (isPanning) {
      isPanning = false;
      panStart = null;
      canvas.style.cursor =
        selectedToolRef.current === "pan" ? "grab" : "default";
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
      return;
    }

    if (!isDrawingRef.current || !startPointRef.current) return;

    const { x: screenX, y: screenY } = getScreenPoint(e);
    const { x, y } = screenToWorld(screenX, screenY);
    const { x: startX, y: startY } = startPointRef.current;

    // Handle selection mode - update shape in database
    if (selectedToolRef.current === "selection") {
      // Box selection - select shapes in the box
      if (isBoxSelecting) {
        const boxWidth = x - startX;
        const boxHeight = y - startY;

        // Treat very small drags as a plain click (prevents accidental marquee selection).
        // This also fixes "clicking inside a rectangle selects it" because rect-box overlap
        // is much easier to trigger than circle-center containment.
        const MIN_BOX_SELECT_PX = 4;
        const minWorld = MIN_BOX_SELECT_PX / camera.scale;
        if (Math.abs(boxWidth) < minWorld && Math.abs(boxHeight) < minWorld) {
          resizeHandle = null;
          resizeMode = null;
          groupResizeStart = null;
          singleResizeStart = null;
          dragOffset = { x: 0, y: 0 };
          isMovingSelection = false;
          moveMode = null;
          isBoxSelecting = false;
          drawCanvas(ctx);

          isDrawingRef.current = false;
          startPointRef.current = null;
          try {
            canvas.releasePointerCapture(e.pointerId);
          } catch {}
          return;
        }

        const indices: number[] = [];
        for (let i = 0; i < existingShapesRef.current.length; i++) {
          const shape = existingShapesRef.current[i];
          if (isShapeInBox(ctx, shape, startX, startY, boxWidth, boxHeight)) {
            indices.push(i);
          }
        }

        selectMany(indices);
        // Reset state for the newly selected shapes
        resizeHandle = null;
        dragOffset = { x: 0, y: 0 };
        isMovingSelection = false;
        moveMode = null;

        isBoxSelecting = false;
        drawCanvas(ctx);

        // Update cursor for the newly selected shape
        if (primarySelectedShapeIndex !== null) {
          const shape = existingShapesRef.current[primarySelectedShapeIndex];
          if (shape) {
            const b = getShapeBounds(ctx, shape);
            const handle = getBoundsBorderResizeHandleAtPoint(x, y, b);
            if (handle) {
              canvas.style.cursor = cursorForResizeHandle(handle);
              return;
            }
          }

          if (isPointInShape(ctx, x, y, shape)) {
            canvas.style.cursor = "move";
          } else {
            canvas.style.cursor = "default";
          }
        }
      } else if (
        primarySelectedShapeIndex !== null &&
        (resizeHandle || isMovingSelection)
      ) {
        // Persist updates
        const indicesToUpdate =
          moveMode === "group" || resizeMode === "group"
            ? Array.from(selectedShapeIndices)
            : [primarySelectedShapeIndex];

        for (const idx of indicesToUpdate) {
          const shape = existingShapesRef.current[idx];
          if (!shape?.id) continue;

          persistShapeUpdate(shape).catch((err) => {
            console.error("Failed to update shape:", err);
          });

          socket.send(
            JSON.stringify({
              type: "update",
              shape,
              roomId,
            })
          );
        }

        resizeHandle = null;
        resizeMode = null;
        groupResizeStart = null;
        singleResizeStart = null;
        dragOffset = { x: 0, y: 0 };
        isMovingSelection = false;
        moveMode = null;
      }

      isDrawingRef.current = false;
      startPointRef.current = null;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
      return;
    }

    // Create shape based on selected tool
    let shape: Shape;

    if (selectedToolRef.current === "rectangle") {
      let rectX = startX;
      let rectY = startY;
      let rectW = x - startX;
      let rectH = y - startY;

      if (rectW < 0) {
        rectX += rectW;
        rectW = -rectW;
      }
      if (rectH < 0) {
        rectY += rectH;
        rectH = -rectH;
      }

      shape = {
        type: "rect",
        x: rectX,
        y: rectY,
        width: rectW,
        height: rectH,
      };
    } else if (selectedToolRef.current === "circle") {
      const radius = Math.sqrt(
        Math.pow(x - startX, 2) + Math.pow(y - startY, 2)
      );
      shape = {
        type: "circle",
        centerX: startX,
        centerY: startY,
        radius,
      };
    } else if (selectedToolRef.current === "pencil") {
      // Add final point
      currentPencilPoints.push({ x, y });
      shape = {
        type: "pencil",
        points: [...currentPencilPoints],
      };
      // Clear pencil points for next drawing
      currentPencilPoints.length = 0;
    } else if (selectedToolRef.current === "text") {
      // Text creation is handled by the inline editor opened on pointerdown.
      drawCanvas(ctx);
      isDrawingRef.current = false;
      startPointRef.current = null;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
      return;
    } else if (selectedToolRef.current === "eraser") {
      // Eraser mode: delete all shapes marked during the drag
      commitEraserStroke({
        shapes: existingShapesRef.current,
        markedIndices: shapesToEraseRef,
        socket,
        roomId,
      });

      drawCanvas(ctx);
      isDrawingRef.current = false;
      startPointRef.current = null;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
      return;
    } else {
      // Fallback
      shape = {
        type: "rect",
        x: startX,
        y: startY,
        width: x - startX,
        height: y - startY,
      };
    }

    existingShapesRef.current.push(shape);

    socket.send(
      JSON.stringify({
        type: "chat",
        message: JSON.stringify({
          shape,
        }),
        roomId,
      })
    );

    // Redraw everything (now includes new shape)
    drawCanvas(ctx);

    isDrawingRef.current = false;
    startPointRef.current = null;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const onWheel = (e: WheelEvent) => {
    // Prevent the page from scrolling; canvas wheel is used for pan/zoom.
    e.preventDefault();

    // Don't pan/zoom while typing.
    if (textEditor.isActive()) return;

    const { x: screenX, y: screenY } = getScreenPoint(e);

    if (e.ctrlKey) {
      // Zoom around cursor
      const anchor = screenToWorld(screenX, screenY);
      const zoomFactor = Math.exp(-e.deltaY * 0.001);
      const nextScale = Math.min(4, Math.max(0.1, camera.scale * zoomFactor));
      camera.scale = nextScale;
      camera.x = screenX - anchor.x * camera.scale;
      camera.y = screenY - anchor.y * camera.scale;
    } else {
      // Pan
      camera.x -= e.deltaX;
      camera.y -= e.deltaY;
    }

    drawCanvas(ctx2);
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  return () => {
    textEditor.teardown();
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("wheel", onWheel);
  };
}
