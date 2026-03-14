import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
    let authuserid: string | null = null;

    try {
        const { pemail, pfullname, pphone, prole, pschoolkey } = await req.json();

        // 1. Invite user by email
        let inviteData: any = null;
        let inviteError: any = null;
        let inviteLink: string | null = null;
        let emailSent = false;

        try {
            const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(pemail, {
                data: {
                    full_name: pfullname,
                }
            });
            inviteData = data;
            inviteError = error;
            if (!inviteError) emailSent = true;
        } catch (err: any) {
            inviteError = err;
        }

        // 2. Fallback to generateLink if email fails (likely rate limit)
        if (inviteError) {
            console.warn("Invite email failed, attempting to generate link:", inviteError);

            // If user already exists, we might still want to generate a link
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: "invite",
                email: pemail,
                options: {
                    data: { full_name: pfullname }
                }
            });

            if (linkError) {
                // If both fail, we have a real problem
                throw new Error(`Failed to invite user: ${inviteError.message || linkError.message}`);
            }

            inviteLink = linkData.properties.action_link;
            authuserid = linkData.user.id;
        } else {
            authuserid = inviteData.user.id;
        }

        // 3. Insert admin record via RPC
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
            emailSent,
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
