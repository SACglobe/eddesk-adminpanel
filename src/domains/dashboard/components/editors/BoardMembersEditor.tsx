"use client";
import { generateId } from '@/lib/generateId';

import React, { useState, useMemo, useEffect } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData, getInitialValuesFromFilters } from "@/domains/dashboard/hooks/useComponentData";
import { upsertComponentData, deleteComponentData } from "@/domains/dashboard/actions";
import { useRouter } from "next/navigation";
import type { TemplateComponent, TemplateScreen, ComponentPlacement } from "@/domains/auth/types";
import { uploadFile } from "@/lib/supabase/storage";
import MediaUpload from "@/components/ui/MediaUpload";
import { Check, X } from "lucide-react";

interface BoardMembersEditorProps {
    component: TemplateComponent;
    screen: TemplateScreen;
    schoolKey: string;
}

export default function BoardMembersEditor({ component, screen, schoolKey }: BoardMembersEditorProps) {
    const config = component.config as any;
    const isEditable = component.iseditable;
    const tableName = (component.componentregistry as any)?.tablename || "leadership";
    const itemCount = config?.itemcount ? parseInt(config.itemcount) : 10;
    const router = useRouter();

    const effectiveMediaType = useMemo(() => {
        const type = config?.variant || config?.mediatype;
        if (!type) return "image";
        const lowType = type.toLowerCase();
        if (lowType === "video" || lowType === "videos") return "video";
        return "image";
    }, [config?.variant, config?.mediatype]);

    const filters = useMemo(() => ({
        ...(config?.filters || {})
    }), [config?.filters]);

    const {
        records: leadership,
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

    // Staged upload state for Photo
    const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
    const [pendingPhotoPreviewUrl, setPendingPhotoPreviewUrl] = useState<string | null>(null);
    
    // Staged upload state for Signature
    const [pendingSignatureFile, setPendingSignatureFile] = useState<File | null>(null);
    const [pendingSignaturePreviewUrl, setPendingSignaturePreviewUrl] = useState<string | null>(null);
    
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
            if (pendingPhotoPreviewUrl) URL.revokeObjectURL(pendingPhotoPreviewUrl);
            if (pendingSignaturePreviewUrl) URL.revokeObjectURL(pendingSignaturePreviewUrl);
        };
    }, [pendingPhotoPreviewUrl, pendingSignaturePreviewUrl]);

    const handleCloseModal = () => {
        if (pendingPhotoPreviewUrl) URL.revokeObjectURL(pendingPhotoPreviewUrl);
        if (pendingSignaturePreviewUrl) URL.revokeObjectURL(pendingSignaturePreviewUrl);
        setPendingPhotoFile(null);
        setPendingPhotoPreviewUrl(null);
        setPendingSignatureFile(null);
        setPendingSignaturePreviewUrl(null);
        setEditingItem(null);
    };

    const handlePhotoSelect = (file: File) => {
        if (pendingPhotoPreviewUrl) URL.revokeObjectURL(pendingPhotoPreviewUrl);
        const url = URL.createObjectURL(file);
        setPendingPhotoFile(file);
        setPendingPhotoPreviewUrl(url);
    };

    const handleSignatureSelect = (file: File) => {
        if (pendingSignaturePreviewUrl) URL.revokeObjectURL(pendingSignaturePreviewUrl);
        const url = URL.createObjectURL(file);
        setPendingSignatureFile(file);
        setPendingSignaturePreviewUrl(url);
    };

    useEffect(() => {
        console.group('%c[BoardMembersEditor] LEADERSHIP CONTENT', 'color:#6366f1;font-weight:bold');
        console.log('Filters:', filters);
        console.log('Record count:', leadership.length);
        console.table(leadership.map((l: any) => ({
            name: l.name,
            designation: l.designation,
            isactive: l.isactive,
        })));
        console.groupEnd();
    }, [leadership]);

    const handleSelectRecord = async (recordKey: string) => {
        if (pickingForIndex === null) return;
        setIsUpdating(true);

        try {
            const existingPlacement = placements.find((p: ComponentPlacement) => p.displayorder === pickingForIndex + 1);

            const response = await upsertComponentData('componentplacement', {
                key: existingPlacement?.key || undefined,
                schoolkey: schoolKey,
                templatecomponentkey: component.key,
                componentcode: 'boardmembers',
                contenttable: tableName,
                contentkey: recordKey,
                displayorder: pickingForIndex + 1,
                isactive: true
            }, schoolKey);

            if (response.success && response.data) {
                const newPlacement = response.data as unknown as ComponentPlacement;
                setPlacements(prev => {
                    const next = prev.filter(p => p.displayorder !== newPlacement.displayorder);
                    next.push(newPlacement);
                    return next.sort((a, b) => (a.displayorder || 0) - (b.displayorder || 0));
                });
            }

            setPickingForIndex(null);
            router.refresh();
        } catch (err) {
            console.error(err);
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
            console.error(err);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleEditItem = (item: any) => {
        setEditingItem({ ...item });
    };

    const handleAddNew = (displayOrder?: number) => {
        const initialValues = getInitialValuesFromFilters(filters);

        const newItem = {
            key: generateId(),
            schoolkey: schoolKey,
            ...initialValues,
            name: "",
            designation: initialValues.designation || "",
            message: "",
            quote: "",
            imageurl: "",
            signatureurl: "",
            contenttype: config?.mediatype === "video" ? "video" : "image",
            isactive: true,
            displayorder: displayOrder || leadership.length + 1
        };
        handleEditItem(newItem);
    };

    const handleSave = async () => {
        if (!editingItem.name || (!editingItem.photo_url && !pendingPhotoFile)) return;
        setIsSaving(true);
        try {
            let finalItem = { ...editingItem };

            setIsUploading(true);
            try {
                // Upload Photo if pending
                if (pendingPhotoFile) {
                    const uploadedUrl = await uploadFile(pendingPhotoFile, schoolKey, "leadership");
                    finalItem.photo_url = uploadedUrl;
                }

                // Upload Signature if pending
                if (pendingSignatureFile) {
                    const uploadedUrl = await uploadFile(pendingSignatureFile, schoolKey, "leadership");
                    finalItem.signature_url = uploadedUrl;
                }
            } catch (err) {
                console.error("Upload failed:", err);
                throw err;
            } finally {
                setIsUploading(false);
            }

            await saveRecord(finalItem);
            handleCloseModal();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };


    const slots = useMemo(() => {
        const result = [];
        const count = itemCount;

        if (config?.selectionmethod === "manual") {
            for (let i = 0; i < count; i++) {
                const placement = placements.find((p: ComponentPlacement) => p.displayorder === i + 1);
                const item = placement ? leadership.find((l: any) => l.key === placement.contentkey) : null;
                result.push(item || { isSkeleton: true, displayorder: i + 1 });
            }
        } else {
            for (let i = 0; i < count; i++) {
                result.push(leadership.find((l: any) => l.displayorder === i + 1) || { isSkeleton: true, displayorder: i + 1 });
            }
        }
        return result;
    }, [leadership, placements, itemCount, config?.selectionmethod]);

    return (
        <BaseEditor
            title="Board Members"
            description="Manage your school's board of directors and leadership team profiles."
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            }
            error={error}
            isEditable={isEditable}
            parentScreenName={component.parentscreenname}
            selectionMethod={config?.selectionmethod}
            emptySlotsCount={slots.filter((s: any) => s.isSkeleton).length}
            component={component}
        >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {slots.map((item: any, index: number) => {
                    const canEditSlot = isEditable || config?.selectionmethod === "manual";

                    if (!item || item.isSkeleton) {
                        return (
                            <div
                                key={`empty-${index}`}
                                onClick={() => canEditSlot ? (isEditable ? handleAddNew(index + 1) : setPickingForIndex(index)) : undefined}
                                className={`h-[320px] border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center gap-3 text-gray-400 ${canEditSlot ? 'hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/20 cursor-pointer transition-all group' : 'opacity-70 bg-gray-50/30'}`}
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${canEditSlot ? 'bg-gray-50 group-hover:bg-red-100' : 'bg-gray-100/50'}`}>
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <div className="text-center px-4">
                                    <p className="text-[14px] font-black tracking-tight">Slot {index + 1}</p>
                                    <p className="text-[11px] font-medium text-gray-400">Add Member</p>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={item.key}
                            onClick={() => isEditable ? handleEditItem(item) : (config?.selectionmethod === "manual" ? setPickingForIndex(index) : undefined)}
                            className={`group relative rounded-[32px] overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 flex flex-col items-center p-6 pb-8 text-center min-h-[300px] ${isEditable || config?.selectionmethod === "manual" ? "cursor-pointer" : ""}`}
                        >
                            {/* Avatar */}
                            <div className="w-24 h-24 rounded-full bg-gray-50 overflow-hidden mb-5 border-4 border-gray-50 group-hover:border-red-50 transition-colors shadow-inner flex-shrink-0">
                                {item.imageurl ? (
                                    item.contenttype === 'video' ? (
                                        <video 
                                            src={item.imageurl} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                            autoPlay 
                                            loop 
                                            muted 
                                            playsInline 
                                        />
                                    ) : (
                                        <img src={item.imageurl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    )
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gray-50 text-gray-300 group-hover:text-[#F54927]/60 transition-colors">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
 
                            <div className="flex-1 flex flex-col items-center min-w-0 w-full mb-2">
                                <h4 className="text-[16px] font-black text-gray-900 group-hover:text-[#F54927] transition-colors truncate w-full mb-0.5">{item.name || "Name Not Set"}</h4>
                                <p className="text-[10px] font-black text-[#F54927] uppercase tracking-widest mb-3 leading-none">{item.designation || "Member"}</p>
                                
                                {item.quote && (
                                    <p className="text-[12px] text-gray-500 line-clamp-2 leading-relaxed text-center px-2 font-medium">"{item.quote}"</p>
                                )}
                            </div>

                            {/* Hover Pencil Icon */}
                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-2 z-10">
                                {isEditable ? (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleEditItem(item); }}
                                        className="p-3 bg-white rounded-2xl text-gray-400 hover:text-[#F54927] shadow-2xl border border-gray-100 transition-all active:scale-90"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                ) : config?.selectionmethod === "manual" && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleClearSlot(index); }}
                                        className="p-3 bg-white rounded-2xl text-gray-400 hover:text-red-500 shadow-2xl border border-gray-100 transition-all active:scale-90"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Selection Dialog */}
            {pickingForIndex !== null && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
                    <div className="absolute inset-0" onClick={() => setPickingForIndex(null)} />
                    <div className="relative bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-[18px] font-black text-gray-900 tracking-tight">Select Member for Slot {pickingForIndex + 1}</h3>
                            <button onClick={() => setPickingForIndex(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-3 no-scrollbar">
                            {leadership.filter((item: any) => item.contenttype === effectiveMediaType).length === 0 ? (
                                <div className="col-span-2 py-20 text-center">
                                    <p className="text-gray-400 font-bold">No {effectiveMediaType} members found.</p>
                                    <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest leading-loose">Switch to Source Screen to create<br/>new {effectiveMediaType} content first.</p>
                                </div>
                            ) : (
                                leadership
                                    .filter((item: any) => item.contenttype === effectiveMediaType)
                                    .map((item: any) => (
                                        <button
                                            key={item.key}
                                            onClick={() => handleSelectRecord(item.key)}
                                            className={`p-4 flex items-center gap-4 rounded-2xl border-2 transition-all text-left ${slots.some((s: any) => !s.isSkeleton && s.key === item.key) ? "border-[#F54927] bg-red-50/20" : "border-gray-50 hover:border-red-100 bg-white"}`}
                                        >
                                            <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-gray-200">
                                                {item.imageurl ? (
                                                    item.contenttype === 'video' ? (
                                                        <video src={item.imageurl} className="w-full h-full object-cover" muted />
                                                    ) : (
                                                        <img src={item.imageurl} alt="" className="w-full h-full object-cover" />
                                                    )
                                                ) : <div className="w-full h-full bg-gray-50" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-black text-gray-900 truncate">{item.name}</p>
                                                <p className="text-[11px] font-bold text-gray-400 mt-0.5">{item.designation}</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                        </div>
                    </div>
                </div>
            )}

            {/* New Premium Split-View Modal */}
            {editingItem && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
                    <div className="absolute inset-0" onClick={handleCloseModal} />
                    <div className="relative bg-white w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white/50">
                            <div>
                                <h3 className="text-[20px] font-black text-gray-900 tracking-tight">
                                    {leadership.some(l => l.key === editingItem.key) ? 'Update' : 'Add'} Board Member
                                </h3>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                    Manage profile details and message
                                </p>
                            </div>
                            <button onClick={handleCloseModal} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-3 no-scrollbar">
                            {/* Split Body */}
                            <div className="flex-1 overflow-hidden flex flex-col md:flex-row col-span-2">
                                {/* Left: Preview Card */}
                                <div className="w-full md:w-[360px] bg-gray-50/50 p-10 border-r border-gray-50 flex items-center justify-center overflow-y-auto no-scrollbar">
                                    <div className="w-full max-w-[280px] bg-white rounded-[40px] shadow-xl border border-gray-100 p-8 flex flex-col items-center text-center gap-6 animate-in slide-in-from-left-4 duration-500">
                                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-50 shadow-inner bg-gray-50">
                                            {editingItem.imageurl ? <img src={editingItem.imageurl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-200"><svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>}
                                        </div>
                                        <div className="space-y-2 w-full">
                                            <span className="text-[10px] font-black text-[#F54927] uppercase tracking-[0.2em]">{editingItem.designation || "Member"}</span>
                                            <h4 className="text-[20px] font-black text-gray-900 truncate px-2">{editingItem.name || "Full Name"}</h4>
                                            <p className="text-[13px] text-gray-500 font-medium line-clamp-3 italic px-4 mt-4">{editingItem.message || "Message content goes here..."}</p>
                                        </div>
                                        {/* {editingItem.signatureurl && <img src={editingItem.signatureurl} alt="" className="h-10 w-auto opacity-50 grayscale" />} */}
                                    </div>
                                </div>

                                {/* Middle & Right: Editors */}
                                <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
                                    {/* Member Identity */}
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Full Name</label>
                                                <input
                                                    type="text"
                                                    value={editingItem.name || ""}
                                                    onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                                                    className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-red-100 transition-all text-[15px] font-bold outline-none"
                                                    placeholder="e.g. Dr. Robert Wilson"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Designation</label>
                                                <input
                                                    type="text"
                                                    value={editingItem.designation || ""}
                                                    onChange={e => setEditingItem({ ...editingItem, designation: e.target.value })}
                                                    className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-red-100 transition-all text-[15px] font-bold outline-none"
                                                    placeholder="e.g. Managing Director"
                                                />
                                            </div>
                                        </div>

                                        {/* Upload Zones */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <MediaUpload
                                                value={editingItem.photo_url || ""}
                                                type="image"
                                                onChange={(url) => setEditingItem({ ...editingItem, photo_url: url })}
                                                onFileSelect={handlePhotoSelect}
                                                isStaged={!!pendingPhotoFile}
                                                stagedPreviewUrl={pendingPhotoPreviewUrl}
                                                isExternalUploading={isUploading}
                                                schoolKey={schoolKey}
                                                category="leadership"
                                                label="Profile Photo"
                                                description="Upload a high-quality professional headshot"
                                                aspectRatio="square"
                                            />
                                            
                                            {/* <MediaUpload
                                                value={editingItem.signature_url || ""}
                                                type="image"
                                                onChange={(url) => setEditingItem({ ...editingItem, signature_url: url })}
                                                onFileSelect={handleSignatureSelect}
                                                isStaged={!!pendingSignatureFile}
                                                stagedPreviewUrl={pendingSignaturePreviewUrl}
                                                isExternalUploading={isUploading}
                                                schoolKey={schoolKey}
                                                category="leadership"
                                                label="Author Signature"
                                                description="Upload a clear image of their signature (PNG preferred)"
                                                aspectRatio="video"
                                            /> */}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Quote</label>
                                            <input
                                                type="text"
                                                value={editingItem.quote || ""}
                                                onChange={e => setEditingItem({ ...editingItem, quote: e.target.value })}
                                                className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-red-100 transition-all text-[15px] font-bold outline-none"
                                                placeholder="A short punchy quote (optional)"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Message Content</label>
                                            <textarea
                                                value={editingItem.message || ""}
                                                onChange={e => setEditingItem({ ...editingItem, message: e.target.value })}
                                                rows={8}
                                                className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-[32px] focus:bg-white focus:border-red-100 transition-all text-[14px] font-bold outline-none resize-none no-scrollbar"
                                                placeholder="The full message to show in the board member's profile card..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-gray-50/50 flex items-center justify-between border-t border-gray-50">
                            {leadership.some(l => l.key === editingItem.key) && (
                                <button
                                    onClick={() => { if (confirm("Delete this profile?")) { removeRecord(editingItem.key); handleCloseModal(); } }}
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
                                    disabled={isSaving || isUploading || (!editingItem.photo_url && !pendingPhotoFile)}
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
                                            {leadership.some(l => l.key === editingItem.key) ? 'Update Profile' : 'Add Member'}
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
