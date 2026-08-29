"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { login, type ActionResult } from "@/lib/auth/actions";

const initial: ActionResult = { ok: true, data: undefined };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initial);
  const error = state.ok ? "" : state.message;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Entrar</CardTitle>
        <CardDescription>Acesse seu painel do Agendify.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
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
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <a href="/recuperar-senha" className="hover:underline">
            Esqueceu a senha?
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
