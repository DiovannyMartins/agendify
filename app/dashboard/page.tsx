import { CalendarClock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    (user?.user_metadata?.displayName as string | undefined) ?? user?.email ?? "profissional";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <CalendarClock className="size-5" />
          <span>Agendify</span>
        </div>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut className="size-4" />
            Sair
          </Button>
        </form>
      </header>
      <main className="mt-10">
        <h1 className="text-2xl font-semibold">Olá, {displayName}</h1>
        <p className="mt-2 text-muted-foreground">
          Em breve você poderá configurar seu negócio, serviços e agenda.
        </p>
      </main>
    </div>
  );
}
