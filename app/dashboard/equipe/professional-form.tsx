"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { createProfessional, type ActionResult } from "@/lib/team/actions";
import { professionalSchema, type ProfessionalInput } from "@/lib/validation/schemas";

const INITIAL: ActionResult = { ok: true, data: undefined };

export function ProfessionalForm({ limit }: { limit: number }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ActionResult>(INITIAL);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfessionalInput>({
    resolver: zodResolver(professionalSchema),
    defaultValues: { name: "" },
  });

  function onSubmit(values: ProfessionalInput) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", values.name);
      const result = await createProfessional(INITIAL, fd);
      setState(result);
      if (result.ok) {
        setOpen(false);
        reset({ name: "" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Novo profissional</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar profissional</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" placeholder="Ex.: João Silva" autoComplete="off" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <p className="text-sm text-muted-foreground">
            Seu plano permite até {limit} {limit === 1 ? "profissional" : "profissionais"}.
          </p>
          {!state.ok && <p className="text-sm text-destructive">{state.message}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Criar profissional"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
