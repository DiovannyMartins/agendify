"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Delay in ms before the reveal animation starts once visible. */
  delay?: number;
  /** Animation variant used when the element enters the viewport. */
  variant?: "up" | "down" | "left" | "right" | "fade" | "zoom";
};

const variants: Record<NonNullable<RevealProps["variant"]>, string> = {
  up: "fade-in duration-700 slide-in-from-bottom-8",
  down: "fade-in duration-700 slide-in-from-top-8",
  left: "fade-in duration-700 slide-in-from-right-12",
  right: "fade-in duration-700 slide-in-from-left-12",
  fade: "fade-in duration-700",
  zoom: "fade-in duration-700 zoom-in-95",
};

export function Reveal({ children, className, delay = 0, variant = "up" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={cn(
        "motion-safe:animate-in motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:translate-y-0",
        visible ? variants[variant] : "opacity-0 translate-y-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
