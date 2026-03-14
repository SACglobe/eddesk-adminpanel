"use client";

import { TemplateComponent, TemplateScreen } from "@/domains/auth/types";
import React from "react";
import HeroEditor from "./editors/HeroEditor";
import StatsEditor from "./editors/StatsEditor";
import BroadcastEditor from "./editors/BroadcastEditor";

interface EditorHostProps {
    selectedComponent: TemplateComponent | null;
    selectedScreen?: TemplateScreen | null;
    generalItem?: { key: string; label: string; icon: React.ReactNode } | null;
    schoolKey?: string;
    onBack?: () => void;
    onSearch?: () => void;
    allScreens?: TemplateScreen[];
}

export default function EditorHost({ selectedComponent, selectedScreen, generalItem, schoolKey, onBack, onSearch, allScreens }: EditorHostProps) {
    return (
        <div className="flex-1 bg-white flex flex-col min-w-0 transition-all duration-300">
            {/* Sub-header Bar (Supabase Table Look) */}
            <div className="h-14 border-b border-[#f1f1f1] flex items-center justify-between px-3 lg:px-6 bg-white flex-shrink-0 gap-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 sm:gap-4 flex-1">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="lg:hidden p-1.5 -ml-1 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0"
                            aria-label="Open mobile menu"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    )}
                    {generalItem && (
                        <div className="flex items-center gap-1.5 lg:gap-2 text-[12px] lg:text-[13px] font-medium text-gray-500 tracking-tight">
                            <span className="capitalize hover:text-gray-900 transition-colors cursor-default hidden lg:inline">General</span>
                            <span className="text-gray-300 font-light hidden lg:inline">/</span>
                            <span className="text-gray-900 font-bold truncate max-w-[120px] lg:max-w-none">{generalItem.label}</span>
                        </div>
                    )}
                    {!generalItem && selectedScreen && selectedComponent && (
                        <div className="flex items-center gap-1.5 lg:gap-2 text-[12px] lg:text-[13px] font-medium text-gray-500 tracking-tight">
                            <span className="capitalize hover:text-gray-900 transition-colors cursor-default truncate max-w-[100px] lg:max-w-none">{selectedScreen.screenname ?? selectedScreen.screenslug}</span>
                            <span className="text-gray-300 font-light">/</span>
                            <span className="text-gray-900 font-bold truncate max-w-[120px] lg:max-w-none">{selectedComponent.componentregistry?.componentname ?? selectedComponent.componentcode}</span>
                        </div>
                    )}
                </div>

                {/* Mobile Search Icon (Right Side) */}
                {onSearch && (
                    <button
                        onClick={onSearch}
                        className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors flex-shrink-0"
                        aria-label="Search screens"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Workspace Area */}
            <div className="flex-1 overflow-auto p-4 lg:p-8 xl:p-12 bg-[#f9fafb]">
                {generalItem ? (
                    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1 lg:mb-2 px-4 lg:px-0">
                            {generalItem.label}
                        </h1>
                        <p className="text-[13px] lg:text-[14px] text-gray-500 mb-6 lg:mb-10 px-4 lg:px-0">
                            Manage and configure settings for {generalItem.label}.
                        </p>

                        <div className="bg-white border border-[#f1f1f1] rounded-lg overflow-hidden shadow-sm mx-0 lg:mx-0">
                            <div className="border-b border-[#f1f1f1] bg-[#f9fafb] px-4 lg:px-6 py-3">
                                <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-widest">
                                    {generalItem.label} Settings
                                </h3>
                            </div>
                            <div className="px-4 lg:px-6 py-8 flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 bg-red-50 text-[#F54927] rounded-xl flex items-center justify-center mb-4">
                                    {generalItem.icon}
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    {generalItem.label} Editor
                                </h2>
                                <p className="text-[14px] text-gray-500 mt-2 max-w-sm mx-auto">
                                    The configuration form for {generalItem.label} will be implemented here.
                                </p>

                                <div className="mt-8 flex gap-3">
                                    <button className="px-6 py-2 bg-gradient-to-r from-[#F54927] to-[#ff6b52] hover:opacity-90 text-white text-[13px] font-bold rounded-md shadow-sm transition-all duration-150">
                                        Implement Feature
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : selectedComponent ? (
                    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 px-4 sm:px-0">
                            {String(selectedComponent.componentregistry?.componentname ?? selectedComponent.componentcode)}
                        </h1>
                        <p className="text-[13px] sm:text-[14px] text-gray-500 mb-6 sm:mb-10 px-4 sm:px-0">
                            Manage and configuration for the {String(selectedComponent.componentregistry?.componentname ?? selectedComponent.componentcode)} module.
                        </p>

                        <div className="bg-white border border-[#f1f1f1] rounded-lg overflow-hidden shadow-sm mx-0 md:mx-0">
                            <div className="border-b border-[#f1f1f1] bg-[#f9fafb] px-4 md:px-6 py-3">
                                <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-widest">
                                    Component Properties
                                </h3>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                {(() => {
                                    if (!schoolKey) return null;

                                    const code = selectedComponent.componentcode.toLowerCase();
                                    if (code === "hero") {
                                        return <HeroEditor component={selectedComponent} screen={selectedScreen!} schoolKey={schoolKey} allScreens={allScreens || []} />;
                                    }
                                    if (code === "schoolstats") {
                                        return <StatsEditor component={selectedComponent} screen={selectedScreen!} schoolKey={schoolKey} />;
                                    }
                                    if (code === "broadcast") {
                                        return <BroadcastEditor component={selectedComponent} screen={selectedScreen!} schoolKey={schoolKey} />;
                                    }

                                    return (
                                        <div className="px-4 md:px-6 py-8 flex flex-col items-center justify-center text-center">
                                            <div className="w-12 h-12 bg-red-50 text-[#F54927] rounded-xl flex items-center justify-center mb-4">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                                </svg>
                                            </div>
                                            <h2 className="text-lg font-bold text-gray-900">
                                                {String(selectedComponent.componentregistry?.componentname ?? selectedComponent.componentcode)} Editor
                                            </h2>
                                            <p className="text-[14px] text-gray-500 mt-2 max-w-sm mx-auto">
                                                Connected to <code className="bg-gray-100 text-[#F54927] px-1.5 py-0.5 rounded font-mono text-xs">{String(selectedComponent.componentregistry?.tablename)}</code>.
                                                The editor form for this component will appear here.
                                            </p>

                                            <div className="mt-8 flex gap-3">
                                                <button className="px-6 py-2 bg-gradient-to-r from-[#F54927] to-[#ff6b52] hover:opacity-90 text-white text-[13px] font-bold rounded-md shadow-sm transition-all duration-150">
                                                    Implement editor
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                        <div className="w-16 h-16 bg-gray-100/50 rounded-2xl flex items-center justify-center mb-6">
                            <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </div>
                        <h2 className="text-[16px] font-bold text-gray-900 mb-1">No component selected</h2>
                        <p className="text-[13px] text-gray-500">Select a component from the sidebar to start configuring it.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
