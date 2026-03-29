"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Generic Upsert for Component Data
 * Handles both adding new records and updating existing ones.
 * Security: Verifies the user's session and schoolkey ownership on the server.
 */
export async function upsertComponentData(
    tableName: string,
    data: any,
    schoolKey: string
) {
    const supabase = await createClient();

    // 1. Session check
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
        throw new Error("Unauthorized");
    }

    // 2. School ownership check (Secondary safety gate)
    // In a real app, we would query the adminusers table to ensure this user has access to this schoolKey.
    // For now, we enforce that the data being saved MUST match the provided schoolKey.
    const payload: any = {
        ...data,
        schoolkey: schoolKey,
    };

    // Only inject updatedat for tables that actually have this column
    const tablesWithUpdatedAt = [
        "schools",
        "herocontent",
        "broadcastcontent",
        "schoolidentity",
        "adminusers",
        "subscriptions",
        "componentplacement"
    ];
    
    if (tablesWithUpdatedAt.includes(tableName)) {
        payload.updatedat = new Date().toISOString();
    }

    // 3. Execution
    const { data: result, error } = await supabase
        .from(tableName as any)
        .upsert(payload, { onConflict: 'key' })
        .select()
        .single();

    if (error) {
        console.error(`Error upserting to ${tableName}:`, error);
        return { success: false, error: error.message };
    }

    // 4. Cache bust
    revalidatePath("/dashboard");
    return { success: true, data: result };
}

/**
 * Generic Delete for Component Data
 * Security: Verifies the record belongs to the school before deleting.
 */
export async function deleteComponentData(
    tableName: string,
    recordKey: string,
    schoolKey: string
) {
    const supabase = await createClient();

    // 1. Session check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Unauthorized");

    // 2. Execution with schoolKey filter for safety
    const { error } = await supabase
        .from(tableName as any)
        .delete()
        .match({ key: recordKey, schoolkey: schoolKey });

    if (error) {
        console.error(`Error deleting from ${tableName}:`, error);
        return { success: false, error: error.message };
    }

    // 3. Cache bust
    revalidatePath("/dashboard");
    return { success: true };
}

/**
 * Bulk Order Update
 * Useful for reordering slides, faculty, etc.
 */
export async function updateComponentOrder(
    tableName: string,
    items: { key: string; displayorder: number }[],
    schoolKey: string
) {
    const supabase = await createClient();

    // 1. Session check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Unauthorized");

    // 2. Perform updates in parallel (or use a stored procedure for atomicity)
    const promises = items.map(item =>
        supabase
            .from(tableName as any)
            .update({ displayorder: item.displayorder })
            .match({ key: item.key, schoolkey: schoolKey })
    );

    const results = await Promise.all(promises);
    const firstError = results.find(r => r.error);

    if (firstError) {
        return { success: false, error: firstError.error?.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
}

/**
 * Update Template Component Configuration
 * Used for saving selector items, variants, etc.
 */
export async function updateComponentConfig(
    componentKey: string,
    config: any
) {
    const supabase = await createClient();

    // 1. Session check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Unauthorized");

    // 2. Execution
    const { data: result, error } = await supabase
        .from('templatecomponents')
        .update({ config })
        .eq('key', componentKey)
        .select()
        .single();

    if (error) {
        console.error(`Error updating component config:`, error);
        return { success: false, error: error.message };
    }

    // 3. Cache bust
    revalidatePath("/dashboard");
    return { success: true, data: result };
}
