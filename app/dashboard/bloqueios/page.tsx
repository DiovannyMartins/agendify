import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/business/queries";
import { BlockForm, BlockRow } from "./block-form";

export default async function BloqueiosPage() {
  const business = await getCurrentBusiness();
  const supabase = await createClient();
  const [{ data: blocks }, { data: professionals }] = await Promise.all([
    supabase
      .from("availability_blocks")
      .select("*")
      .eq("business_id", business?.id ?? "")
      .order("start_at", { ascending: false }),
    supabase
      .from("professionals")
      .select("id, name")
      .eq("business_id", business?.id ?? "")
      .order("created_at", { ascending: true }),
  ]);
  const professionalName: Record<string, string> = {};
  for (const p of professionals ?? []) professionalName[p.id] = p.name;
  const formProfessionals = (professionals ?? []).map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Bloqueios</h1>
      <p className="mt-1 text-muted-foreground">
        Bloqueie períodos para pausas, férias e exceções. Os horários bloqueados não aparecem para reserva.
      </p>

      <div className="mt-6 rounded-xl border border-border p-4">
        <BlockForm professionals={formProfessionals} />
      </div>

      {blocks && blocks.length > 0 && (
        <div className="mt-6 space-y-2">
          {blocks.map((block) => (
            <BlockRow
              key={block.id}
              id={block.id}
              startAt={block.start_at}
              endAt={block.end_at}
              reason={block.reason}
              timezone={business?.timezone ?? "UTC"}
              professionalName={block.professional_id ? professionalName[block.professional_id] : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
