"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requestPasswordReset, type ActionResult } from "@/lib/auth/actions";

const initial: ActionResult = { ok: true, data: undefined };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initial);
  const done = state.ok && !(state as { message?: string }).message;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Recuperar senha</CardTitle>
        <CardDescription>Enviaremos um link seguro para redefinir sua senha.</CardDescription>
      </CardHeader>
      <CardContent>
        {done ? (
          <div className="space-y-3 text-center text-sm">
            <p className="font-medium">E-mail enviado!</p>
            <p className="text-muted-foreground">
              Se existir uma conta com esse e-mail, você receberá o link de recuperação.
            </p>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                E-mail
              </label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            {!state.ok && <p className="text-sm text-destructive">{state.message}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Enviando..." : "Enviar link"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
