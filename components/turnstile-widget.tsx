"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
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
      reset: (widgetId?: string) => void;
    };
  }
}

// Cloudflare Turnstile anti-bot widget (§17). Renders the challenge only when a
// public site key is configured (NEXT_PUBLIC_TURNSTILE_SITE_KEY); otherwise it
// renders nothing and the server-side gate stays fail-open. The token and a
// "challenge resolved" boolean are surfaced to the parent form.
//
// The security boundary stays fail-closed server-side (a bot can never submit
// without a valid token). On the client we make the failure *recoverable*: a
// transient error (Cloudflare down, blocklisted region, scripting glitch) shows
// a "Tentar novamente" button that re-renders the challenge, instead of leaving
// a real customer permanently unable to book.
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
  const widgetIdRef = useRef<string | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!sitekey) {
      // Fail-open: without a sitekey there is no widget to solve, so the form is
      // never blocked waiting on it.
      if (onState) onState(true);
      return;
    }
    // With a sitekey the challenge must be solved before any submit. Start the
    // form disabled so a customer can't submit with an empty token and get a
    // spurious "human verification failed" rejection.
    if (onState) onState(false);
    let cancelled = false;
    let polls = 0;

    const render = () => {
      const el = containerRef.current;
      if (!el || !sitekey || !window.turnstile?.render) return false;
      try {
        const id = window.turnstile.render(el, {
          sitekey,
          theme: "light",
          callback: (token) => {
            widgetIdRef.current = id;
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
        widgetIdRef.current = id;
      } catch {
        return false;
      }
      return true;
    };

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
      // Tear down a previously rendered widget so a retry doesn't stack frames.
      if (widgetIdRef.current && window.turnstile?.reset) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          /* ignore */
        }
      }
    };
  }, [sitekey, onToken, onState, attempt]);

  // Retry: bump the attempt counter to re-run the effect (re-render the widget).
  const retry = useCallback(() => {
    setError(false);
    setResolved(false);
    onToken("");
    if (onState) onState(false);
    setAttempt((a) => a + 1);
  }, [onToken, onState]);

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
      {error && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-destructive">Não foi possível carregar a verificação.</p>
          <button
            type="button"
            onClick={retry}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      )}
      <span className="sr-only" data-testid="turnstile-solved" data-solved={resolved ? "true" : "false"}></span>
    </>
  );
});
