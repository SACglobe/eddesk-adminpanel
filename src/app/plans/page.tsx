import { createClient } from "@/lib/supabase/server";
import PlansClient from "./PlansClient";
import LegalFooter from "@/components/LegalFooter";

import type { Database } from "@/lib/supabase/database.types";

export type Plan = Database['public']['Tables']['plans']['Row'];

export default async function PlansPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = await createClient();
  const { data: plans, error } = await supabase
    .from("plans")
    .select("*")
    .eq("isactive", true)
    .order("price", { ascending: true });

  const status = searchParams.status;

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        <PlansClient 
          initialPlans={plans || []} 
          status={status} 
        />
      </main>
      <LegalFooter />
    </div>
  );
}
