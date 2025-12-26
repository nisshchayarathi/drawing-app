import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend_common/config";
import { prismaClient } from "@repo/db/client";
// things to fix:
// 1. any user can send message to any room right now
// 2. the iteration over global users array is too bad we must use singelton or a library for state management
// 3. uses queues for chats being stored in a db
// 4. right now users can spam messages we need to set a limit

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: Number(PORT) });
console.log(`WebSocket server listening on port ${PORT}`);
interface User {
  ws: WebSocket;
  rooms: string[];
  userId: string;
}

const users: User[] = []; //bad way

function cheackUser(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded == "string") {
      return null;
    }

    if (!decoded || !decoded.userId) {
      return null;
    }
    return decoded.userId;
  } catch (e) {
    return null;
  }
}

wss.on("connection", function connection(ws, request) {
  const url = request.url;
  if (!url) return;

  const queryParams = new URLSearchParams(url.split("?")[1]);
  const token = queryParams.get("token") ?? "";

  const userId = cheackUser(token);

  if (!userId) {
    ws.close();
    return null;
  }

  users.push({
    userId,
    rooms: [],
    ws,
  });
  ws.on("message", async function message(data) {
    let parsedData = JSON.parse(data as unknown as string);

    if (parsedData.type === "join_room") {
      const user = users.find((x) => x.ws === ws);
      if (!user) return;

      const roomId = String(parsedData.roomId);
      if (!user.rooms.includes(roomId)) {
        user.rooms.push(roomId);
      }
    }

    if (parsedData.type === "leave_room") {
      const user = users.find((x) => x.ws === ws);
      if (!user) return;

      const roomId = String(parsedData.room);
      user.rooms = user.rooms.filter((r) => r !== roomId);
    }

    if (parsedData.type === "chat") {
      const roomId = String(parsedData.roomId);
      const message = parsedData.message;

      const numericRoomId = Number(parsedData.roomId);
      if (!Number.isFinite(numericRoomId) || typeof message !== "string")
        return;

      const chat = await prismaClient.chat.create({
        data: {
          roomId: numericRoomId,
          message,
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      users.forEach((user) => {
        if (user.rooms.includes(roomId)) {
          user.ws.send(
            JSON.stringify({
              type: "chat",
              message: chat.message,
              userId: chat.userId,
              user: {
                id: chat.user.id,
                name: chat.user.name,
              },
              roomId,
            })
          );
        }
      });
    }
  });
});
