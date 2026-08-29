"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { upsertBusiness, type ActionResult } from "@/lib/business/actions";

const TIMEZONES = ["America/Sao_Paulo", "America/New_York", "Europe/Lisbon", "Europe/London"];
const INITIAL = { ok: true } as ActionResult;

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-sm text-destructive">{errors[0]}</p>;
}

export function BusinessForm({ initial }: { initial?: Partial<Record<string, unknown>> | null }) {
  const [state, formAction, pending] = useActionState(upsertBusiness, INITIAL);
  const fieldErrors = state.ok ? undefined : state.fieldErrors;
  const slug = typeof initial?.slug === "string" ? initial.slug : "";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Configurações do negócio</CardTitle>
        <CardDescription>
          {slug ? "Atualize os dados do seu negócio." : "Vamos configurar seu perfil público."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do negócio</Label>
              <Input id="name" name="name" defaultValue={String(initial?.name ?? "")} required />
              <FieldError errors={fieldErrors?.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Endereço público (slug)</Label>
              <Input
                id="slug"
                name="slug"
                defaultValue={slug}
                placeholder="minha-barbearia"
                required
              />
              <p className="text-xs text-muted-foreground">
                Apenas minúsculas, números e hífen. Seu link: agendify.app/{slug || "seu-slug"}
              </p>
              <FieldError errors={fieldErrors?.slug} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <Input id="phone" name="phone" defaultValue={String(initial?.phone ?? "")} required />
              <FieldError errors={fieldErrors?.phone} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Fuso horário</Label>
              <Select name="timezone" defaultValue={String(initial?.timezone ?? "America/Sao_Paulo")}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o fuso" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={fieldErrors?.timezone} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={String(initial?.description ?? "")}
              maxLength={500}
              rows={3}
            />
            <FieldError errors={fieldErrors?.description} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="slotIntervalMinutes">Intervalo (min)</Label>
              <Select name="slotIntervalMinutes" defaultValue={String(initial?.slotIntervalMinutes ?? 30)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                </SelectContent>
              </Select>
              <FieldError errors={fieldErrors?.slotIntervalMinutes} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minNoticeMinutes">Antecedência (min)</Label>
              <Input
                id="minNoticeMinutes"
                name="minNoticeMinutes"
                type="number"
                defaultValue={String(initial?.minNoticeMinutes ?? 120)}
                min={0}
                max={10080}
                required
              />
              <FieldError errors={fieldErrors?.minNoticeMinutes} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookingWindowDays">Janela futura (dias)</Label>
              <Input
                id="bookingWindowDays"
                name="bookingWindowDays"
                type="number"
                defaultValue={String(initial?.bookingWindowDays ?? 60)}
                min={1}
                max={180}
                required
              />
              <FieldError errors={fieldErrors?.bookingWindowDays} />
            </div>
          </div>

          {!state.ok && <p className="text-sm text-destructive">{state.message}</p>}

          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : slug ? "Salvar alterações" : "Criar meu negócio"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
