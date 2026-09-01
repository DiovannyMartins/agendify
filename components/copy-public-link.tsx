"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Link2 } from "lucide-react";

// Copies the business's public booking link to the clipboard. The earlier
// version tried the Web Share API first, but on desktop the native share sheet
// can fail with "could not show all share methods", so we copy instead — the
// reliable behaviour for a "Compartilhar link" action.
export function CopyPublicLink({ slug, children }: { slug: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
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
    <Button type="button" variant="outline" onClick={copy}>
      <Link2 className="size-4" />
      {copied ? "Link copiado!" : children}
    </Button>
  );
}
