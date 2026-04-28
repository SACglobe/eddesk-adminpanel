import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSubscriptionEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { rating, feedback, contactEmail } = await request.json();
    const supabase = await createClient();

    // Get user session for context
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch school info
    const { data: adminUser } = await supabase
      .from("adminusers")
      .select("schoolkey, schools(name, slug, customdomain)")
      .eq("authuserid", user.id)
      .single();

    const schoolName = (adminUser?.schools as any)?.name || "Unknown School";
    const schoolDomain = (adminUser?.schools as any)?.customdomain || (adminUser?.schools as any)?.slug || "No domain";

    // Send email to support@eddesk.in
    await sendSubscriptionEmail("support@eddesk.in", "FEEDBACK", {
      schoolName,
      rating,
      supportMessage: feedback,
      customerDomain: schoolDomain,
      date: new Date().toLocaleDateString("en-IN"),
      ...({ replyTo: contactEmail || user.email } as any)
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Feedback API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
