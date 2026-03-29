"use client";

import React, { useState, useMemo, useEffect } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData } from "@/domains/dashboard/hooks/useComponentData";
import { upsertComponentData, deleteComponentData } from "@/domains/dashboard/actions";
import { useRouter } from "next/navigation";
import type { TemplateComponent, ComponentPlacement } from "@/domains/auth/types";

interface FacultyEditorProps {
    component: TemplateComponent;
    schoolKey: string;
}

export default function FacultyEditor({ component, schoolKey }: FacultyEditorProps) {
    const config = component.config as any;
    const isEditable = component.iseditable;
    const tableName = "faculty";
    const itemCount = config?.itemcount ? parseInt(config.itemcount) : 0;
    const router = useRouter();

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
                componentcode: component.componentcode || 'faculty',
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
        setEditingItem({
            key: crypto.randomUUID(),
            schoolkey: schoolKey,
            name: "",
            designation: "",
            qualification: "",
            description: "",
            imageurl: "",
            isactive: true,
            displayorder: faculty.length + 1
        });
    };

    const handleSave = async () => {
        if (!editingItem.name) return;
        setIsSaving(true);
        try {
            await saveRecord(editingItem);
            setEditingItem(null);
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
            const limit = itemCount > 0 ? itemCount : faculty.length;
            for (let i = 0; i < limit; i++) {
                result.push(faculty[i] || { isSkeleton: true, displayorder: i + 1 });
            }
        }
        return result;
    }, [faculty, placements, itemCount, config?.selectionmethod, isEditable]);

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
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {slots.map((item: any, index: number) => {
                    const canEditSlot = isEditable || config?.selectionmethod === "manual";

                    if (!item || item.isSkeleton) {
                        return (
                            <div
                                key={`empty-${index}`}
                                onClick={() => canEditSlot ? (isEditable ? handleAddNew() : setPickingForIndex(index)) : undefined}
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
                        <div key={item.key} className="group relative rounded-[32px] overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center p-6 pb-8 text-center">
                            <div className="w-24 h-24 rounded-full bg-gray-50 overflow-hidden mb-5 border-4 border-gray-50 group-hover:border-red-50 transition-colors">
                                {item.imageurl ? (
                                    <img src={item.imageurl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 flex flex-col items-center min-w-0 w-full">
                                <h4 className="text-[16px] font-black text-gray-900 group-hover:text-[#F54927] transition-colors truncate w-full mb-0.5">{item.name}</h4>
                                <p className="text-[10px] font-black text-[#F54927] uppercase tracking-widest mb-3 leading-none">{item.designation}</p>
                                <p className="text-[12px] text-gray-400 font-bold mb-3">{item.qualification || "No Qualification"}</p>
                                <p className="text-[12px] text-gray-500 line-clamp-2 leading-relaxed text-center px-2">{item.description}</p>
                            </div>

                            <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-white via-white/95 to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3 translate-y-4 group-hover:translate-y-0 duration-300">
                                {isEditable ? (
                                    <button
                                        onClick={() => setEditingItem(item)}
                                        className="px-6 py-2.5 bg-[#111827] text-white rounded-xl text-[12px] font-black hover:bg-black transition-all shadow-lg"
                                    >
                                        Edit Profile
                                    </button>
                                ) : config?.selectionmethod === "manual" && (
                                    <>
                                        <button
                                            onClick={() => setPickingForIndex(index)}
                                            className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-900 hover:bg-blue-500 hover:text-white transition-all shadow-lg border border-gray-100"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                        <button
                                            onClick={() => handleClearSlot(index)}
                                            className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-900 hover:bg-red-500 hover:text-white transition-all shadow-lg border border-gray-100"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}

                {isEditable && config?.selectionmethod !== "manual" && (
                    <button
                        onClick={handleAddNew}
                        className="p-6 border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/20 transition-all group min-h-[260px]"
                    >
                        <div className="w-16 h-16 rounded-full bg-gray-50 group-hover:bg-red-100 flex items-center justify-center transition-colors">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <p className="text-[14px] font-black tracking-tight">Add Faculty Member</p>
                    </button>
                )}
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
                            {faculty.length === 0 ? (
                                <div className="py-20 text-center text-gray-400 font-bold">No faculty members found.</div>
                            ) : (
                                faculty.map((item: any) => (
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

            {/* Edit/Add Modal */}
            {editingItem && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
                    <div className="absolute inset-0" onClick={() => setEditingItem(null)} />
                    <div className="relative bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                            <h3 className="text-[18px] font-black text-gray-900 tracking-tight">{faculty.some(f => f.key === editingItem.key) ? "Edit Profile" : "New Staff Profile"}</h3>
                            <button onClick={() => setEditingItem(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                                    <input
                                        type="text"
                                        value={editingItem.name}
                                        onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[15px] font-bold outline-none"
                                        placeholder="e.g. Dr. Jane Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Designation</label>
                                    <input
                                        type="text"
                                        value={editingItem.designation}
                                        onChange={e => setEditingItem({ ...editingItem, designation: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none"
                                        placeholder="e.g. Senior Faculty"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Qualification</label>
                                    <input
                                        type="text"
                                        value={editingItem.qualification}
                                        onChange={e => setEditingItem({ ...editingItem, qualification: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none"
                                        placeholder="e.g. M.Sc, B.Ed"
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Profile Image URL</label>
                                    <input
                                        type="text"
                                        value={editingItem.imageurl}
                                        onChange={e => setEditingItem({ ...editingItem, imageurl: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none"
                                        placeholder="https://"
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Biography / Description</label>
                                    <textarea
                                        value={editingItem.description}
                                        onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                                        rows={4}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none resize-none"
                                        placeholder="Brief introduction..."
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
                                    disabled={isSaving || !editingItem.name}
                                    onClick={handleSave}
                                    className="px-8 py-3 bg-[#111827] text-white text-[13px] font-black rounded-xl hover:bg-black transition-all shadow-xl disabled:opacity-50"
                                >
                                    {isSaving ? "Saving..." : (faculty.some(f => f.key === editingItem.key) ? "Update Profile" : "Add Faculty")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </BaseEditor>
    );
}
