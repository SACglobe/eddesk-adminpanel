"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/domains/auth/queries";
import { AdminInitialData, TemplateScreen, TemplateComponent } from "@/domains/auth/types";
import NavigationRail, { GetIcon, GENERAL_ITEMS, CONNECT_ITEMS } from "@/domains/dashboard/components/NavigationRail";
import ComponentListPanel from "@/domains/dashboard/components/ComponentListPanel";
import EditorHost from "@/domains/dashboard/components/EditorHost";
import BrandLogo from "@/components/BrandLogo";
import { getEnrichedConfig } from "@/domains/dashboard/utils/componentUtils";
import { LoadingProvider } from "@/providers/LoadingProvider";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import TemplateScanner from "@/domains/dashboard/components/TemplateScanner";
import PlansModal from "@/domains/dashboard/components/subscription/PlansModal";
import type { Plan } from "@/app/dashboard/page";
import LegalFooter from "@/components/LegalFooter";

interface DashboardClientProps {
    initialData: AdminInitialData;
    requiresSubscription?: boolean;
    availablePlans?: Plan[];
}

export default function DashboardClient({ initialData, requiresSubscription = false, availablePlans = [] }: DashboardClientProps) {
    const [adminData, setAdminData] = useState<AdminInitialData>(initialData);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileComponentListOpen, setIsMobileComponentListOpen] = useState(false);

    // Search Command Center State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Selection State
    const [selectedScreenKey, setSelectedScreenKey] = useState<string | null>(null);
    const [selectedComponentKey, setSelectedComponentKey] = useState<string | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const selectedComponentRef = useRef<HTMLButtonElement>(null);

    // Auto-select "Home" screen on mount if not already selected
    useEffect(() => {
        if (!selectedScreenKey && adminData.templatescreens && adminData.templatescreens.length > 0) {
            const sortedScreens = [...adminData.templatescreens].sort(
                (a, b) => (a.displayorder ?? 0) - (b.displayorder ?? 0)
            );

            const homeScreen = sortedScreens.find(s =>
                (s.screenname?.toLowerCase() === 'home' || s.screenslug?.toLowerCase() === 'home')
            );

            const defaultScreen = homeScreen || sortedScreens[0];
            setSelectedScreenKey(defaultScreen.key);

            if (defaultScreen.components && defaultScreen.components.length > 0) {
                const sortedComps = [...defaultScreen.components].sort((a, b) => (a.displayorder ?? 0) - (b.displayorder ?? 0));
                const firstComp = sortedComps[0];
                const config = getEnrichedConfig(firstComp);
                
                if (config.group && config.groupmode) {
                    setSelectedComponentKey(`group:${config.groupmode}:${config.group}`);
                } else {
                    setSelectedComponentKey(firstComp.key);
                }
            }
        }
    }, [adminData, selectedScreenKey]);

    // Filter screens and components based on search query
    const searchResults = useMemo(() => {
        if (!searchQuery.trim() || !adminData?.templatescreens) return [];

        const query = searchQuery.toLowerCase();
        const results: { type: 'screen' | 'component', screen: TemplateScreen, component?: any }[] = [];

        adminData.templatescreens.forEach(screen => {
            const screenName = (screen.screenname ?? screen.screenslug).toLowerCase();
            const screenMatches = screenName.includes(query);

            if (screenMatches) {
                results.push({ type: 'screen', screen });
            }

            screen.components?.forEach((comp: TemplateComponent) => {
                const compName = (comp.componentregistry?.componentname ?? comp.componentcode ?? "").toLowerCase();
                if (compName.includes(query)) {
                    if (!results.some(r => r.type === 'component' && r.screen.screenslug === screen.screenslug && r.component?.componentcode === comp.componentcode)) {
                        results.push({ type: 'component', screen, component: comp });
                    }
                }
            });
        });

        return results;
    }, [searchQuery, adminData?.templatescreens]);

    useEffect(() => {
        const supabase = createClient();

        // Multi-tab session safety
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event: string, session: any) => {
            if (event === "SIGNED_OUT" || !session) {
                window.location.href = "/login";
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Derived state for selection
    const selectedScreen = useMemo(() => {
        if (!selectedScreenKey || !adminData) return null;
        return adminData.templatescreens?.find(s => s.key === selectedScreenKey) || null;
    }, [selectedScreenKey, adminData]);

    const activeComponentData = useMemo(() => {
        if (!selectedComponentKey || !selectedScreen) return null;

        if (selectedComponentKey.startsWith("group:")) {
            const [, mode, groupName] = selectedComponentKey.split(":");
            const groupComponents = selectedScreen.components?.filter((c: TemplateComponent) => {
                const config = getEnrichedConfig(c);
                return config.group === groupName;
            }) ?? [];

            if (mode === 'exclusive') {
                const variants = adminData.schools.componentvariants || {};
                const activeVariant = variants[selectedScreen.screenslug || '']?.[groupName];
                
                const activeComp = groupComponents.find((c: TemplateComponent) => {
                    const config = getEnrichedConfig(c);
                    return config.variant === activeVariant;
                }) || groupComponents[0];

                return { 
                    components: activeComp ? [activeComp] : [], 
                    allComponents: groupComponents, // Pass the full set for context
                    isGroup: true, 
                    groupMode: 'exclusive' as const, 
                    groupName 
                };
            } else {
                return { 
                    components: groupComponents, 
                    allComponents: groupComponents, // Consistently available
                    isGroup: true, 
                    groupMode: 'merged' as const, 
                    groupName 
                };
            }
        }

        const component = selectedScreen.components?.find((c: TemplateComponent) => c.key === selectedComponentKey);
        return component ? { components: [component], isGroup: false } : null;
    }, [selectedComponentKey, selectedScreen, adminData.schools.componentvariants]);

    // Grouping logic for the component list (Mobile and Desktop shared)
    const displayItems = useMemo(() => {
        if (!selectedScreen) return [];
        
        const components = selectedScreen.components ?? [];
        const groups: Map<string, { mode: 'exclusive' | 'merged', items: TemplateComponent[], order: number }> = new Map();
        const singles: TemplateComponent[] = [];

        components.forEach((comp: TemplateComponent) => {
            const config = getEnrichedConfig(comp);
            const groupName = config.group;
            const groupMode = config.groupmode;
            const variant = config.variant;

            // Only group if it's merged mode, or if it's exclusive mode AND has a variant defined
            const shouldGroup = groupName && groupMode && (groupMode === 'merged' || variant);

            if (shouldGroup) {
                if (!groups.has(groupName!)) {
                    groups.set(groupName!, { mode: groupMode!, items: [], order: comp.displayorder ?? 0 });
                }
                const enrichedComp = { ...comp, config };
                groups.get(groupName!)!.items.push(enrichedComp);
                
                if ((comp.displayorder ?? 0) < groups.get(groupName!)!.order) {
                    groups.get(groupName!)!.order = comp.displayorder ?? 0;
                }
            } else {
                singles.push(comp);
            }
        });

        return [
            ...singles.map(s => ({ type: 'single' as const, item: s, order: s.displayorder ?? 0 })),
            ...Array.from(groups.entries()).map(([name, data]) => ({ type: 'group' as const, name, ...data }))
        ].sort((a, b) => a.order - b.order);
    }, [selectedScreen]);

    const selectedComponent = activeComponentData?.components[0] || null;

    const generalItemSelected = useMemo(() => {
        if (!selectedScreenKey) return null;
        return GENERAL_ITEMS.find(item => item.key === selectedScreenKey) || null;
    }, [selectedScreenKey]);

    const connectItemSelected = useMemo(() => {
        if (!selectedScreenKey) return null;
        return CONNECT_ITEMS.find(item => item.key === selectedScreenKey) || null;
    }, [selectedScreenKey]);

    // Global Keyboard Shortcut for Search (Cmd+K / Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
            if (e.key === 'Escape' && isSearchOpen) {
                setIsSearchOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSearchOpen]);

    // Handle outside click for Profile Dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Instant scroll to selected component when mobile components dialog opens
    useEffect(() => {
        if (isMobileComponentListOpen && selectedComponentKey && selectedComponentRef.current) {
            const timer = setTimeout(() => {
                selectedComponentRef.current?.scrollIntoView({
                    block: 'center',
                    behavior: 'auto'
                });
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isMobileComponentListOpen, selectedComponentKey]);

    async function handleLogout() {
        await signOut();
        window.location.href = "/login";
    }

    const school = adminData?.schools;

    // Refresh data without page reload
    const refreshAdminData = async () => {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("get_admin_initial_data");

        if (!error && data) {
            const typedData = data as AdminInitialData;
            
            // Re-apply deduplication logic from page.tsx to keep mapping consistent
            const uniqueScreensMap = new Map<string, TemplateScreen>();
            typedData.templatescreens?.forEach(screen => {
                const slug = screen.screenslug ?? '';
                if (!uniqueScreensMap.has(slug)) {
                    if (screen.components) {
                        const uniqueComponents = new Map<string, TemplateComponent>();
                        screen.components.forEach((comp: TemplateComponent) => uniqueComponents.set(comp.key, comp));
                        screen.components = Array.from(uniqueComponents.values());
                    }
                    uniqueScreensMap.set(slug, screen);
                } else {
                    const existingScreen = uniqueScreensMap.get(slug)!;
                    if (screen.components && existingScreen.components) {
                        const uniqueComponents = new Map<string, TemplateComponent>();
                        existingScreen.components.forEach((comp: TemplateComponent) => uniqueComponents.set(comp.key, comp));
                        screen.components.forEach((comp: TemplateComponent) => uniqueComponents.set(comp.key, comp));
                        existingScreen.components = Array.from(uniqueComponents.values());
                    }
                }
            });
            typedData.templatescreens = Array.from(uniqueScreensMap.values());
            
            setAdminData(typedData);
        }
    };

    // Handle screen selection
    const handleSelectScreen = (key: string) => {
        const isGeneral = GENERAL_ITEMS.some(item => item.key === key);
        const isConnect = CONNECT_ITEMS.some(item => item.key === key);

        if (isGeneral || isConnect) {
            setSelectedScreenKey(key);
            setSelectedComponentKey(null);
            setIsMobileMenuOpen(false);
        } else {
            setSelectedScreenKey(key);
            const screen = adminData?.templatescreens?.find(s => s.key === key);
            if (screen && screen.components && screen.components.length > 0) {
                const sortedComps = [...screen.components].sort((a, b) => (a.displayorder ?? 0) - (b.displayorder ?? 0));
                const firstComp = sortedComps[0];
                const config = getEnrichedConfig(firstComp);
                
                if (config.group && config.groupmode) {
                    setSelectedComponentKey(`group:${config.groupmode}:${config.group}`);
                } else {
                    setSelectedComponentKey(firstComp.key);
                }
            } else {
                setSelectedComponentKey(null);
            }
            setIsMobileMenuOpen(false);
        }
    };

    // Handle search result selection
    const handleSelectSearchResult = (result: { type: 'screen' | 'component', screen: TemplateScreen, component?: any }) => {
        setIsSearchOpen(false);
        setSearchQuery("");
        setSelectedScreenKey(result.screen.key);
        if (result.type === 'component' && result.component) {
            setSelectedComponentKey(result.component.key);
        } else {
            setSelectedComponentKey(null);
        }
    };

    useEffect(() => {
        document.body.style.overflow = 'auto';
        return () => { document.body.style.overflow = 'auto'; };
    }, []);

    if (requiresSubscription) {
        return (
            <LoadingProvider>
                <div className="fixed inset-0 z-[9999] bg-slate-50 overflow-y-auto flex flex-col items-center">
                    <div className="w-full flex-grow flex flex-col items-center">
                        <PlansModal 
                            initialPlans={availablePlans} 
                            status="required"
                            currentSubscription={adminData.subscriptions}
                        />
                    </div>
                    <div className="w-full py-8 bg-white border-t border-gray-100 flex justify-center">
                        <LegalFooter />
                    </div>
                </div>
            </LoadingProvider>
        );
    }

    return (
        <LoadingProvider>
            <div className="h-screen flex flex-col bg-white overflow-hidden text-gray-900 font-sans selection:bg-red-100 selection:text-red-900">
                <LoadingOverlay />
                {/* Header */}
                <header className="h-16 border-b border-[#f1f1f1] flex items-center justify-between px-4 lg:px-6 flex-shrink-0 z-50 bg-white w-full">
                <div className="flex items-center gap-4 text-[14px] font-medium text-gray-500 overflow-hidden">
                    <div className="hidden lg:block">
                        <BrandLogo variant="full" size="md" />
                    </div>
                    <div className="lg:hidden flex items-center">
                        <BrandLogo variant="icon" size="sm" />
                    </div>
                    <div className="flex items-center gap-1 lg:gap-2 hover:text-black cursor-pointer transition-colors px-1 lg:px-2 py-1 rounded hover:bg-[#f9fafb]" onClick={() => setIsMobileMenuOpen(true)}>
                        <span className="font-bold text-gray-900 text-[14px] lg:text-[16px] tracking-tight truncate max-w-[250px] lg:max-w-[200px]">{school?.name ?? "School"}</span>
                    </div>
                    <div className="flex items-center px-2 py-0.5 bg-[#f9fafb] border border-[#e5e7eb] rounded-full shrink-0">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                            {(() => {
                                const planCode = adminData?.plans?.code as string | undefined;
                                if (planCode === 'monthly') return 'Monthly';
                                if (planCode === 'yearly') return 'Yearly';
                                return 'Free';
                            })()}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3 lg:gap-4 ml-auto justify-end">
                    <button onClick={() => setIsSearchOpen(true)} className="hidden lg:flex items-center justify-start gap-2 group lg:bg-[#f9fafb] hover:bg-gray-100 lg:border border-gray-200 lg:h-auto lg:px-3 lg:py-1.5 rounded-full transition-all lg:w-[240px] xl:w-[380px]">
                        <svg className="md:w-4 md:h-4 text-gray-500 group-hover:text-gray-700 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="hidden lg:inline text-[13px] font-medium text-gray-400 mr-auto truncate">Search screens...</span>
                    </button>
                    <div className="hidden lg:block w-[1px] h-4 bg-[#f1f1f1]" />
                    {/* User Profile Desktop */}
                    <div className="hidden lg:block relative" ref={profileRef}>
                        <div className="flex items-center hover:bg-gray-50 px-2.5 py-1.5 rounded-2xl transition-all cursor-pointer group/user relative" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                            <div className="relative flex-shrink-0">
                                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-gradient-to-tr from-[#F54927] to-[#ff6b52] flex items-center justify-center text-white font-black text-[10px] lg:text-[11px] shadow-sm tracking-wider">
                                    {(adminData?.adminusers as any)?.full_name ? (((adminData?.adminusers as any).full_name as string).split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()) : 'ED'}
                                </div>
                                <div className="absolute -bottom-0 -right-0 w-2 h-2 lg:w-2.5 lg:h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                            </div>
                            <div className="hidden lg:flex flex-col min-w-0 ml-3">
                                <p className="text-[13px] font-black text-gray-900 truncate tracking-tight leading-tight group-hover/user:text-[#F54927] transition-colors">{(adminData?.adminusers as any)?.full_name || 'Admin User'}</p>
                                <p className="text-[11px] text-gray-500 font-medium truncate leading-none mt-0.5">{(adminData?.adminusers as any)?.email || 'admin@eddesk.com'}</p>
                            </div>
                            <svg className={`ml-2 w-3.5 h-3.5 lg:w-4 lg:h-4 text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                        {isProfileOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 py-2.5 z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                <div className="px-4 py-3 border-b border-gray-50 mb-1">
                                    <p className="text-[14px] font-black text-gray-900 tracking-tight">{(adminData?.adminusers as any)?.full_name || 'Admin User'}</p>
                                    <p className="text-[12px] text-gray-500 font-medium mt-0.5">{(adminData?.adminusers as any)?.email || 'admin@eddesk.com'}</p>
                                </div>
                                <div className="px-1.5 space-y-0.5">
                                    <button
                                        onClick={() => { handleSelectScreen('account-details'); setIsProfileOpen(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-bold text-gray-600 hover:text-[#F54927] hover:bg-red-50 transition-all group/item">
                                        Edit Profile
                                    </button>
                                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-bold text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all">
                                        Log out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative min-h-0">
                {/* Sidebar Desktop */}
                <div className="hidden lg:block h-full flex-shrink-0 z-50 bg-white">
                    <NavigationRail
                        screens={adminData?.templatescreens ?? []}
                        selectedScreenKey={selectedScreenKey}
                        onSelectScreen={handleSelectScreen}
                        schoolName={school?.name ?? ""}
                        schoolDomain={school?.customdomain ?? `${school?.slug ?? ""}.eddesk.com`}
                        adminData={adminData}
                        onLogout={handleLogout}
                    />
                </div>

                {/* Main Content */}
                <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden bg-[#f9fafb]">
                    <div className="flex flex-1 overflow-hidden relative">
                        {/* Component List Desktop */}
                        {!generalItemSelected && !connectItemSelected && (
                            <div className="hidden lg:flex h-full w-60 flex-shrink-0">
                                <ComponentListPanel
                                    selectedScreen={selectedScreen}
                                    selectedComponentKey={selectedComponentKey}
                                    onSelectComponent={setSelectedComponentKey}
                                    componentVariants={adminData.schools.componentvariants}
                                />
                            </div>
                        )}
                        {/* Editor Host */}
                        <div className="h-full flex-1 min-w-0 flex">
                            <EditorHost
                                selectedComponent={selectedComponent}
                                activeComponentData={activeComponentData}
                                selectedScreen={selectedScreen}
                                generalItem={generalItemSelected}
                                connectItem={connectItemSelected}
                                schoolKey={school?.key ?? ""}
                                adminData={adminData}
                                availablePlans={availablePlans}
                                onBack={() => setIsMobileMenuOpen(true)}
                                onSearch={() => setIsSearchOpen(true)}
                                allScreens={adminData?.templatescreens ?? []}
                                allowedHeroMediaType={adminData?.schools?.componentvariants?.[selectedScreen?.screenslug || '']?.hero as 'image' | 'video' | 'both' | undefined}
                                onRefreshData={refreshAdminData}
                                onSchoolUpdated={(updatedSchool) => {
                                    setAdminData(prev => ({
                                        ...prev,
                                        schools: { ...prev.schools, ...updatedSchool }
                                    }));
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Mobile Hamburger Menu Overlay */}
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 z-[200] lg:hidden flex">
                        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => { setIsMobileMenuOpen(false); setIsProfileOpen(false); }} />
                        <div className="relative w-[85vw] max-w-[340px] bg-[#fcfcfc] h-full shadow-[0_0_50px_rgba(0,0,0,0.1)] flex flex-col pt-safe animate-in slide-in-from-left duration-300 ease-out border-r border-gray-100">
                            {/* Drawer Header */}
                            <div className="h-24 border-b border-gray-100 flex items-center px-6 justify-between flex-shrink-0 bg-white/50 backdrop-blur-sm">
                                <div className="flex items-center gap-2.5">
                                    <BrandLogo variant="full" size="md" />
                                </div>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all active:scale-90"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto py-8 px-5 space-y-9 no-scrollbar pb-[120px]">
                                {/* Screens Section */}
                                <section>
                                    <div className="flex items-center justify-between mb-4 px-1">
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">SCREENS</h3>
                                        <div className="h-px flex-1 bg-gray-100 ml-4 opacity-50" />
                                    </div>
                                    <div className="space-y-1.5">
                                        {adminData?.templatescreens?.sort((a, b) => (a.displayorder ?? 0) - (b.displayorder ?? 0)).map(screen => {
                                            const isActiveScreen = selectedScreenKey === screen.key;
                                            return (
                                                <button
                                                    key={screen.key}
                                                    onClick={() => handleSelectScreen(screen.key)}
                                                    className={`w-full group relative text-left px-4 py-3.5 rounded-2xl transition-all flex items-center justify-between active:scale-[0.98] ${isActiveScreen
                                                        ? 'bg-white shadow-[0_4px_20px_rgba(245,73,39,0.08)] border border-red-100/50 text-[#F54927]'
                                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3.5">
                                                        <span className={`w-6 h-6 flex items-center justify-center transition-colors duration-200 ${isActiveScreen ? 'text-[#F54927]' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                                            <GetIcon slug={screen.screenslug} />
                                                        </span>
                                                        <span className={`text-[15px] capitalize tracking-tight ${isActiveScreen ? 'font-black' : 'font-bold'}`}>
                                                            {screen.screenname ?? screen.screenslug}
                                                        </span>
                                                    </div>
                                                    {isActiveScreen && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#F54927] shadow-[0_0_8px_rgba(245,73,39,0.5)]" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                                
                                {/* Connect Section */}
                                <section>
                                    <div className="flex items-center justify-between mb-4 px-1">
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">CONNECT</h3>
                                        <div className="h-px flex-1 bg-gray-100 ml-4 opacity-50" />
                                    </div>
                                    <div className="space-y-1.5">
                                        {CONNECT_ITEMS.map(item => {
                                            const isSelected = selectedScreenKey === item.key;
                                            return (
                                                <button
                                                    key={item.key}
                                                    onClick={() => handleSelectScreen(item.key)}
                                                    className={`w-full group text-left px-4 py-3.5 rounded-2xl transition-all flex items-center justify-between active:scale-[0.98] ${isSelected
                                                        ? 'bg-white shadow-[0_4px_20px_rgba(245,73,39,0.08)] border border-red-100/50 text-[#F54927]'
                                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3.5">
                                                        <span className={`w-6 h-6 flex items-center justify-center transition-colors duration-200 ${isSelected ? 'text-[#F54927]' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                                            {item.icon}
                                                        </span>
                                                        <span className={`text-[15px] tracking-tight ${isSelected ? 'font-black' : 'font-bold'}`}>
                                                            {item.label}
                                                        </span>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#F54927] shadow-[0_0_8px_rgba(245,73,39,0.5)]" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>

                                {/* General Section */}
                                <section>
                                    <div className="flex items-center justify-between mb-4 px-1">
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">GENERAL</h3>
                                        <div className="h-px flex-1 bg-gray-100 ml-4 opacity-50" />
                                    </div>
                                    <div className="space-y-1.5">
                                        {GENERAL_ITEMS.map(item => {
                                            const isSelected = selectedScreenKey === item.key;
                                            return (
                                                <button
                                                    key={item.key}
                                                    onClick={() => handleSelectScreen(item.key)}
                                                    className={`w-full group text-left px-4 py-3.5 rounded-2xl transition-all flex items-center justify-between active:scale-[0.98] ${isSelected
                                                        ? 'bg-white shadow-[0_4px_20px_rgba(245,73,39,0.08)] border border-red-100/50 text-[#F54927]'
                                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3.5">
                                                        <span className={`w-6 h-6 flex items-center justify-center transition-colors duration-200 ${isSelected ? 'text-[#F54927]' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                                            {item.icon}
                                                        </span>
                                                        <span className={`text-[15px] tracking-tight ${isSelected ? 'font-black' : 'font-bold'}`}>
                                                            {item.label}
                                                        </span>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#F54927] shadow-[0_0_8px_rgba(245,73,39,0.5)]" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            </div>

                            {/* Styled Sticky Profile Footer */}
                            <div className="mt-auto p-3 bg-white/60 backdrop-blur-xl border-t border-gray-100/80 sticky bottom-0 z-10 pb-[env(safe-area-inset-bottom,12px)]">
                                <div className="relative">
                                    <button
                                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                                        className={`w-full flex items-center justify-between p-2.5 rounded-[18px] transition-all duration-300 group/profile ${isProfileOpen || selectedScreenKey === 'account-details'
                                            ? 'bg-white shadow-[0_4px_25px_rgba(0,0,0,0.06)] ring-1 ring-gray-100'
                                            : 'bg-gray-50/50 hover:bg-white hover:shadow-sm ring-1 ring-transparent hover:ring-gray-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F54927] to-[#ff6b52] flex items-center justify-center text-white font-black text-[12px] shadow-lg shadow-red-500/20 group-hover/profile:scale-105 transition-transform">
                                                    {(adminData?.adminusers as any)?.full_name ? (((adminData?.adminusers as any).full_name as string).split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()) : 'ED'}
                                                </div>
                                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[13px] font-black text-gray-900 tracking-tight leading-tight mb-0.5 group-hover/profile:text-[#F54927] transition-colors line-clamp-1">
                                                    {(adminData?.adminusers as any)?.full_name || 'Admin User'}
                                                </p>
                                                <p className="text-[10px] text-gray-500 font-bold truncate max-w-[130px] opacity-70">
                                                    {(adminData?.adminusers as any)?.email || 'admin@eddesk.com'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`w-6 h-6 flex items-center justify-center rounded-full transition-all duration-300 ${isProfileOpen ? 'bg-red-50 text-[#F54927] rotate-180' : 'text-gray-400'}`}>
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                                            </svg>
                                        </div>
                                    </button>

                                    {/* Mobile Profile Actions Card */}
                                    {isProfileOpen && (
                                        <div className="absolute bottom-full left-0 right-0 mb-3 bg-white rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-6 duration-300 origin-bottom">
                                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Account</span>
                                                <button onClick={() => setIsProfileOpen(false)} className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="p-2 space-y-1">
                                                <button
                                                    onClick={() => { handleSelectScreen('account-details'); setIsProfileOpen(false); }}
                                                    className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-[14px] font-black text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all"
                                                >
                                                    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                    </div>
                                                    Edit Profile
                                                </button>
                                                <button
                                                    onClick={() => { setIsProfileOpen(false); handleLogout(); }}
                                                    className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-[14px] font-black text-red-600 hover:bg-red-50 active:bg-red-100 transition-all"
                                                >
                                                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                        </svg>
                                                    </div>
                                                    Sign Out
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Components FAB */}
            {!generalItemSelected && !connectItemSelected && selectedScreen && (
                <div className="lg:hidden fixed bottom-6 left-0 right-0 z-40 flex justify-center pointer-events-none">
                    <button onClick={() => setIsMobileComponentListOpen(true)} className="bg-gray-900 text-white shadow-xl shadow-gray-900/20 px-6 py-3.5 rounded-full flex items-center gap-2.5 font-bold text-[14px] hover:bg-black transition-transform active:scale-95 pointer-events-auto border border-gray-800 tracking-wide">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        Components
                    </button>
                </div>
            )}

            {/* Mobile Components Dialog */}
            {isMobileComponentListOpen && selectedScreen && (
                <div className="fixed inset-0 z-[200] lg:hidden flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsMobileComponentListOpen(false)} />
                    <div className="relative w-full max-sm bg-white rounded-[28px] shadow-2xl flex flex-col max-h-[70vh] animate-in zoom-in-95 fade-in duration-300 overflow-hidden border border-gray-100">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                            <div>
                                <h3 className="text-[17px] font-black text-gray-900 capitalize tracking-tight leading-none mb-1">{selectedScreen.screenname ?? selectedScreen.screenslug}</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">COMPONENTS</p>
                            </div>
                            <button onClick={() => setIsMobileComponentListOpen(false)} className="w-9 h-9 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-900 rounded-full transition-all shadow-sm border border-gray-100 active:scale-90">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 no-scrollbar">
                            {displayItems.map((entry) => {
                                if (entry.type === 'single') {
                                    const comp = entry.item;
                                    const isSelected = selectedComponentKey === comp.key;
                                    return (
                                        <button
                                            key={comp.key}
                                            ref={isSelected ? selectedComponentRef : null}
                                            onClick={() => { setSelectedComponentKey(comp.key); setIsMobileComponentListOpen(false); }}
                                            className={`w-full text-left px-4 py-4 rounded-2xl text-[14px] transition-all flex items-center justify-between group active:scale-[0.98] ${isSelected
                                                ? 'bg-white shadow-[0_4px_20px_rgba(245,73,39,0.08)] text-[#F54927] font-black border border-red-100/50'
                                                : 'bg-transparent text-gray-600 font-bold border border-transparent hover:bg-gray-50 hover:text-gray-900'
                                                }`}
                                        >
                                            <span className="truncate pr-4">{comp.componentregistry?.componentname ?? comp.componentcode}</span>
                                            {isSelected && (
                                                <div className="w-6 h-6 rounded-full bg-[#F54927] flex items-center justify-center shadow-[0_2px_8px_rgba(245,73,39,0.4)] transition-transform group-hover:scale-110">
                                                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                    );
                                } else {
                                    // Group
                                    const groupKey = `group:${entry.mode}:${entry.name}`;
                                    const items = entry.items;
                                    const isSelected = selectedComponentKey === groupKey || items.some(i => i.key === selectedComponentKey);

                                    let displayName = entry.name;
                                    let variantLabel = "";

                                    if (entry.mode === 'exclusive') {
                                        displayName = items[0].componentregistry?.componentname ?? entry.name;
                                        const activeVariant = adminData.schools.componentvariants?.[selectedScreen.screenslug || '']?.[entry.name];
                                        if (activeVariant) {
                                            variantLabel = activeVariant.charAt(0).toUpperCase() + activeVariant.slice(1);
                                        } else {
                                            variantLabel = "";
                                        }
                                    } else {
                                        displayName = items[0].componentregistry?.componentname ?? entry.name;
                                        variantLabel = "Merged";
                                    }

                                    return (
                                        <button
                                            key={groupKey}
                                            ref={isSelected ? selectedComponentRef : null}
                                            onClick={() => { setSelectedComponentKey(groupKey); setIsMobileComponentListOpen(false); }}
                                            className={`w-full text-left px-4 py-4 rounded-2xl text-[14px] transition-all flex items-center justify-between group active:scale-[0.98] ${isSelected
                                                ? 'bg-white shadow-[0_4px_20px_rgba(245,73,39,0.08)] text-[#F54927] font-black border border-red-100/50'
                                                : 'bg-transparent text-gray-600 font-bold border border-transparent hover:bg-gray-50 hover:text-gray-900'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 truncate pr-4">
                                                <span className="truncate capitalize">{displayName}</span>
                                                {variantLabel && (
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter shrink-0 ${isSelected ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"}`}>
                                                        {variantLabel}
                                                    </span>
                                                )}
                                            </div>
                                            {isSelected && (
                                                <div className="w-6 h-6 rounded-full bg-[#F54927] flex items-center justify-center shadow-[0_2px_8px_rgba(245,73,39,0.4)] transition-transform group-hover:scale-110">
                                                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                    );
                                }
                            })}
                        </div>
                        <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex justify-center">
                            <p className="text-[11px] font-bold text-gray-400 tracking-tight">Select a component to edit</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Search Dialog */}
            {isSearchOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsSearchOpen(false)} />
                    <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center border-b border-gray-100 px-4">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input autoFocus type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search screens..." className="flex-1 bg-transparent border-0 py-4 px-3 text-[15px] font-medium text-gray-900 focus:outline-none focus:ring-0 placeholder:text-gray-400" />
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto w-full">
                            {searchResults.length === 0 ? (
                                <div className="px-6 py-12 text-center text-gray-500">No results found.</div>
                            ) : (
                                <div className="py-2 w-full">
                                    {searchResults.map(result => (
                                        <button key={`${result.type}-${result.screen.key}-${result.component?.key || 'main'}`} onClick={() => handleSelectSearchResult(result)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#fff0ed] group transition-colors">
                                            <div className="flex items-center gap-3 w-full text-left">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-[#F54927] transition-all">
                                                    {result.type === 'screen' ? <GetIcon slug={result.screen.screenslug} /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[14px] font-bold text-gray-900 capitalize truncate group-hover:text-[#F54927]">{result.type === 'screen' ? (result.screen.screenname ?? result.screen.screenslug) : (result.component.componentregistry?.componentname ?? result.component.componentcode)}</span>
                                                    <span className="text-[11px] text-gray-500">{result.type === 'component' ? `${result.screen.screenname ?? result.screen.screenslug} Screen` : 'Screen'}</span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        {/* Template Scanner FAB */}
        <TemplateScanner adminData={adminData} />
        </div>
        </LoadingProvider>
    );
}
