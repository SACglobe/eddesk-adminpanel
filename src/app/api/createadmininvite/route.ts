import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
    let supabaseAdmin;
    try {
        supabaseAdmin = getSupabaseAdmin();
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let authuserid: string | null = null;

    try {
        const { pemail, pfullname, pphone, prole, pschoolkey } = await req.json();

        // 0. Check if user already exists in adminusers table
        const { data: existingAdmin, error: adminCheckError } = await supabaseAdmin
            .from("adminusers")
            .select("email")
            .eq("email", pemail)
            .maybeSingle();

        if (adminCheckError) throw adminCheckError;
        if (existingAdmin) {
            return NextResponse.json(
                { error: "A user with this email already has access to a school." },
                { status: 400 }
            );
        }

        // 0.5 Check if user already exists in Auth
        const { data: { users }, error: authCheckError } = await supabaseAdmin.auth.admin.listUsers();
        if (authCheckError) throw authCheckError;

        const existingAuthUser = users.find(u => u.email === pemail);
        
        // If user is found, block as per "one user, one account" rule
        if (existingAuthUser) {
            return NextResponse.json(
                { error: "This email is already registered. One user can only have one account." },
                { status: 400 }
            );
        }

        // 1. Fetch school name for the email
        const { data: schoolData } = await supabaseAdmin
            .from("schools")
            .select("name")
            .eq("key", pschoolkey)
            .single();

        const schoolName = schoolData?.name || "EdDesk School";

        // 2. Generate invite link
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: "invite",
            email: pemail,
            options: {
                data: { full_name: pfullname },
                redirectTo: `${new URL(req.url).origin}/login?email=${encodeURIComponent(pemail)}`
            }
        });

        if (linkError) {
            throw new Error(`Failed to generate invite link: ${linkError.message}`);
        }

        const inviteLink = linkData.properties.action_link;
        authuserid = linkData.user.id;
        const emailSent = true; // We'll mark as true after the send call

        // 3. Send custom branded email via Resend
        const { sendSubscriptionEmail } = await import("@/lib/email");
        const emailResult = await sendSubscriptionEmail(pemail, 'ADMIN_INVITE', {
            schoolName,
            fullname: pfullname,
            role: prole.charAt(0).toUpperCase() + prole.slice(1),
            inviteLink,
            date: new Date().toLocaleDateString('en-IN')
        });

        if (!emailResult.success) {
            console.error("Custom Email Error:", emailResult.error);
            // We continue anyway as the link was generated, but we can log it
        }

        // 4. Insert admin record via RPC
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("createadmininvite", {
            pauthuserid: authuserid,
            pemail: pemail,
            pfullname: pfullname,
            pphone: pphone,
            prole: prole.toLowerCase(),
            pschoolkey: pschoolkey,
        });

        if (rpcError) throw rpcError;

        return NextResponse.json({
            success: true,
            authuserid,
            emailSent: emailResult.success,
            inviteLink,
            ...rpcData,
        });
    } catch (error: any) {
        console.error("Invite Error:", error);

        // Rollback: Delete the auth user if RPC or email failed
        if (authuserid) {
            await supabaseAdmin.auth.admin.deleteUser(authuserid);
        }

        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
