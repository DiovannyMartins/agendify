import type { ReactNode } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Navbar } from "./navbar";
import { Footer } from "./footer";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function Cta({ className }: { className?: string }) {
  return (
    <Link href="/cadastro" className={cn(buttonVariants({ size: "lg" }), "px-6", className)}>
      Começar grátis
    </Link>
  );
}

export function SecondaryCta({
  className,
  href = "/login",
  label = "Entrar",
}: {
  className?: string;
  href?: string;
  label?: string;
}) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-6", className)}>
      {label}
    </Link>
  );
}
