"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BACKEND_URL } from "../config";
import { clearAuthToken, getAuthToken } from "@/lib/authToken";

function getAxiosMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (data && typeof data === "object" && "message" in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
    if (typeof err.message === "string" && err.message.trim())
      return err.message;
  }

  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

type RoomResponse = {
  room: {
    id: number;
    slug: string;
    adminId: string;
  };
};

export default function RoomsPage() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"join" | "create" | null>(null);

  const trimmed = useMemo(() => slug.trim(), [slug]);

  const requireToken = () => {
    const token = getAuthToken();
    if (!token) {
      router.push("/signin");
      return null;
    }
    return token;
  };

  const joinRoom = async () => {
    if (!trimmed) {
      setError("Enter a room name");
      return;
    }

    setError(null);
    setBusy("join");
    try {
      const res = await axios.get<RoomResponse>(
        `${BACKEND_URL}/room/${encodeURIComponent(trimmed)}`
      );
      const roomId = res.data?.room?.id;
      if (!roomId) throw new Error("Room not found");
      router.push(`/canvas/${roomId}`);
    } catch (e) {
      setError(getAxiosMessage(e, "Failed to join room"));
    } finally {
      setBusy(null);
    }
  };

  const createRoom = async () => {
    if (!trimmed) {
      setError("Enter a room name");
      return;
    }

    const token = requireToken();
    if (!token) return;

    setError(null);
    setBusy("create");
    try {
      const res = await axios.post<{ roomId: number }>(
        `${BACKEND_URL}/room`,
        { name: trimmed },
        {
          headers: {
            authorization: token,
          },
        }
      );

      const roomId = res.data?.roomId;
      if (!roomId) throw new Error("Room creation failed");
      router.push(`/canvas/${roomId}`);
    } catch (e) {
      setError(getAxiosMessage(e, "Failed to create room"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md border bg-white p-6">
        <div className="text-xl font-semibold">Rooms</div>
        <div className="text-sm text-slate-600">
          Join an existing room or create a new one.
        </div>

        <div className="mt-4">
          <input
            className="w-full border px-3 py-2"
            placeholder="Room name"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>

        {error ? (
          <div className="mt-2 text-sm text-red-600">{error}</div>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button
            className="flex-1 border px-3 py-2"
            onClick={joinRoom}
            disabled={busy !== null}
          >
            {busy === "join" ? "Joining..." : "Join"}
          </button>
          <button
            className="flex-1 border px-3 py-2"
            onClick={createRoom}
            disabled={busy !== null}
          >
            {busy === "create" ? "Creating..." : "Create"}
          </button>
        </div>

        <div className="mt-4 flex justify-between">
          <button
            className="text-sm underline"
            onClick={() => {
              clearAuthToken();
              router.push("/");
            }}
          >
            Sign out
          </button>
          <button
            className="text-sm underline"
            onClick={() => router.push("/")}
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
