import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { sendSubscriptionEmail } from "@/lib/email";
import { calculatePlanPrice } from "@/lib/utils/pricing";

export async function POST(request: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planKey, amount } = await request.json();

    const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

    if (!keySecret) {
      console.error("Payment Verification Error: Razorpay secret missing.");
      return NextResponse.json(
        { error: "Payment verification credentials not configured." },
        { status: 500 }
      );
    }

    // Step 1: Create a hash using order_id and payment_id
    const hmac = crypto.createHmac("sha256", keySecret);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest("hex");

    // Step 2: Compare with the signature returned from Razorpay
    if (generated_signature === razorpay_signature) {
      const supabase = await createClient();
      const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
      const supabaseAdmin = getSupabaseAdmin();

      // Get user session to find schoolkey
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Fetch schoolkey from adminusers
      const { data: adminUser, error: adminError } = await supabase
        .from("adminusers")
        .select("schoolkey")
        .eq("authuserid", user.id)
        .single();

      if (adminError || !adminUser?.schoolkey) {
        return NextResponse.json({ error: "School key not found" }, { status: 404 });
      }

      const schoolKey = adminUser.schoolkey;

      // Fetch plan details for pricing/cycle
      const { data: plan, error: planError } = await supabase
        .from("plans")
        .select("*")
        .eq("code", planKey)
        .single();
      
      if (planError || !plan) {
        return NextResponse.json({ error: "Plan details not found" }, { status: 404 });
      }

      // Record in payments table using admin client to bypass RLS if needed
      await supabaseAdmin.from("payments").insert({
        payment_id: razorpay_payment_id,
        merchant_id: razorpay_order_id,
        status: "captured",
        plankey: planKey,
        schoolkey: schoolKey,
        amount: amount || plan.price,
        time: new Date().toISOString(),
        metadata: { source: "verify_api" }
      });

      // Fetch existing subscription to check for renewal
      const { data: existingSub } = await supabaseAdmin
        .from("subscriptions")
        .select("enddate, status, isactive")
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
      // Note: Proration typically only applies to new/expired subscriptions. 
      // If renewing early, we usually append a full cycle.
      if (existingSub?.status === "active" && existingSub.enddate && new Date(existingSub.enddate) > now) {
        startDate = new Date(existingSub.enddate);
        endDate = new Date(existingSub.enddate);
        if (planKey === "yearly") {
            endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
            endDate.setMonth(endDate.getMonth() + 1);
        }
      }

      // Update/Upsert subscription using admin client
      const { error: subError } = await supabaseAdmin.from("subscriptions").upsert({
        schoolkey: schoolKey,
        plankey: plan.key, // Use the UUID instead of the code
        status: "active",
        isactive: true,
        startdate: startDate.toISOString(),
        enddate: endDate.toISOString(),
        updatedat: new Date().toISOString()
      }, { onConflict: "schoolkey" });

      if (subError) {
        console.error("Subscription update error:", subError);
        return NextResponse.json({ success: true, message: "Payment verified but subscription update failed. Contact support." });
      }

      // Step 3: Send Email Receipt
      try {
        const { data: school } = await supabase
          .from("schools")
          .select("name, email, customdomain")
          .eq("key", schoolKey)
          .single();

        if (school?.email) {
          // Fetch monthly plan for comparison
          const { data: monthlyPlan } = await supabase
            .from("plans")
            .select("price")
            .eq("code", "monthly")
            .single();

          const { originalPrice, totalSavings } = calculatePlanPrice(plan, monthlyPlan ? Number(monthlyPlan.price) : undefined);
          const paidAmount = amount || plan.price || 0;

          await sendSubscriptionEmail(school.email, 'RECEIPT', {
            schoolName: school.name ?? "School",
            planName: plan.name ?? "Premium Plan",
            amount: paidAmount,
            savings: totalSavings,
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            customerDomain: school.customdomain || undefined,
            date: new Date().toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "long",
              year: "numeric"
            })
          });
        }

      } catch (emailErr) {
        console.error("Failed to send receipt email:", emailErr);
      }
      
      return NextResponse.json({ success: true, message: "Payment verified and subscription updated" });
    } else {
      return NextResponse.json({ success: false, message: "Invalid payment signature" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Verify API Internal Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
