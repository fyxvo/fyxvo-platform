"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          background: "#0a0a0f",
          color: "#f1f5f9",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: "16px",
          textAlign: "center",
          padding: "16px",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Critical error</h1>
        <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
          A critical error occurred. Please reload the page.
        </p>
        <button
          onClick={reset}
          style={{
            background: "#f97316",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            padding: "10px 20px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
