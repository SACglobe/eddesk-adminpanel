"use client";
import { generateId } from '@/lib/generateId';

import React, { useState, useMemo, useEffect } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData, getInitialValuesFromFilters } from "@/domains/dashboard/hooks/useComponentData";
import { getEnrichedConfig } from "@/domains/dashboard/utils/componentUtils";
import { upsertComponentData, deleteComponentData } from "@/domains/dashboard/actions";
import { useRouter } from "next/navigation";
import type { TemplateComponent, ComponentPlacement } from "@/domains/auth/types";
import MediaUpload from "@/components/ui/MediaUpload";
import { Check, X, Plus, Trash2, LayoutGrid, Activity } from "lucide-react";
import { uploadFile } from "@/lib/supabase/storage";
import { createClient } from "@/lib/supabase/client";

interface HighlightedActivitiesEditorProps {
    component: TemplateComponent;
    schoolKey: string;
}

export default function HighlightedActivitiesEditor({ component, schoolKey }: HighlightedActivitiesEditorProps) {
    const config = useMemo(() => getEnrichedConfig(component), [component]);
    const isIconVariant = useMemo(() => config?.variant === 'bulletintextwithicon', [config?.variant]);
    const isEditable = component.iseditable;
    const tableName = (component.componentregistry as any)?.tablename || config?.datasource || 'academics';
    const itemCount = 1; // Explicitly 1 for highlighted section
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

    // Staged upload state
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

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
        setPlacements((component.contentplacements || [])
            .filter((p: ComponentPlacement) => p.isactive !== false)
            .sort((a: ComponentPlacement, b: ComponentPlacement) => (a.displayorder || 0) - (b.displayorder || 0)));
    }, [component.contentplacements]);

    useEffect(() => {
        return () => {
            if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        };
    }, [pendingPreviewUrl]);

    const handleCloseModal = () => {
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        setPendingFile(null);
        setPendingPreviewUrl(null);
        setEditingItem(null);
        setTargetSlotIndex(null);
    };

    const handleFileSelect = (file: File) => {
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        const url = URL.createObjectURL(file);
        setPendingFile(file);
        setPendingPreviewUrl(url);
    };

    const handleSelectRecordFromIndex = async (slotIndex: number, recordKey: string) => {
        setIsUpdating(true);
        try {
            const existingPlacement = placements.find((p: ComponentPlacement) => p.displayorder === slotIndex);
            
            const response = await upsertComponentData('componentplacement', {
                key: existingPlacement?.key || undefined,
                schoolkey: schoolKey,
                templatecomponentkey: component.key,
                componentcode: component.componentcode || 'highlightedactivites',
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
            contenttype: config?.filters?.conditions?.find((c: any) => c.field === 'contenttype')?.value || 'bulletintextwithimage',
            displayorder: academics.length + 1,
            isactive: true
        });
    };

    const handleSave = async () => {
        if (!editingItem.title || (!isIconVariant && !editingItem.imageurl && !pendingFile)) return;
        setIsSaving(true);
        try {
            let finalItem = { ...editingItem };

            if (pendingFile) {
                setIsUploading(true);
                try {
                    const uploadedUrl = await uploadFile(pendingFile, schoolKey, tableName);
                    finalItem.imageurl = uploadedUrl;
                } catch (err) {
                    console.error("Upload failed:", err);
                    throw err;
                } finally {
                    setIsUploading(false);
                }
            }

            const { isSkeleton, _isSkeleton, ...dataToSave } = finalItem;
            const response = await saveRecord(dataToSave);
            
            if (config?.selectionmethod !== "auto" && targetSlotIndex !== null && response?.data) {
                const recordKey = (response.data as any).key;
                await handleSelectRecordFromIndex(targetSlotIndex, recordKey);
            }

            setEditingItem(null);
            handleCloseModal();
        } catch (err) {
            console.error("Failed to save activity record:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const slots = useMemo(() => {
        const limit = itemCount;
        
        if (config?.selectionmethod === "auto") {
            const result: any[] = academics.slice(0, limit).map(item => ({ ...item }));
            if (isEditable) {
                while (result.length < limit) {
                    result.push({ isSkeleton: true, displayorder: result.length + 1 });
                }
            }
            return result;
        } else {
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
            title="Highlighted Activities"
            description="Feature a specific school activity or program with a high-impact layout."
            icon={<Activity className="w-5 h-5 text-red-500" />}
            error={error}
            isEditable={isEditable}
            parentScreenName={component.parentscreenname}
            selectionMethod={config?.selectionmethod || 'manual'}
            emptySlotsCount={slots.filter((s:any) => s.isSkeleton).length}
            component={component}
        >
            <div className="max-w-4xl mx-auto">
                {slots.map((item: any, index: number) => {
                    const canEditSlot = isEditable || config?.selectionmethod === "manual";
                    
                    if (!item || item.isSkeleton) {
                        return (
                            <div
                                key={`empty-${index}`}
                                onClick={() => canEditSlot ? (isEditable ? handleAddNew(index + 1) : setPickingForIndex(index)) : undefined}
                                className={`p-10 border-2 border-dashed border-gray-100 rounded-[48px] flex flex-col items-center justify-center gap-6 text-gray-400 min-h-[450px] transition-all duration-500 shadow-sm ${canEditSlot ? "hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/10 cursor-pointer group hover:shadow-2xl hover:shadow-red-500/10" : "opacity-60 bg-gray-50/30"}`}
                            >
                                <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center transition-all duration-500 ${canEditSlot ? "bg-gray-50 group-hover:bg-red-100 group-hover:scale-110 group-hover:rotate-12" : "bg-gray-100/50"}`}>
                                    {canEditSlot ? <Plus className="w-12 h-12" /> : <LayoutGrid className="w-12 h-12 opacity-30" />}
                                </div>
                                <div className="text-center px-8">
                                    <h4 className="text-[20px] font-black tracking-tight text-gray-900 mb-2 leading-tight">Featured Activity</h4>
                                    <p className="text-[13px] font-black text-gray-400 uppercase tracking-widest group-hover:text-[#F54927]">
                                        {isEditable ? "Add Featured Activity" : (config?.selectionmethod === "manual" ? "Select activity to feature" : "No Activity Available")}
                                    </p>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={item.key} className="group relative rounded-[48px] overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-700 flex flex-col md:flex-row min-h-[450px]">
                            {/* Image Section */}
                            <div className="w-full md:w-[45%] relative overflow-hidden bg-neutral-100 shrink-0">
                                {item.imageurl ? (
                                    <img src={item.imageurl} alt={item.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <Activity className="w-16 h-16 opacity-10" />
                                    </div>
                                )}
                                <div className="absolute inset-x-0 top-0 p-8">
                                     <span className="px-4 py-1.5 bg-black/20 backdrop-blur-md text-white text-[11px] font-black uppercase tracking-widest rounded-full border border-white/20">Featured Selection</span>
                                </div>
                                <div className="absolute inset-0 bg-black/10 transition-opacity group-hover:opacity-0" />
                            </div>

                            {/* Content Section */}
                            <div className="flex-1 p-12 md:p-16 flex flex-col justify-center relative bg-white">
                                <div className="inline-block self-start mb-8">
                                    <h4 className="text-[34px] font-black text-gray-900 leading-none mb-3 tracking-tight group-hover:text-[#F54927] transition-colors">{item.title}</h4>
                                    <p className="text-[14px] font-black text-gray-400 uppercase tracking-[0.2em]">{item.subtitle}</p>
                                    <div className="h-1.5 bg-[#F54927] mt-6 rounded-full w-20" />
                                </div>
                                
                                <p className="text-[16px] text-gray-500 leading-relaxed mb-10 line-clamp-4 font-medium">{item.description}</p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
                                    {(item.bulletinjson || []).slice(0, 4).map((point: any, i: number) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="w-6 h-6 rounded-full bg-red-50 text-[#F54927] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-[14px] font-black text-gray-600 leading-tight">{point.text || point}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Actions Layer */}
                                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-500 z-20 flex flex-col gap-3">
                                    {isEditable ? (
                                        <button
                                            onClick={() => setEditingItem(item)}
                                            className="p-3 bg-white rounded-2xl text-gray-400 hover:text-[#F54927] shadow-2xl border border-gray-100 transition-all active:scale-90"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    ) : config?.selectionmethod === "manual" && (
                                        <>
                                            <button
                                                onClick={() => setPickingForIndex(index)}
                                                className="p-3 bg-white rounded-2xl text-gray-400 hover:text-[#F54927] shadow-2xl border border-gray-100 transition-all active:scale-90"
                                            >
                                                <Plus className="w-5 h-5 rotate-45" />
                                            </button>
                                            <button
                                                onClick={() => handleClearSlot(index)}
                                                className="p-3 bg-white rounded-2xl text-gray-400 hover:text-red-500 shadow-2xl border border-red-50 transition-all active:scale-90"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Selection Dialog */}
            {pickingForIndex !== null && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={() => setPickingForIndex(null)} />
                    <div className="relative bg-white w-full max-w-5xl rounded-[48px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
                        <div className="p-10 border-b border-gray-50 flex items-center justify-between bg-white">
                            <div>
                                <h3 className="text-[22px] font-black text-gray-900 tracking-tight">Select Featured Activity</h3>
                                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mt-1">Pick the premier activity to showcase</p>
                            </div>
                            <button onClick={() => setPickingForIndex(null)} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 no-scrollbar">
                            {academics.length === 0 ? (
                                <div className="py-24 text-center">
                                    <div className="w-24 h-24 bg-gray-50 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                                        <Activity className="w-12 h-12 text-gray-300" />
                                    </div>
                                    <p className="text-gray-900 font-black text-[20px]">No records found</p>
                                    <p className="text-[12px] text-gray-400 mt-2 uppercase tracking-widest font-bold">Create records first to feature them here</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {academics.map((item: any) => (
                                    <button
                                        key={item.key}
                                        onClick={() => handleSelectRecord(item.key)}
                                        className={`w-full text-left rounded-[40px] border-2 transition-all p-8 relative flex flex-col gap-4 group ${placements.some((s: any) => s.contentkey === item.key) ? "border-[#F54927] bg-red-50/20" : "border-gray-50 hover:border-red-100 bg-white shadow-sm hover:shadow-xl hover:shadow-red-500/10"}`}
                                    >
                                        <h4 className={`text-[18px] font-black transition-colors ${placements.some((s: any) => s.contentkey === item.key) ? "text-[#F54927]" : "text-gray-900 group-hover:text-[#F54927]"} truncate pr-6`}>{item.title}</h4>
                                        <p className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em]">{item.subtitle}</p>
                                        <p className="text-[14px] text-gray-500 line-clamp-2 leading-relaxed font-medium">{item.description}</p>
                                        
                                        {placements.some((s: any) => s.contentkey === item.key) && (
                                            <div className="absolute top-6 right-6 w-8 h-8 bg-[#F54927] text-white rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                                                <Check className="w-5 h-5" />
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
                    <div className="relative bg-white w-full max-w-[1000px] rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh]">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-red-50 text-[#F54927] rounded-2xl flex items-center justify-center">
                                    <Activity className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-[22px] font-black text-gray-900 tracking-tight">Featured Activity Editor</h3>
                                    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Refine your premier activity showcase</p>
                                </div>
                            </div>
                            <button onClick={handleCloseModal} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            {/* Left Side: Preview Card */}
                            <div className="w-full md:w-[420px] bg-neutral-50/50 p-10 border-r border-gray-100 flex items-start justify-center overflow-y-auto no-scrollbar">
                                <div className="w-full bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-left-6 duration-700">
                                    <div className="aspect-video w-full bg-neutral-100 relative">
                                        {(pendingPreviewUrl || editingItem.imageurl) ? (
                                            <img src={pendingPreviewUrl || editingItem.imageurl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <Activity className="w-12 h-12 opacity-10" />
                                            </div>
                                        )}
                                        <div className="absolute top-4 left-4">
                                            <span className="px-3 py-1 bg-black/40 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest rounded-full border border-white/20">PREVIEW</span>
                                        </div>
                                    </div>
                                    <div className="p-8 space-y-4">
                                        <div className="space-y-1">
                                            <h4 className="text-[22px] font-black text-gray-900 leading-tight truncate">{editingItem.title || "Activity Name"}</h4>
                                            <p className="text-[11px] font-black text-[#F54927] uppercase tracking-widest">{editingItem.subtitle || "Category"}</p>
                                        </div>
                                        <p className="text-[13px] text-gray-500 font-medium leading-relaxed line-clamp-3 italic opacity-80 whitespace-pre-wrap">
                                            {editingItem.description || "Enter description to see preview..."}
                                        </p>
                                        <div className="pt-4 grid grid-cols-2 gap-3">
                                            {((editingItem.bulletinjson as any[]) || []).slice(0, 4).map((point, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-red-50 text-[#F54927] flex items-center justify-center shrink-0">
                                                        <Check className="w-3 h-3" />
                                                    </div>
                                                    <span className="text-[10px] font-black text-gray-600 truncate">{point.text || point || "Feature"}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Form */}
                            <div className="flex-1 overflow-y-auto p-12 space-y-12 no-scrollbar">
                                <section className="space-y-8">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-3 col-span-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Activity Title</label>
                                            <input
                                                type="text"
                                                value={editingItem.title}
                                                onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                                                className="w-full px-7 py-5 bg-neutral-50/80 border-2 border-transparent focus:bg-white focus:border-[#F54927] rounded-[24px] transition-all text-[15px] font-bold outline-none shadow-sm"
                                                placeholder="e.g. Annual Robotics Championship"
                                            />
                                        </div>
                                        <div className="space-y-3 col-span-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Subtitle / Category</label>
                                            <input
                                                type="text"
                                                value={editingItem.subtitle}
                                                onChange={e => setEditingItem({ ...editingItem, subtitle: e.target.value })}
                                                className="w-full px-7 py-5 bg-neutral-50/80 border-2 border-transparent focus:bg-white focus:border-[#F54927] rounded-[24px] transition-all text-[14px] font-bold outline-none shadow-sm"
                                                placeholder="e.g. Innovation & Technology"
                                            />
                                        </div>
                                        <div className="space-y-3 col-span-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Detailed Overview</label>
                                            <textarea
                                                rows={4}
                                                value={editingItem.description}
                                                onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                                                className="w-full px-7 py-5 bg-neutral-50/80 border-2 border-transparent focus:bg-white focus:border-[#F54927] rounded-[24px] transition-all text-[14px] font-bold outline-none resize-none shadow-sm"
                                                placeholder="Provide deep details about this featured highlight..."
                                            />
                                        </div>
                                        {itemCount > 1 && (
                                            <div className="space-y-3 col-span-1">
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Display Order</label>
                                                <input
                                                    type="number"
                                                    value={editingItem.displayorder || ""}
                                                    onChange={e => setEditingItem({ ...editingItem, displayorder: parseInt(e.target.value) || 0 })}
                                                    className="w-full px-7 py-5 bg-neutral-50/80 border-2 border-transparent focus:bg-white focus:border-[#F54927] rounded-[24px] transition-all text-[14px] font-bold outline-none shadow-sm"
                                                    placeholder="Position (e.g. 1)"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {!isIconVariant && (
                                    <section className="space-y-8">
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Featured Visual</label>
                                            <MediaUpload
                                                value={editingItem.imageurl || ""}
                                                type="image"
                                                onChange={(url) => setEditingItem({ ...editingItem, imageurl: url })}
                                                onFileSelect={handleFileSelect}
                                                isStaged={!!pendingFile}
                                                stagedPreviewUrl={pendingPreviewUrl}
                                                isExternalUploading={isUploading}
                                                schoolKey={schoolKey}
                                                category={tableName}
                                                label="Featured Photo"
                                                description="Upload a high-impact photo for this activity"
                                                aspectRatio="video"
                                            />
                                        </div>
                                    </section>
                                )}

                                <section className="space-y-8 pb-10">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Activity Highlights</label>
                                        <button 
                                            type="button"
                                            onClick={() => setEditingItem((prev: any) => ({ ...prev, bulletinjson: [...(prev.bulletinjson || []), { text: "", id: generateId() }] }))}
                                            className="px-5 py-2.5 bg-red-50 text-[#F54927] rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all hover:bg-red-100 active:scale-95 shadow-sm"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Point
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        {((editingItem.bulletinjson as any[]) || []).map((highlight: any, index: number) => (
                                            <div key={highlight.id || index} className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                               <input 
                                                  type="text"
                                                  value={highlight.text || (typeof highlight === 'string' ? highlight : "")}
                                                  onChange={e => {
                                                      const newList = [...(editingItem.bulletinjson || [])];
                                                      if (typeof newList[index] === 'string') newList[index] = { text: e.target.value, id: generateId() };
                                                      else newList[index] = { ...newList[index], text: e.target.value };
                                                      setEditingItem({ ...editingItem, bulletinjson: newList });
                                                  }}
                                                  className="flex-1 px-6 py-4 bg-neutral-50/50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-[#F54927] transition-all text-[14px] font-bold outline-none shadow-sm"
                                                  placeholder="e.g. State-level recognition"
                                               />
                                               <button 
                                                  disabled={isSaving}
                                                  onClick={() => {
                                                      const newList = [...(editingItem.bulletinjson || [])];
                                                      newList.splice(index, 1);
                                                      setEditingItem({ ...editingItem, bulletinjson: newList });
                                                  }} 
                                                  className="w-14 h-14 rounded-[20px] bg-red-50 text-red-500 hover:bg-neutral-900 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-90"
                                               >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-10 bg-neutral-50/50 flex items-center justify-between border-t border-gray-100 z-10">
                            <button
                                onClick={() => { if (confirm("Delete this record?")) { removeRecord(editingItem.key); handleCloseModal(); } }}
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
                                    disabled={isSaving || isUploading || (!isIconVariant && !editingItem.imageurl && !pendingFile)}
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
                                            <span>{academics.some(f => f.key === editingItem.key) ? 'Update Featured' : 'Publish Featured'}</span>
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
