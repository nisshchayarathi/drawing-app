import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend_common/config";
import { middleware } from "./middleware";
import {
  CreateUserSchema,
  CreateRoomSchema,
  SigninSchema,
} from "@repo/common/types";
import { prismaClient } from "@repo/db/client";

const app = express();
app.use(express.json());
app.use(cors());

app.post("/signup", async (req, res) => {
  const parsedData = CreateUserSchema.safeParse(req.body);
  if (!parsedData.success) {
    res.json({
      message: "Incorrect inputs",
    });
    return;
  }
  try {
    const user = await prismaClient.user.create({
      data: {
        email: parsedData.data.username,
        password: parsedData.data.password,
        name: parsedData.data.name,
      },
    });

    res.json({
      userId: user.id,
    });
  } catch (e) {
    res.status(411).json({
      message: "Email already exists",
    });
  }
});

app.post("/signin", async (req, res) => {
  const parsedData = SigninSchema.safeParse(req.body);
  if (!parsedData.success) {
    res.json({
      message: "Incorrect inputs",
    });
    return;
  }
  const user = await prismaClient.user.findFirst({
    where: {
      email: parsedData.data.username,
      password: parsedData.data.password,
    },
  });

  if (!user) {
    res.status(403).json({
      message: "User does not exist!",
    });
    return;
  }

  const token = jwt.sign(
    {
      userId: user?.id,
    },
    JWT_SECRET
  );

  res.json({
    token,
  });
});

app.post("/room", middleware, async (req, res) => {
  const parsedData = CreateRoomSchema.safeParse(req.body);
  if (!parsedData.success) {
    res.json({
      message: "Incorrect inputs",
    });
    return;
  }

  const userId = req.userId;
  try {
    const room = await prismaClient.room.create({
      data: {
        slug: parsedData.data.name,
        adminId: userId,
      },
    });

    res.json({
      roomId: room.id,
    });
  } catch (e) {
    res.status(411).json({
      message: "Room already exists",
    });
  }
});

app.get("/chats/:roomId", async (req, res) => {
  const roomId = Number(req.params.roomId);
  const messages = await prismaClient.chat.findMany({
    where: {
      roomId,
    },
    orderBy: {
      id: "asc",
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

  res.json({
    messages,
  });
});

app.get("/room/:slug", async (req, res) => {
  const slug = req.params.slug;
  const room = await prismaClient.room.findFirst({
    where: {
      slug,
    },
  });
  if (!room) {
    res.status(404).json({
      message: "Room not found",
    });
    return;
  }
  res.json({
    room,
  });
});

app.delete("/chats/:messageId", async (req, res) => {
  const messageId = Number(req.params.messageId);
  try {
    await prismaClient.chat.delete({
      where: {
        id: messageId,
      },
    });
    res.json({
      success: true,
    });
  } catch (e) {
    res.status(500).json({
      message: "Failed to delete message",
    });
  }
});

app.put("/chats/:messageId", async (req, res) => {
  const messageId = Number(req.params.messageId);
  const { message } = req.body;
  try {
    await prismaClient.chat.update({
      where: {
        id: messageId,
      },
      data: {
        message,
      },
    });
    res.json({
      success: true,
    });
  } catch (e) {
    res.status(500).json({
      message: "Failed to update message",
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`HTTP backend listening on port ${PORT}`);
});
