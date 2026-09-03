import { redirect } from "next/navigation";
import { BusinessForm } from "./business-form";
import { AvailabilityForm, AvailabilityRow } from "./availability-form";
import { PlanCard } from "./plan-card";
import { getCurrentBusiness } from "@/lib/business/queries";
import {
  getProfessionalLimit,
  isSelfServeUpgradeEnabled,
  PLAN_LABEL,
} from "@/lib/team/plan";
import { createClient } from "@/lib/supabase/server";

export default async function ConfiguracoesPage() {
  const business = await getCurrentBusiness();
  if (!business) redirect("/dashboard/setup");

  const supabase = await createClient();
  const { data: availability } = await supabase
    .from("availability")
    .select("*")
    .eq("business_id", business.id)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PlanCard
        plan={business.plan}
        planLabel={PLAN_LABEL[business.plan]}
        limit={getProfessionalLimit(business.plan)}
        proLimit={getProfessionalLimit("pro")}
        selfServeEnabled={isSelfServeUpgradeEnabled()}
      />

      <BusinessForm initial={business} />

      <section>
        <h2 className="text-xl font-semibold">Disponibilidade recorrente</h2>
        <p className="mt-1 text-muted-foreground">
          Defina as faixas de atendimento por dia da semana, em hora local do negócio.
        </p>
        <div className="mt-4 rounded-xl border border-border p-4">
          <AvailabilityForm />
        </div>
        {availability && availability.length > 0 && (
          <div className="mt-4 space-y-2">
            {availability.map((row) => (
              <AvailabilityRow
                key={row.id}
                id={row.id}
                weekday={row.weekday}
                startTime={row.start_time}
                endTime={row.end_time}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
