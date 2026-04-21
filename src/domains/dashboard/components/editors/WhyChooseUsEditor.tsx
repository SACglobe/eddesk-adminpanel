"use client";
import { generateId } from '@/lib/generateId';

import { useState, useMemo, useEffect } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData, getInitialValuesFromFilters } from "@/domains/dashboard/hooks/useComponentData";
import IconPicker from "@/components/ui/IconPicker";
import ColorPicker from "@/components/ui/ColorPicker";
import DynamicIcon from "@/components/ui/DynamicIcon";
import { useRouter } from "next/navigation";
import type { TemplateComponent, TemplateScreen } from "@/domains/auth/types";

interface WhyChooseUsEditorProps {
    component: TemplateComponent;
    screen: TemplateScreen;
    schoolKey: string;
}

export default function WhyChooseUsEditor({ component, screen, schoolKey }: WhyChooseUsEditorProps) {
    const tableName = (component.componentregistry as any)?.tablename || "whychooseus";
    const config = component.config as any;
    const isEditable = component.iseditable;
    const itemCount = config?.itemcount ? parseInt(config.itemcount) : 3;
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

    const handleAddNew = () => {
        const initialValues = getInitialValuesFromFilters(filters);
        
        setEditingItem({
            key: generateId(),
            schoolkey: schoolKey,
            ...initialValues,
            title: "",
            description: "",
            icon: "ShieldCheck",
            iconcolor: "#F54927",
            isactive: true,
            displayorder: items.length + 1
        });
    };

    const slots = useMemo(() => {
        const result = [];
        const unassigned = items.filter(it => 
            !it.displayorder || it.displayorder > itemCount || items.filter(other => other.displayorder === it.displayorder).length > 1
        ).sort((a, b) => (new Date(b.createdat || 0).getTime()) - (new Date(a.createdat || 0).getTime()));

        let unassignedIdx = 0;

        for (let i = 0; i < itemCount; i++) {
            const displayOrder = i + 1;
            const existing = items.find((it: any) => it.displayorder === displayOrder);
            
            if (existing) {
                result.push(existing);
            } else if (unassignedIdx < unassigned.length) {
                result.push({ ...unassigned[unassignedIdx++], displayorder: displayOrder });
            } else {
                result.push({ isSkeleton: true, displayorder: displayOrder });
            }
        }
        return result;
    }, [items, itemCount]);

    return (
        <BaseEditor
            title="Why Choose Us"
            description="Highlight unique features and benefits of your school."
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                    if (!item || item.isSkeleton) {
                        return (
                            <div
                                key={`empty-${index}`}
                                onClick={() => isEditable ? handleAddNew() : undefined}
                                className={`p-8 border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center gap-4 text-gray-400 min-h-[220px] ${isEditable ? "hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/20 cursor-pointer transition-all group" : "opacity-70 bg-gray-50/30"}`}
                            >
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${isEditable ? "bg-gray-50 group-hover:bg-red-100" : "bg-gray-100/50"}`}>
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <p className="text-[14px] font-black tracking-tight">Slot {index + 1}</p>
                                    <p className="text-[11px] font-medium text-gray-400">{isEditable ? "Add Feature" : "No Content"}</p>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={item.key} className="group relative rounded-[32px] overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 flex flex-col p-8 items-center text-center justify-center min-h-[220px]">
                            {isEditable && (
                                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}
                                        className="p-3 bg-white rounded-2xl text-gray-400 hover:text-[#F54927] shadow-lg border border-gray-100 transition-all active:scale-90"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                            <div 
                                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300"
                                style={{ backgroundColor: `${item.iconcolor || '#F54927'}15` }}
                            >
                                <DynamicIcon 
                                    name={item.icon} 
                                    size={32} 
                                    style={{ color: item.iconcolor || '#F54927' }}
                                    className="transition-all group-hover:scale-110" 
                                />
                            </div>
                            <h4 className="text-[18px] font-black text-gray-900 mb-2" style={{ color: item.iconcolor || '#111827' }}>{item.title}</h4>
                            <p className="text-[13px] font-medium text-gray-500 leading-relaxed max-w-[200px]">{item.description}</p>
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
                                <h3 className="text-[20px] font-black text-gray-900 tracking-tight">{items.some(i => i.key === editingItem.key) ? "Edit Feature" : "New Feature"}</h3>
                                <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mt-1">Configure feature details</p>
                            </div>
                            <button onClick={() => setEditingItem(null)} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-10 space-y-8">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-2">Feature Title</label>
                                <input
                                    type="text"
                                    value={editingItem.title}
                                    onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                                    className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-red-100 transition-all text-[15px] font-bold outline-none shadow-inner"
                                    placeholder="e.g. Holistic Development"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-2">Description</label>
                                <textarea
                                    value={editingItem.description}
                                    onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-red-100 transition-all text-[14px] font-bold outline-none resize-none shadow-inner"
                                    placeholder="Brief explanation of this feature..."
                                />
                            </div>

                            <div className="space-y-2">
                                <IconPicker
                                    value={editingItem.icon || ""}
                                    onChange={iconName => setEditingItem({ ...editingItem, icon: iconName })}
                                    label="Feature Icon"
                                />
                            </div>

                            {(!editingItem.icon || !editingItem.icon.includes(":")) && (
                                <div className="space-y-2">
                                    <ColorPicker
                                        value={editingItem.iconcolor || "#F54927"}
                                        onChange={color => setEditingItem({ ...editingItem, iconcolor: color })}
                                        label="Icon Color"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="p-8 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between">
                            {items.some(i => i.key === editingItem.key) && (
                                <button
                                    onClick={() => { if (confirm("Delete this feature?")) { removeRecord(editingItem.key); setEditingItem(null); } }}
                                    className="px-6 py-3 text-[13px] font-bold text-red-500 hover:text-red-600 transition-all"
                                >
                                    Delete Feature
                                </button>
                            )}
                            <div className="flex gap-4 ml-auto">
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
                                    {isSaving ? "Saving..." : (items.some(i => i.key === editingItem.key) ? "Update Feature" : "Add Feature")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </BaseEditor>
    );
}
