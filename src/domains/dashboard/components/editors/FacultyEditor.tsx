"use client";
import { generateId } from '@/lib/generateId';

import React, { useState, useMemo, useEffect } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData } from "@/domains/dashboard/hooks/useComponentData";
import { upsertComponentData, deleteComponentData } from "@/domains/dashboard/actions";
import { useRouter } from "next/navigation";
import type { TemplateComponent, ComponentPlacement } from "@/domains/auth/types";
import MediaUpload from "@/components/ui/MediaUpload";
import { Check, X, Plus, Trash2, Star } from "lucide-react";
import { uploadFile } from "@/lib/supabase/storage";

interface FacultyEditorProps {
    component: TemplateComponent;
    schoolKey: string;
}

export default function FacultyEditor({ component, schoolKey }: FacultyEditorProps) {
    const config = component.config as any;
    const isEditable = component.iseditable;
    const tableName = (component.componentregistry as any)?.tablename;
    const itemCount = config?.itemcount ? parseInt(config.itemcount) : 0;
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
        records: faculty,
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
        try {
            const existingPlacement = placements.find((p: ComponentPlacement) => p.displayorder === pickingForIndex + 1);
            
            const response = await upsertComponentData('componentplacement', {
                key: existingPlacement?.key || undefined,
                schoolkey: schoolKey,
                templatecomponentkey: component.key,
                componentcode: component.componentcode || 'faculty',
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

    const handleAddNew = (displayOrder?: number) => {
        setEditingItem({
            key: generateId(),
            schoolkey: schoolKey,
            name: "",
            designation: "",
            qualification: "",
            experience_years: 0,
            email: "",
            phone: "",
            description: "",
            highlighteddescription: "",
            quotes: "",
            imageurl: "",
            isactive: true,
            displayorder: displayOrder || faculty.length + 1
        });
    };

    const handleSave = async () => {
        if (!editingItem.name || (!editingItem.imageurl && !pendingFile)) return;
        setIsSaving(true);
        try {
            let finalItem = { ...editingItem };

            if (pendingFile) {
                setIsUploading(true);
                try {
                    const uploadedUrl = await uploadFile(pendingFile, schoolKey, "faculty");
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
            console.error("Failed to save faculty member:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const slots = useMemo(() => {
        const result = [];
        
        if (config?.selectionmethod === "manual") {
            const limit = itemCount || faculty.length;
            for (let i = 0; i < limit; i++) {
                const placement = placements.find((p: ComponentPlacement) => p.displayorder === i + 1);
                const item = placement ? faculty.find((f: any) => f.key === placement.contentkey) : null;
                result.push(item || { isSkeleton: true, displayorder: i + 1 });
            }
        } else {
            for (let i = 0; i < itemCount; i++) {
                result.push(faculty.find((f: any) => f.displayorder === i + 1) || { isSkeleton: true, displayorder: i + 1 });
            }
        }
        return result;
    }, [faculty, placements, itemCount, config?.selectionmethod]);

    return (
        <BaseEditor
            title="Faculty & Staff"
            description="Manage your school's leadership team and teaching staff profiles."
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
                                className={`p-6 border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center gap-3 text-gray-400 min-h-[260px] ${canEditSlot ? 'hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/20 cursor-pointer transition-all group' : 'opacity-70 bg-gray-50/30'}`}
                            >
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${canEditSlot ? 'bg-gray-50 group-hover:bg-red-100' : 'bg-gray-100/50'}`}>
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
                                        {isEditable ? "Click to add staff" : (config?.selectionmethod === "manual" ? "Select staff" : "No Data")}
                                    </p>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={item.key}
                            onClick={() => isEditable ? setEditingItem(item) : (config?.selectionmethod === "manual" ? setPickingForIndex(index) : undefined)}
                            className={`group relative rounded-[32px] overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 flex flex-col items-center p-6 pb-8 text-center min-h-[280px] ${isEditable || config?.selectionmethod === "manual" ? "cursor-pointer" : ""}`}
                        >
                            <div className="w-24 h-24 rounded-full bg-gray-50 overflow-hidden mb-5 border-4 border-gray-50 group-hover:border-red-50 transition-colors shadow-inner flex-shrink-0">
                                {item.imageurl ? (
                                    <img src={item.imageurl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gray-50 text-gray-300 group-hover:text-[#F54927]/60 transition-colors">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 flex flex-col items-center min-w-0 w-full mb-2">
                                <h4 className="text-[16px] font-black text-gray-900 group-hover:text-[#F54927] transition-all truncate w-full mb-0.5">{item.name}</h4>
                                <p className="text-[10px] font-black text-[#F54927] uppercase tracking-widest mb-3 leading-none">{item.designation}</p>
                                <p className="text-[12px] text-gray-400 font-bold mb-1">{item.qualification || "No Qualification"}</p>
                                {item.experience_years > 0 && (
                                    <p className="text-[11px] text-gray-400 font-black uppercase tracking-widest mb-3">{item.experience_years} Years Experience</p>
                                )}
                                <p className="text-[12px] text-gray-500 line-clamp-2 leading-relaxed text-center px-2 font-medium">{item.description}</p>
                            </div>

                            {/* Floating Pen Icon */}
                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-2 z-20">
                                {isEditable ? (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}
                                        className="p-3 bg-white rounded-2xl text-gray-400 hover:text-[#F54927] shadow-2xl border border-gray-100 transition-all active:scale-90"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                ) : config?.selectionmethod === "manual" && (
                                    <>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setPickingForIndex(index); }}
                                            className="p-3 bg-white rounded-2xl text-gray-400 hover:text-[#F54927] shadow-2xl border border-gray-100 transition-all active:scale-90"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleClearSlot(index); }}
                                            className="p-3 bg-white rounded-2xl text-gray-400 hover:text-red-500 shadow-2xl border border-red-50 transition-all active:scale-90"
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
                            <h3 className="text-[18px] font-black text-gray-900 tracking-tight">Select Staff Member for Slot {pickingForIndex + 1}</h3>
                            <button onClick={() => setPickingForIndex(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
                            {faculty.filter((item: any) => !item.contenttype || item.contenttype === effectiveMediaType).length === 0 ? (
                                <div className="py-20 text-center">
                                    <p className="text-gray-400 font-bold">No {effectiveMediaType} members found.</p>
                                    <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest leading-loose">Switch to Source Screen to create<br/>new {effectiveMediaType} content first.</p>
                                </div>
                            ) : (
                                faculty
                                    .filter((item: any) => !item.contenttype || item.contenttype === effectiveMediaType)
                                    .map((item: any) => (
                                    <button
                                        key={item.key}
                                        onClick={() => handleSelectRecord(item.key)}
                                        className={`w-full p-4 flex items-center gap-4 rounded-[24px] border-2 transition-all ${slots.some((s: any) => !s.isSkeleton && s.key === item.key) ? "border-red-500 bg-red-50/20" : "border-gray-50 hover:border-red-100 bg-white"}`}
                                    >
                                        <div className="w-14 h-14 rounded-full bg-gray-50 overflow-hidden shrink-0">
                                            <img src={item.imageurl} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="text-left flex-1">
                                            <h4 className="text-[14px] font-black text-gray-900">{item.name}</h4>
                                            <p className="text-[11px] font-bold text-gray-400 mt-0.5">{item.designation} • {item.qualification}</p>
                                        </div>
                                        {slots.some((s: any) => !s.isSkeleton && s.key === item.key) && (
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

            {/* Premium Split-View Modal */}
            {editingItem && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={handleCloseModal} />
                    <div className="relative bg-white w-full max-w-[1000px] rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh]">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#F54927]/10 text-[#F54927] rounded-2xl flex items-center justify-center">
                                    <Star className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-[20px] font-black text-gray-900 tracking-tight">Faculty Profile Editor</h3>
                                    <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Edit Official Profile & Media</p>
                                </div>
                            </div>
                            <button onClick={handleCloseModal} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            {/* Left: Preview Card */}
                            <div className="w-full md:w-[380px] bg-gray-50/50 p-10 border-r border-gray-50 flex items-center justify-center overflow-y-auto no-scrollbar">
                                <div className="w-full max-w-[300px] bg-white rounded-[40px] shadow-xl border border-gray-100 p-8 flex flex-col items-center text-center gap-6 animate-in slide-in-from-left-4 duration-500">
                                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-50 shadow-inner bg-gray-50">
                                        {(editingItem.imageurl || pendingPreviewUrl) ? <img src={pendingPreviewUrl || editingItem.imageurl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-200"><svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>}
                                    </div>
                                    <div className="space-y-1 w-full">
                                        <h4 className="text-[22px] font-black text-gray-900 truncate px-2 leading-tight">{editingItem.name || "Full Name"}</h4>
                                        <p className="text-[12px] font-black text-[#F54927] uppercase tracking-[0.2em] mb-2">{editingItem.designation || "Designation"}</p>
                                        <div className="flex flex-wrap justify-center gap-2 mb-4">
                                            {editingItem.qualification && <span className="px-3 py-1 bg-gray-50 text-gray-500 text-[11px] font-bold rounded-full border border-gray-100">{editingItem.qualification}</span>}
                                            {editingItem.experience_years > 0 && <span className="px-3 py-1 bg-red-50 text-[#F54927] text-[11px] font-black rounded-full border border-red-100">{editingItem.experience_years} Years Exp.</span>}
                                        </div>
                                        {editingItem.quotes && (
                                            <div className="relative pt-4 pb-2 italic text-gray-400 text-[13px] font-medium leading-relaxed">
                                                <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[40px] opacity-10 leading-none">"</span>
                                                {editingItem.quotes}
                                            </div>
                                        )}
                                        <div className="text-[13px] text-gray-500 font-medium line-clamp-3 px-2 mt-2 leading-relaxed whitespace-pre-wrap">{editingItem.highlighteddescription || editingItem.description || "Brief introduction..."}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Form Fields */}
                            <div className="flex-1 overflow-y-auto p-12 space-y-10 no-scrollbar">
                                <section className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Full Name</label>
                                            <input
                                                type="text"
                                                value={editingItem.name || ""}
                                                onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                                                className="w-full px-6 py-5 bg-neutral-50/80 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-[#F54927] transition-all text-[15px] font-bold outline-none"
                                                placeholder="e.g. Dr. Robert Wilson"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Qualification</label>
                                            <input
                                                type="text"
                                                value={editingItem.qualification || ""}
                                                onChange={e => setEditingItem({ ...editingItem, qualification: e.target.value })}
                                                className="w-full px-6 py-5 bg-neutral-50/80 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-[#F54927] transition-all text-[15px] font-bold outline-none"
                                                placeholder="e.g. M.Sc, B.Ed"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Designation</label>
                                            <input
                                                type="text"
                                                value={editingItem.designation || ""}
                                                onChange={e => setEditingItem({ ...editingItem, designation: e.target.value })}
                                                className="w-full px-6 py-5 bg-neutral-50/80 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-[#F54927] transition-all text-[15px] font-bold outline-none"
                                                placeholder="e.g. Senior Faculty"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Experience (Years)</label>
                                            <input
                                                type="number"
                                                value={editingItem.experience_years || 0}
                                                onChange={e => setEditingItem({ ...editingItem, experience_years: parseInt(e.target.value) || 0 })}
                                                className="w-full px-6 py-5 bg-neutral-50/80 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-[#F54927] transition-all text-[15px] font-bold outline-none"
                                                placeholder="10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Email Address</label>
                                            <input
                                                type="email"
                                                value={editingItem.email || ""}
                                                onChange={e => setEditingItem({ ...editingItem, email: e.target.value })}
                                                className="w-full px-6 py-5 bg-neutral-50/80 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-[#F54927] transition-all text-[15px] font-bold outline-none"
                                                placeholder="robert@school.edu"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Phone Number</label>
                                            <input
                                                type="tel"
                                                value={editingItem.phone || ""}
                                                onChange={e => setEditingItem({ ...editingItem, phone: e.target.value })}
                                                className="w-full px-6 py-5 bg-neutral-50/80 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-[#F54927] transition-all text-[15px] font-bold outline-none"
                                                placeholder="+1 234 567 890"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Highlighted Quote</label>
                                        <textarea
                                            value={editingItem.quotes || ""}
                                            onChange={e => setEditingItem({ ...editingItem, quotes: e.target.value })}
                                            rows={2}
                                            className="w-full px-6 py-5 bg-neutral-50/80 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-[#F54927] transition-all text-[15px] font-medium italic outline-none resize-none"
                                            placeholder="A short inspirational quote..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Highlighted Overview</label>
                                        <textarea
                                            value={editingItem.highlighteddescription || ""}
                                            onChange={e => setEditingItem({ ...editingItem, highlighteddescription: e.target.value })}
                                            rows={3}
                                            className="w-full px-6 py-5 bg-neutral-50/80 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-[#F54927] transition-all text-[15px] font-medium outline-none resize-none"
                                            placeholder="Catchy highlight for the profile card..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Full Biography / Detailed Description</label>
                                        <textarea
                                            value={editingItem.description || ""}
                                            onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                                            rows={5}
                                            className="w-full px-6 py-5 bg-neutral-50/80 border-2 border-transparent rounded-[32px] focus:bg-white focus:border-[#F54927] transition-all text-[15px] font-medium outline-none resize-none leading-relaxed"
                                            placeholder="Detailed introduction and history..."
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <MediaUpload
                                            value={editingItem.imageurl || ""}
                                            type="image"
                                            onChange={(url) => setEditingItem({ ...editingItem, imageurl: url })}
                                            onFileSelect={handleFileSelect}
                                            isStaged={!!pendingFile}
                                            stagedPreviewUrl={pendingPreviewUrl}
                                            isExternalUploading={isUploading}
                                            schoolKey={schoolKey}
                                            category="faculty"
                                            label="Profile Photo"
                                            description="Upload a high-quality headshot"
                                            aspectRatio="square"
                                        />
                                    </div>
                                </section>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-8 bg-gray-50/50 flex items-center justify-between border-t border-gray-50">
                            <button
                                onClick={() => { if (confirm("Remove this profile?")) { removeRecord(editingItem.key); handleCloseModal(); } }}
                                className="px-8 py-3 text-[13px] font-black text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                            >
                                Delete Profile
                            </button>
                            <div className="flex gap-4">
                                <button
                                    onClick={handleCloseModal}
                                    className="px-8 py-3 text-[14px] font-black text-gray-400 hover:text-gray-900 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isSaving || isUploading || (!editingItem.imageurl && !pendingFile)}
                                    onClick={handleSave}
                                    className={`
                                        px-12 py-4 text-[14px] font-black rounded-[20px] shadow-xl transition-all active:scale-[0.97] flex items-center gap-3 h-[60px]
                                        ${isSaving || isUploading 
                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                                            : "bg-neutral-950 text-white hover:bg-black"
                                        }
                                    `}
                                >
                                    {(isSaving || isUploading) ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            Update Profile
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
