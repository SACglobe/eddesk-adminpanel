"use client";
import { generateId } from '@/lib/generateId';

import React, { useState, useMemo, useEffect } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData, getInitialValuesFromFilters } from "@/domains/dashboard/hooks/useComponentData";
import { upsertComponentData, deleteComponentData } from "@/domains/dashboard/actions";
import IconPicker from "@/components/ui/IconPicker";
import DynamicIcon from "@/components/ui/DynamicIcon";
import { useRouter } from "next/navigation";
import type { TemplateComponent, ComponentPlacement } from "@/domains/auth/types";
import MediaUpload from "@/components/ui/MediaUpload";
import { Check, X } from "lucide-react";
import { uploadFile } from "@/lib/supabase/storage";

interface InfrastructureEditorProps {
    component: TemplateComponent;
    schoolKey: string;
    onRefreshData?: () => Promise<void>;
}

export default function InfrastructureEditor({ component, schoolKey, onRefreshData }: InfrastructureEditorProps) {
    const config = component.config as any;
    const isEditable = component.iseditable;
    const tableName = (component.componentregistry as any)?.tablename;
    const itemCount = config?.itemcount ? parseInt(config.itemcount) : 0;
    const router = useRouter();

    const hasIcon = useMemo(() => {
        const variant = config?.variant?.toLowerCase() || '';
        return ['icon', 'textwithicon', 'bulletintextwithicon'].includes(variant);
    }, [config?.variant]);

    const hasImage = useMemo(() => {
        const variant = config?.variant?.toLowerCase() || '';
        // If it's specifically an icon variant, it should NOT have an image unless it's a known dual variant
        if (hasIcon) return false;
        return true; // Default to image for other variants including bulletintextwithimage
    }, [config?.variant, hasIcon]);

    const effectiveMediaType = useMemo(() => {
        const type = config?.variant || config?.mediatype;
        if (!type) return "image";
        const lowType = type.toLowerCase();
        if (lowType.includes("video")) return "video";
        // If it's a known variant like 'bulletintextwithicon', return it directly for correct filtering
        return type;
    }, [config?.variant, config?.mediatype]);

    const filters = useMemo(() => ({
        ...(config?.filters || {})
    }), [config?.filters]);

    const {
        records: facilities,
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
    };

    const handleFileSelect = (file: File) => {
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        const url = URL.createObjectURL(file);
        setPendingFile(file);
        setPendingPreviewUrl(url);
    };

    const handleSelectRecord = async (recordKey: string) => {
        if (pickingForIndex === null) return;
        setIsUpdating(true);
        // Optimistic update for instant UI feedback
        const optimisticPlacement: ComponentPlacement = {
            key: `temp-${Date.now()}`,
            schoolkey: schoolKey,
            templatecomponentkey: component.key,
            componentcode: component.componentcode || 'infrastructure',
            contenttable: tableName,
            contentkey: recordKey,
            displayorder: pickingForIndex + 1,
            isactive: true,
        } as any;
        setPlacements(prev => {
            const next = prev.filter(p => p.displayorder !== optimisticPlacement.displayorder);
            return [...next, optimisticPlacement].sort((a, b) => (a.displayorder || 0) - (b.displayorder || 0));
        });
        setPickingForIndex(null);
        try {
            const existingPlacement = placements.find((p: ComponentPlacement) => p.displayorder === pickingForIndex + 1);
            await upsertComponentData('componentplacement', {
                key: existingPlacement?.key || undefined,
                schoolkey: schoolKey,
                templatecomponentkey: component.key,
                componentcode: component.componentcode || 'infrastructure',
                contenttable: tableName,
                contentkey: recordKey,
                displayorder: pickingForIndex + 1,
                isactive: true
            }, schoolKey);
            onRefreshData?.();
        } catch (err) {
            console.error("Failed to update placement:", err);
            // Rollback
            setPlacements((component.contentplacements || []).filter((p: ComponentPlacement) => p.isactive !== false).sort((a: ComponentPlacement, b: ComponentPlacement) => (a.displayorder || 0) - (b.displayorder || 0)));
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
            onRefreshData?.();
        } catch (err) {
            console.error("Failed to delete placement:", err);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAddNew = (displayOrder?: number) => {
        setEditingItem({
            key: generateId(),
            schoolkey: schoolKey,
            ...getInitialValuesFromFilters(filters),
            title: "",
            description: "",
            highlighttitle: "",
            highlightdescription: "",
            bulletintextlist: [],
            tag: "#2563eb",
            icon: "School",
            imageurl: "",
            contenttype: effectiveMediaType,
            isactive: true,
            displayorder: displayOrder || facilities.length + 1
        });
    };

    const handleSave = async () => {
        if (!editingItem.title?.trim()) {
            alert("Please enter a facility name.");
            return;
        }
        if (!editingItem.description?.trim()) {
            alert("Please provide a description.");
            return;
        }
        if (hasImage && !editingItem.imageurl && !pendingFile && !editingItem._usePlaceholder) {
            alert("Please upload a facility photo.");
            return;
        }
        setIsSaving(true);
        try {
            const { _usePlaceholder, ...dataToSave } = editingItem;
            let finalItem = { ...dataToSave };

            if (pendingFile) {
                setIsUploading(true);
                try {
                    const uploadedUrl = await uploadFile(pendingFile, schoolKey, "infrastructure");
                    finalItem.imageurl = uploadedUrl;
                } catch (err) {
                    console.error("Upload failed:", err);
                    throw err;
                } finally {
                    setIsUploading(false);
                }
            }

            await saveRecord(finalItem);
            setEditingItem(null);
            handleCloseModal();
        } catch (err) {
            console.error("Failed to save facility:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const slots = useMemo(() => {
        const result = [];
        
        if (config?.selectionmethod === "manual") {
            const limit = itemCount || facilities.length;
            for (let i = 0; i < limit; i++) {
                const placement = placements.find((p: ComponentPlacement) => p.displayorder === i + 1);
                const item = placement ? facilities.find((f: any) => f.key === placement.contentkey) : null;
                result.push(item || { isSkeleton: true, displayorder: i + 1 });
            }
        } else {
            for (let i = 0; i < itemCount; i++) {
                result.push(facilities.find((f: any) => f.displayorder === i + 1) || { isSkeleton: true, displayorder: i + 1 });
            }
        }
        return result;
    }, [facilities, placements, itemCount, config?.selectionmethod]);

    return (
        <BaseEditor
            title={component.editorsname || "School Infrastructure"}
            description="Highlight key facilities, campuses, or specialized labs and resources."
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            }
            error={error}
            isEditable={isEditable}
            parentScreenName={component.parentscreenname}
            selectionMethod={config?.selectionmethod}
            emptySlotsCount={slots.filter((s:any) => s.isSkeleton).length}
            component={component}
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {slots.map((item: any, index: number) => {
                    const canEditSlot = isEditable || config?.selectionmethod === "manual";
                    
                    if (!item || item.isSkeleton) {
                        return (
                            <div
                                key={`empty-${index}`}
                                onClick={() => canEditSlot ? (isEditable ? handleAddNew(index + 1) : setPickingForIndex(index)) : undefined}
                                className={`p-6 border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center gap-3 text-gray-400 min-h-[300px] ${canEditSlot ? "hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/20 cursor-pointer transition-all group" : "opacity-70 bg-gray-50/30"}`}
                            >
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${canEditSlot ? "bg-gray-50 group-hover:bg-red-100" : "bg-gray-100/50"}`}>
                                    {canEditSlot ? (
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    ) : (
                                        <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                        </svg>
                                    )}
                                </div>
                                <div className="text-center px-4">
                                    <p className="text-[14px] font-black tracking-tight">Slot {index + 1}</p>
                                    <p className="text-[11px] font-medium text-gray-400">
                                        {isEditable ? "Click to add facility" : (config?.selectionmethod === "manual" ? "Select facility" : "No Data")}
                                    </p>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={item.key} className="group relative rounded-[32px] overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col text-left min-h-[400px]">
                            {/* Card Image / Header Area */}
                            {item.imageurl ? (
                                <div className="relative h-[200px] w-full overflow-hidden shrink-0">
                                    <img 
                                        src={item.imageurl} 
                                        alt={item.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    
                                    {/* Overlapping Icon (Only if variant supports icons) */}
                                    {hasIcon && (
                                        <div className="absolute -bottom-6 left-8 w-[56px] h-[56px] rounded-[18px] flex items-center justify-center shadow-xl border-4 border-white transition-transform group-hover:-translate-y-1" style={{ backgroundColor: item.tag || '#2563eb' }}>
                                            <DynamicIcon name={item.icon} size={24} className="text-white" />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-8 pb-0">
                                    {hasIcon ? (
                                        <div className="w-[72px] h-[72px] rounded-[24px] flex items-center justify-center shrink-0 shadow-sm transition-colors" style={{ backgroundColor: item.tag || '#2563eb' }}>
                                            <DynamicIcon name={item.icon} size={32} className="text-white" />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: item.tag || '#2563eb' }} />
                                    )}
                                </div>
                            )}
                            
                            <div className={`flex-1 flex flex-col min-w-0 w-full relative z-10 bg-white ${item.imageurl ? 'p-8 pt-10' : 'p-8 pt-8'}`}>
                                <div className="mb-6 inline-block shrink-0 self-start">
                                    <h4 className="text-[22px] font-black text-[#1e293b] group-hover:text-[#F54927] transition-colors truncate pr-4">{item.title}</h4>
                                    <div className="h-1 bg-amber-400 mt-2 rounded-full w-4/5" />
                                </div>
                                <ul className="space-y-4 mb-4">
                                    {((item.bulletintextlist as any[]) || []).sort((a, b) => (a.displayorder || 0) - (b.displayorder || 0)).map((point: any, i: number) => {
                                        if (!point.text?.trim()) return null;
                                        return (
                                            <li key={i} className="flex items-start gap-3 text-[14px] font-bold text-[#475569]">
                                                <div className="w-2 h-2 rounded-full bg-[#1e40af] mt-2 shrink-0" />
                                                <span className="leading-relaxed">{point.text.trim()}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            <div className="absolute top-6 right-6 p-3 bg-white rounded-2xl shadow-2xl border border-gray-100 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 flex items-center gap-2">
                                {isEditable ? (
                                    <button
                                        onClick={() => setEditingItem(item)}
                                        className="text-gray-400 hover:text-[#F54927] transition-all active:scale-90"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                ) : config?.selectionmethod === "manual" && (
                                    <>
                                        <button
                                            onClick={() => setPickingForIndex(index)}
                                            className="text-gray-400 hover:text-[#F54927] transition-all active:scale-90"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                        <button
                                            onClick={() => handleClearSlot(index)}
                                            className="text-gray-400 hover:text-red-500 transition-all active:scale-90"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
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
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm shadow-2xl">
                    <div className="absolute inset-0" onClick={() => setPickingForIndex(null)} />
                    <div className="relative bg-white w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-[18px] font-black text-gray-900 tracking-tight">Select Facility for Slot {pickingForIndex + 1}</h3>
                            <button onClick={() => setPickingForIndex(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                            {facilities.filter((item: any) => item.contenttype === effectiveMediaType).length === 0 ? (
                                <div className="py-20 text-center">
                                    <p className="text-gray-400 font-bold">No {effectiveMediaType} items found.</p>
                                    <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest leading-loose">Switch to Source Screen to create<br/>new {effectiveMediaType} content first.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {facilities
                                    .filter((item: any) => item.contenttype === effectiveMediaType)
                                    .map((item: any) => (
                                    <button
                                        key={item.key}
                                        onClick={() => handleSelectRecord(item.key)}
                                        className={`w-full text-left rounded-[24px] border-2 transition-all overflow-hidden ${slots.some((s: any) => !s.isSkeleton && s.key === item.key) ? "border-red-500 bg-red-50/20" : "border-gray-100 hover:border-red-200 bg-white"}`}
                                    >
                                        <div className="w-full bg-gray-50/50 rounded-xl overflow-hidden mb-4 p-5 flex items-start gap-4 relative">
                                            <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 shadow-sm transition-colors" style={{ backgroundColor: item.tag || '#2563eb' }}>
                                                <DynamicIcon name={item.icon} size={24} className="text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0 pt-1">
                                                <h4 className="text-[15px] font-black text-gray-900 truncate mb-1 border-b-2 border-amber-400 inline-block pb-0.5">{item.title}</h4>
                                                <p className="text-[11px] text-gray-500 mt-2 line-clamp-2">
                                                    {((item.bulletintextlist as any[]) || []).sort((a, b) => (a.displayorder || 0) - (b.displayorder || 0))[0]?.text || item.description || "No highlights"}
                                                </p>
                                            </div>
                                            {slots.some((s: any) => !s.isSkeleton && s.key === item.key) && (
                                                <div className="absolute top-4 right-4 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                            )}
                                        </div>
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
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
                    <div className="absolute inset-0" onClick={handleCloseModal} />
                    <div className="relative bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white/50">
                            <div>
                                <h3 className="text-[20px] font-black text-gray-900 tracking-tight">
                                    {facilities.some(f => f.key === editingItem.key) ? 'Update' : 'Add'} Facility
                                </h3>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                    Manage facility details and photo
                                </p>
                            </div>
                            <button onClick={handleCloseModal} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Facility Name / Title</label>
                                    <input
                                        type="text"
                                        value={editingItem.title}
                                        onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[15px] font-bold outline-none"
                                        placeholder="e.g. Main Library"
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                                    <textarea
                                        value={editingItem.description || ""}
                                        onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none min-h-[100px] resize-none"
                                        placeholder="Brief details about this facility..."
                                    />
                                </div>
                                {editingItem.contenttype?.toLowerCase().includes("bulletin") && (
                                    <>
                                        <div className="space-y-2 col-span-1">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Highlight Title</label>
                                            <input
                                                type="text"
                                                value={editingItem.highlighttitle || ""}
                                                onChange={e => setEditingItem({ ...editingItem, highlighttitle: e.target.value })}
                                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none"
                                                placeholder="e.g. Featured Lab"
                                            />
                                        </div>
                                        <div className="space-y-2 col-span-1">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Highlight Description</label>
                                            <input
                                                type="text"
                                                value={editingItem.highlightdescription || ""}
                                                onChange={e => setEditingItem({ ...editingItem, highlightdescription: e.target.value })}
                                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none"
                                                placeholder="e.g. State-of-the-art"
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Icon Background Color (Hex)</label>
                                    <input
                                        type="text"
                                        value={editingItem.tag || ""}
                                        onChange={e => setEditingItem({ ...editingItem, tag: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none"
                                        placeholder="e.g. #2563eb or #ebb017"
                                    />
                                </div>
                                {hasImage && (
                                    <div className="space-y-2 col-span-2">
                                        <MediaUpload
                                            value={editingItem.imageurl || ""}
                                            type="image"
                                            onChange={(url) => setEditingItem({ ...editingItem, imageurl: url, _usePlaceholder: false })}
                                            onFileSelect={handleFileSelect}
                                            isStaged={!!pendingFile}
                                            stagedPreviewUrl={pendingPreviewUrl}
                                            isExternalUploading={isUploading}
                                            schoolKey={schoolKey}
                                            category="infrastructure"
                                            label="Facility Photo"
                                            description="Upload a high-quality photo of the facility"
                                            allowVideo={config?.mediatype !== "image"}
                                            allowImage={config?.mediatype !== "video"}
                                            aspectRatio="video"
                                            showPlaceholderCheckbox={true}
                                            isPlaceholderActive={!!editingItem._usePlaceholder}
                                            onPlaceholderToggle={(active) => setEditingItem({ ...editingItem, _usePlaceholder: active, imageurl: active ? "" : editingItem.imageurl })}
                                        />
                                    </div>
                                )}
                                {hasIcon && (
                                    <div className="space-y-2 col-span-2">
                                        <IconPicker
                                            value={editingItem.icon || ""}
                                            onChange={iconName => setEditingItem({ ...editingItem, icon: iconName })}
                                            label="Facility Icon"
                                        />
                                    </div>
                                )}
                                <div className="space-y-4 col-span-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Facility Highlights</label>
                                        <button 
                                            type="button"
                                            onClick={() => setEditingItem((prev: any) => ({ ...prev, bulletintextlist: [...(prev.bulletintextlist || []), { text: "", displayorder: (prev.bulletintextlist?.length || 0) + 1 }] }))}
                                            className="text-[11px] font-black text-[#F54927] hover:text-[#d43b1e] uppercase tracking-widest flex items-center gap-1 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                            Add Highlight
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {((editingItem.bulletintextlist as any[]) || []).map((highlight: any, index: number) => (
                                            <div key={index} className="flex items-center gap-3">
                                               <input 
                                                  type="text"
                                                  value={highlight.text || ""}
                                                  onChange={e => {
                                                      const newList = [...(editingItem.bulletintextlist || [])];
                                                      newList[index] = { ...newList[index], text: e.target.value };
                                                      setEditingItem({ ...editingItem, bulletintextlist: newList });
                                                  }}
                                                  className="flex-1 px-5 py-3 bg-gray-50 border-2 border-transparent rounded-[16px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none"
                                                  placeholder="e.g. Modern Lab Equipment"
                                               />
                                               <button 
                                                  disabled={isSaving}
                                                  onClick={() => {
                                                      const newList = [...(editingItem.bulletintextlist || [])];
                                                      newList.splice(index, 1);
                                                      newList.forEach((h, i) => h.displayorder = i + 1);
                                                      setEditingItem({ ...editingItem, bulletintextlist: newList });
                                                  }} 
                                                  className="w-12 h-12 rounded-[16px] bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors shrink-0"
                                               >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                        {((editingItem.bulletintextlist as any[]) || []).length === 0 && (
                                            <div className="text-[13px] text-gray-400 font-bold py-6 text-center bg-gray-50 rounded-[24px] border border-dashed border-gray-200">No highlights added yet. Click "Add Highlight" to begin.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50/50 flex items-center justify-between border-t border-gray-50">
                            {facilities.some(f => f.key === editingItem.key) && (
                                <button
                                    onClick={() => { if (confirm("Delete this facility?")) { removeRecord(editingItem.key); handleCloseModal(); } }}
                                    className="px-6 py-3.5 text-[13px] font-black text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                >
                                    Delete
                                </button>
                            )}
                            <div className="flex gap-3 ml-auto">
                                <button
                                    onClick={handleCloseModal}
                                    className="px-6 py-3 text-[13px] font-bold text-gray-400 hover:text-gray-900 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isSaving || isUploading}
                                    onClick={handleSave}
                                    className="px-10 py-3.5 bg-[#111827] text-white text-[14px] font-black rounded-2xl hover:bg-black transition-all shadow-xl disabled:opacity-50 flex items-center gap-3 h-[52px]"
                                >
                                    {isSaving || isUploading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            {isUploading ? "Uploading..." : "Saving..."}
                                        </>
                                    ) : (
                                        <>
                                            {facilities.some(f => f.key === editingItem.key) ? 'Update Facility' : 'Add to Collection'}
                                            <Check className="w-4 h-4" />
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
