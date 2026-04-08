import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import type { AdminInitialData, TemplateScreen, TemplateComponent } from "@/domains/auth/types";

export default async function DashboardPage() {
    const supabase = await createClient();

    // 1. Check Session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        redirect("/login");
    }

    // 2. Load admin initial data via RPC
    const { data, error } = await supabase.rpc("get_admin_initial_data");

    if (error) {
        // Handle specific errors from RPC
        const msg = error.message;
        if (msg === "Unauthorized" || msg === "JWT expired") {
            redirect("/login");
        }

        // For other errors (Admin not found, etc), we render an error state
        return (
            <div className="h-screen flex items-center justify-center bg-[#1c1c1c] p-6 text-white font-sans">
                <div className="bg-[#242424] p-8 rounded-xl border border-[#2e2e2e] shadow-2xl max-w-sm w-full text-center">
                    <div className="w-12 h-12 bg-red-900/30 text-red-500 rounded-lg flex items-center justify-center mx-auto mb-4 border border-red-900/50">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold">Configuration Error</h2>
                    <p className="text-[13px] text-gray-400 mt-2 mb-6 leading-relaxed px-4">{error.message}</p>
                    <a href="/dashboard" className="inline-block w-full bg-white text-black px-4 py-2 rounded-md text-[13px] font-bold hover:bg-gray-200 transition-colors text-center">
                        Retry System
                    </a>
                </div>
            </div>
        );
    }

    const typedData = data as AdminInitialData;

    // 3. Deduplicate 
    // We deduplicate screens by slug to avoid redundant sidebar entries, 
    // but WE MUST KEEP all components to support variants and merged groups.
    const uniqueScreensMap = new Map<string, TemplateScreen>();
    typedData.templatescreens?.forEach(screen => {
        if (!uniqueScreensMap.has(screen.screenslug)) {
            // Ensure components have unique keys if the RPC somehow duplicated them
            if (screen.components) {
                const uniqueComponents = new Map<string, TemplateComponent>();
                screen.components.forEach((comp: TemplateComponent) => uniqueComponents.set(comp.key, comp));
                screen.components = Array.from(uniqueComponents.values());
            }
            uniqueScreensMap.set(screen.screenslug, screen);
        } else {
            // If we found the same screen slug again, merge its components into the existing one
            const existingScreen = uniqueScreensMap.get(screen.screenslug)!;
            if (screen.components && existingScreen.components) {
                const uniqueComponents = new Map<string, TemplateComponent>();
                existingScreen.components.forEach((comp: TemplateComponent) => uniqueComponents.set(comp.key, comp));
                screen.components.forEach((comp: TemplateComponent) => uniqueComponents.set(comp.key, comp));
                existingScreen.components = Array.from(uniqueComponents.values());
            }
        }
    });
    typedData.templatescreens = Array.from(uniqueScreensMap.values());

    // 4. Render Client Component with initial data
    return <DashboardClient initialData={typedData} />;
}
