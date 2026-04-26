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

interface PrincipalMessageEditorProps {
    component: TemplateComponent;
    screen: TemplateScreen;
    schoolKey: string;
    onRefreshData?: () => Promise<void>;
}

export default function PrincipalMessageEditor({ component, screen, schoolKey, onRefreshData }: PrincipalMessageEditorProps) {
    const config = component.config as any;
    const isEditable = component.iseditable;
    const tableName = (component.componentregistry as any)?.tablename || "leadership";
    const itemCount = config?.itemcount ? parseInt(config.itemcount) : 1;
    const isFixedMode = itemCount !== null;
    const router = useRouter();

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
    const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
    const [pendingImagePreviewUrl, setPendingImagePreviewUrl] = useState<string | null>(null);

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
            if (pendingImagePreviewUrl) URL.revokeObjectURL(pendingImagePreviewUrl);
            if (pendingSignaturePreviewUrl) URL.revokeObjectURL(pendingSignaturePreviewUrl);
        };
    }, [pendingImagePreviewUrl, pendingSignaturePreviewUrl]);

    const handleCloseModal = () => {
        if (pendingImagePreviewUrl) URL.revokeObjectURL(pendingImagePreviewUrl);
        if (pendingSignaturePreviewUrl) URL.revokeObjectURL(pendingSignaturePreviewUrl);
        setPendingImageFile(null);
        setPendingImagePreviewUrl(null);
        setPendingSignatureFile(null);
        setPendingSignaturePreviewUrl(null);
        setEditingItem(null);
    };

    const handleImageSelect = (file: File) => {
        if (pendingImagePreviewUrl) URL.revokeObjectURL(pendingImagePreviewUrl);
        const url = URL.createObjectURL(file);
        setPendingImageFile(file);
        setPendingImagePreviewUrl(url);
    };

    const handleSignatureSelect = (file: File) => {
        if (pendingSignaturePreviewUrl) URL.revokeObjectURL(pendingSignaturePreviewUrl);
        const url = URL.createObjectURL(file);
        setPendingSignatureFile(file);
        setPendingSignaturePreviewUrl(url);
    };

    const handleSelectRecord = async (recordKey: string) => {
        if (pickingForIndex === null) return;
        setIsUpdating(true);

        try {
            const existingPlacement = placements.find((p: ComponentPlacement) => p.displayorder === pickingForIndex + 1);

            const response = await upsertComponentData('componentplacement', {
                key: existingPlacement?.key || undefined,
                schoolkey: schoolKey,
                templatecomponentkey: component.key,
                componentcode: 'principalmessage',
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
            onRefreshData?.();
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
            onRefreshData?.();
        } catch (err) {
            console.error(err);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleEditItem = (item: any) => {
        setEditingItem({ ...item });
    };

    const handleAddNew = () => {
        const newItem = {
            key: generateId(),
            schoolkey: schoolKey,
            ...getInitialValuesFromFilters(filters),
            name: "",
            designation: "Principal",
            message: "",
            quote: "",
            imageurl: "",
            signatureurl: "",
            isactive: true,
            displayorder: leadership.length + 1
        };
        handleEditItem(newItem);
    };

    const handleSave = async () => {
        if (!editingItem.name || (!editingItem.imageurl && !pendingImageFile)) return;
        setIsSaving(true);
        try {
            let finalItem = { ...editingItem };

            setIsUploading(true);
            try {
                // Upload Photo if pending
                if (pendingImageFile) {
                    const uploadedUrl = await uploadFile(pendingImageFile, schoolKey, "principal");
                    finalItem.imageurl = uploadedUrl;
                }

                // Upload Signature if pending
                if (pendingSignatureFile) {
                    const uploadedUrl = await uploadFile(pendingSignatureFile, schoolKey, "principal");
                    finalItem.signatureurl = uploadedUrl;
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
        const count = itemCount || 1;

        if (config?.selectionmethod === "manual") {
            for (let i = 0; i < count; i++) {
                const placement = placements.find((p: ComponentPlacement) => p.displayorder === i + 1);
                const item = placement ? leadership.find((l: any) => l.key === placement.contentkey) : null;
                result.push(item || { isSkeleton: true, displayorder: i + 1 });
            }
        } else {
            for (let i = 0; i < count; i++) {
                result.push(leadership[i] || { isSkeleton: true, displayorder: i + 1 });
            }
        }
        return result;
    }, [leadership, placements, itemCount, config?.selectionmethod]);

    return (
        <BaseEditor
            title="Principal's Message"
            description="Manage the principal's message and profile photo."
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            }
            error={error}
            isEditable={isEditable}
            parentScreenName={component.parentscreenname}
            selectionMethod={config?.selectionmethod}
            emptySlotsCount={slots.filter((s: any) => s.isSkeleton).length}
            component={component}
        >
            <div className="grid grid-cols-1 gap-10">
                {slots.map((item: any, index: number) => {
                    const canEditSlot = isEditable || config?.selectionmethod === "manual";

                    if (!item || item.isSkeleton) {
                        return (
                            <div
                                key={`empty-${index}`}
                                onClick={() => canEditSlot ? (isEditable ? handleAddNew() : setPickingForIndex(index)) : undefined}
                                className={`p-8 border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center gap-4 text-gray-400 min-h-[300px] ${canEditSlot ? 'hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/20 cursor-pointer transition-all group' : 'opacity-70 bg-gray-50/30'}`}
                            >
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${canEditSlot ? 'bg-gray-50 group-hover:bg-red-100' : 'bg-gray-100/50'}`}>
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <p className="text-[14px] font-black tracking-tight">Slot {index + 1}</p>
                                    <p className="text-[11px] font-medium text-gray-400">{isEditable ? "Set Principal Message" : "No Content"}</p>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={item.key}
                            onClick={() => isEditable ? handleEditItem(item) : (config?.selectionmethod === "manual" ? setPickingForIndex(index) : undefined)}
                            className={`group relative rounded-[32px] overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-500 flex flex-col items-center p-12 text-center min-h-[500px] ${isEditable || config?.selectionmethod === "manual" ? "cursor-pointer" : ""}`}
                        >
                            <div className="w-40 h-40 rounded-full overflow-hidden mb-8 border-4 border-gray-50 group-hover:border-red-50 transition-colors shadow-inner flex-shrink-0">
                                {item.imageurl ? (
                                    <img src={item.imageurl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gray-50 text-gray-200 group-hover:bg-red-50 transition-colors">
                                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 flex flex-col items-center w-full max-w-2xl">
                                <span className="text-[11px] font-black text-[#F54927] uppercase tracking-[0.3em] mb-2">{item.designation || "Principal"}</span>
                                <h4 className="text-[28px] font-black text-gray-900 group-hover:text-[#F54927] transition-colors mb-4">{item.name || "Full Name"}</h4>
                                
                                {item.quote && (
                                    <div className="bg-yellow-50/50 p-6 rounded-3xl border border-yellow-100/50 border-dashed mb-6 italic">
                                        <p className="text-[15px] text-gray-700 font-bold leading-relaxed">"{item.quote}"</p>
                                    </div>
                                )}
                                
                                <p className="text-[16px] text-gray-500 line-clamp-6 leading-relaxed italic font-medium whitespace-pre-wrap px-4">
                                    {item.message || "Message and profile details goes here..."}
                                </p>
                            </div>

                            {/* {item.signatureurl && (
                                <div className="mt-8 h-16 flex items-center justify-center">
                                    <img src={item.signatureurl} alt="Signature" className="h-full w-auto object-contain opacity-50 grayscale" />
                                </div>
                            )} */}

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

            {pickingForIndex !== null && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
                    <div className="absolute inset-0" onClick={() => setPickingForIndex(null)} />
                    <div className="relative bg-white w-full max-w-2xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-[20px] font-black text-gray-900 tracking-tight">Select Message Profile</h3>
                            <button onClick={() => setPickingForIndex(null)} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
                            {leadership.map((item: any) => (
                                <button
                                    key={item.key}
                                    onClick={() => handleSelectRecord(item.key)}
                                    className={`w-full p-6 flex items-center gap-6 rounded-3xl border-2 transition-all text-left ${slots.some((s: any) => !s.isSkeleton && s.key === item.key) ? "border-[#F54927] bg-red-50/20" : "border-gray-50 hover:border-red-100 bg-white"}`}
                                >
                                    <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border border-gray-100">
                                        {item.imageurl ? <img src={item.imageurl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-50" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[16px] font-black text-gray-900 truncate">{item.name}</p>
                                        <p className="text-[12px] font-bold text-[#F54927] uppercase tracking-widest mt-1">{item.designation}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {editingItem && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={handleCloseModal} />
                    <div className="relative bg-white w-full max-w-[1000px] rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh]">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#F54927]/10 text-[#F54927] rounded-2xl flex items-center justify-center">
                                    <Check className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-[20px] font-black text-gray-900 tracking-tight">Principal Profile Editor</h3>
                                    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Edit Official Message & Media</p>
                                </div>
                            </div>
                            <button onClick={handleCloseModal} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            <div className="w-full md:w-[380px] bg-gray-50/50 p-10 border-r border-gray-50 flex items-center justify-center overflow-y-auto no-scrollbar">
                                <div className="w-full max-w-[300px] bg-white rounded-[40px] shadow-xl border border-gray-100 p-8 flex flex-col items-center text-center gap-6 animate-in slide-in-from-left-4 duration-500">
                                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-50 shadow-inner bg-gray-50 flex-shrink-0">
                                        {editingItem.imageurl ? <img src={editingItem.imageurl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-200"><svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>}
                                    </div>
                                    <div className="space-y-2 w-full">
                                        <span className="text-[10px] font-black text-[#F54927] uppercase tracking-[0.2em]">{editingItem.designation || "Principal"}</span>
                                        <h4 className="text-[22px] font-black text-gray-900 truncate px-2 leading-tight">{editingItem.name || "Full Name"}</h4>
                                        <div className="text-[13px] text-gray-500 font-medium line-clamp-4 italic px-2 mt-4 leading-relaxed whitespace-pre-wrap">{editingItem.message || "Message content goes here..."}</div>
                                    </div>
                                    {/* {editingItem.signatureurl && <img src={editingItem.signatureurl} alt="" className="h-12 w-auto opacity-50 grayscale" />} */}
                                </div>
                            </div>

                        <div className="flex-1 overflow-y-auto p-12 no-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                                <div className="lg:col-span-7 space-y-10">
                                    <section className="space-y-8">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Full Name</label>
                                                <input
                                                    type="text"
                                                    value={editingItem.name || ""}
                                                    onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                                                    className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-red-100 transition-all text-[15px] font-bold outline-none shadow-inner"
                                                    placeholder="e.g. Dr. Jane Smith"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Designation</label>
                                                <input
                                                    type="text"
                                                    value={editingItem.designation || ""}
                                                    onChange={e => setEditingItem({ ...editingItem, designation: e.target.value })}
                                                    className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-red-100 transition-all text-[15px] font-bold outline-none shadow-inner"
                                                    placeholder="Principal"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Quote (Heading)</label>
                                            <input
                                                type="text"
                                                value={editingItem.quote || ""}
                                                onChange={e => setEditingItem({ ...editingItem, quote: e.target.value })}
                                                className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-red-100 transition-all text-[15px] font-bold outline-none shadow-inner"
                                                placeholder="A short punchy quote or heading..."
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Full Message</label>
                                            <textarea
                                                value={editingItem.message || ""}
                                                onChange={e => setEditingItem({ ...editingItem, message: e.target.value })}
                                                rows={10}
                                                className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-[32px] focus:bg-white focus:border-red-100 transition-all text-[15px] font-bold outline-none resize-none no-scrollbar shadow-inner"
                                                placeholder="Write the full message from the principal..."
                                            />
                                        </div>
                                    </section>
                                </div>

                                <div className="lg:col-span-5 space-y-8">
                                    <MediaUpload
                                        value={editingItem.imageurl || ""}
                                        type="image"
                                        onChange={(url) => setEditingItem({ ...editingItem, imageurl: url })}
                                        onFileSelect={handleImageSelect}
                                        isStaged={!!pendingImageFile}
                                        stagedPreviewUrl={pendingImagePreviewUrl}
                                        isExternalUploading={isUploading}
                                        schoolKey={schoolKey}
                                        category="principal"
                                        label="Principal Photo"
                                        description="High-quality professional headshot"
                                        allowVideo={false}
                                        aspectRatio="square"
                                    />
                                    {/* <MediaUpload
                                        value={editingItem.signatureurl || ""}
                                        type="image"
                                        onChange={(url) => setEditingItem({ ...editingItem, signatureurl: url })}
                                        onFileSelect={handleSignatureSelect}
                                        isStaged={!!pendingSignatureFile}
                                        stagedPreviewUrl={pendingSignaturePreviewUrl}
                                        isExternalUploading={isUploading}
                                        schoolKey={schoolKey}
                                        category="principal"
                                        label="Official Signature"
                                        description="Scanned transparent signature"
                                        allowVideo={false}
                                        aspectRatio="any"
                                    /> */}
                                </div>
                            </div>
                        </div>
                        </div>

                        <div className="p-8 border-t border-gray-50 bg-gray-50/30 flex items-center justify-between">
                            {leadership.some(l => l.key === editingItem.key) && (
                                <button
                                    onClick={() => { if (confirm("Delete this profile?")) { removeRecord(editingItem.key); handleCloseModal(); } }}
                                    className="px-6 py-3.5 text-[13px] font-black text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                >
                                    Delete
                                </button>
                            )}
                            <div className="flex gap-4 ml-auto">
                                <button onClick={handleCloseModal} className="px-8 py-4 text-[13px] font-bold text-gray-400 hover:text-gray-900 transition-all">Cancel</button>
                                <button
                                    disabled={isSaving || isUploading || (!editingItem.imageurl && !pendingImageFile)}
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
                                            {leadership.some((l: any) => l.key === editingItem.key) ? 'Update Profile' : 'Add to Collection'}
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
