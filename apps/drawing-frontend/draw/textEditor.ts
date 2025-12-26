import type { Shape } from "./types";

export function createInlineTextEditor(args: {
  measureCtx: CanvasRenderingContext2D;
  camera: { x: number; y: number; scale: number };
  existingShapesRef: { current: Shape[] };
  socket: WebSocket;
  roomId: string;
  drawCanvas: (ctx: CanvasRenderingContext2D) => void;
}) {
  const { measureCtx, camera, existingShapesRef, socket, roomId, drawCanvas } =
    args;

  let active: {
    input: HTMLInputElement;
    remove: () => void;
  } | null = null;

  const teardown = () => {
    if (!active) return;
    active.remove();
    active = null;
  };

  const isActive = () => Boolean(active);

  const begin = (beginArgs: {
    screenX: number;
    screenY: number;
    canvasRect: DOMRect;
    worldX: number;
    worldY: number;
  }) => {
    teardown();

    const fontSizeWorld = 24;
    const fontSizePx = Math.max(8, fontSizeWorld * camera.scale);

    const input = document.createElement("input");
    input.type = "text";
    input.value = "";
    input.autocomplete = "off";
    input.spellcheck = false;

    input.style.position = "fixed";
    input.style.left = `${beginArgs.canvasRect.left + beginArgs.screenX}px`;
    input.style.top = `${beginArgs.canvasRect.top + beginArgs.screenY}px`;
    input.style.zIndex = "100";
    input.style.font = `${fontSizePx}px sans-serif`;
    input.style.color = "white";
    input.style.background = "rgba(0,0,0,0.25)";
    input.style.border = "1px solid rgba(255,255,255,0.25)";
    input.style.borderRadius = "4px";
    input.style.outline = "none";
    input.style.padding = "2px 6px";
    input.style.lineHeight = "1.2";
    input.style.minWidth = "20px";

    const syncWidth = () => {
      measureCtx.save();
      measureCtx.font = `${fontSizePx}px sans-serif`;
      const w = Math.max(
        20,
        measureCtx.measureText(input.value || " ").width + 12
      );
      measureCtx.restore();
      input.style.width = `${w}px`;
    };

    let done = false;
    const cleanup = () => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("keydown", onKeyDown);
      input.removeEventListener("blur", onBlur);
      if (input.parentNode) input.parentNode.removeChild(input);
    };

    const commit = () => {
      if (done) return;
      done = true;
      const text = input.value;
      cleanup();
      active = null;

      if (!text.trim()) {
        drawCanvas(measureCtx);
        return;
      }

      const shape: Shape = {
        type: "text",
        x: beginArgs.worldX,
        y: beginArgs.worldY,
        text,
        fontSize: fontSizeWorld,
      };

      existingShapesRef.current.push(shape);
      socket.send(
        JSON.stringify({
          type: "chat",
          message: JSON.stringify({ shape }),
          roomId,
        })
      );
      drawCanvas(measureCtx);
    };

    const cancel = () => {
      if (done) return;
      done = true;
      cleanup();
      active = null;
      drawCanvas(measureCtx);
    };

    const onInput = () => syncWidth();
    const onBlur = () => commit();
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        commit();
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        cancel();
      }
    };

    input.addEventListener("input", onInput);
    input.addEventListener("keydown", onKeyDown);
    input.addEventListener("blur", onBlur);

    document.body.appendChild(input);
    syncWidth();
    input.focus();

    active = {
      input,
      remove: cleanup,
    };
  };

  return {
    begin,
    teardown,
    isActive,
  };
}
