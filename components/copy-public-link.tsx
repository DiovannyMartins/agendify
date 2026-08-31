"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Link2 } from "lucide-react";

// Copies the business's public booking link to the clipboard (with a Web Share
// fallback on browsers that support it, e.g. mobile). Shows transient feedback
// so the owner knows the link was shared — the earlier "Compartilhar link" entry
// just navigated to settings without ever sharing anything.
export function CopyPublicLink({ slug, children }: { slug: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/${slug}`;
    if (navigator.share && typeof navigator.share === "function") {
      try {
        await navigator.share({ url, title: "Agendamento" });
        return;
      } catch {
        // user cancelled or share unsupported: fall through to clipboard
      }
    }
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
