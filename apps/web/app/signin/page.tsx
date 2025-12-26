"use client";

import axios from "axios";
import { BACKEND_URL } from "../config";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Signin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter(); // ✅ Initialize router

  const handleSignin = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/signin`, {
        username,
        password,
      });
      const token = res.data.token;
      localStorage.setItem("chat-token", token);

      // ✅ Navigate to rooms page after sign in
      router.push("/rooms");
    } catch (err) {
      console.error("Signin failed:", err);
      alert("Signin failed. Please check your credentials.");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100vw",
      }}
    >
      <input
        style={{ padding: 10, margin: 10 }}
        placeholder="Username"
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        style={{ padding: 10, margin: 10 }}
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleSignin} style={{ padding: 10, margin: 10 }}>
        Sign in
      </button>
      <p>
        Don&apos;t have an account?{" "}
        <a href="/signup" style={{ color: "blue", cursor: "pointer" }}>
          Sign up
        </a>
      </p>
    </div>
  );
}
