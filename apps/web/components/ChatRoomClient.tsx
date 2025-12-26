"use client";

import { useState, useEffect, useRef } from "react";
import { useSocket, getCurrentUserId } from "../hooks/useSockets";

export function ChatRoomClient({
  messages,
  id,
}: {
  messages: {
    id: number;
    message: string;
    userId?: string;
    user?: { id: string; name: string };
  }[];
  id: string;
}) {
  const [chats, setChats] = useState(messages);
  const [currentMessage, setCurrentMessage] = useState("");
  const { socket, loading } = useSocket();
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const currentUserId = getCurrentUserId();

  useEffect(() => {
    if (!socket || loading) return;

    socket.send(
      JSON.stringify({
        type: "join_room",
        roomId: id,
      })
    );

    const handleMessage = (event: MessageEvent) => {
      const parsedData = JSON.parse(event.data);
      if (parsedData.type === "chat") {
        setChats((prev) => [...prev, parsedData.message]);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, loading, id]);

  // ✅ Auto-scroll to bottom when chats update
  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [chats]);

  if (loading) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1e1e1e",
        }}
      >
        <div
          style={{
            border: "4px solid #f3f3f3",
            borderTop: "4px solid #007bff",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#1e1e1e",
        color: "#fff",
      }}
    >
      {/* Chat messages area */}
      <div
        ref={chatContainerRef}
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end", // keeps content at bottom
          padding: "10px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {chats.map((m, i) => {
            const isMyMessage = m.userId === currentUserId;
            const userName = m.user?.name || "Unknown";

            return (
              <div
                key={m.id ?? i}
                style={{
                  alignSelf: isMyMessage ? "flex-end" : "flex-start",
                  display: "flex",
                  flexDirection: "column",
                  maxWidth: "70%",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    color: "#aaa",
                    marginBottom: "4px",
                    marginLeft: isMyMessage ? "auto" : "0",
                    marginRight: isMyMessage ? "0" : "auto",
                  }}
                >
                  {isMyMessage ? "You" : userName}
                </div>
                <div
                  style={{
                    backgroundColor: isMyMessage ? "#007bff" : "#5e5e5e",
                    color: "white",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    wordWrap: "break-word",
                  }}
                >
                  {m.message}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Input and send button */}
      <div
        style={{
          display: "flex",
          borderTop: "1px solid #444",
          padding: "8px",
          backgroundColor: "#2a2a2a",
        }}
      >
        <input
          style={{
            flex: 1,
            padding: "10px",
            border: "1px solid gray",
            borderRadius: "6px",
            marginRight: "8px",
            backgroundColor: "#3a3a3a",
            color: "white",
          }}
          type="text"
          placeholder="Type a message..."
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && currentMessage.trim() !== "") {
              socket?.send(
                JSON.stringify({
                  type: "chat",
                  roomId: id,
                  message: currentMessage,
                })
              );
              setCurrentMessage("");
            }
          }}
        />
        <button
          style={{
            padding: "10px 16px",
            borderRadius: "6px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
          }}
          onClick={() => {
            if (currentMessage.trim() !== "") {
              socket?.send(
                JSON.stringify({
                  type: "chat",
                  roomId: id,
                  message: currentMessage,
                })
              );
              setCurrentMessage("");
            }
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
