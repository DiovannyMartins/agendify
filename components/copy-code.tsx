"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { formatPublicCode } from "@/lib/bookings/public-code";

// Renders a reservation's public code (XXXX-XXXX) with a one-click copy button,
// so the customer can copy it without typing the characters. The copied value
// keeps the hyphen; the consult/cancel validation strips it.
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const display = formatPublicCode(code);

  async function copy() {
    try {
      await navigator.clipboard.writeText(display);
    } catch {
      const el = document.createElement("textarea");
      el.value = display;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5">
      <span className="font-mono text-sm font-semibold tracking-wide">{display}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={copy}
        aria-label="Copiar código"
        title="Copiar código"
      >
        {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
      </Button>
    </span>
  );
}
