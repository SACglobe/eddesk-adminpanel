import { createClient } from "@/lib/supabase/client";
import { AdminInviteParams, SchoolOption } from "./types";
import { Database } from "@/lib/supabase/database.types";

export async function getSchools(): Promise<SchoolOption[]> {
    const supabase = createClient<Database>();
    const { data, error } = await supabase
        .from("schools")
        .select("key, name")
        .eq("isactive", true)
        .order("name");

    if (error) {
        console.error("Error fetching schools:", error.message);
        return [];
    }

    return (data as SchoolOption[]) || [];
}

export async function createAdminInvite(params: AdminInviteParams) {
    const response = await fetch("/api/createadmininvite", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            pemail: params.pemail,
            pfullname: params.pfullname,
            pphone: params.pphone,
            prole: params.prole,
            pschoolkey: params.pschoolkey,
        }),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "Failed to create invite");
    }

    return result;
}
