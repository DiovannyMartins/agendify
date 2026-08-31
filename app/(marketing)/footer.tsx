import Link from "next/link";
import { CalendarClock } from "lucide-react";

const columns = [
  {
    title: "Produto",
    links: [
      { href: "/#recursos", label: "Recursos" },
      { href: "/#como-funciona", label: "Como funciona" },
      { href: "/#planos", label: "Planos" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { href: "/#faq", label: "FAQ" },
      { href: "/#sobre", label: "Sobre" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacidade", label: "Privacidade" },
      { href: "/termos", label: "Termos" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        <div className="space-y-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarClock className="size-4" />
            </span>
            <span>Agendify</span>
          </Link>
          <p className="max-w-xs text-sm text-muted-foreground">
            Sua agenda trabalhando por você, 24 horas por dia.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-medium">{col.title}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Agendify. Todos os direitos reservados.
      </div>
    </footer>
  );
}
