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
import { Check, X, Plus, Trash2, LayoutGrid, Star, Pen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ColorPicker from "@/components/ui/ColorPicker";
import { Layout } from "lucide-react";

interface HighlightedInfrastructureEditorProps {
    component: TemplateComponent;
    schoolKey: string;
}

export default function HighlightedInfrastructureEditor({ component, schoolKey }: HighlightedInfrastructureEditorProps) {
    const config = component.config as any;
    const isEditable = component.iseditable;
    const tableName = (component.componentregistry as any)?.tablename || 'infrastructure';
    const itemCount = config?.itemcount ? parseInt(config.itemcount) : 3;
    const router = useRouter();

    const filters = useMemo(() => ({
        ...(config?.filters || {})
    }), [config?.filters]);

    const {
        records: infrastructure,
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
    const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);

    const [placements, setPlacements] = useState<ComponentPlacement[]>(() => {
        return (component.contentplacements || [])
            .filter((p: ComponentPlacement) => p.isactive !== false)
            .sort((a: ComponentPlacement, b: ComponentPlacement) => (a.displayorder || 0) - (b.displayorder || 0));
    });

    useEffect(() => {
        const fetchPlacements = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('componentplacement')
                .select('*')
                .eq('templatecomponentkey', component.key)
                .is('isactive', true)
                .order('displayorder', { ascending: true });
            
            if (data) {
                setPlacements(data as ComponentPlacement[]);
            }
        };
        fetchPlacements();
    }, [component.key]);

    useEffect(() => {
        setPlacements((component.contentplacements || [])
            .filter((p: ComponentPlacement) => p.isactive !== false)
            .sort((a: ComponentPlacement, b: ComponentPlacement) => (a.displayorder || 0) - (b.displayorder || 0)));
    }, [component.contentplacements]);

    const handleCloseModal = () => {
        setEditingItem(null);
        setTargetSlotIndex(null);
    };

    const handleAddFromPool = async (item: any, slotIndex: number) => {
        try {
            setIsUpdating(true);
            const existingPlacement = placements.find(p => p.displayorder === slotIndex);
            
            await upsertComponentData('componentplacement', {
                key: existingPlacement?.key,
                schoolkey: schoolKey,
                templatecomponentkey: component.key,
                componentcode: component.componentcode || 'highlightedinfrastructure',
                contenttable: tableName,
                contentkey: item.key,
                displayorder: slotIndex,
                isactive: true
            }, schoolKey);
            
            setPickingForIndex(null);
            router.refresh();
        } catch (err) {
            console.error("Failed to pin item:", err);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRemovePlacement = async (placementKey: string) => {
        try {
            setIsUpdating(true);
            await deleteComponentData('componentplacement', placementKey, schoolKey);
            router.refresh();
        } catch (err) {
            console.error("Failed to remove placement:", err);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAddNew = (slotIndex: number) => {
        const initialValues = getInitialValuesFromFilters(filters);
        setEditingItem({
            key: generateId(),
            title: "",
            description: "",
            icon: "BookOpen",
            tag: "#F54927",
            contenttype: filters.contenttype || 'textwithicon',
            isactive: true,
            displayorder: infrastructure.length + 1,
            ...initialValues
        });
        setTargetSlotIndex(slotIndex);
    };

    const handleEditItem = (item: any) => {
        setEditingItem({ ...item });
    };

    const handleSaveItem = async () => {
        if (!editingItem.title?.trim()) {
            alert("Please enter a title.");
            return;
        }
        if (!editingItem.description?.trim()) {
            alert("Please provide a description.");
            return;
        }

        try {
            setIsSaving(true);
            
            const savedRecord = await saveRecord(editingItem);
            
            if (targetSlotIndex !== null && (savedRecord as any).data) {
                const existingPlacement = placements.find(p => p.displayorder === targetSlotIndex);
                
                await upsertComponentData('componentplacement', {
                    key: existingPlacement?.key,
                    schoolkey: schoolKey,
                    templatecomponentkey: component.key,
                    componentcode: component.componentcode || 'highlightedinfrastructure',
                    contenttable: tableName,
                    contentkey: (savedRecord as any).data.key,
                    displayorder: targetSlotIndex,
                    isactive: true
                }, schoolKey);
            }

            setEditingItem(null);
            setTargetSlotIndex(null);
            router.refresh();
        } catch (err) {
            console.error("Failed to save item:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const slots = useMemo(() => {
        const result = [];
        for (let i = 0; i < itemCount; i++) {
            const displayOrder = i + 1;
            const placement = placements.find(p => p.displayorder === displayOrder);
            const item = placement ? infrastructure.find(inf => inf.key === placement.contentkey) : null;
            
            // If auto selection and no placement, try to find by index in the main list
            if (!item && config?.selectionmethod === 'auto') {
                const autoItem = infrastructure[i];
                if (autoItem) {
                    result.push({ ...autoItem, isFromAutoSelection: true });
                    continue;
                }
            }

            result.push(item ? { ...item, placementKey: placement?.key } : { isSkeleton: true, displayorder: displayOrder });
        }
        return result;
    }, [infrastructure, placements, itemCount, config?.selectionmethod]);

    return (
        <BaseEditor
            title={component.editorsname || "Highlighted Infrastructure"}
            description="Feature your most important facilities prominently on the page."
            icon={<Star className="w-5 h-5 text-amber-500" />}
            error={error}
            isEditable={isEditable}
            parentScreenName={component.parentscreenname}
            selectionMethod={config?.selectionmethod}
            emptySlotsCount={slots.filter((s:any) => s.isSkeleton).length}
            component={component}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {slots.map((item: any, index: number) => {
                    const displayOrder = index + 1;
                    
                    if (item.isSkeleton) {
                        return (
                            <div
                                key={`empty-${index}`}
                                onClick={() => isEditable ? handleAddNew(displayOrder) : setPickingForIndex(displayOrder)}
                                className="p-8 border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center gap-4 text-center hover:border-red-200 hover:bg-red-50/30 transition-all cursor-pointer group min-h-[280px]"
                            >
                                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                                    <Plus className="w-8 h-8 text-gray-400 group-hover:text-[#F54927]" />
                                </div>
                                <div>
                                    <p className="text-[14px] font-black text-gray-900 tracking-tight">Slot {displayOrder}</p>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Click to assign</p>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={item.key} className="group relative bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-500 flex flex-col items-center text-center justify-center h-full min-h-[320px]">
                            {/* Actions Overlay */}
                            <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <button
                                    onClick={() => handleEditItem(item)}
                                    className="p-3 bg-white border border-gray-100 text-gray-500 hover:text-[#F54927] rounded-2xl shadow-2xl transition-all active:scale-90"
                                    title="Edit Content"
                                >
                                    <Pen className="w-5 h-5" strokeWidth={2.5} />
                                </button>
                                {item.placementKey && (
                                    <button
                                        onClick={() => handleRemovePlacement(item.placementKey)}
                                        className="p-3 bg-white border border-gray-100 text-gray-500 hover:text-red-600 rounded-2xl shadow-lg transition-all active:scale-90"
                                        title="Unpin Item"
                                    >
                                        <X className="w-5 h-5" strokeWidth={2.5} />
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-col items-center gap-6">
                                <div 
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 bg-gray-50/50"
                                    style={{ backgroundColor: `${item.tag || '#F54927'}15` }}
                                >
                                    <DynamicIcon 
                                        name={item.icon} 
                                        size={32} 
                                        style={{ color: item.tag || '#F54927' }}
                                        className="transition-all duration-500 group-hover:scale-110" 
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <h4 className="text-[18px] font-black text-gray-900 tracking-tight leading-tight group-hover:text-[#F54927] transition-colors">{item.title}</h4>
                                        {item.isFromAutoSelection && (
                                            <span className="text-[9px] bg-red-50 text-[#F54927] px-3 py-1 rounded-full font-black uppercase tracking-widest">Auto Recommended</span>
                                        )}
                                    </div>
                                    <p className="text-[13px] text-gray-500 font-medium leading-relaxed line-clamp-3">
                                        {item.description}
                                    </p>
                                </div>

                                </div>
                            </div>
                    );
                })}
            </div>

            {/* Selection Pool Modal */}
            {pickingForIndex !== null && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
                    <div className="absolute inset-0" onClick={() => setPickingForIndex(null)} />
                    <div className="relative bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-[24px] font-black text-gray-900 tracking-tight">Choose Content</h3>
                                <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mt-1">Select from {tableName}</p>
                            </div>
                            <button onClick={() => setPickingForIndex(null)} className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-full hover:bg-gray-100 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {infrastructure
                                    .filter(item => !placements.some(p => p.contentkey === item.key))
                                    .map(item => (
                                        <div 
                                            key={item.key}
                                            onClick={() => handleAddFromPool(item, pickingForIndex)}
                                            className="p-6 border border-gray-100 rounded-3xl hover:border-red-200 hover:bg-red-50/30 transition-all cursor-pointer flex items-center gap-5 group"
                                        >
                                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: item.tag || '#F54927' }}>
                                                <DynamicIcon name={item.icon} size={24} className="text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-[15px] font-black text-gray-900 truncate">{item.title}</h4>
                                                <p className="text-[12px] text-gray-400 font-bold truncate mt-0.5">{item.description}</p>
                                            </div>
                                            <Plus className="w-5 h-5 text-gray-300 group-hover:text-[#F54927] transition-all" />
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit / Build Modal */}
            {editingItem && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-md">
                    <div className="absolute inset-0" onClick={handleCloseModal} />
                    <div className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col scale-in-center animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white px-10">
                            <div>
                                <h3 className="text-[20px] font-black text-gray-900 tracking-tight">
                                    {infrastructure.some(i => i.key === editingItem.key) ? "Edit Feature" : "New Feature"}
                                </h3>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Configure facility details</p>
                            </div>
                            <button onClick={handleCloseModal} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-2">Feature Title</label>
                                <input
                                    type="text"
                                    value={editingItem.title}
                                    onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                                    className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-red-100 transition-all text-[15px] font-bold outline-none shadow-inner"
                                    placeholder="e.g. Innovation Hub"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-2">Description</label>
                                <textarea
                                    value={editingItem.description}
                                    onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-red-100 transition-all text-[14px] font-bold outline-none resize-none shadow-inner"
                                    placeholder="Describe this facility..."
                                />
                            </div>

                            <div className="space-y-2">
                                <IconPicker
                                    value={editingItem.icon || ""}
                                    onChange={iconName => setEditingItem({ ...editingItem, icon: iconName })}
                                    label="Feature Icon"
                                />
                            </div>

                            <div className="space-y-2">
                                <ColorPicker
                                    value={editingItem.tag || "#F54927"}
                                    onChange={color => setEditingItem({ ...editingItem, tag: color })}
                                    label="Theme Color (Hex)"
                                />
                            </div>
                        </div>

                        <div className="p-8 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between px-10">
                            {infrastructure.some(i => i.key === editingItem.key) && (
                                <button
                                    onClick={() => { if (confirm("Delete this facility?")) { removeRecord(editingItem.key); handleCloseModal(); } }}
                                    className="px-6 py-3 text-[13px] font-bold text-red-500 hover:text-red-600 transition-all"
                                >
                                    Delete Feature
                                </button>
                            )}
                            <div className="flex gap-4 ml-auto">
                                <button onClick={handleCloseModal} className="px-8 py-3 text-[13px] font-bold text-gray-400 hover:text-gray-900 transition-all">Cancel</button>
                                <button
                                    disabled={isSaving}
                                    onClick={handleSaveItem}
                                    className="px-10 py-3.5 bg-[#111827] text-white text-[14px] font-black rounded-2xl hover:bg-black transition-all shadow-xl disabled:opacity-50"
                                >
                                    {isSaving ? "Saving..." : (infrastructure.some(i => i.key === editingItem.key) ? "Update Feature" : "Add Feature")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </BaseEditor>
    );
}
