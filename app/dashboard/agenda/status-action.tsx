"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateBookingStatus } from "@/lib/bookings/actions";

const INITIAL: { ok: boolean; message?: string } = { ok: true };
export function StatusAction({ id, status }: { id: string; status: string }) {
  const canComplete = status === "confirmed";
  const canShow = status === "confirmed";

  return (
    <div className="flex items-center gap-2">
      {canComplete && <CompleteForm id={id} />}
      {canShow && <NoShowForm id={id} />}
      {status === "confirmed" && <CancelDialog id={id} />}
    </div>
  );
}

function CompleteForm({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(updateBookingStatus, INITIAL);
  void state;

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value="completed" />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        Concluir
      </Button>
    </form>
  );
}

function NoShowForm({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(updateBookingStatus, INITIAL);
  void state;

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value="no_show" />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        No-show
      </Button>
    </form>
  );
}

function CancelDialog({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(updateBookingStatus, INITIAL);

  return (
    <Dialog>
      <DialogTrigger
        render={<Button size="sm" variant="outline" className="text-destructive" />}
      >
        Cancelar
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancelar reserva</DialogTitle>
          <DialogDescription>
            A reserva será cancelada e o horário voltará a ficar disponível.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="cancelled" />
          <div className="space-y-2">
            <label htmlFor={`reason-${id}`} className="text-sm font-medium">
              Motivo (opcional)
            </label>
            <Input id={`reason-${id}`} name="cancelReason" maxLength={250} />
          </div>
          {state.ok === false && <p className="text-sm text-destructive">{state.message}</p>}
          <Button type="submit" variant="destructive" disabled={pending} className="w-full">
            {pending ? "Cancelando..." : "Confirmar cancelamento"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
