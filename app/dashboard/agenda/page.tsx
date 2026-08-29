import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgendaPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold">Reservas</h1>
      <p className="mt-1 text-muted-foreground">Em breve: lista e gestão de reservas.</p>
      <Card className="mt-8">
        <CardHeader className="items-center text-center">
          <CalendarDays className="size-8 text-muted-foreground" />
          <CardTitle className="mt-3">Nenhuma reserva ainda</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          Suas próximas reservas aparecerão aqui.
        </CardContent>
      </Card>
    </div>
  );
}
