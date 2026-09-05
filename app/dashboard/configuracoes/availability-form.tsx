"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setAvailability, deleteAvailability, type ActionResult } from "@/lib/availability/actions";
import { ProfessionalSelect } from "@/components/professional-select";

export const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: "1 - Domingo" },
  { value: 2, label: "2 - Segunda" },
  { value: 3, label: "3 - Terça" },
  { value: 4, label: "4 - Quarta" },
  { value: 5, label: "5 - Quinta" },
  { value: 6, label: "6 - Sexta" },
  { value: 7, label: "7 - Sábado" },
];

const INITIAL = { ok: true } as ActionResult;

const WEEKDAY_ITEMS = Object.fromEntries(WEEKDAYS.map((d) => [String(d.value), d.label]));

export function AvailabilityForm({ professionals }: { professionals: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(setAvailability, INITIAL);
  const defaultValue = professionals[0]?.id ?? "";

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="weekday">Dia da semana</Label>
          <Select name="weekday" defaultValue="2" items={WEEKDAY_ITEMS}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAYS.map((d) => (
                <SelectItem key={d.value} value={String(d.value)}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTime">Início</Label>
          <Input id="startTime" name="startTime" type="time" defaultValue="08:00" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">Fim</Label>
          <Input id="endTime" name="endTime" type="time" defaultValue="18:00" required />
        </div>
      </div>
      <div className="space-y-2">
        <ProfessionalSelect professionals={professionals} defaultValue={defaultValue} />
      </div>
      {!state.ok && <p className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Adicionando..." : "Adicionar faixa"}
      </Button>
    </form>
  );
}

export function AvailabilityRow({
  id,
  weekday,
  startTime,
  endTime,
  professionalName,
}: {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  professionalName?: string;
}) {
  const label = WEEKDAYS.find((d) => d.value === weekday)?.label ?? String(weekday);
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2 text-sm">
      <span>
        {label}: {startTime} – {endTime}
        {professionalName && (
          <span className="text-muted-foreground"> · {professionalName}</span>
        )}
      </span>
      <button
        type="button"
        onClick={() => deleteAvailability(id)}
        className="text-muted-foreground hover:text-destructive"
      >
        Remover
      </button>
    </div>
  );
}
