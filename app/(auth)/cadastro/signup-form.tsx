"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signup, type ActionResult } from "@/lib/auth/actions";

const initial: ActionResult = { ok: true, data: undefined };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initial);
  const error = state.ok ? "" : state.message;
  const done = state.ok && !(state as { message?: string }).message;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Criar conta</CardTitle>
        <CardDescription>Comece a receber reservas grátis.</CardDescription>
      </CardHeader>
      <CardContent>
        {done ? (
          <div className="space-y-3 text-center text-sm">
            <p className="font-medium">Conta criada com sucesso!</p>
            <p className="text-muted-foreground">
              Verifique seu e-mail para confirmar o cadastro e depois faça login.
            </p>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium">
                Como quer ser chamado?
              </label>
              <Input id="displayName" name="displayName" autoComplete="name" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                E-mail
              </label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Senha
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
            <p className="text-xs text-muted-foreground">
              Ao criar a conta você concorda com nossos Termos e Política de Privacidade.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Criando..." : "Começar grátis"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
