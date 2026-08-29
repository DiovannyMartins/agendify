"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createService,
  updateService,
  type ActionResult,
} from "@/lib/services/actions";

const INITIAL = { ok: true } as ActionResult;

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-sm text-destructive">{errors[0]}</p>;
}

export function ServiceForm({ service }: { service?: ServiceRow }) {
  const action = service ? updateService : createService;
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const fieldErrors = state.ok ? undefined : state.fieldErrors;
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant={service ? "outline" : "default"} size={service ? "sm" : "default"} />}
      >
        {service ? "Editar" : "Novo serviço"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service ? "Editar serviço" : "Criar serviço"}</DialogTitle>
        </DialogHeader>
        <form
          action={formAction}
          className="space-y-4"
          onSubmit={(e) => {
            if (state?.ok === false) e.preventDefault();
          }}
        >
          {service && <input type="hidden" name="id" value={service.id} />}
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={service?.name} required />
            <FieldError errors={fieldErrors?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={service?.description ?? ""}
              maxLength={500}
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Duração (min)</Label>
              <Input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                defaultValue={service?.durationMinutes}
                min={5}
                max={480}
                required
              />
              <FieldError errors={fieldErrors?.durationMinutes} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={service ? (service.priceCents / 100).toFixed(2) : ""}
                required
              />
              <FieldError errors={fieldErrors?.priceCents} />
            </div>
          </div>
          {!state.ok && <p className="text-sm text-destructive">{state.message}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : service ? "Salvar" : "Criar serviço"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
