import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const link = searchParams.get("link");

    if (!link) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // Decode and redirect to the Supabase activation URL
    return NextResponse.redirect(new URL(decodeURIComponent(link)));
}
