import { redirect } from "next/navigation";
import { BusinessForm } from "./business-form";
import { getCurrentBusiness } from "@/lib/business/queries";

export default async function ConfiguracoesPage() {
  const business = await getCurrentBusiness();
  if (!business) redirect("/dashboard/setup");

  return (
    <div className="mx-auto max-w-3xl">
      <BusinessForm initial={business} />
    </div>
  );
}
