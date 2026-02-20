"use client";

import { useCallback, useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={onCopy}
      className={`mt-2 inline-flex min-h-[44px] items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
        copied
          ? "bg-emerald-600 text-white"
          : "border border-[var(--fc-border)] bg-white text-[var(--fc-text)] hover:bg-slate-50"
      }`}
    >
      {copied ? "복사 완료" : "링크 복사"}
    </button>
  );
}
