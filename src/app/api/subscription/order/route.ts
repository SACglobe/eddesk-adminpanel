import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { amount, planName, planKey } = await request.json();

    const keyId = (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

    if (!keyId || !keySecret) {
      console.error("Payment Error: Razorpay credentials missing from environment.");
      return NextResponse.json(
        { error: "Payment gateway credentials not configured correctly." },
        { status: 500 }
      );
    }

    const supabase = await createClient();
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
    const now = new Date();

    // 1. Fetch Plan Details from DB
    const { data: plans } = await supabase
      .from("plans")
      .select("*")
      .order('price', { ascending: true });

    if (!plans || plans.length === 0) {
      return NextResponse.json({ error: "No plans found in database" }, { status: 404 });
    }

    const targetPlan = plans.find(p => p.code === planKey);
    if (!targetPlan) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
    }

    const monthlyPlan = plans.find(p => p.code === 'monthly');
    const monthlyPrice = monthlyPlan ? Number(monthlyPlan.price) : undefined;

    // 2. Recalculate Price on Server (Harden against client manipulation)
    const { getProratedPricing } = await import("@/lib/utils/pricing");
    const { finalPrice } = getProratedPricing(targetPlan, monthlyPrice);
    
    const calculatedAmount = finalPrice * 100; // to paise

    // Razorpay basic auth: base64(key_id:key_secret)
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: calculatedAmount, 
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: {
          planName: targetPlan.name || planName,
          planKey,
          schoolKey
        },
      }),
    });

    const order = await response.json();

    if (!response.ok) {
      console.error("Razorpay Order Error:", order);
      return NextResponse.json({ error: order.error.description }, { status: 400 });
    }

    return NextResponse.json(order);

  } catch (error: any) {
    console.error("Order API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
