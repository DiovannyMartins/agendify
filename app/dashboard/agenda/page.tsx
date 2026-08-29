import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/business/queries";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CalendarClock, Users } from "lucide-react";
import { StatusAction } from "./status-action";

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  confirmed: { label: "Confirmada", variant: "default" },
  completed: { label: "Concluída", variant: "secondary" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  no_show: { label: "No-show", variant: "outline" },
};

function formatBookingTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default async function AgendaPage() {
  const business = await getCurrentBusiness();
  if (!business) redirect("/dashboard/setup");

  const supabase = await createClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("business_id", business.id)
    .order("start_at", { ascending: true });

  const list = bookings ?? [];
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayBookings = list.filter(
    (b) => b.status !== "cancelled" && new Date(b.start_at) >= todayStart && new Date(b.start_at) <= new Date(todayStart.getTime() + 86400000),
  );
  const upcoming = list.filter((b) => b.status === "confirmed" && new Date(b.start_at) >= now);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Reservas</h1>
      <p className="mt-1 text-muted-foreground">Acompanhe e gerencie seus atendimentos.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-primary" /> Reservas de hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{todayBookings.length}</p>
            <p className="text-sm text-muted-foreground">
              {todayBookings.length === 0 ? "Nenhuma para hoje" : "atendimento(s) agendado(s)"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-primary" /> Próximas reservas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{upcoming.length}</p>
            <p className="text-sm text-muted-foreground">confirmadas à frente</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Users className="size-5 text-primary" /> Todas as reservas
        </h2>

        {list.length === 0 ? (
          <Card>
            <CardHeader className="items-center text-center">
              <CalendarDays className="size-8 text-muted-foreground" />
              <CardTitle className="mt-3">Nenhuma reserva ainda</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground">
              Compartilhe sua página pública para receber reservas.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {list.map((booking) => {
              const status = STATUS_LABEL[booking.status] ?? STATUS_LABEL.confirmed;
              return (
                <div
                  key={booking.id}
                  className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{booking.service_name_snapshot}</p>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatBookingTime(booking.start_at)} · {booking.duration_minutes_snapshot} min
                    </p>
                    <p className="mt-1 text-sm">
                      {booking.customer_name_snapshot} · {booking.customer_phone_snapshot}
                    </p>
                    {booking.cancel_reason && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Motivo: {booking.cancel_reason}
                      </p>
                    )}
                  </div>
                  <StatusAction id={booking.id} status={booking.status} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
