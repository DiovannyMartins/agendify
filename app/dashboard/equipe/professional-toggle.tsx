"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { toggleProfessionalActive, type ActionResult } from "@/lib/team/actions";

export function ProfessionalToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [checked, setChecked] = useState(isActive);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function onChange(next: boolean) {
    const previous = checked;
    setChecked(next);
    setError(null);
    startTransition(async () => {
      const result: ActionResult = await toggleProfessionalActive(id, next);
      if (!result.ok) {
        // Revert the optimistic switch and surface the specific error.
        setChecked(previous);
        setError(result.message);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        aria-label={checked ? "Desativar profissional" : "Ativar profissional"}
      />
    </div>
  );
}
