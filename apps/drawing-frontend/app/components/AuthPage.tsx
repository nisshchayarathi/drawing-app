"use client";

import { useState } from "react";

type AuthMode = "Signin" | "Signup";

type AuthValues = {
  email: string;
  password: string;
  name?: string;
};

export function AuthPage({
  type,
  onSubmit,
}: {
  type: AuthMode;
  onSubmit: (values: AuthValues) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        email,
        password,
        name: type === "Signup" ? name : undefined,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Request failed";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-screen h-screen flex justify-center items-center">
      <div className="flex-col border-4 p-10">
        <div className=" text-center text-xl ">{type}</div>

        {type === "Signup" ? (
          <div className="p-2  m-2 bg-white rounded ">
            <input
              className="text-center outline-2 pl-10 pr-10"
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        ) : null}

        <div className="p-2  m-2 bg-white rounded ">
          <input
            className="text-center outline-2 pl-10 pr-10"
            type="text"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="p-2 m-2 bg-white rounded ">
          <input
            className="text-center outline-2 pl-10 pr-10"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error ? (
          <div className="text-red-600 text-sm text-center p-1">{error}</div>
        ) : null}

        <div className="p-1 m-1 bg-white flex items-center justify-center rounded">
          <button
            className={"outline-2 pl-2 pr-2"}
            onClick={submit}
            disabled={isSubmitting}
          >
            {type}
          </button>
        </div>
      </div>
    </div>
  );
}
