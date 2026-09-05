"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { setPlan, type ActionResult } from "@/lib/team/actions";
import type { Plan } from "@/lib/team/plan";

const INITIAL: ActionResult = { ok: true, data: undefined };

export function PlanCard({
  plan,
  planLabel,
  limit,
  proLimit,
  selfServeEnabled,
}: {
  plan: Plan;
  planLabel: string;
  limit: number;
  proLimit: number;
  selfServeEnabled: boolean;
}) {
  const [state, setState] = useState<ActionResult>(INITIAL);
  const [pending, startTransition] = useTransition();
  // Mirror the plan locally so the badge and CTA settle immediately after a
  // successful upgrade instead of waiting for a refresh of the server prop.
  const [displayPlan, setDisplayPlan] = useState<Plan>(plan);
  const [displayLabel, setDisplayLabel] = useState(planLabel);

  function onUpgrade() {
    startTransition(async () => {
      const result = await setPlan("pro");
      setState(result);
      if (result.ok) {
        setDisplayPlan("pro");
        setDisplayLabel("Pro");
      }
    });
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="size-5 text-muted-foreground" />
          Plano
          <Badge variant="secondary">{displayLabel}</Badge>
        </CardTitle>
        <CardDescription>
          Seu plano permite até {limit} {limit === 1 ? "profissional" : "profissionais"} ativo
          {limit === 1 ? "" : "s"}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {displayPlan === "pro" ? (
          <p className="text-sm text-muted-foreground">Você já está no plano Pro.</p>
        ) : selfServeEnabled ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Amplie sua equipe para até {proLimit} profissionais ativos.
            </p>
            <Button onClick={onUpgrade} disabled={pending}>
              {pending ? "Assinando..." : "Assinar Pro"}
            </Button>
            {!state.ok && <p className="text-sm text-destructive">{state.message}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Em produção, o upgrade para o Pro é feito manualmente. Fale com o
            suporte para assinar o plano.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
