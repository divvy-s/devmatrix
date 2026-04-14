"use client";

import { usePrivy } from "@privy-io/react-auth";

function getUserLabel(userId: string | undefined): string {
  if (!userId) return "Privy";
  if (userId.length <= 12) return userId;
  return `${userId.slice(0, 6)}...${userId.slice(-4)}`;
}

export default function PrivyLoginButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  return (
    <button
      onClick={() => {
        if (!ready) return;
        if (authenticated) {
          void logout();
          return;
        }
        void login();
      }}
      disabled={!ready}
      style={{
        borderRadius: 10,
        border: "1px solid rgba(217,119,6,0.35)",
        background: authenticated ? "rgba(22,101,52,0.22)" : "rgba(13,10,5,0.55)",
        color: authenticated ? "#86EFAC" : "#F59E0B",
        fontFamily: "'Inter', sans-serif",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "8px 10px",
        cursor: ready ? "pointer" : "not-allowed",
        opacity: ready ? 1 : 0.6,
      }}
    >
      {!ready
        ? "Privy..."
        : authenticated
          ? `Privy ${getUserLabel(user?.id)}`
          : "Privy Login"}
    </button>
  );
}
