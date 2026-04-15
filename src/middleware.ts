import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. EARLY EXIT: If it's a public path, don't even touch Supabase
    const isPublicPath =
        pathname === "/login" ||
        pathname === "/invite" ||
        pathname.startsWith("/plans") ||
        pathname.startsWith("/api") ||
        /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|otf)$/.test(pathname);

    if (isPublicPath) {
        return NextResponse.next();
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error("Middleware error: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.");
        // We can't use supabase if these are missing, so we just pass the request through or return 500.
        // Returning a 500 allows the user to see exactly what's wrong instead of a generic Vercel middleware crash.
        return new NextResponse("Missing Supabase Environment Variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your Vercel project.", { status: 500 });
    }

    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh session — this is required to keep sessions alive
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // If user is not logged in and not on a public page → redirect to /login
    if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // If user is logged in and visiting /login or / via GET → redirect to /dashboard
    // We allow other methods (like POST for Server Actions) to proceed
    if (user && (pathname === "/login" || pathname === "/") && request.method === "GET") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        /*
         * Match all routes except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         * - Static file extensions (images, fonts, etc.)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|otf)$).*)",
    ],
};
