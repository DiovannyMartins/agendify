"use client";

import { useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

// Renders the business's public booking link as a scannable QR code (INC-4).
// The origin is only known at runtime in the browser (dev vs production), so the
// component reads it via useSyncExternalStore: SSR matches with the empty server
// snapshot (renders nothing), then re-renders once the client origin is known —
// no hydration mismatch and no setState-in-effect cascades.
const emptySubscribe = () => () => {};
function getOrigin(): string {
  return window.location.origin;
}
function getServerOrigin(): string {
  return "";
}

export function PublicLinkQR({
  slug,
  size = 160,
  className,
}: {
  slug: string;
  size?: number;
  className?: string;
}) {
  const origin = useSyncExternalStore(emptySubscribe, getOrigin, getServerOrigin);

  if (!origin) return null;

  return (
    <QRCodeSVG
      value={`${origin}/${slug}`}
      size={size}
      level="M"
      marginSize={1}
      title={`Endereço público: ${origin}/${slug}`}
      className={cn("rounded-lg bg-white p-2", className)}
    />
  );
}
