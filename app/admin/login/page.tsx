import { signIn } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
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

        <form action={signIn} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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

          <LoginError searchParams={searchParams} />

          <button
            type="submit"
            style={{
              marginTop: "8px",
              backgroundColor: "#f4f4f5",
              color: "#09090b",
              border: "none",
              borderRadius: "4px",
              padding: "12px",
              fontSize: "12px",
              fontFamily: "monospace",
              fontWeight: "bold",
              letterSpacing: "1.5px",
              cursor: "pointer",
            }}
          >
            SIGN IN
          </button>
        </form>
      </div>
    </div>
  );
}

async function LoginError({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  if (!params.error) return null;

  return (
    <p style={{ fontSize: "12px", color: "#f87171", margin: 0 }}>
      Invalid email or password.
    </p>
  );
}
