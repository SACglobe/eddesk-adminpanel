"use client";

import { useState, useMemo, useEffect } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData } from "@/domains/dashboard/hooks/useComponentData";
import { upsertComponentData, deleteComponentData } from "@/domains/dashboard/actions";
import IconPicker from "@/components/ui/IconPicker";
import DynamicIcon from "@/components/ui/DynamicIcon";
import { useRouter } from "next/navigation";
import type { TemplateComponent, TemplateScreen, ComponentPlacement } from "@/domains/auth/types";

interface StatsEditorProps {
    component: TemplateComponent;
    screen: TemplateScreen;
    schoolKey: string;
}

export default function StatsEditor({ component, screen, schoolKey }: StatsEditorProps) {
    const tableName = (component.componentregistry as any)?.tablename || "schoolstats";
    
    const config = component.config as any;
    const isEditable = component.iseditable;
    const itemCount = config?.itemcount ? parseInt(config.itemcount) : 0;
    const router = useRouter();

    const filters = useMemo(() => ({
        ...(config?.filters || {})
    }), [config?.filters]);

    const {
        records: stats,
        isSaving,
        error,
        saveRecord,
        removeRecord
    } = useComponentData({
        tableName,
        schoolKey,
        filters,
        initialRecords: (component as any).content || []
    });

    const [pickingForIndex, setPickingForIndex] = useState<number | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [editingStat, setEditingStat] = useState<any>(null);

    const [placements, setPlacements] = useState<ComponentPlacement[]>(() => {
        return (component.contentplacements || [])
            .filter((p: ComponentPlacement) => p.isactive !== false)
            .sort((a: ComponentPlacement, b: ComponentPlacement) => (a.displayorder || 0) - (b.displayorder || 0));
    });

    useEffect(() => {
        setPlacements((component.contentplacements || [])
            .filter((p: ComponentPlacement) => p.isactive !== false)
            .sort((a: ComponentPlacement, b: ComponentPlacement) => (a.displayorder || 0) - (b.displayorder || 0)));
    }, [component.contentplacements]);

    const handleSelectRecord = async (recordKey: string) => {
        if (pickingForIndex === null) return;
        setIsUpdating(true);
        try {
            const existingPlacement = placements.find((p: ComponentPlacement) => p.displayorder === pickingForIndex + 1);
            
            const response = await upsertComponentData('componentplacement', {
                key: existingPlacement?.key || undefined,
                schoolkey: schoolKey,
                templatecomponentkey: component.key,
                componentcode: component.componentcode || 'schoolstats',
                contenttable: tableName,
                contentkey: recordKey,
                displayorder: pickingForIndex + 1,
                isactive: true
            }, schoolKey);
            
            if (response.success && response.data) {
                setPlacements(prev => {
                    const next = prev.filter(p => p.displayorder !== response.data.displayorder);
                    next.push(response.data);
                    return next.sort((a,b) => (a.displayorder || 0) - (b.displayorder || 0));
                });
            }
            
            setPickingForIndex(null);
            router.refresh();
        } catch (err) {
            console.error("Failed to update placement:", err);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleClearSlot = async (index: number) => {
        const placement = placements.find((p: ComponentPlacement) => p.displayorder === index + 1);
        if (!placement) return;

        setIsUpdating(true);
        try {
            const response = await deleteComponentData('componentplacement', placement.key, schoolKey);
            if (response.success) {
                setPlacements(prev => prev.filter(p => p.key !== placement.key));
            }
            router.refresh();
        } catch (err) {
            console.error("Failed to delete placement:", err);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAddNew = () => {
        setEditingStat({
            key: crypto.randomUUID(),
            schoolkey: schoolKey,
            ...filters,
            label: "New Stat",
            value: "0+",
            icon: "TrendingUp",
            isactive: true,
            displayorder: stats.length + 1
        });
    };

    const slots = useMemo(() => {
        const result = [];
        
        if (config?.selectionmethod === "manual") {
            const limit = itemCount || stats.length;
            for (let i = 0; i < limit; i++) {
                const placement = placements.find((p: ComponentPlacement) => p.displayorder === i + 1);
                const item = placement ? stats.find((s: any) => s.key === placement.contentkey) : null;
                result.push(item || { isSkeleton: true, displayorder: i + 1 });
            }
        } else {
            const limit = itemCount > 0 ? itemCount : stats.length;
            for (let i = 0; i < limit; i++) {
                result.push(stats[i] || { isSkeleton: true, displayorder: i + 1 });
            }
        }
        return result;
    }, [stats, placements, itemCount, config?.selectionmethod, isEditable]);

    return (
        <BaseEditor
            title="Statistics Section"
            description="Highlight key numbers like student count, faculty, or awards."
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            }
            error={error}
            isEditable={isEditable}
            parentScreenName={component.parentscreenname}
            selectionMethod={config?.selectionmethod}
            emptySlotsCount={slots.filter((s:any) => s.isSkeleton).length}
        >
            <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {slots.map((stat: any, index: number) => {
                        const canEditSlot = isEditable || config?.selectionmethod === "manual";

                        if (!stat || stat.isSkeleton) {
                            return (
                                <div
                                    key={`empty-${index}`}
                                    onClick={() => canEditSlot ? (isEditable ? handleAddNew() : setPickingForIndex(index)) : undefined}
                                    className={`p-6 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 min-h-[120px] ${canEditSlot ? "hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/30 cursor-pointer transition-all hover:scale-[0.98]" : "opacity-70 bg-gray-50/30"}`}
                                >
                                    {canEditSlot ? (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    ) : (
                                        <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                        </svg>
                                    )}
                                    <div className="text-center mt-2">
                                        <p className="text-[13px] font-black tracking-tight">Slot {index + 1}</p>
                                        <p className="text-[11px] font-medium text-gray-400">{isEditable ? "Add statistic" : (config?.selectionmethod === "manual" ? "Select statistic" : "No Data")}</p>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={stat.key}
                                className="group p-6 bg-white border border-gray-100 rounded-2xl hover:border-red-100 hover:shadow-xl hover:shadow-red-500/5 transition-all relative flex flex-col items-center text-center justify-center min-h-[120px]"
                            >
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    {isEditable ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditingStat(stat); }}
                                            className="p-1.5 bg-white shadow-sm border border-gray-100 rounded-lg text-gray-400 hover:text-[#F54927]"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    ) : config?.selectionmethod === "manual" && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setPickingForIndex(index); }}
                                                className="p-1.5 bg-white shadow-sm border border-gray-100 rounded-lg text-gray-400 hover:text-blue-500"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleClearSlot(index); }}
                                                className="p-1.5 bg-white shadow-sm border border-gray-100 rounded-lg text-gray-400 hover:text-red-500"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </>
                                    )}
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
                                    <DynamicIcon name={stat.icon} size={20} className="text-gray-400 group-hover:text-[#F54927] transition-colors" />
                                </div>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-[32px] font-black text-gray-900 tracking-tight leading-none">{stat.value}</span>
                                </div>
                                <p className="text-[12px] font-bold text-gray-400 mt-2 uppercase tracking-wide">{stat.label}</p>
                            </div>
                        );
                    })}

                    {isEditable && config?.selectionmethod !== "manual" && (
                        <button
                            onClick={() => handleAddNew()}
                            className="p-6 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/30 transition-all active:scale-[0.98] min-h-[120px]"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-[13px] font-black tracking-tight">Add New Stat</span>
                        </button>
                    )}
                </div>

                {/* Selection Dialog */}
                {pickingForIndex !== null && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm shadow-2xl">
                        <div className="absolute inset-0" onClick={() => setPickingForIndex(null)} />
                        <div className="relative bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                                <h3 className="text-[18px] font-black text-gray-900 tracking-tight">Select Statistic for Slot {pickingForIndex + 1}</h3>
                                <button onClick={() => setPickingForIndex(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
                                {stats.length === 0 ? (
                                    <div className="py-20 text-center text-gray-400 font-bold">No statistics records found.</div>
                                ) : (
                                    stats.map((item: any) => (
                                        <button
                                            key={item.key}
                                            onClick={() => handleSelectRecord(item.key)}
                                            className={`w-full p-6 flex flex-col text-center items-center justify-center gap-2 rounded-[24px] border-2 transition-all ${slots.some((s: any) => !s.isSkeleton && s.key === item.key) ? "border-red-500 bg-red-50/20" : "border-gray-50 hover:border-red-100 bg-white"}`}
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-1">
                                                <DynamicIcon name={item.icon} size={20} className="text-gray-400" />
                                            </div>
                                            <span className="text-[28px] font-black text-gray-900 leading-none">{item.value}</span>
                                            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">{item.label}</p>
                                            {slots.some((s: any) => !s.isSkeleton && s.key === item.key) && (
                                                <div className="absolute top-4 right-4 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {editingStat && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="absolute inset-0" onClick={() => setEditingStat(null)} />
                        <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                                <h3 className="text-[16px] font-black text-gray-900 capitalize">{stats.some((s: any) => s.key === editingStat.key) ? "Edit Statistic" : "New Statistic"}</h3>
                                <button onClick={() => setEditingStat(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Label</label>
                                    <input
                                        type="text"
                                        value={editingStat.label}
                                        onChange={e => setEditingStat({ ...editingStat, label: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none"
                                        placeholder="e.g. Students Enrolled"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <IconPicker
                                        value={editingStat.icon || ""}
                                        onChange={iconName => setEditingStat({ ...editingStat, icon: iconName })}
                                        label="Icon"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Value</label>
                                    <input
                                        type="text"
                                        value={editingStat.value}
                                        onChange={e => setEditingStat({ ...editingStat, value: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none"
                                        placeholder="e.g. 500+"
                                    />
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-50 bg-gray-50/30 flex items-center justify-between">
                                <button
                                    onClick={() => { removeRecord(editingStat.key); setEditingStat(null); }}
                                    className="px-5 py-3 text-[13px] font-bold text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                                >
                                    Delete
                                </button>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setEditingStat(null)}
                                        className="px-6 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-900 rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={isSaving || !editingStat.label}
                                        onClick={() => { saveRecord(editingStat); setEditingStat(null); }}
                                        className="px-8 py-3 bg-[#111827] text-white text-[13px] font-black rounded-xl hover:bg-black transition-all shadow-xl disabled:opacity-50"
                                    >
                                        {isSaving ? "Saving..." : (stats.some((s: any) => s.key === editingStat.key) ? "Update Stat" : "Add Stat")}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </BaseEditor>
    );
}
