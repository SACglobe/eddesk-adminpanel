import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { amount, planName, planKey } = await request.json();

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay credentials not configured" },
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

    // Razorpay basic auth: base64(key_id:key_secret)
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount, // in paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: {
          planName,
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
