"use client";
import { generateId } from '@/lib/generateId';

import React, { useState, useMemo, useEffect } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData, getInitialValuesFromFilters } from "@/domains/dashboard/hooks/useComponentData";
import { upsertComponentData, deleteComponentData } from "@/domains/dashboard/actions";
import { useRouter } from "next/navigation";
import type { TemplateComponent, ComponentPlacement } from "@/domains/auth/types";
import { Check, X, Plus, Trash2, LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AcademicsListEditorProps {
    component: TemplateComponent;
    schoolKey: string;
}

export default function AcademicsListEditor({ component, schoolKey }: AcademicsListEditorProps) {
    const config = component.config as any;
    const isEditable = component.iseditable;
    const tableName = (component.componentregistry as any)?.tablename || 'academics';
    const itemCount = config?.itemcount ? parseInt(config.itemcount) : 3;
    const router = useRouter();

    const filters = useMemo(() => ({
        ...(config?.filters || {})
    }), [config?.filters]);

    const {
        records: academics,
        isLoading,
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
    const [editingItem, setEditingItem] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);

    const [placements, setPlacements] = useState<ComponentPlacement[]>(() => {
        return (component.contentplacements || [])
            .filter((p: ComponentPlacement) => p.isactive !== false)
            .sort((a: ComponentPlacement, b: ComponentPlacement) => (a.displayorder || 0) - (b.displayorder || 0));
    });

    useEffect(() => {
        const fetchPlacements = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('componentplacement')
                .select('*')
                .eq('templatecomponentkey', component.key)
                .is('isactive', true)
                .order('displayorder', { ascending: true });
            
            if (data) {
                setPlacements(data as ComponentPlacement[]);
            }
        };
        fetchPlacements();
    }, [component.key]);

    useEffect(() => {
        // Still keep this as a secondary sync if the prop ever actually updates
        setPlacements((component.contentplacements || [])
            .filter((p: ComponentPlacement) => p.isactive !== false)
            .sort((a: ComponentPlacement, b: ComponentPlacement) => (a.displayorder || 0) - (b.displayorder || 0)));
    }, [component.contentplacements]);

    const handleCloseModal = () => {
        setEditingItem(null);
        setTargetSlotIndex(null);
    };

    const handleSelectRecordFromIndex = async (slotIndex: number, recordKey: string) => {
        setIsUpdating(true);
        try {
            const existingPlacement = placements.find((p: ComponentPlacement) => p.displayorder === slotIndex);
            
            const response = await upsertComponentData('componentplacement', {
                key: existingPlacement?.key || undefined,
                schoolkey: schoolKey,
                templatecomponentkey: component.key,
                componentcode: component.componentcode || 'academicslist',
                contenttable: tableName,
                contentkey: recordKey,
                displayorder: slotIndex,
                isactive: true
            }, schoolKey);
            
            if (response.success && response.data) {
                const newPlacement = response.data as unknown as ComponentPlacement;
                setPlacements(prev => {
                    const next = prev.filter(p => p.displayorder !== newPlacement.displayorder);
                    next.push(newPlacement);
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

    const handleSelectRecord = async (recordKey: string) => {
        if (pickingForIndex === null) return;
        await handleSelectRecordFromIndex(pickingForIndex + 1, recordKey);
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

    const handleAddNew = (displayOrder?: number) => {
        if (displayOrder !== undefined) setTargetSlotIndex(displayOrder);
        setEditingItem({
            key: generateId(),
            schoolkey: schoolKey,
            ...getInitialValuesFromFilters(filters),
            title: "",
            subtitle: "",
            description: "",
            bulletinjson: [],
            imageurl: "",
            contenttype: config?.filters?.conditions?.find((c: any) => c.field === 'contenttype')?.value || 'text',
            displayorder: academics.length + 1,
            isactive: true
        });
    };

    const handleSave = async () => {
        if (!editingItem.title) return;
        setIsSaving(true);
        try {
            // Sanitize data
            const { isSkeleton, _isSkeleton, ...dataToSave } = editingItem;
            const response = await saveRecord(dataToSave);
            
            // If we came from an empty slot (Manual Mode), auto-place it
            if (config?.selectionmethod !== "auto" && targetSlotIndex !== null && (response as any).data) {
                const recordKey = (response as any).data.key;
                await handleSelectRecordFromIndex(targetSlotIndex, recordKey);
            }

            setEditingItem(null);
            handleCloseModal();
        } catch (err) {
            console.error("Failed to save academic record:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const slots = useMemo(() => {
        const limit = itemCount;
        
        if (config?.selectionmethod === "auto") {
            // In auto mode, we just show the records that match our filters
            const result: any[] = academics.slice(0, limit).map(item => ({ ...item }));
            
            // Add skeleton cards if we are below the limit and editable
            if (isEditable) {
                while (result.length < limit) {
                    result.push({ isSkeleton: true, displayorder: result.length + 1 });
                }
            }
            return result;
        } else {
            // Manual mode: using placements
            const result = [];
            for (let i = 0; i < limit; i++) {
                const placement = placements.find((p: ComponentPlacement) => p.displayorder === i + 1);
                const item = placement ? academics.find((f: any) => f.key === placement.contentkey) : null;
                result.push(item || { isSkeleton: true, displayorder: i + 1 });
            }
            return result;
        }
    }, [academics, placements, itemCount, config?.selectionmethod, isEditable]);

    return (
        <BaseEditor
            title="General Academics"
            description="Manage and showcase the different academic levels and sections of your school."
            icon={<LayoutGrid className="w-5 h-5" />}
            error={error}
            isEditable={isEditable}
            parentScreenName={component.parentscreenname}
            selectionMethod={config?.selectionmethod || 'manual'}
            emptySlotsCount={slots.filter((s:any) => s.isSkeleton).length}
            component={component}
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {slots.map((item: any, index: number) => {
                    const canEditSlot = isEditable || config?.selectionmethod === "manual";
                    
                    if (!item || item.isSkeleton) {
                        return (
                            <div
                                key={`empty-${index}`}
                                onClick={() => canEditSlot ? (isEditable ? handleAddNew(index + 1) : setPickingForIndex(index)) : undefined}
                                className={`p-8 border-2 border-dashed border-gray-100 rounded-[40px] flex flex-col items-center justify-center gap-4 text-gray-400 min-h-[300px] transition-all duration-500 ${canEditSlot ? "hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/10 cursor-pointer group" : "opacity-60 bg-gray-50/30"}`}
                            >
                                <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-all duration-500 ${canEditSlot ? "bg-gray-50 group-hover:bg-red-100 group-hover:scale-110 group-hover:rotate-90" : "bg-gray-100/50"}`}>
                                    {canEditSlot ? <Plus className="w-8 h-8 transition-transform" /> : <LayoutGrid className="w-8 h-8 opacity-30" />}
                                </div>
                                <div className="text-center px-6">
                                    {config?.selectionmethod !== "auto" && (
                                        <p className="text-[11px] font-black tracking-[0.2em] uppercase mb-1 opacity-25">Slot {index + 1}</p>
                                    )}
                                    <p className="text-[12px] font-black text-gray-400 tracking-widest uppercase group-hover:text-[#F54927]">
                                        {isEditable ? "Add Section" : (config?.selectionmethod === "manual" ? "Select section" : "No Data")}
                                    </p>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={item.key} className="group relative rounded-[40px] overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col p-8 text-left min-h-[300px]">
                            <div className="flex-1 flex flex-col min-w-0 w-full relative z-10">
                                <div className="mb-6 inline-block shrink-0 self-start">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-1 w-6 bg-[#F54927] rounded-full" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.subtitle}</p>
                                    </div>
                                    <h4 className="text-[20px] font-black text-gray-900 group-hover:text-[#F54927] transition-colors leading-tight truncate pr-4">{item.title}</h4>
                                </div>
                                <p className="text-[14px] text-gray-500 leading-relaxed line-clamp-4 font-medium">{item.description}</p>
                            </div>

                            <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-2 z-20">
                                {isEditable ? (
                                    <button
                                        onClick={() => setEditingItem(item)}
                                        className="p-4 bg-white rounded-2xl text-gray-400 hover:text-[#F54927] shadow-xl border border-gray-100 transition-all active:scale-90"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                ) : config?.selectionmethod === "manual" && (
                                    <>
                                        <button
                                            onClick={() => setPickingForIndex(index)}
                                            className="p-4 bg-white rounded-2xl text-gray-400 hover:text-[#F54927] shadow-xl border border-gray-100 transition-all active:scale-90"
                                        >
                                            <Plus className="w-5 h-5 rotate-45" />
                                        </button>
                                        <button
                                            onClick={() => handleClearSlot(index)}
                                            className="p-4 bg-white rounded-2xl text-gray-400 hover:text-red-500 shadow-xl border border-red-50 transition-all active:scale-90"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Selection Dialog */}
            {pickingForIndex !== null && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md">
                    <div className="absolute inset-0" onClick={() => setPickingForIndex(null)} />
                    <div className="relative bg-white w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-neutral-50/50">
                            <div>
                                <h3 className="text-[20px] font-black text-gray-900 tracking-tight">Select Section for Slot {pickingForIndex + 1}</h3>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Pick from your academics library</p>
                            </div>
                            <button onClick={() => setPickingForIndex(null)} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                            {academics.length === 0 ? (
                                <div className="py-20 text-center">
                                    <p className="text-gray-400 font-bold">No academic records found.</p>
                                    <p className="text-[11px] text-gray-400 mt-2 uppercase tracking-widest">Create records first or add directly to the slot</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {academics.map((item: any) => (
                                    <button
                                        key={item.key}
                                        onClick={() => handleSelectRecord(item.key)}
                                        className={`w-full text-left rounded-[28px] border-2 transition-all p-6 relative flex flex-col gap-3 ${placements.some((s: any) => s.contentkey === item.key) ? "border-[#F54927] bg-red-50/20" : "border-gray-50 hover:border-red-100 bg-white"}`}
                                    >
                                        <h4 className="text-[16px] font-black text-gray-900 truncate pr-4">{item.title}</h4>
                                        <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest">{item.subtitle}</p>
                                        <p className="text-[13px] text-gray-500 line-clamp-2 leading-relaxed">{item.description}</p>
                                        
                                        {placements.some((s: any) => s.contentkey === item.key) && (
                                            <div className="absolute top-4 right-4 w-6 h-6 bg-[#F54927] text-white rounded-full flex items-center justify-center shadow-lg">
                                                <Check className="w-4 h-4" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit/Add Modal */}
            {editingItem && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={handleCloseModal} />
                    <div className="relative bg-white w-full max-w-2xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white">
                            <div>
                                <h3 className="text-[22px] font-black text-gray-900 tracking-tight">
                                    {academics.some(f => f.key === editingItem.key) ? 'Update' : 'Add'} Academic Section
                                </h3>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage details and curriculum flow</p>
                            </div>
                            <button onClick={handleCloseModal} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3 col-span-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Section Title</label>
                                    <input
                                        type="text"
                                        value={editingItem.title}
                                        onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                                        className="w-full px-6 py-5 bg-neutral-50/80 border-2 border-transparent focus:bg-white focus:border-[#F54927] rounded-[24px] transition-all text-[15px] font-bold outline-none shadow-sm"
                                        placeholder="e.g. Primary Education"
                                    />
                                </div>
                                <div className="space-y-3 col-span-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Subtitle / Grade Range</label>
                                    <input
                                        type="text"
                                        value={editingItem.subtitle}
                                        onChange={e => setEditingItem({ ...editingItem, subtitle: e.target.value })}
                                        className="w-full px-6 py-5 bg-neutral-50/80 border-2 border-transparent focus:bg-white focus:border-[#F54927] rounded-[24px] transition-all text-[14px] font-bold outline-none shadow-sm"
                                        placeholder="e.g. Nursery to Class 10"
                                    />
                                </div>
                                <div className="space-y-3 col-span-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Detailed Description</label>
                                    <textarea
                                        rows={4}
                                        value={editingItem.description}
                                        onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                                        className="w-full px-6 py-5 bg-neutral-50/80 border-2 border-transparent focus:bg-white focus:border-[#F54927] rounded-[24px] transition-all text-[14px] font-bold outline-none resize-none shadow-sm"
                                        placeholder="Briefly describe the curriculum and approach..."
                                    />
                                </div>
                                {itemCount > 1 && (
                                    <div className="space-y-3 col-span-1">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Display Order</label>
                                        <input
                                            type="number"
                                            value={editingItem.displayorder || ""}
                                            onChange={e => setEditingItem({ ...editingItem, displayorder: parseInt(e.target.value) || 0 })}
                                            className="w-full px-6 py-5 bg-neutral-50/80 border-2 border-transparent focus:bg-white focus:border-[#F54927] rounded-[24px] transition-all text-[14px] font-bold outline-none shadow-sm"
                                            placeholder="Position (e.g. 1)"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-10 bg-neutral-50/50 flex items-center justify-between border-t border-gray-100">
                            <button
                                onClick={() => { if (confirm("Delete this academic record?")) { removeRecord(editingItem.key); handleCloseModal(); } }}
                                className="px-8 py-4 text-[13px] font-black text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-95"
                            >
                                Delete Record
                            </button>
                            <div className="flex gap-4">
                                <button
                                    onClick={handleCloseModal}
                                    className="px-8 py-4 text-[13px] font-bold text-gray-400 hover:text-gray-900 transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isSaving}
                                    onClick={handleSave}
                                    className={`
                                        px-12 py-4 text-[14px] font-black rounded-[20px] shadow-xl transition-all active:scale-[0.97] flex items-center gap-3 h-[60px]
                                        ${isSaving 
                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                                            : "bg-neutral-950 text-white hover:bg-black"
                                        }
                                    `}
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <span>{academics.some(f => f.key === editingItem.key) ? 'Update Section' : 'Save Section'}</span>
                                            <Check className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </BaseEditor>
    );
}
