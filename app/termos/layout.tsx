import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function TermosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 font-semibold">
        <CalendarClock className="size-5" />
        <span>Agendify</span>
      </Link>
      {children}
      <p className="mt-12 border-t border-border pt-6 text-sm">
        <Link href="/" className={cn(buttonVariants({ variant: "link" }), "px-0")}>
          ← Voltar ao início
        </Link>
      </p>
    </div>
  );
}
