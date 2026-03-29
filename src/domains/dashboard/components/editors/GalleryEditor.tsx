"use client";

import React, { useState, useMemo } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData } from "@/domains/dashboard/hooks/useComponentData";
import { upsertComponentData, deleteComponentData } from "@/domains/dashboard/actions";
import type { TemplateComponent, ComponentPlacement } from "@/domains/auth/types";

interface GalleryEditorProps {
    component: TemplateComponent;
    schoolKey: string;
}

export default function GalleryEditor({ component, schoolKey }: GalleryEditorProps) {
    const config = component.config as any;
    const isEditable = component.iseditable;
    const tableName = "gallery";
    const itemCount = config?.itemcount ? parseInt(config.itemcount) : 0;

    const {
        records: gallery,
        isLoading,
        error,
        saveRecord,
        removeRecord
    } = useComponentData({
        tableName,
        schoolKey,
        filters: config?.filters || {},
        initialRecords: (component as any).content || []
    });

    const [pickingForIndex, setPickingForIndex] = useState<number | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const placements = useMemo(() => {
        return (component.contentplacements || [])
            .filter((p: ComponentPlacement) => p.isactive !== false)
            .sort((a: ComponentPlacement, b: ComponentPlacement) => (a.displayorder || 0) - (b.displayorder || 0));
    }, [component.contentplacements]);

    const handleSelectRecord = async (recordKey: string) => {
        if (pickingForIndex === null) return;
        setIsUpdating(true);
        try {
            const existingPlacement = placements.find((p: ComponentPlacement) => p.displayorder === pickingForIndex + 1);
            
            await upsertComponentData('componentplacement', {
                key: existingPlacement?.key || undefined,
                schoolkey: schoolKey,
                templatecomponentkey: component.key,
                componentcode: component.componentcode || 'gallery',
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

    const handleAddNew = () => {
        setEditingItem({
            key: crypto.randomUUID(),
            schoolkey: schoolKey,
            url: "",
            caption: "",
            category: "",
            contenttype: "image",
            isactive: true,
            isfeatured: false
        });
    };

    const handleSave = async () => {
        if (!editingItem.url) return;
        setIsSaving(true);
        try {
            await saveRecord(editingItem);
            setEditingItem(null);
        } catch (err) {
            console.error("Failed to save gallery item:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const slots = useMemo(() => {
        const result = [];
        const limit = itemCount > 0 ? itemCount : gallery.length;
        
        for (let i = 0; i < limit; i++) {
            if (config?.selectionmethod === "manual") {
                const placement = placements.find((p: ComponentPlacement) => p.displayorder === i + 1);
                const item = placement ? gallery.find((g: any) => g.key === placement.contentkey) : null;
                result.push(item || { isSkeleton: true, displayorder: i + 1 });
            } else {
                result.push(gallery[i] || { isSkeleton: true, displayorder: i + 1 });
            }
        }
        return result;
    }, [gallery, placements, itemCount, config?.selectionmethod]);

    return (
        <BaseEditor
            title="Gallery"
            description="Manage your school's photo and video gallery."
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            }
            error={error}
            isEditable={isEditable}
            parentScreenName={component.parentscreenname}
            selectionMethod={config?.selectionmethod}
            emptySlotsCount={slots.filter((s:any) => s.isSkeleton).length}
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {slots.map((item: any, index: number) => {
                    const canEditSlot = isEditable || config?.selectionmethod === "manual";

                    if (!item || item.isSkeleton) {
                        return (
                            <div
                                key={`empty-${index}`}
                                onClick={() => canEditSlot ? (isEditable ? handleAddNew() : setPickingForIndex(index)) : undefined}
                                className={`aspect-square border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center gap-3 text-gray-400 ${canEditSlot ? "hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/20 cursor-pointer transition-all group" : "opacity-70 bg-gray-50/30"}`}
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
                                        {isEditable ? "Click to add media" : (config?.selectionmethod === "manual" ? "Select media" : "No Data")}
                                    </p>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={item.key} className="group relative aspect-square rounded-[32px] overflow-hidden bg-gray-100 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
                            {item.url ? (
                                <img src={item.url} alt={item.caption} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                            )}
                            
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                                {isEditable ? (
                                    <button
                                        onClick={() => setEditingItem(item)}
                                        className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-900 hover:bg-emerald-500 hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 duration-300"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                ) : config?.selectionmethod === "manual" && (
                                    <>
                                        <button
                                            onClick={() => setPickingForIndex(index)}
                                            className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-900 hover:bg-blue-500 hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 duration-300"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                        <button
                                            onClick={() => handleClearSlot(index)}
                                            className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-900 hover:bg-red-500 hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 duration-300"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Add New Button for Auto/Infinite Mode */}
                {isEditable && config?.selectionmethod !== "manual" && (
                    <button
                        onClick={handleAddNew}
                        className="aspect-square border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/20 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 group-hover:bg-red-100 flex items-center justify-center transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <p className="text-[14px] font-black tracking-tight">Add Media</p>
                    </button>
                )}
            </div>

            {/* Selection Dialog */}
            {pickingForIndex !== null && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm shadow-2xl">
                    <div className="absolute inset-0" onClick={() => setPickingForIndex(null)} />
                    <div className="relative bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-[18px] font-black text-gray-900 tracking-tight">Select Item for Slot {pickingForIndex + 1}</h3>
                            <button onClick={() => setPickingForIndex(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-3 gap-4 no-scrollbar">
                            {gallery.length === 0 ? (
                                <div className="col-span-3 py-20 text-center text-gray-400 font-bold">No gallery items found.</div>
                            ) : (
                                gallery.map((item: any) => (
                                    <button
                                        key={item.key}
                                        onClick={() => handleSelectRecord(item.key)}
                                        className={`group relative aspect-square rounded-2xl overflow-hidden border-4 transition-all ${placements.some((p: ComponentPlacement) => p.contentkey === item.key) ? "border-red-500 shadow-lg" : "border-gray-50 hover:border-red-200"}`}
                                    >
                                        <img src={item.url} alt={item.caption} className="w-full h-full object-cover" />
                                        {placements.some((p: ComponentPlacement) => p.contentkey === item.key) && (
                                            <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
                                                <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </div>
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
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
                    <div className="absolute inset-0" onClick={() => setEditingItem(null)} />
                    <div className="relative bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                            <h3 className="text-[18px] font-black text-gray-900 tracking-tight">{gallery.some(g => g.key === editingItem.key) ? "Edit Media" : "New Media"}</h3>
                            <button onClick={() => setEditingItem(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Media URL</label>
                                <input
                                    type="text"
                                    value={editingItem.url}
                                    onChange={e => setEditingItem({ ...editingItem, url: e.target.value })}
                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none"
                                    placeholder="https://"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Caption</label>
                                <input
                                    type="text"
                                    value={editingItem.caption}
                                    onChange={e => setEditingItem({ ...editingItem, caption: e.target.value })}
                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Type</label>
                                    <select
                                        value={editingItem.contenttype}
                                        onChange={e => setEditingItem({ ...editingItem, contenttype: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none"
                                    >
                                        <option value="image">Image</option>
                                        <option value="video">Video</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                                    <input
                                        type="text"
                                        value={editingItem.category}
                                        onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50/50 flex items-center justify-between">
                            <button
                                onClick={() => { removeRecord(editingItem.key); setEditingItem(null); }}
                                className="px-5 py-3 text-[13px] font-bold text-red-500 hover:text-red-600 rounded-xl transition-all"
                            >
                                Delete
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setEditingItem(null)}
                                    className="px-6 py-3 text-[13px] font-bold text-gray-400 hover:text-gray-900 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isSaving || !editingItem.url}
                                    onClick={handleSave}
                                    className="px-8 py-3 bg-[#111827] text-white text-[13px] font-black rounded-xl hover:bg-black transition-all shadow-xl disabled:opacity-50"
                                >
                                    {isSaving ? "Saving..." : (gallery.some(g => g.key === editingItem.key) ? "Save Changes" : "Add to Gallery")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </BaseEditor>
    );
}
