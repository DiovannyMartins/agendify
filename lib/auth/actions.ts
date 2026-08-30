"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string[]> };

const genericError = (message: string): { ok: false; code: string; message: string } => ({
  ok: false,
  code: "UNEXPECTED_ERROR",
  message,
});

export async function signup(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (!email || !password || !displayName) {
    return { ok: false, code: "VALIDATION", message: "Preencha todos os campos.", fieldErrors: {} };
  }
  if (password.length < 8) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "A senha deve ter pelo menos 8 caracteres.",
      fieldErrors: { password: ["A senha deve ter pelo menos 8 caracteres."] },
    };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { displayName } },
  });

  if (error) {
    return {
      ok: false,
      code: "SIGNUP_FAILED",
      message: "Não foi possível criar a conta. Verifique os dados e tente novamente.",
    };
  }

  return { ok: true, data: undefined };
}

export async function login(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) {
    return { ok: false, code: "VALIDATION", message: "Preencha e-mail e senha.", fieldErrors: {} };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: "E-mail ou senha incorretos.",
    };
  }

  // Only allow same-origin, non-protocol-relative paths to avoid open redirect.
  const safeNext = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/dashboard";
  redirect(safeNext);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const origin = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (!email) {
    return { ok: false, code: "VALIDATION", message: "Informe seu e-mail.", fieldErrors: {} };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/redefinir-senha`,
  });

  if (error) {
    return genericError("Não foi possível enviar o e-mail de recuperação.");
  }

  return { ok: true, data: undefined };
}

export async function updatePassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "A senha deve ter pelo menos 8 caracteres.",
      fieldErrors: { password: ["A senha deve ter pelo menos 8 caracteres."] },
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return genericError("Não foi possível redefinir a senha.");
  }

  return { ok: true, data: undefined };
}
