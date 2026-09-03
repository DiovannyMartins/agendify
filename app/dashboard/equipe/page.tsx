import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/business/queries";
import { getProfessionalLimit } from "@/lib/team/plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { ProfessionalForm } from "./professional-form";
import { ProfessionalToggle } from "./professional-toggle";

const PLAN_LABEL = { free: "Free", pro: "Pro" } as const;

export default async function EquipePage() {
  const business = await getCurrentBusiness();
  const supabase = await createClient();
  const { data: professionals } = await supabase
    .from("professionals")
    .select("*")
    .eq("business_id", business?.id ?? "")
    .order("created_at", { ascending: true });

  const list = professionals ?? [];
  const activeCount = list.filter((p) => p.is_active).length;
  const plan = business?.plan ?? "free";
  const limit = getProfessionalLimit(plan);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">Equipe</h1>
            <Badge variant="secondary">
              {PLAN_LABEL[plan]} · {activeCount}/{limit} profissionais
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            Gerencie quem atende no seu negócio. Quem já tem histórico nunca é excluído, apenas desativado.
          </p>
        </div>
        <ProfessionalForm limit={limit} />
      </div>

      {list.length === 0 ? (
        <Card className="mt-8">
          <CardHeader className="items-center text-center">
            <Users className="size-8 text-muted-foreground" />
            <CardTitle className="mt-3">Nenhum profissional ainda</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            Cadastre o primeiro profissional para começar a atender.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 space-y-3">
          {list.map((professional) => (
            <div
              key={professional.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{professional.name}</p>
                  {!professional.is_active && <Badge variant="secondary">Inativo</Badge>}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {professional.is_active ? "Ativo · disponível para reservas" : "Desativado · não aceita novas reservas"}
                </p>
              </div>
              <ProfessionalToggle id={professional.id} isActive={professional.is_active} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
