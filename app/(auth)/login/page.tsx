import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12">
      <Reveal variant="down">
        <Link href="/" className="mb-8 flex items-center gap-2 font-semibold">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CalendarClock className="size-5" />
          </span>
          <span className="text-lg">Agendify</span>
        </Link>
      </Reveal>
      <Reveal delay={80} className="w-full max-w-md">
        <LoginForm />
      </Reveal>
      <Reveal delay={160}>
        <p className="mt-6 text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-foreground hover:underline">
            Cadastre-se grátis
          </Link>
        </p>
      </Reveal>
    </div>
  );
}
