import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { UpdatePasswordForm } from "./update-password-form";

export default function RedefinirSenhaPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 font-semibold">
        <CalendarClock className="size-6" />
        <span className="text-lg">Agendify</span>
      </Link>
      <UpdatePasswordForm />
    </div>
  );
}
