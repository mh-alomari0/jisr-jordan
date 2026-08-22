"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0 }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            fontFamily: "Arial, sans-serif",
            background: "#f7f5ef",
            color: "#183f42",
          }}
        >
          <section
            style={{
              width: "100%",
              maxWidth: "560px",
              borderTop: "1px solid #d8dedb",
              paddingTop: "32px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 700,
                color: "#a63f3f",
              }}
            >
              صار معنا خلل
            </p>
            <h1
              style={{
                margin: "8px 0 0",
                fontSize: "32px",
                lineHeight: 1.25,
              }}
            >
              جسر ما قدر يكمل هالمرة
            </h1>
            <p
              style={{
                margin: "12px 0 0",
                fontSize: "14px",
                lineHeight: 1.9,
                color: "#607174",
              }}
            >
              جرّب إعادة المحاولة. إذا استمر الخطأ، افتح جسر من جديد بعد شوي.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: "24px",
                minHeight: "44px",
                padding: "0 20px",
                border: 0,
                borderRadius: "12px",
                background: "#087f79",
                color: "white",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              حاول مرة ثانية
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
