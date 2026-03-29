"use client";

import { TemplateScreen, TemplateComponent } from "@/domains/auth/types";
import { getEnrichedConfig } from "../utils/componentUtils";

interface ComponentListPanelProps {
    selectedScreen: TemplateScreen | null;
    selectedComponentKey: string | null;
    onSelectComponent: (key: string) => void;
    componentVariants?: Record<string, string>;
}

export default function ComponentListPanel({
    selectedScreen,
    selectedComponentKey,
    onSelectComponent,
    componentVariants = {},
}: ComponentListPanelProps) {
    if (!selectedScreen) {
        return (
            <div className="w-full sm:w-60 h-full bg-white border-r border-[#f1f1f1] flex flex-col p-4 flex-shrink-0">
                <div className="h-3 w-16 bg-gray-100 rounded mb-6 animate-pulse" />
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-8 w-full bg-gray-50 rounded-md animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    const components = selectedScreen.components ?? [];
    
    // Group components
    const groups: Map<string, { mode: 'exclusive' | 'merged', items: TemplateComponent[], order: number }> = new Map();
    const singles: TemplateComponent[] = [];

    components.forEach((comp: TemplateComponent) => {
        const config = getEnrichedConfig(comp);
        const groupName = config.group;
        const groupMode = config.groupmode;

        if (groupName && groupMode) {
            if (!groups.has(groupName)) {
                groups.set(groupName, { mode: groupMode, items: [], order: comp.displayorder ?? 0 });
            }
            // Ensure the component has the enriched config for internal logic
            const enrichedComp = { ...comp, config };
            groups.get(groupName)!.items.push(enrichedComp);
            
            // Use the lowest displayorder for the group
            if ((comp.displayorder ?? 0) < groups.get(groupName)!.order) {
                groups.get(groupName)!.order = comp.displayorder ?? 0;
            }
        } else {
            singles.push(comp);
        }
    });

    const displayItems: ({ type: 'single', item: TemplateComponent } | { type: 'group', name: string, mode: 'exclusive' | 'merged', items: TemplateComponent[], order: number })[] = [
        ...singles.map(s => ({ type: 'single' as const, item: s, order: s.displayorder ?? 0 })),
        ...Array.from(groups.entries()).map(([name, data]) => ({ type: 'group' as const, name, ...data }))
    ].sort((a, b) => a.order - b.order);

    return (
        <div className="w-full sm:w-60 h-full flex flex-col bg-white border-r border-[#f1f1f1] flex-shrink-0 z-10 overflow-y-auto pt-2 shadow-sm">
            {/* Header Section */}
            <div className="px-5 py-2.5 border-b border-[#f1f1f1]">
                <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Edition
                    </h2>
                </div>
                <p className="text-[14px] font-bold text-gray-900 px-0.5 capitalize">
                    {selectedScreen.screenname ?? selectedScreen.screenslug}
                </p>
            </div>

            {/* Sidebar List */}
            <div className="flex-1 overflow-y-auto w-full">
                <div className="px-3 py-4 relative">
                    <h3 className="px-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                        Components
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 rounded-full font-bold">
                            {displayItems.length}
                        </span>
                    </h3>

                    <div className="space-y-0.5">
                        {displayItems.length > 0 ? (
                            displayItems.map((entry) => {
                                if (entry.type === 'single') {
                                    const component = entry.item;
                                    const isActive = component.key === selectedComponentKey;
                                    return (
                                        <button
                                            key={component.key}
                                            onClick={() => onSelectComponent(component.key)}
                                            className={`
                                                w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md transition-all duration-150 text-left group
                                                ${isActive
                                                    ? "bg-gray-50 text-[#F54927] font-bold"
                                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                                }
                                            `}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#F54927] shadow-[0_0_8px_rgba(245,73,39,0.4)]" : "bg-gray-300 group-hover:bg-gray-400"}`} />
                                            <span className="text-[13px] font-medium truncate">
                                                {component.componentregistry?.componentname ?? component.componentcode}
                                            </span>
                                        </button>
                                    );
                                } else {
                                    // Group
                                    const groupKey = `group:${entry.mode}:${entry.name}`;
                                    const items = entry.items;
                                    
                                    // Highlight if the group itself is selected OR if one of its children is selected
                                    const isActive = selectedComponentKey === groupKey || items.some(i => i.key === selectedComponentKey);
                                    
                                    let displayName = entry.name;
                                    let variantLabel = "";

                                    if (entry.mode === 'exclusive') {
                                        // Use the component name from one of the members, or capitalize group name
                                        displayName = items[0].componentregistry?.componentname ?? entry.name;
                                        const activeVariant = componentVariants[entry.name];
                                        if (activeVariant) {
                                            variantLabel = activeVariant.charAt(0).toUpperCase() + activeVariant.slice(1);
                                        } else {
                                            variantLabel = "No Variant";
                                        }
                                    } else {
                                        // Merged: Use the component name from first item or display name
                                        displayName = items[0].componentregistry?.componentname ?? entry.name;
                                        variantLabel = "Merged";
                                    }

                                    return (
                                        <button
                                            key={groupKey}
                                            onClick={() => onSelectComponent(groupKey)}
                                            className={`
                                                w-full flex items-center justify-between px-3 py-1.5 rounded-md transition-all duration-150 text-left group
                                                ${isActive
                                                    ? "bg-gray-50 text-[#F54927] font-bold"
                                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-2.5 truncate">
                                                <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#F54927] shadow-[0_0_8px_rgba(245,73,39,0.4)]" : "bg-gray-400 group-hover:bg-gray-500"}`} />
                                                <span className="text-[13px] font-medium truncate capitalize">
                                                    {displayName}
                                                </span>
                                            </div>
                                            {variantLabel && (
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter ${isActive ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"}`}>
                                                    {variantLabel}
                                                </span>
                                            )}
                                        </button>
                                    );
                                }
                            })
                        ) : (
                            <div className="py-4 px-2">
                                <p className="text-[11px] text-gray-400 italic">No components found.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
