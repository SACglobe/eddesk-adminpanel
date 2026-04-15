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
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: subs, error: subsError } = await supabaseAdmin
      .from("subscriptions")
      .select(`
        *,
        schools (key, name, email, slug, customdomain),
        plans (key, name, graceperiod, billgenerationdate)
      `)
      .eq('status', 'active');

    if (subsError) throw subsError;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let sentCount = 0;

    for (const sub of (subs || [])) {
      if (!sub.schools?.email || !sub.enddate) continue;

      const billDay = sub.plans?.billgenerationdate || 1;
      const gracePeriod = sub.plans?.graceperiod || 1;
      const schoolEmail = sub.schools.email;
      const schoolName = sub.schools?.name ?? "School";
      const planName = sub.plans?.name || "Premium Plan";

      const emailData = {
        schoolName,
        planName,
        amount: 0,
        date: new Date().toLocaleDateString('en-IN')
      };

      // Scenario 1-6 are based on billgenerationdate (relative to month cycles)
      // Scenario 7 is based on absolute enddate + 6 days

      let triggerType: EmailType | null = null;

      // Helper for day-of-month matching with offsets
      const checkDay = (offset: number) => {
        const target = new Date(today);
        target.setDate(today.getDate() - offset);
        return target.getDate() === billDay;
      };

      if (checkDay(-5)) triggerType = 'REMINDER_5_DAY';
      else if (checkDay(0)) triggerType = 'BILL_GENERATED';
      else if (checkDay(1)) triggerType = 'BILL_PENDING';
      else if (checkDay(gracePeriod - 2)) triggerType = 'GRACE_WARNING_2_DAY';
      else if (checkDay(gracePeriod + 1)) triggerType = 'SHUTDOWN_NOTICE';
      else if (checkDay(gracePeriod + 10)) triggerType = 'LAPSED_NOTICE';

      if (triggerType) {
        // Double check status before sending (if needed)
        await sendSubscriptionEmail(schoolEmail, triggerType, emailData);
        sentCount++;
      }

      // Scenario 7: Internal Escalation (+6 days after enddate)
      const endDate = new Date(sub.enddate);
      endDate.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - endDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 6) {
        // Fetch extra school details (Phone/Address)
        const { data: contact } = await supabaseAdmin
          .from('contactdetails')
          .select('phone, address')
          .eq('schoolkey', sub.schoolkey)
          .single();

        await sendSubscriptionEmail('support@eddesk.in', 'SUPPORT_ESCALATION', {
          ...emailData,
          customerDomain: sub.schools.customdomain || sub.schools.slug || "No domain",
          date: endDate.toLocaleDateString('en-IN'), // Expiration date
          paymentId: contact?.phone || "No Phone",
          orderId: contact?.address || "No Address"
        });
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
