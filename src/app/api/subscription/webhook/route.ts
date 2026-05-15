import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { sendSubscriptionEmail } from "@/lib/email";
import { calculatePlanPrice } from "@/lib/utils/pricing";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret || !signature) {
      return NextResponse.json({ error: "Configuration error" }, { status: 400 });
    }

    // 1. Verify Signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // 2. Parse Payload
    const payload = JSON.parse(body);
    const event = payload.event;
    const payment = payload.payload.payment.entity;
    const orderId = payment.order_id;
    const notes = payment.notes || {};
    
    const schoolKey = notes.schoolKey;
    const planKey = notes.planKey;
    const amount = payment.amount / 100; // Convert paise to INR

    console.log(`Processing Webhook Event: ${event} for School: ${schoolKey}`);

    if (event === "payment.captured" || event === "order.paid") {
      // Record successful payment (keep planKey code for reference in payments log)
      await supabaseAdmin.from("payments").upsert({
        payment_id: payment.id,
        merchant_id: orderId,
        status: "captured",
        plankey: planKey,
        schoolkey: schoolKey,
        amount: amount,
        time: new Date().toISOString(),
        metadata: { webhook_event: event, raw: payload }
      }, { onConflict: 'payment_id' });

      // Fetch plan UUID to use as foreign key in subscriptions
      const { data: plan } = await supabaseAdmin
        .from("plans")
        .select("key, name, price")
        .eq("code", planKey)
        .single();

      if (plan) {
        // ... (subscription update logic)
        const { data: existingSub } = await supabaseAdmin
          .from("subscriptions")
          .select("enddate, isactive")
          .eq("schoolkey", schoolKey)
          .single();

        // Calculate dates using centralized pricing utility
        const { getProratedPricing } = await import("@/lib/utils/pricing");
        
        // Fetch monthly plan for comparison if needed
        const { data: monthlyPlan } = await supabaseAdmin
          .from("plans")
          .select("price")
          .eq("code", "monthly")
          .single();
          
        const pricing = getProratedPricing(plan, monthlyPlan ? Number(monthlyPlan.price) : undefined);

        let startDate = new Date();
        let endDate = pricing.nextBillDate;
        const now = new Date();

        // If subscription is still active and not expired, append time to existing enddate
        if (existingSub?.isactive && existingSub.enddate && new Date(existingSub.enddate) > now) {
          startDate = new Date(existingSub.enddate);
          endDate = new Date(existingSub.enddate);
          if (planKey === 'yearly') {
            endDate.setFullYear(endDate.getFullYear() + 1);
          } else {
            endDate.setMonth(endDate.getMonth() + 1);
          }
        }

        await supabaseAdmin.from("subscriptions").upsert({
          schoolkey: schoolKey,
          plankey: plan.key, // Use the UUID
          status: "active",
          isactive: true,
          startdate: startDate.toISOString(),
          enddate: endDate.toISOString(),
          updatedat: new Date().toISOString()
        }, { onConflict: 'schoolkey' });

        // Step 3: Send Email Receipt (Background)
        try {
          const { data: school } = await supabaseAdmin
            .from("schools")
            .select("name, email, customdomain")
            .eq("key", schoolKey)
            .single();

          if (school?.email) {
            // Fetch monthly plan for comparison
            const { data: monthlyPlan } = await supabaseAdmin
              .from("plans")
              .select("price")
              .eq("code", "monthly")
              .single();

            const { totalSavings } = calculatePlanPrice(plan, monthlyPlan ? Number(monthlyPlan.price) : undefined);
            const paidAmount = amount;

            await sendSubscriptionEmail(school.email, 'RECEIPT', {
              schoolName: school.name ?? "School",
              planName: plan.name ?? "Premium Plan",
              amount: paidAmount,
              savings: totalSavings,
              paymentId: payment.id,
              orderId: orderId,
              customerDomain: school.customdomain || undefined,
              date: new Date().toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })
            });
          }

        } catch (emailErr) {
          console.error("Webhook failed to send receipt email:", emailErr);
        }
      }

    } else if (event === "payment.failed") {
      // Record failed payment
      await supabaseAdmin.from("payments").upsert({
        payment_id: payment.id,
        merchant_id: orderId,
        status: "failed",
        plankey: planKey,
        schoolkey: schoolKey,
        amount: amount,
        time: new Date().toISOString(),
        metadata: { 
          webhook_event: event, 
          error: payment.error_description || "Unknown error",
          raw: payload 
        }
      }, { onConflict: 'payment_id' });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
