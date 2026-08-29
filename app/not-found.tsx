import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-semibold text-muted-foreground">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        O endereço que você tentou acessar não existe ou não está mais disponível.
      </p>
      <Link href="/" className={cn(buttonVariants(), "mt-8 px-6")}>
        Voltar ao início
      </Link>
    </div>
  );
}
