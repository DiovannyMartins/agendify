import { redirect } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, CalendarDays, Blocks } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentBusiness } from "@/lib/business/queries";

export default async function DashboardHome() {
  const business = await getCurrentBusiness();
  if (!business) redirect("/dashboard/setup");

  const publicUrl = `/s/${business.slug}`;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{business.name}</h1>
          <p className="mt-1 text-muted-foreground">
            Seu link público:{" "}
            <Link href={publicUrl} className="font-medium text-foreground hover:underline">
              agendify.app/{business.slug}
            </Link>
          </p>
        </div>
        <Link href={publicUrl} className={cn(buttonVariants({ variant: "outline" }))}>
          Ver página pública
        </Link>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Serviços
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Cadastre e gerencie seus serviços.</p>
            <Link href="/dashboard/servicos" className="text-sm font-medium hover:underline">
              Gerenciar →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              Reservas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Acompanhe seus próximos atendimentos.</p>
            <Link href="/dashboard/agenda" className="text-sm font-medium hover:underline">
              Ver agenda →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Blocks className="size-4 text-primary" />
              Bloqueios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Pausas, férias e exceções de agenda.</p>
            <Link href="/dashboard/bloqueios" className="text-sm font-medium hover:underline">
              Gerenciar →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
