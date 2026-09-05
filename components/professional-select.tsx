"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function ProfessionalSelect({
  professionals,
  defaultValue,
}: {
  professionals: { id: string; name: string }[];
  defaultValue: string;
}) {
  const items = Object.fromEntries(professionals.map((p) => [p.id, p.name]));
  return (
    <div className="space-y-2">
      <Label htmlFor="professionalId">Profissional</Label>
      <Select name="professionalId" defaultValue={defaultValue} items={items}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {professionals.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
