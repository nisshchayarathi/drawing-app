"use client";
import axios from "axios";
import { AuthPage } from "../components/AuthPage";
import { useRouter } from "next/navigation";
import { BACKEND_URL } from "../config";

export default function Signup() {
  const router = useRouter();

  return (
    <AuthPage
      type={"Signup"}
      onSubmit={async ({ email, password, name }) => {
        if (!name?.trim()) throw new Error("Name is required");

        await axios.post(`${BACKEND_URL}/signup`, {
          username: email,
          password,
          name,
        });

        router.push("/signin");
      }}
    />
  );
}
