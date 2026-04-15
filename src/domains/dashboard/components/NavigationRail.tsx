"use client";

import { useState, useRef, useEffect } from "react";
import { TemplateScreen } from "@/domains/auth/types";

interface NavigationRailProps {
    screens: TemplateScreen[];
    selectedScreenKey: string | null;
    onSelectScreen: (key: string) => void;
    schoolName?: string;
    schoolDomain?: string;
    adminData?: any;
    onLogout?: () => void;
}

export const CONNECT_ITEMS = [
    {
        key: 'admission-enquiries',
        label: 'Admission Enquiries',
        icon: (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
        )
    },
    {
        key: 'general-messages',
        label: 'General Messages',
        icon: (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
        )
    },
    {
        key: 'callback-requests',
        label: 'Callback Requests',
        icon: (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
        )
    },
];

export const GENERAL_ITEMS = [
    {
        key: 'plan-details',
        label: 'Plan Details',
        icon: (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
        )
    },
    {
        key: 'account-details',
        label: 'Account Details',
        icon: (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        )
    },
    {
        key: 'feedback',
        label: 'Feedback',
        icon: (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
        )
    },
    {
        key: 'help',
        label: 'Help',
        icon: (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )
    },
];

export const LEGAL_ITEMS = [
    { name: 'About Us', href: 'https://www.eddesk.in/about' },
    { name: 'Contact Us', href: 'https://www.eddesk.in/contact' },
    { name: 'Terms & Conditions', href: 'https://www.eddesk.in/terms' },
    { name: 'Privacy Policy', href: 'https://www.eddesk.in/privacy' },
    { name: 'Refund & Cancellation', href: 'https://www.eddesk.in/refund-cancellation' },
];

export default function NavigationRail({
    screens,
    selectedScreenKey,
    onSelectScreen,
    adminData,
    onLogout,
}: NavigationRailProps) {
    const sortedScreens = [...screens].sort(
        (a, b) => (a.displayorder ?? 0) - (b.displayorder ?? 0)
    );
    type PanelControlState = 'expanded' | 'expand_on_hover' | 'collapsed';
    const [panelState, setPanelState] = useState<PanelControlState>('expand_on_hover');
    const [showPanelOptions, setShowPanelOptions] = useState(false);
    
    // Refs
    const railRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const totalItems = sortedScreens.length + CONNECT_ITEMS.length + GENERAL_ITEMS.length;

    const widthClass = panelState === 'expanded'
        ? 'w-64'
        : panelState === 'collapsed'
            ? 'w-[72px]'
            : 'w-[72px] group-hover/rail:w-64';

    const shadowClass = panelState === 'expanded'
        ? 'border-r border-[#f1f1f1] bg-white'
        : panelState === 'collapsed'
            ? 'shadow-[4px_0_24px_rgba(0,0,0,0.02)] border-r border-[#f1f1f1]'
            : 'shadow-[4px_0_24px_rgba(0,0,0,0.02)] group-hover/rail:shadow-[8px_0_32px_rgba(245,73,39,0.08)] border-r border-[#f1f1f1]';

    const textOpacityClass = panelState === 'expanded'
        ? 'opacity-100'
        : panelState === 'collapsed'
            ? 'opacity-0'
            : 'opacity-0 group-hover/rail:opacity-100';

    const outerWidthClass = panelState === 'expanded' ? 'w-64' : 'w-[72px]';
    const isCollapsedMode = panelState === 'collapsed' || panelState === 'expand_on_hover';

    return (
        <div className={`relative h-full flex-shrink-0 z-50 group/rail font-sans transition-all duration-500 ${outerWidthClass}`}>
            <div
                ref={railRef}
                className={`absolute top-0 left-0 h-full backdrop-blur-xl transition-all duration-500 flex flex-col overflow-visible ${widthClass} ${shadowClass} z-50`}
            >
                {/* ── Navigation Content (Scrollable Area) ── */}
                <div
                    className={`pt-4 custom-scrollbar overflow-y-auto overflow-x-hidden flex-1`}
                >
                    {/* Screens label */}
                    <div className={`px-5 pb-2 ${textOpacityClass} transition-opacity duration-300`}>
                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                            Screens
                        </h3>
                    </div>

                    {/* Screen items */}
                    <nav className="px-3.5 space-y-1">
                        {sortedScreens.map((screen) => {
                            const isActive = screen.key === selectedScreenKey;
                            return (
                                <button
                                    key={screen.key}
                                    onClick={() => onSelectScreen(screen.key)}
                                    className={`w-full flex items-center rounded-xl text-[13px] font-semibold transition-all duration-300 relative group/item ${isActive
                                        ? 'text-[#F54927] bg-[#F54927]/5'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/80'
                                        } px-3.5 py-2.5 h-12`}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#F54927] rounded-r-full shadow-[0_0_12px_rgba(245,73,39,0.4)]" />
                                    )}
                                    <span className={`transition-all duration-300 flex-shrink-0 transform group-hover/item:scale-110 ${isActive ? "text-[#F54927]" : "text-gray-400"}`}>
                                        <GetIcon slug={screen.screenslug} />
                                    </span>
                                    <span className={`ml-4 truncate ${textOpacityClass} transition-all duration-500 capitalize tracking-tight font-bold w-full text-left`}>
                                        {screen.screenname ?? screen.screenslug}
                                    </span>
                                    {isCollapsedMode && (
                                        <div className={`absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none whitespace-nowrap z-[100] shadow-xl border border-gray-800 transition-all duration-200 translate-x-1 group-hover/item:translate-x-0 group-hover/item:opacity-100 ${panelState === 'expand_on_hover' ? 'group-hover/rail:hidden' : ''}`}>
                                            {toTitleCase(screen.screenname ?? screen.screenslug)}
                                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45 border-l border-b border-gray-800" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Connect section */}
                    <div className="mx-3.5 my-3 border-t border-gray-100" />
                    <div className={`px-5 pb-2 ${textOpacityClass} transition-opacity duration-300`}>
                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                            Connect
                        </h3>
                    </div>
                    <nav className="px-3.5 space-y-1">
                        {CONNECT_ITEMS.map((item) => {
                            const isActive = item.key === selectedScreenKey;
                            return (
                                <button
                                    key={item.key}
                                    onClick={() => onSelectScreen(item.key)}
                                    className={`w-full flex items-center rounded-xl text-[13px] font-semibold transition-all duration-300 relative group/item ${isActive
                                        ? 'text-[#F54927] bg-[#F54927]/5'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/80'
                                        } px-3.5 py-2.5 h-12`}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#F54927] rounded-r-full shadow-[0_0_12px_rgba(245,73,39,0.4)]" />
                                    )}
                                    <span className={`transition-all duration-300 flex-shrink-0 transform group-hover/item:scale-110 ${isActive ? "text-[#F54927]" : "text-gray-400"}`}>
                                        {item.icon}
                                    </span>
                                    <span className={`ml-4 truncate ${textOpacityClass} transition-all duration-500 tracking-tight font-bold w-full text-left`}>
                                        {item.label}
                                    </span>
                                    {isCollapsedMode && (
                                        <div className={`absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none whitespace-nowrap z-[100] shadow-xl border border-gray-800 transition-all duration-200 translate-x-1 group-hover/item:translate-x-0 group-hover/item:opacity-100 ${panelState === 'expand_on_hover' ? 'group-hover/rail:hidden' : ''}`}>
                                            {item.label}
                                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45 border-l border-b border-gray-800" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* General section */}
                    <div className="mx-3.5 my-3 border-t border-gray-100" />
                    <div className={`px-5 pb-2 ${textOpacityClass} transition-opacity duration-300`}>
                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                            General
                        </h3>
                    </div>
                    <nav className="px-3.5 space-y-1">
                        {GENERAL_ITEMS.map((item) => {
                            const isActive = item.key === selectedScreenKey;
                            return (
                                <button
                                    key={item.key}
                                    onClick={() => onSelectScreen(item.key)}
                                    className={`w-full flex items-center rounded-xl text-[13px] font-semibold transition-all duration-300 relative group/item ${isActive
                                        ? 'text-[#F54927] bg-[#F54927]/5'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/80'
                                        } px-3.5 py-2.5 h-12`}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#F54927] rounded-r-full shadow-[0_0_12px_rgba(245,73,39,0.4)]" />
                                    )}
                                    <span className={`transition-all duration-300 flex-shrink-0 transform group-hover/item:scale-110 ${isActive ? "text-[#F54927]" : "text-gray-400"}`}>
                                        {item.icon}
                                    </span>
                                    <span className={`ml-4 truncate ${textOpacityClass} transition-all duration-500 tracking-tight font-bold w-full text-left`}>
                                        {item.label}
                                    </span>
                                    {isCollapsedMode && (
                                        <div className={`absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none whitespace-nowrap z-[100] shadow-xl border border-gray-800 transition-all duration-200 translate-x-1 group-hover/item:translate-x-0 group-hover/item:opacity-100 ${panelState === 'expand_on_hover' ? 'group-hover/rail:hidden' : ''}`}>
                                            {item.label}
                                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45 border-l border-b border-gray-800" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Legal section */}
                    <div className="mx-3.5 my-3 border-t border-gray-100" />
                    <div className={`px-5 pb-2 ${textOpacityClass} transition-opacity duration-300`}>
                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                            Legal
                        </h3>
                    </div>
                    <nav className="px-3.5 space-y-1 pb-8">
                        {LEGAL_ITEMS.map((item) => (
                            <a
                                key={item.name}
                                href={item.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`w-full flex items-center rounded-xl text-[13px] font-semibold transition-all duration-300 relative group/item text-gray-500 hover:text-gray-900 hover:bg-gray-50/80 px-3.5 py-2.5 h-12`}
                            >
                                <span className={`transition-all duration-300 flex-shrink-0 transform group-hover/item:scale-110 text-gray-400`}>
                                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </span>
                                <span className={`ml-4 truncate ${textOpacityClass} transition-all duration-500 tracking-tight font-bold w-full text-left`}>
                                    {item.name}
                                </span>
                                {isCollapsedMode && (
                                    <div className={`absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-[11px] font-bold rounded-lg opacity-0 pointer-events-none whitespace-nowrap z-[100] shadow-xl border border-gray-800 transition-all duration-200 translate-x-1 group-hover/item:translate-x-0 group-hover/item:opacity-100 ${panelState === 'expand_on_hover' ? 'group-hover/rail:hidden' : ''}`}>
                                        {item.name}
                                        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45 border-l border-b border-gray-800" />
                                    </div>
                                )}
                            </a>
                        ))}
                    </nav>
                </div>

                {/* ── Sidebar Control — always at the bottom ── */}

                <div
                    className="border-t border-gray-100 flex-shrink-0 relative"
                    style={{ height: '56px' }}
                    ref={menuRef}
                >
                    <div className="px-3.5 h-full flex items-center">
                        <button
                            onClick={() => setShowPanelOptions(!showPanelOptions)}
                            className="w-full flex items-center rounded-md text-[13px] font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-3.5 py-2.5 transition-colors group/ctrl"
                        >
                            <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <rect strokeWidth={1.5} x={3} y={3} width={18} height={18} rx={2} />
                                <path strokeWidth={1.5} d="M9 3v18" />
                            </svg>
                            <span className={`ml-4 truncate w-full text-left ${textOpacityClass} transition-opacity duration-500 tracking-tight`}>
                                Sidebar control
                            </span>
                        </button>
                    </div>

                    {showPanelOptions && (
                        <div className={`absolute bottom-full mb-1 w-48 bg-white rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-gray-200 z-[100] ${panelState === 'collapsed' ? 'left-14' : 'left-4'}`}>
                            <div className="px-3 py-2 text-[11px] font-semibold text-gray-500 border-b border-gray-100">Sidebar control</div>
                            <div className="py-1">
                                {(['expanded', 'collapsed', 'expand_on_hover'] as PanelControlState[]).map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => { setPanelState(opt); setShowPanelOptions(false); }}
                                        className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-gray-100 transition-colors flex items-center gap-2.5 ${panelState === opt ? 'text-gray-900 font-medium' : 'text-gray-600'}`}
                                    >
                                        <div className="w-3 flex items-center justify-center">
                                            {panelState === opt && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-800" />
                                            )}
                                        </div>
                                        {opt.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Icon Components & Mapping
export function GetIcon({ slug }: { slug: string | null | undefined }) {
    const iconSize = "w-[18px] h-[18px]";

    const icons = {
        home: <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
        about: <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        gallery: <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
        events: <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
        admission: <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
        contact: <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
        academics: <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>,
        activities: <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        infrastructure: <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
        faculty: <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    };

    const lowercaseSlug = (slug ?? '').toLowerCase();
    return (icons as any)[lowercaseSlug] || <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 6h18M3 14h18M3 18h18" /></svg>;
}

function toTitleCase(str: string) {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}
