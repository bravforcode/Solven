"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/** Global error boundary — production-grade crash containment with a
 *  friendly Thai fallback instead of a blank screen. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: unknown): State {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : String(err),
    };
  }

  componentDidCatch(err: unknown) {
    // keep the error in the console for diagnosis; never leak to the UI
    console.error("[Solven] render error:", err);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f6f8fa",
          fontFamily: "var(--font), sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e6e8eb",
            borderRadius: 12,
            boxShadow: "0 16px 40px rgba(10,37,64,.12)",
            padding: "32px 36px",
            maxWidth: 440,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              margin: "0 auto 14px",
              borderRadius: "50%",
              background: "#fdecec",
              display: "grid",
              placeItems: "center",
              fontSize: 20,
            }}
            aria-hidden="true"
          >
            ⚠️
          </div>
          <h1 style={{ margin: 0, fontSize: 18, color: "#0a2540" }}>
            เกิดข้อผิดพลาดชั่วคราว
          </h1>
          <p style={{ margin: "8px 0 18px", fontSize: 13.5, color: "#697386", lineHeight: 1.6 }}>
            หน้านี้ทำงานผิดพลาดโดยไม่คาดคิด ข้อมูลงานของคุณยังปลอดภัย
            ลองโหลดหน้านี้อีกครั้ง
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: "#635bff",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "9px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            โหลดใหม่
          </button>
        </div>
      </div>
    );
  }
}
