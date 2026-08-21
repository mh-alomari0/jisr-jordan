"use client";

import { useRef } from "react";

export default function OtpInput({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] || "");

  const update = (index: number, raw: string) => {
    const incoming = raw.replace(/\D/g, "");
    const next = [...digits];

    if (incoming.length > 1) {
      incoming
        .slice(0, 6)
        .split("")
        .forEach((digit, offset) => {
          if (index + offset < 6) next[index + offset] = digit;
        });
    } else {
      next[index] = incoming;
    }

    const result = next.join("").slice(0, 6);
    onChange(result);

    if (incoming) {
      refs.current[Math.min(5, index + Math.max(1, incoming.length))]?.focus();
    }
  };

  return (
    <div
      dir="ltr"
      className="grid grid-cols-6 gap-2 sm:gap-3"
      onPaste={(event) => {
        const pasted = event.clipboardData
          .getData("text")
          .replace(/\D/g, "")
          .slice(0, 6);
        if (pasted) {
          event.preventDefault();
          onChange(pasted);
          refs.current[Math.min(5, pasted.length - 1)]?.focus();
        }
      }}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          aria-label={`الرقم ${index + 1} من رمز التحقق`}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(event) => update(index, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digit && index > 0) {
              refs.current[index - 1]?.focus();
            }
          }}
          className="form-field aspect-square !h-auto !p-0 text-center text-xl font-black shadow-sm transition-all focus:scale-105 focus:border-brand"
        />
      ))}
    </div>
  );
}