"use client";

import { useState } from "react";

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
      style={{
        backgroundColor: copied ? "#22c55e" : "var(--surface)",
        border: "1px solid var(--border)",
        color: copied ? "#fff" : "var(--text-muted)",
      }}
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
