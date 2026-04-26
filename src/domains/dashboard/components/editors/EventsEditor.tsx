"use client";
import { generateId } from '@/lib/generateId';

import React, { useState, useMemo } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData } from "@/domains/dashboard/hooks/useComponentData";
import { upsertComponentData, deleteComponentData } from "@/domains/dashboard/actions";
import type { TemplateComponent, ComponentPlacement } from "@/domains/auth/types";
import MediaUpload from "@/components/ui/MediaUpload";
import { Check, X } from "lucide-react";
import { useEffect } from "react";
import { uploadFile } from "@/lib/supabase/storage";

interface EventsEditorProps {
    component: TemplateComponent;
    schoolKey: string;
}

export default function EventsEditor({ component, schoolKey }: EventsEditorProps) {
    const config = component.config as any;
    const isEditable = component.iseditable;
    const tableName = (component.componentregistry as any)?.tablename;
    const itemCount = config?.itemcount ? parseInt(config.itemcount) : 0;

    const effectiveMediaType = useMemo(() => {
        const type = config?.variant || config?.mediatype;
        if (!type) return "image";
        const lowType = type.toLowerCase();
        if (lowType === "video" || lowType === "videos") return "video";
        return "image";
    }, [config?.variant, config?.mediatype]);

    const {
        records: events,
        isLoading,
        error,
        saveRecord,
        removeRecord
    } = useComponentData({
        tableName,
        schoolKey,
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

    const placements = useMemo(() => {
        return (component.contentplacements || [])
            .filter((p: ComponentPlacement) => p.isactive !== false)
            .sort((a: ComponentPlacement, b: ComponentPlacement) => (a.displayorder || 0) - (b.displayorder || 0));
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
        try {
            const existingPlacement = placements.find((p: ComponentPlacement) => p.displayorder === pickingForIndex + 1);
            
            await upsertComponentData('componentplacement', {
                key: existingPlacement?.key || undefined,
                schoolkey: schoolKey,
                templatecomponentkey: component.key,
                componentcode: component.componentcode || 'events',
                contenttable: tableName,
                contentkey: recordKey,
                displayorder: pickingForIndex + 1,
                isactive: true
            }, schoolKey);
            
            setPickingForIndex(null);
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
            await deleteComponentData('componentplacement', placement.key, schoolKey);
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
            title: "",
            description: "",
            location: "",
            eventdate: new Date().toISOString().split('T')[0],
            starttime: "10:00 AM",
            imageurl: "",
            isactive: true,
            isfeatured: false,
            displayorder: displayOrder || events.length + 1
        });
    };

    const handleSave = async () => {
        if (!editingItem.title || (!editingItem.imageurl && !pendingFile && !editingItem._usePlaceholder)) return;
        setIsSaving(true);
        try {
            const { _usePlaceholder, ...dataToSave } = editingItem;
            let finalItem = { ...dataToSave };

            if (pendingFile) {
                setIsUploading(true);
                try {
                    const uploadedUrl = await uploadFile(pendingFile, schoolKey, "events");
                    finalItem.imageurl = uploadedUrl;
                } catch (err) {
                    console.error("Upload failed:", err);
                    throw err;
                } finally {
                    setIsUploading(false);
                }
            }

            await saveRecord(finalItem);
            handleCloseModal();
        } catch (err) {
            console.error("Failed to save event:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const slots = useMemo(() => {
        const result = [];
        const limit = itemCount > 0 ? itemCount : (events.length > 0 ? events.length : 4);
        
        // Find items that don't have a valid displayorder within the limit
        const unassigned = events.filter(e => 
            !e.displayorder || e.displayorder > limit || events.filter(other => other.displayorder === e.displayorder).length > 1
        ).sort((a, b) => (new Date(b.createdat || 0).getTime()) - (new Date(a.createdat || 0).getTime()));

        let unassignedIdx = 0;
        
        for (let i = 0; i < limit; i++) {
            const displayOrder = i + 1;
            if (config?.selectionmethod === "manual") {
                const placement = placements.find((p: ComponentPlacement) => p.displayorder === displayOrder);
                const item = placement ? events.find((e: any) => e.key === placement.contentkey) : null;
                
                if (item) {
                    result.push(item);
                } else if (unassignedIdx < unassigned.length) {
                    result.push({ ...unassigned[unassignedIdx++], displayorder: displayOrder, isAutoFilled: true });
                } else {
                    result.push({ isSkeleton: true, displayorder: displayOrder });
                }
            } else {
                const item = events.find((e: any) => e.displayorder === displayOrder);
                if (item) {
                    result.push(item);
                } else if (unassignedIdx < unassigned.length) {
                    result.push({ ...unassigned[unassignedIdx++], displayorder: displayOrder });
                } else {
                    result.push({ isSkeleton: true, displayorder: displayOrder });
                }
            }
        }
        return result;
    }, [events, placements, itemCount, config?.selectionmethod]);

    return (
        <BaseEditor
            title="School Events"
            description="Manage upcoming events, workshops and school programs."
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            }
            error={error}
            isEditable={isEditable}
            parentScreenName={component.parentscreenname}
            selectionMethod={config?.selectionmethod}
            emptySlotsCount={slots.filter((s:any) => s.isSkeleton).length}
            component={component}
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {slots.map((item: any, index: number) => {
                    const canEditSlot = isEditable || config?.selectionmethod === "manual";

                    if (!item || item.isSkeleton) {
                        return (
                            <div
                                key={`empty-${index}`}
                                onClick={() => canEditSlot ? (isEditable ? handleAddNew(index + 1) : setPickingForIndex(index)) : undefined}
                                className={`p-6 border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center gap-3 text-gray-400 min-h-[220px] ${canEditSlot ? "hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/20 cursor-pointer transition-all group" : "opacity-70 bg-gray-50/30"}`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${canEditSlot ? "bg-gray-50 group-hover:bg-red-100" : "bg-gray-100/50"}`}>
                                    {canEditSlot ? (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                        </svg>
                                    ) : (
                                        <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                        </svg>
                                    )}
                                </div>
                                <div className="text-center px-4">
                                    <p className="text-[14px] font-black tracking-tight">Slot {index + 1}</p>
                                    <p className="text-[11px] font-medium text-gray-400">
                                        {isEditable ? "Click to add event" : (config?.selectionmethod === "manual" ? "Select event" : "No Data")}
                                    </p>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={item.key} className="group relative rounded-[32px] overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 flex flex-col">
                            <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
                                {item.imageurl ? (
                                    item.contenttype === 'video' ? (
                                        <div className="relative w-full h-full">
                                            <video 
                                                src={item.imageurl} 
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                                autoPlay 
                                                loop 
                                                muted 
                                                playsInline 
                                            />
                                        </div>
                                    ) : (
                                        <img src={item.imageurl} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    )
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                )}
                                <div className="absolute top-4 left-4 flex flex-col items-center p-2 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm min-w-[50px]">
                                    <span className="text-[14px] font-black text-gray-900 leading-none">{new Date(item.eventdate).getDate()}</span>
                                    <span className="text-[9px] font-black text-[#F54927] uppercase tracking-widest mt-0.5">
                                        {new Date(item.eventdate).toLocaleString('default', { month: 'short' })}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="p-5 flex-1 flex flex-col">
                                <h4 className="text-[15px] font-black text-gray-900 group-hover:text-[#F54927] transition-colors line-clamp-1 mb-1">{item.title}</h4>
                                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-3 leading-none">{item.location || "No Location"}</p>
                                <p className="text-[12px] text-gray-500 line-clamp-2 leading-relaxed mb-4">{item.description}</p>
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
                    <div className="relative bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-[18px] font-black text-gray-900 tracking-tight">Select Event for Slot {pickingForIndex + 1}</h3>
                            <button onClick={() => setPickingForIndex(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
                            {events.filter((item: any) => item.contenttype === effectiveMediaType).length === 0 ? (
                                <div className="py-20 text-center">
                                    <p className="text-gray-400 font-bold">No {effectiveMediaType} events found.</p>
                                    <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest leading-loose">Switch to Source Screen to create<br/>new {effectiveMediaType} content first.</p>
                                </div>
                            ) : (
                                events
                                    .filter((item: any) => item.contenttype === effectiveMediaType)
                                    .map((item: any) => (
                                    <button
                                        key={item.key}
                                        onClick={() => handleSelectRecord(item.key)}
                                        className={`w-full p-4 flex items-center gap-4 rounded-[24px] border-2 transition-all ${placements.some((p: ComponentPlacement) => p.contentkey === item.key) ? "border-red-500 bg-red-50/20" : "border-gray-50 hover:border-red-100 bg-white"}`}
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden shrink-0">
                                            <img src={item.imageurl} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="text-left flex-1">
                                            <h4 className="text-[14px] font-black text-gray-900">{item.title}</h4>
                                            <p className="text-[11px] font-bold text-gray-400 mt-0.5">{new Date(item.eventdate).toLocaleDateString()} • {item.location}</p>
                                        </div>
                                        {placements.some((p: ComponentPlacement) => p.contentkey === item.key) && (
                                            <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                        )}
                                    </button>
                                ))
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
                                    {events.some(e => e.key === editingItem.key) ? 'Update' : 'Add'} Event
                                </h3>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                    Manage event details and photo
                                </p>
                            </div>
                            <button onClick={handleCloseModal} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Event Title</label>
                                    <input
                                        type="text"
                                        value={editingItem.title}
                                        onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[15px] font-bold outline-none"
                                        placeholder="e.g. Annual Sports Day 2024"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Event Date</label>
                                    <input
                                        type="date"
                                        value={editingItem.eventdate}
                                        onChange={e => setEditingItem({ ...editingItem, eventdate: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Event Time</label>
                                    <input
                                        type="text"
                                        value={editingItem.starttime}
                                        onChange={e => setEditingItem({ ...editingItem, starttime: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none"
                                        placeholder="e.g. 10:00 AM - 4:00 PM"
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Location</label>
                                    <input
                                        type="text"
                                        value={editingItem.location}
                                        onChange={e => setEditingItem({ ...editingItem, location: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none"
                                        placeholder="e.g. Main Auditorium"
                                    />
                                </div>
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
                                        category="events"
                                        label="Event Banner"
                                        description="Upload a photo for this event"
                                        aspectRatio="video"
                                        showPlaceholderCheckbox={false}
                                        isPlaceholderActive={!!editingItem._usePlaceholder}
                                        onPlaceholderToggle={(active) => setEditingItem({ ...editingItem, _usePlaceholder: active, imageurl: active ? "" : editingItem.imageurl })}
                                        allowVideo={config?.mediatype !== "image"}
                                        allowImage={config?.mediatype !== "video"}
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                                    <textarea
                                        value={editingItem.description}
                                        onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                                        rows={4}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none resize-none"
                                        placeholder="What is this event about?"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50/50 flex items-center justify-between border-t border-gray-50">
                            {events.some(e => e.key === editingItem.key) && (
                                <button
                                    onClick={() => { if (confirm("Delete this event?")) { removeRecord(editingItem.key); handleCloseModal(); } }}
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
                                    disabled={isSaving || isUploading || (!editingItem.imageurl && !pendingFile && !editingItem._usePlaceholder)}
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
                                            {events.some(e => e.key === editingItem.key) ? 'Update Event' : 'Add to Collection'}
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
