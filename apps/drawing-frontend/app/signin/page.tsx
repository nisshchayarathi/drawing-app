"use client";
import axios from "axios";
import { AuthPage } from "../components/AuthPage";
import { useRouter } from "next/navigation";
import { BACKEND_URL } from "../config";
import { setAuthToken } from "@/lib/authToken";

export default function Signin() {
  const router = useRouter();

  return (
    <AuthPage
      type={"Signin"}
      onSubmit={async ({ email, password }) => {
        const res = await axios.post<{ token: string }>(
          `${BACKEND_URL}/signin`,
          {
            username: email,
            password,
          }
        );

        const token = res.data?.token;
        if (!token) throw new Error("No token returned from server");

        setAuthToken(token);
        router.push("/rooms");
      }}
    />
  );
}
