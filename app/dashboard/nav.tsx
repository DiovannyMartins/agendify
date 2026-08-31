"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, CalendarDays, Blocks, CalendarPlus, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyPublicLink } from "@/components/copy-public-link";
import { logout } from "@/lib/auth/actions";

const links = [
  { href: "/dashboard", label: "Início", icon: CalendarClock },
  { href: "/dashboard/servicos", label: "Serviços", icon: Sparkles },
  { href: "/dashboard/agenda", label: "Reservas", icon: CalendarDays },
  { href: "/dashboard/bloqueios", label: "Bloqueios", icon: Blocks },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
];

export function DashboardNav({ slug }: { slug: string | null }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <div className="flex flex-wrap items-center gap-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        {slug ? (
          <CopyPublicLink slug={slug}>Compartilhar link</CopyPublicLink>
        ) : (
          <Link
            href="/dashboard/configuracoes"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <CalendarPlus className="size-4" />
            Compartilhar link
          </Link>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sair
          </button>
        </form>
      </div>
    </nav>
  );
}
