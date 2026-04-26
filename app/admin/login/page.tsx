"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "./actions";

const initialState: { error?: string } = {};

export default function LoginPage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(signIn, initialState);

  // Redirect only after the action has fully resolved (cookies are written)
  useEffect(() => {
    if (state && !state.error && state !== initialState) {
      router.push("/admin");
    }
  }, [state, router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          padding: "40px 32px",
          backgroundColor: "#111113",
          border: "1px solid #27272a",
          borderRadius: "8px",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            letterSpacing: "3px",
            color: "#f4f4f5",
            marginBottom: "4px",
          }}
        >
          BENCHMARK
        </h1>
        <p
          style={{
            fontSize: "10px",
            letterSpacing: "1.5px",
            color: "#52525b",
            marginBottom: "32px",
          }}
        >
          ADMIN
        </p>

        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", letterSpacing: "1px", color: "#71717a" }}>
              EMAIL
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              style={{
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "4px",
                padding: "10px 12px",
                color: "#f4f4f5",
                fontSize: "14px",
                fontFamily: "monospace",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", letterSpacing: "1px", color: "#71717a" }}>
              PASSWORD
            </label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              style={{
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "4px",
                padding: "10px 12px",
                color: "#f4f4f5",
                fontSize: "14px",
                fontFamily: "monospace",
                outline: "none",
              }}
            />
          </div>

          {state?.error && (
            <p style={{ fontSize: "12px", color: "#f87171", margin: 0 }}>
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            style={{
              marginTop: "8px",
              backgroundColor: isPending ? "#27272a" : "#f4f4f5",
              color: isPending ? "#71717a" : "#09090b",
              border: "none",
              borderRadius: "4px",
              padding: "12px",
              fontSize: "12px",
              fontFamily: "monospace",
              fontWeight: "bold",
              letterSpacing: "1.5px",
              cursor: isPending ? "wait" : "pointer",
            }}
          >
            {isPending ? "SIGNING IN…" : "SIGN IN"}
          </button>
        </form>
      </div>
    </div>
  );
}
