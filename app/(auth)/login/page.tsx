import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 font-semibold">
        <CalendarClock className="size-6" />
        <span className="text-lg">Agendify</span>
      </Link>
      <LoginForm />
      <p className="mt-6 text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-foreground hover:underline">
          Cadastre-se grátis
        </Link>
      </p>
    </div>
  );
}
