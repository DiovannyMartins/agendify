import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CheckCircle2, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

async function ConfirmationContent({ code, slug }: { code: string; slug: string }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_booking_by_public_code", { p_code: code });

  const booking = data?.[0];
  if (!booking) notFound();

  const tz = booking.business_timezone || "UTC";
  const dateStr = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeZone: tz,
  }).format(new Date(booking.start_at));
  const timeStr = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }).format(new Date(booking.start_at));

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center px-4 py-12">
      <div className="w-full rounded-2xl border border-border bg-background p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-green-100 text-green-700">
          <CheckCircle2 className="size-8" />
        </div>
        <h1 className="text-2xl font-semibold">Reserva confirmada!</h1>
        <p className="mt-2 text-muted-foreground">
          Você recebeu um horário garantido. Mostre esta confirmação na sua visita.
        </p>

        <div className="mt-6 space-y-3 rounded-xl bg-muted/40 p-5 text-left">
          <div className="flex items-center gap-2 font-medium">
            <CalendarClock className="size-5 text-primary" />
            {booking.service_name}
          </div>
          <p className="text-sm text-muted-foreground">
            {dateStr} · às {timeStr}
          </p>
          <div className="border-t border-border pt-3">
            <p className="text-sm font-medium">{booking.business_name}</p>
            <p className="text-sm text-muted-foreground">
              {booking.business_slug} · {booking.business_phone}
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Guarde o código <Badge variant="secondary">{code}</Badge>
        </p>
        <Link href={`/${slug}`} className="mt-6 inline-block text-sm font-medium hover:underline">
          ← Fazer outra reserva
        </Link>
      </div>
    </div>
  );
}

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { slug } = await params;
  const { code } = await searchParams;
  if (!code) notFound();

  return (
    <Suspense fallback={<div className="py-24 text-center text-muted-foreground">Carregando...</div>}>
      <ConfirmationContent code={code} slug={slug} />
    </Suspense>
  );
}
