"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updatePassword, type ActionResult } from "@/lib/auth/actions";

const initial: ActionResult = { ok: true, data: undefined };

export function UpdatePasswordForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updatePassword, initial);
  const done = state.ok && !(state as { message?: string }).message;

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => router.push("/dashboard"), 1500);
      return () => clearTimeout(t);
    }
  }, [done, router]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Redefinir senha</CardTitle>
        <CardDescription>Escolha uma nova senha para sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        {done ? (
          <div className="space-y-3 text-center text-sm">
            <p className="font-medium">Senha atualizada!</p>
            <p className="text-muted-foreground">Redirecionando para o painel...</p>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Nova senha
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            {!state.ok && <p className="text-sm text-destructive">{state.message}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
