import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/business/queries";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, CalendarClock } from "lucide-react";
import { AgendaList } from "./agenda-list";

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

      <AgendaList bookings={list} timezone={business.timezone} />
    </div>
  );
}
