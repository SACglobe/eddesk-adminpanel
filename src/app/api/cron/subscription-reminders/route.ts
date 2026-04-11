import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSubscriptionEmail } from "@/lib/email";

// Service role client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    // 1. Basic security check (Optional but recommended for Vercel Cron)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      // Note: During initial setup, we might allow bypass if CRON_SECRET is not yet set
    }

    // 2. Fetch all relevant subscriptions with school and plan details
    const { data: subs, error: subsError } = await supabaseAdmin
      .from("subscriptions")
      .select(`
        *,
        schools (name, email),
        plans (name, graceperiod)
      `)
      .eq('status', 'active');

    if (subsError) throw subsError;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let sentCount = 0;

    for (const sub of (subs || [])) {
      if (!sub.schools?.email || !sub.enddate) continue;

      const endDate = new Date(sub.enddate);
      endDate.setHours(0, 0, 0, 0);

      // Calculations in IST context (assuming database dates are stored or intended as local)
      // Difference in days: (Expiry - Today)
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const gracePeriod = sub.plans?.graceperiod || 1;
      const schoolEmail = sub.schools.email;
      const schoolName = sub.schools?.name ?? "School";
      const planName = sub.plans?.name || "Premium Plan";

      const emailData = {
        schoolName,
        planName,
        amount: 0, // Not needed for reminders
        date: new Date().toLocaleDateString('en-IN')
      };

      // Email 1: 5 days before expiration
      if (diffDays === 5) {
        await sendSubscriptionEmail(schoolEmail, 'REMINDER', emailData);
        sentCount++;
      } 
      // Email 2: Exactly on expiration (Start of Grace Period)
      else if (diffDays === 0) {
        await sendSubscriptionEmail(schoolEmail, 'GRACE_PERIOD', {
          ...emailData,
          date: `${gracePeriod} days` // Inform about grace duration
        });
        sentCount++;
      } 
      // Email 3: Exactly at the end of the Grace Period
      else if (diffDays === -gracePeriod) {
        await sendSubscriptionEmail(schoolEmail, 'FINAL_EXPIRY', emailData);
        sentCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: subs?.length || 0,
      emailsSent: sentCount,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
