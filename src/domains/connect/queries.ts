import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/database.types";

export type FormSubmission = Database['public']['Tables']['formsubmissions']['Row'];

export async function getAdmissionEnquiries(schoolKey: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('formsubmissions')
        .select('*')
        .eq('schoolkey', schoolKey)
        .eq('formtype', 'admissionenquiry')
        .order('createdat', { ascending: false });

    return { data, error };
}

export async function getGeneralMessages(schoolKey: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('formsubmissions')
        .select('*')
        .eq('schoolkey', schoolKey)
        .eq('formtype', 'generalmessage')
        .order('createdat', { ascending: false });

    return { data, error };
}

export async function getCallbackRequests(schoolKey: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('formsubmissions')
        .select('*')
        .eq('schoolkey', schoolKey)
        .eq('formtype', 'callbackrequired')
        .order('createdat', { ascending: false });

    return { data, error };
}

export async function updateSubmissionStatus(key: string, status: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('formsubmissions')
        .update({ status } as any)
        .eq('key', key)
        .select()
        .single();

    return { data, error };
}
