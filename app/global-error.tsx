"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              maxWidth: "28rem",
              width: "100%",
              background: "white",
              padding: "2rem",
              borderRadius: "1rem",
              border: "1px solid #e2e8f0",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "3rem",
                height: "3rem",
                background: "#fef2f2",
                borderRadius: "9999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
                color: "#dc2626",
                fontSize: "1.5rem",
              }}
            >
              ⚠
            </div>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: "0.5rem",
              }}
            >
              حدث خطأ غير متوقع
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#64748b",
                marginBottom: "1.5rem",
              }}
            >
              نعتذر، تعذر إكمال العملية. يرجى المحاولة مرة أخرى.
            </p>
            <button
              onClick={() => reset()}
              style={{
                padding: "0.625rem 1.25rem",
                background: "#0284c7",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
