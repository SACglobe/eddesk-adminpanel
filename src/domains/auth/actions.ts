"use server";

import { createClient } from "@/lib/supabase/server";
import { Database } from "@/lib/supabase/database.types";

/**
 * Server Action to activate an invited admin account by setting their password
 * and updating their status in the adminusers table.
 */
export async function activateAccountAction(password: string) {
    try {
        console.log("--- Starting activateAccountAction ---");
        const supabase = await createClient<Database>();

        // Check if user is authenticated first
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error("Auth check failed:", userError || "No user found");
            return { success: false, error: "Authenticated session not found. Please refresh the page and try again." };
        }
        console.log("Authenticated user for activation:", user.id);

        // 1. Update the password for the currently authenticated user
        console.log("Attempting to update password...");
        const { data: authData, error: authError } = await supabase.auth.updateUser({
            password: password,
        });

        if (authError || !authData.user) {
            console.error("Password update failed:", authError || "No user returned from updateUser");
            return { success: false, error: authError?.message || "Failed to update password." };
        }
        console.log("Password updated successfully for:", authData.user.id);

        // 2. Update the status in the adminusers table
        console.log("Updating adminusers table status to confirmed...");
        const { error: dbError } = await supabase
            .from("adminusers")
            .update({
                status: "confirmed",
                updatedat: new Date().toISOString()
            })
            .eq("authuserid", authData.user.id);

        if (dbError) {
            console.error("Failed to update status in adminusers:", dbError);
            // We return success: true because the password WAS updated, but adding a warning
            return { success: true, warning: "Password set, but failed to update status table. Please notify admin." };
        }

        console.log("Admin account activation complete.");
        return { success: true };
    } catch (err: any) {
        console.error("CRITICAL ERROR in activateAccountAction:", err);
        return { success: false, error: "An unexpected server error occurred. Please try again or contact support." };
    }
}
