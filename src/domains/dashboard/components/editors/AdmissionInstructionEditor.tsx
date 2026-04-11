"use client";

import { generateId } from '@/lib/generateId';
import { useState, useMemo } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData, getInitialValuesFromFilters } from "@/domains/dashboard/hooks/useComponentData";
import { useRouter } from "next/navigation";
import type { TemplateComponent, TemplateScreen } from "@/domains/auth/types";

interface AdmissionInstructionEditorProps {
    component: TemplateComponent;
    schoolKey: string;
}

export default function AdmissionInstructionEditor({ component, schoolKey }: AdmissionInstructionEditorProps) {
    // Explicitly use the datasource from config or fall back to the Registry name
    const config = component.config as any;
    const tableName = config?.datasource || (component.componentregistry as any)?.tablename || "admissioninstruction";
    
    const isEditable = component.iseditable;
    const itemCount = config?.itemcount ? parseInt(config.itemcount) : 6;
    const router = useRouter();

    const filters = useMemo(() => ({
        ...(config?.filters || {})
    }), [config?.filters]);

    const {
        records: items,
        isSaving,
        error,
        saveRecord,
        removeRecord
    } = useComponentData({
        tableName,
        schoolKey,
        filters,
        initialRecords: (component as any).content || []
    });

    const [editingItem, setEditingItem] = useState<any>(null);

    const handleAddNew = (displayOrder: number) => {
        const initialValues = getInitialValuesFromFilters(filters);
        
        setEditingItem({
            key: generateId(),
            schoolkey: schoolKey,
            ...initialValues,
            title: "",
            description: "",
            isactive: true,
            displayorder: displayOrder
        });
    };

    const slots = useMemo(() => {
        const result = [];
        // We match by displayorder based on the updated schema
        for (let i = 0; i < itemCount; i++) {
            const displayOrder = i + 1;
            const existing = items.find((it: any) => it.displayorder === displayOrder);
            
            if (existing) {
                result.push(existing);
            } else {
                result.push({ isSkeleton: true, displayorder: displayOrder });
            }
        }
        return result;
    }, [items, itemCount]);

    return (
        <BaseEditor
            title="Admission Instructions"
            description="Manage the step-by-step instructions for the admission process."
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
            }
            error={error}
            isEditable={isEditable}
            parentScreenName={component.parentscreenname}
            selectionMethod={config?.selectionmethod || "auto"}
            emptySlotsCount={slots.filter((s:any) => s.isSkeleton).length}
            component={component}
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {slots.map((item: any, index: number) => {
                    const displayOrder = index + 1;
                    
                    if (!item || item.isSkeleton) {
                        return (
                            <div
                                key={`empty-${index}`}
                                onClick={() => isEditable ? handleAddNew(displayOrder) : undefined}
                                className={`p-8 border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center gap-4 text-gray-400 min-h-[200px] ${isEditable ? "hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/20 cursor-pointer transition-all group" : "opacity-70 bg-gray-50/30"}`}
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isEditable ? "bg-gray-50 group-hover:bg-red-100" : "bg-gray-100/50"}`}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <p className="text-[14px] font-black tracking-tight">Step {displayOrder}</p>
                                    <p className="text-[11px] font-medium text-gray-400">{isEditable ? "Add Instruction" : "Empty Slot"}</p>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={item.key} className="group relative rounded-[32px] overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 flex flex-col p-8 min-h-[200px]">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-[18px] font-black text-gray-400 group-hover:text-[#F54927] transition-colors">
                                    {displayOrder}
                                </div>
                                {isEditable && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}
                                        className="p-2 bg-white rounded-xl text-gray-400 hover:text-[#F54927] shadow-lg border border-gray-100 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            
                            <h4 className="text-[16px] font-black text-gray-900 mb-2 line-clamp-1">{item.title}</h4>
                            <p className="text-[13px] font-medium text-gray-500 leading-relaxed line-clamp-3">{item.description}</p>
                        </div>
                    );
                })}
            </div>

            {editingItem && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-md">
                    <div className="absolute inset-0" onClick={() => setEditingItem(null)} />
                    <div className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white">
                            <div>
                                <h3 className="text-[20px] font-black text-gray-900 tracking-tight">
                                    {items.some(i => i.key === editingItem.key) ? `Edit Step ${editingItem.displayorder}` : `New Step ${editingItem.displayorder}`}
                                </h3>
                                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mt-1">Admission Instruction Details</p>
                            </div>
                            <button onClick={() => setEditingItem(null)} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-10 space-y-8">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-2">Step Title</label>
                                <input
                                    type="text"
                                    value={editingItem.title}
                                    onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                                    className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-red-100 transition-all text-[15px] font-bold outline-none shadow-inner"
                                    placeholder="e.g. Digital Inquiry"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-2">Instruction Description</label>
                                <textarea
                                    value={editingItem.description}
                                    onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                                    rows={4}
                                    className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-red-100 transition-all text-[14px] font-bold outline-none resize-none shadow-inner"
                                    placeholder="Explain this step of the admission process..."
                                />
                            </div>
                        </div>

                        <div className="p-8 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between">
                            <button
                                onClick={() => { removeRecord(editingItem.key); setEditingItem(null); }}
                                className="px-6 py-3 text-[13px] font-bold text-red-500 hover:text-red-600 transition-all"
                            >
                                Delete Step
                            </button>
                            <div className="flex gap-4">
                                <button onClick={() => setEditingItem(null)} className="px-8 py-3 text-[13px] font-bold text-gray-400 hover:text-gray-900 transition-all">Cancel</button>
                                <button
                                    disabled={isSaving || !editingItem.title}
                                    onClick={async () => {
                                        await saveRecord(editingItem);
                                        setEditingItem(null);
                                        router.refresh();
                                    }}
                                    className="px-10 py-3 bg-[#111827] text-white text-[14px] font-black rounded-2xl hover:bg-black transition-all shadow-xl disabled:opacity-50"
                                >
                                    {isSaving ? "Saving..." : "Save Step"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </BaseEditor>
    );
}
