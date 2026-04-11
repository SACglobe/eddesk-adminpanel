"use client";
import { generateId } from '@/lib/generateId';

import React, { useState, useMemo, useEffect, useRef } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData, getInitialValuesFromFilters } from "@/domains/dashboard/hooks/useComponentData";
import { uploadFile } from "@/lib/supabase/storage";
import MediaUpload from "@/components/ui/MediaUpload";
import { upsertComponentData, deleteComponentData } from "@/domains/dashboard/actions";
import { createClient } from "@/lib/supabase/client";
import type { TemplateComponent, ComponentPlacement } from "@/domains/auth/types";
import { Image as ImageIcon, Video, Plus, Trash2, Edit3, X, Check, ExternalLink, Filter, Play } from "lucide-react";

interface GalleryEditorProps {
    component: TemplateComponent;
    schoolKey: string;
}

export default function GalleryEditor({ component, schoolKey }: GalleryEditorProps) {
    const config = component.config as any;
    const isEditable = component.iseditable;
    const tableName = (component.componentregistry as any)?.tablename;
    const itemCount = config?.itemcount ? parseInt(config.itemcount) : 0;

    const effectiveMediaType = useMemo(() => {
        // Preference: config.variant -> config.mediatype -> default to image
        const type = config?.variant || config?.mediatype;
        if (!type) return "image";
        const lowType = type.toLowerCase();
        if (lowType === "video" || lowType === "videos") return "video";
        return "image";
    }, [config?.variant, config?.mediatype]);

    const editorFilters = useMemo(() => {
        const f = JSON.parse(JSON.stringify(config?.filters || {}));
        const stripList = ['isfeatured', 'category', 'screenslug'];
        
        if (f.conditions && Array.isArray(f.conditions)) {
            // Complex filter structure: remove management-blocking filters
            f.conditions = f.conditions.filter((c: any) => !stripList.includes(c.field));
        } else {
            // Legacy/Flat filter structure
            stripList.forEach(key => delete f[key]);
        }
        return f;
    }, [config?.filters]);

    const {
        records: gallery,
        isLoading,
        error,
        saveRecord,
        removeRecord
    } = useComponentData({
        tableName,
        schoolKey,
        filters: editorFilters,
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
    
    // Reactivity for placements
    const [localPlacements, setLocalPlacements] = useState<ComponentPlacement[]>(component.contentplacements || []);
    // Track explicitly-deleted placement keys so the server-sync useEffect never re-adds them
    const deletedPlacementKeysRef = React.useRef<Set<string>>(new Set());

    // Fresh client-side fetch of placements on every mount/remount (fixes stale props when switching editors)
    useEffect(() => {
        const fetchFreshPlacements = async () => {
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from("componentplacement" as any)
                    .select("*")
                    .eq("schoolkey", schoolKey)
                    .eq("templatecomponentkey", component.key)
                    .eq("isactive", true);

                if (!error && data) {
                    const placements = data as unknown as ComponentPlacement[];
                    const filtered = placements.filter(
                        (p: ComponentPlacement) => !deletedPlacementKeysRef.current.has(p.key)
                    );
                    setLocalPlacements(filtered);
                }
            } catch (e) {
                // Fallback to initial props if client-side fetch fails
                const filtered = (component.contentplacements || []).filter(
                    (p: ComponentPlacement) => !deletedPlacementKeysRef.current.has(p.key)
                );
                setLocalPlacements(filtered);
            }
        };

        fetchFreshPlacements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [component.key, schoolKey]);

    // Also sync when server props update (e.g. after full page navigation)
    useEffect(() => {
        if (component.contentplacements !== undefined) {
            const filtered = (component.contentplacements || []).filter(
                (p: ComponentPlacement) => !deletedPlacementKeysRef.current.has(p.key)
            );
            setLocalPlacements(filtered);
        }
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

    const activePlacements = useMemo(() => {
        return (localPlacements || [])
            .filter((p: ComponentPlacement) => p.isactive !== false)
            .sort((a: ComponentPlacement, b: ComponentPlacement) => (a.displayorder || 0) - (b.displayorder || 0));
    }, [localPlacements]);

    // Media handling
    const handleMediaChange = (url: string, type: "image" | "video") => {
        setEditingItem({ ...editingItem, url, contenttype: type });
    };

    const handleFileSelect = (file: File) => {
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        const url = URL.createObjectURL(file);
        setPendingFile(file);
        setPendingPreviewUrl(url);
        setEditingItem({ ...editingItem, contenttype: file.type.startsWith("video/") ? "video" : "image" });
    };

    const handleSelectRecord = async (recordKey: string) => {
        if (pickingForIndex === null) return;
        setIsUpdating(true);
        try {
            const existingPlacement = activePlacements.find((p: ComponentPlacement) => p.displayorder === pickingForIndex + 1);
            
            // For non-editable (linked) components, tableName may be undefined — fall back to 'gallery'
            const resolvedTable = tableName || config?.sourcetable || 'gallery';

            const placementData = {
                key: existingPlacement?.key || generateId(),
                schoolkey: schoolKey,
                templatecomponentkey: component.key,
                componentcode: component.componentcode || 'gallery',
                contenttable: resolvedTable,
                contentkey: recordKey,
                displayorder: pickingForIndex + 1,
                isactive: true
            };

            const result = await upsertComponentData('componentplacement', placementData, schoolKey);
            if (result?.success === false) {
                console.error("Failed to save placement:", result.error);
                return;
            }
            
            // Re-sync local placements immediately
            setLocalPlacements(prev => {
                // Remove any existing placement for this slot or content key
                const others = prev.filter(p => p.key !== placementData.key && p.displayorder !== placementData.displayorder);
                return [...others, placementData as ComponentPlacement];
            });

            setPickingForIndex(null);
        } catch (err) {
            console.error("Failed to update placement:", err);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleClearSlot = async (index: number) => {
        const placement = activePlacements.find((p: ComponentPlacement) => p.displayorder === index + 1);
        if (!placement) return;

        setIsUpdating(true);
        try {
            // Mark as deleted locally BEFORE the async call so useEffect doesn't re-add it
            deletedPlacementKeysRef.current.add(placement.key);
            // Optimistically remove from local state
            setLocalPlacements(prev => prev.filter(p => p.key !== placement.key));

            await deleteComponentData('componentplacement', placement.key, schoolKey);
        } catch (err) {
            console.error("Failed to delete placement:", err);
            // Rollback: remove from deleted set and restore
            deletedPlacementKeysRef.current.delete(placement.key);
            setLocalPlacements(prev => [...prev, placement]);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAddNew = (displayOrder?: number) => {
        setEditingItem({
            key: generateId(),
            schoolkey: schoolKey,
            ...getInitialValuesFromFilters(config?.filters || {}),
            url: "",
            caption: "",
            category: "",
            contenttype: effectiveMediaType,
            isactive: true,
            isfeatured: false,
            displayorder: displayOrder || gallery.length + 1
        });
    };

    const handleSave = async () => {
        if (!editingItem.url && !pendingFile) return;
        setIsSaving(true);
        try {
            let finalItem = { ...editingItem };
            
            // Upload pending file if any
            if (pendingFile) {
                setIsUploading(true);
                try {
                    const uploadedUrl = await uploadFile(pendingFile, schoolKey, "gallery");
                    finalItem.url = uploadedUrl;
                } catch (err) {
                    console.error("Upload failed:", err);
                    throw err;
                } finally {
                    setIsUploading(false);
                }
            }

            await saveRecord(finalItem);

            if (config?.selectionmethod === "manual") {
                const placementData = {
                    key: generateId(), // New items always get a new key for the placement if it doesn't exist
                    schoolkey: schoolKey,
                    templatecomponentkey: component.key,
                    componentcode: component.componentcode || '',
                    contenttable: tableName,
                    contentkey: editingItem.key,
                    displayorder: editingItem.displayorder,
                    isactive: true
                };

                await upsertComponentData('componentplacement', placementData, schoolKey);
                
                // Update local state
                setLocalPlacements(prev => {
                    const others = prev.filter(p => p.displayorder !== placementData.displayorder);
                    return [...others, placementData as ComponentPlacement];
                });
            }

            setEditingItem(null);
            handleCloseModal();
        } catch (err) {
            console.error("Failed to save gallery item:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const slots = useMemo(() => {
        const result = [];
        const limit = itemCount || gallery.length || 0;
        const isManual = config?.selectionmethod === "manual";
        
        let unassignedIdx = 0;

        if (!isManual) {
            // Auto mode: find items without a valid displayorder slot
            const unassigned = gallery.filter(g =>
                !g.displayorder || g.displayorder > limit ||
                gallery.filter(other => other.displayorder === g.displayorder).length > 1
            ).sort((a, b) => (new Date(b.createdat || 0).getTime()) - (new Date(a.createdat || 0).getTime()));

            for (let i = 0; i < limit; i++) {
                const displayOrder = i + 1;
                const item = gallery.find((g: any) => g.displayorder === displayOrder);
                if (item) {
                    result.push(item);
                } else if (unassignedIdx < unassigned.length) {
                    result.push({ ...unassigned[unassignedIdx++], displayorder: displayOrder });
                } else {
                    result.push({ isSkeleton: true, displayorder: displayOrder });
                }
            }
        } else {
            // Manual mode: only show an item if there is an explicit placement record, otherwise skeleton
            for (let i = 0; i < limit; i++) {
                const displayOrder = i + 1;
                const placement = activePlacements.find((p: ComponentPlacement) => p.displayorder === displayOrder);
                const item = placement ? gallery.find((g: any) => g.key === placement.contentkey) : null;

                if (item) {
                    result.push(item);
                } else {
                    // No placement → always show empty skeleton, never auto-fill
                    result.push({ isSkeleton: true, displayorder: displayOrder });
                }
            }
        }

        return result;
    }, [gallery, activePlacements, itemCount, config?.selectionmethod]);

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
                        <div key={item.key} className="group relative aspect-square rounded-[32px] overflow-hidden bg-gray-100 border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300">
                            {item.url ? (
                                item.contenttype === 'video' ? (
                                    <div className="relative w-full h-full">
                                        <video 
                                            src={item.url} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                            autoPlay 
                                            loop 
                                            muted 
                                            playsInline 
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/0 transition-colors">
                                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                                                <Play className="w-6 h-6 text-white fill-white" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <img src={item.url} alt={item.caption} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                )
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                            )}
                            
                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 z-20">
                                {isEditable ? (
                                    <button
                                        onClick={() => setEditingItem(item)}
                                        className="p-3 bg-white rounded-2xl text-gray-400 hover:text-[#F54927] shadow-lg border border-gray-100 transition-all active:scale-90"
                                    >
                                        <Edit3 className="w-5 h-5" />
                                    </button>
                                ) : config?.selectionmethod === "manual" && (
                                    <>
                                        <button
                                            title="Change selection"
                                            onClick={() => setPickingForIndex(index)}
                                            className="p-3 bg-white rounded-2xl text-gray-400 hover:text-[#F54927] shadow-lg border border-gray-100 transition-all active:scale-90"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                        <button
                                            title="Remove from this slot"
                                            onClick={() => handleClearSlot(index)}
                                            className="p-3 bg-white rounded-2xl text-gray-400 hover:text-red-500 shadow-lg border border-gray-100 transition-all active:scale-90"
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
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm shadow-2xl">
                    <div className="absolute inset-0" onClick={() => setPickingForIndex(null)} />
                    <div className="relative bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-[18px] font-black text-gray-900 tracking-tight">Select Item for Slot {pickingForIndex + 1}</h3>
                            <button onClick={() => setPickingForIndex(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 grid grid-cols-2 lg:grid-cols-3 gap-6 items-start content-start no-scrollbar scroll-smooth">
                            {gallery.filter((item: any) => item.contenttype === effectiveMediaType).length === 0 ? (
                                <div className="col-span-3 py-20 text-center">
                                    <p className="text-gray-400 font-bold">No {effectiveMediaType} items found.</p>
                                    <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest leading-loose">Switch to Source Screen to upload<br/>new {effectiveMediaType} content first.</p>
                                </div>
                            ) : (
                                gallery
                                    .filter((item: any) => item.contenttype === effectiveMediaType)
                                    .map((item: any) => (
                                    <div key={item.key} className="relative aspect-square group overflow-hidden bg-gray-50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                                        {/* Media fills the square absolutely */}
                                        {item.contenttype === 'video' ? (
                                            <div className="absolute inset-0 bg-gray-900">
                                                <video src={item.url} className="w-full h-full object-cover" muted />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                                                        <Play className="w-5 h-5 text-white fill-white" />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <img 
                                                src={item.url} 
                                                alt={item.caption} 
                                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                            />
                                        )}

                                        {(() => {
                                            const assignedPlacement = activePlacements.find((p: ComponentPlacement) => p.contentkey === item.key);
                                            const isAssigned = !!assignedPlacement;

                                            if (isAssigned) {
                                                // Blocked — show "Already in Slot X" overlay, not clickable
                                                return (
                                                    <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 pointer-events-auto cursor-not-allowed rounded-2xl">
                                                        <div className="w-10 h-10 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center">
                                                            <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                            </svg>
                                                        </div>
                                                        <p className="text-white text-[11px] font-black tracking-wide uppercase text-center px-3 leading-tight">
                                                            Already in<br />Slot {assignedPlacement.displayorder}
                                                        </p>
                                                    </div>
                                                );
                                            }

                                            // Free — clickable
                                            return (
                                                <button
                                                    onClick={() => handleSelectRecord(item.key)}
                                                    className="absolute inset-0 w-full h-full z-10 transition-colors hover:bg-black/5"
                                                />
                                            );
                                        })()}
                                    </div>
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
                                    {gallery.some(g => g.key === editingItem.key) ? 'Update' : 'Add'} {effectiveMediaType === 'video' ? 'Video' : 'Image'} 
                                    {editingItem.displayorder ? ` for Slot ${editingItem.displayorder}` : ''}
                                </h3>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                    Configure current {effectiveMediaType === 'video' ? 'video' : 'image'} in your gallery
                                </p>
                            </div>
                            <button onClick={handleCloseModal} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar">
                            <div className="p-8 space-y-8">
                                <MediaUpload
                                    value={editingItem.url}
                                    type={editingItem.contenttype as any}
                                    onChange={handleMediaChange}
                                    onFileSelect={handleFileSelect}
                                    isStaged={!!pendingFile}
                                    stagedPreviewUrl={pendingPreviewUrl}
                                    isExternalUploading={isUploading}
                                    schoolKey={schoolKey}
                                    category="gallery"
                                    label="Gallery Media"
                                    description="Upload or link an image/video for the gallery"
                                    allowVideo={effectiveMediaType === "video"}
                                    allowImage={effectiveMediaType === "image"}
                                    lockType={true}
                                />

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Caption / description</label>
                                        <textarea
                                            value={editingItem.caption}
                                            onChange={e => setEditingItem({ ...editingItem, caption: e.target.value })}
                                            rows={2}
                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-100 transition-all text-[14px] font-bold outline-none resize-none shadow-inner no-scrollbar"
                                            placeholder="Enter a brief caption for this media..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Category</label>
                                        <input
                                            type="text"
                                            value={editingItem.category}
                                            onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-100 transition-all text-[14px] font-bold outline-none shadow-inner"
                                            placeholder="e.g. Campus, Sports, Academic"
                                        />
                                    </div>

                                    <div 
                                        className="flex items-center gap-3 p-4 bg-gray-50 rounded-[20x] cursor-pointer hover:bg-gray-200/50 transition-all border-2 border-transparent hover:border-emerald-100 group"
                                        onClick={() => setEditingItem({ ...editingItem, isfeatured: !editingItem.isfeatured })}
                                    >
                                        <div className={`w-12 h-6 rounded-full transition-all flex items-center px-1 ${editingItem.isfeatured ? 'bg-emerald-500 justify-end' : 'bg-gray-300 justify-start'}`}>
                                            <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-black text-gray-900 leading-none">Featured Media</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Make this visible in hero sliders</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50/50 flex items-center justify-between border-t border-gray-50">
                            <button
                                onClick={() => { 
                                    if (confirm("Are you sure you want to delete this media?")) {
                                        removeRecord(editingItem.key); 
                                        handleCloseModal();
                                    }
                                }}
                                className="px-6 py-3.5 text-[13px] font-black text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                            >
                                Delete
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCloseModal}
                                    className="px-6 py-3 text-[13px] font-bold text-gray-400 hover:text-gray-900 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isSaving || isUploading || (!editingItem.url && !pendingFile)}
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
                                            {gallery.some(g => g.key === editingItem.key) ? 'Update Item' : 'Add to Gallery'}
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
