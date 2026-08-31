"use client";

import { memo, useEffect, useRef, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
    };
  }
}

// Cloudflare Turnstile anti-bot widget (§17). Renders the challenge only when a
// public site key is configured (NEXT_PUBLIC_TURNSTILE_SITE_KEY); otherwise it
// renders nothing and the server-side gate stays fail-open. The token and a
// "challenge resolved" boolean are surfaced to the parent form: the form can
// disable its submit button until a token exists (fail-closed UX).
//
// Memoized so re-renders of the parent form (e.g. when the token arrives) do
// NOT recreate the container div, which would destroy the injected Turnstile
// iframe and loop forever.
export const TurnstileWidget = memo(function TurnstileWidget({
  onToken,
  onState,
}: {
  onToken: (token: string) => void;
  onState?: (ready: boolean) => void;
}) {
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [resolved, setResolved] = useState(false);

  // The script loads the Turnstile API, but window.turnstile is defined
  // asynchronously after onReady fires. Poll briefly until it is available, then
  // render the widget into the container exactly once.
  useEffect(() => {
    if (!sitekey) {
      // Fail-open: without a sitekey there is no widget to solve, so the form is
      // never blocked waiting on it.
      if (onState) onState(true);
      return;
    }
    let cancelled = false;
    let polls = 0;

    const render = () => {
      const el = containerRef.current;
      if (!el || !sitekey || !window.turnstile?.render) return false;
      try {
        window.turnstile.render(el, {
          sitekey,
          theme: "light",
          callback: (token) => {
            setError(false);
            setResolved(true);
            onToken(token);
          },
          "expired-callback": () => {
            setResolved(false);
            onToken("");
          },
          "error-callback": () => {
            setError(true);
            setResolved(false);
            onToken("");
          },
        });
      } catch {
        return false;
      }
      return true;
    };

    // Try on a timer (in case the API is late), and also on the first paint.
    const attempt = () => {
      if (cancelled) return;
      if (render()) {
        if (onState) onState(true);
        return;
      }
      if (polls++ < 50) window.setTimeout(attempt, 200);
      else {
        setError(true);
        if (onState) onState(false);
      }
    };
    attempt();

    return () => {
      cancelled = true;
    };
  }, [sitekey, onToken, onState]);

  if (!sitekey) {
    return null;
  }

  return (
    <>
      <Script
        id="turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onError={() => setError(true)}
      />
      <div ref={containerRef} className="flex justify-center py-2" data-testid="turnstile-widget" />
      {error && <p className="text-sm text-destructive">Não foi possível carregar a verificação. Tente novamente.</p>}
      <span className="sr-only" data-testid="turnstile-solved" data-solved={resolved ? "true" : "false"}></span>
    </>
  );
});
