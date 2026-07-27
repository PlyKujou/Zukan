"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

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
      className="btn btn-ghost"
      style={copied ? { color: "var(--success)", borderColor: "var(--success)" } : undefined}
    >
      {copied ? <Check size={14} strokeWidth={2.5} /> : <Link2 size={14} strokeWidth={2} />}
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
