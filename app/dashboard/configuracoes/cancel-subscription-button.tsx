"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelSubscription } from "@/lib/billing/actions";

// "Cancelar assinatura" CTA for the "Plano" section (US16). Calls the
// `cancelSubscription` server action, which cancels the Mercado Pago preapproval
// (stopping charges) and records the `cancelled` status with a grace period; on
// success the server component is refreshed to reflect the new status.
export function CancelSubscriptionButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await cancelSubscription();
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={onClick} disabled={pending}>
        {pending ? "Cancelando..." : "Cancelar assinatura"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
