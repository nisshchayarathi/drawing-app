import axios from "axios";
import { HTTP_BACKEND } from "@/config";
import type { Shape } from "./types";

export async function getExistingShapes(roomId: string) {
  const res = await axios.get(`${HTTP_BACKEND}/chats/${roomId}`);
  const messages = res.data.messages;

  return messages
    .map((x: { message: string; id: number }) => {
      const messageData = JSON.parse(x.message);
      return { ...messageData.shape, id: x.id } as Shape;
    })
    .filter((x: Shape) => x);
}

export function installSocketHandlers(args: {
  socket: WebSocket;
  draw: () => void;
  onShape: (shape: Shape) => void;
  onErase: (messageIds: unknown) => void;
  onUpdate: (shape: unknown) => void;
}) {
  const { socket, draw, onShape, onErase, onUpdate } = args;

  socket.onmessage = (event) => {
    let message: unknown;
    try {
      message = JSON.parse(event.data);
    } catch {
      console.warn("Invalid JSON from socket:", event.data);
      return;
    }

    if (!message || typeof message !== "object") return;
    const msg = message as {
      type?: unknown;
      message?: unknown;
      messageIds?: unknown;
      shape?: unknown;
    };

    if (typeof msg.type !== "string") return;

    if (msg.type === "chat") {
      let parsedMessage: unknown;
      try {
        parsedMessage =
          typeof msg.message === "string"
            ? JSON.parse(msg.message)
            : msg.message;
      } catch {
        console.warn("Failed to parse inner message", msg);
        return;
      }

      if (parsedMessage && typeof parsedMessage === "object") {
        const payload = parsedMessage as { shape?: unknown };
        const shape = payload.shape;
        if (shape && typeof shape === "object" && "type" in (shape as object)) {
          onShape(shape as Shape);
          draw();
          return;
        }
      }

      console.warn("Received chat message without valid shape", parsedMessage);
      return;
    }

    if (msg.type === "erase") {
      onErase(msg.messageIds);
      draw();
      return;
    }

    if (msg.type === "update") {
      onUpdate(msg.shape);
      draw();
      return;
    }

    return;
  };
}

export async function persistShapeUpdate(shape: Shape) {
  if (!shape.id) return;
  await axios.put(`${HTTP_BACKEND}/chats/${shape.id}`, {
    message: JSON.stringify({ shape }),
  });
}

export async function persistShapeDeletes(messageIds: string[]) {
  await Promise.all(
    messageIds.map(async (messageId) =>
      axios.delete(`${HTTP_BACKEND}/chats/${messageId}`)
    )
  );
}
