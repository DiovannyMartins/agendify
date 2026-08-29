import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#recursos", label: "Recursos" },
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#planos", label: "Preços" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <CalendarClock className="size-5" />
          <span>Agendify</span>
        </Link>

        <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
            Entrar
          </Link>
          <Link href="/cadastro" className={buttonVariants({ size: "sm" })}>
            Começar grátis
          </Link>
        </div>
      </nav>
    </header>
  );
}
