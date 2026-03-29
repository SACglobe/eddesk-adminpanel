"use client";

import { useState, useMemo, useEffect } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData } from "@/domains/dashboard/hooks/useComponentData";
import { updateComponentConfig, upsertComponentData, deleteComponentData } from "@/domains/dashboard/actions";
import type { TemplateComponent, TemplateScreen, ComponentPlacement } from "@/domains/auth/types";

interface AchievementsEditorProps {
    component: TemplateComponent;
    screen: TemplateScreen;
    schoolKey: string;
}

export default function AchievementsEditor({ component, screen, schoolKey }: AchievementsEditorProps) {
    const isEditable = component.iseditable;
    const config = component.config || {};
    const tableName = config.datasource || "schoolachievements";
    const selectionMethod = config.selectionmethod || "auto"; 
    const itemCount = config.itemcount ? parseInt(config.itemcount) : null;
    const filters = config.filters || {};

    // Debug Log on mount
    useEffect(() => {
        console.log(`[AchievementsEditor] Opened.`, {
            componentKey: component.key,
            tableName,
            schoolKey,
            filters,
            itemCount,
            selectionMethod,
            isEditable,
            parentScreen: component.parentscreenname
        });
    }, []);

    // 1. Fetch data from the content table (schoolachievements)
    const {
        records: allAchievements,
        isSaving,
        error,
        saveRecord,
        removeRecord
    } = useComponentData({
        tableName,
        schoolKey,
        filters, // This will be {category: 'academics'} or {category: 'sports'}
        initialRecords: [],
        orderBy: "displayorder"
    });

    // 2. State for Manual Selection (Selector Mode)
    // We use component.contentplacements for manual mode
    const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
    const [pickingForIndex, setPickingForIndex] = useState<number | null>(null);

    const placements = useMemo(() => {
        return (component.contentplacements || [])
            .filter((p: ComponentPlacement) => p.isactive !== false)
            .sort((a: ComponentPlacement, b: ComponentPlacement) => (a.displayorder || 0) - (b.displayorder || 0));
    }, [component.contentplacements]);

    // 3. Map achievements to slots for Selector/Auto mode
    const slots = useMemo(() => {
        if (isEditable) return allAchievements; // Full Editor mode shows all

        if (selectionMethod === "auto") {
            // Auto mode: just show top items based on itemCount
            return itemCount ? allAchievements.slice(0, itemCount) : allAchievements;
        }

        // Manual mode: Map placements to actual records
        if (itemCount) {
            const result = [];
            for (let i = 0; i < itemCount; i++) {
                // Find placement for this slot (displayorder is 1-indexed)
                const placement = placements.find((p: ComponentPlacement) => p.displayorder === i + 1);
                const record = placement ? allAchievements.find((a: any) => a.key === placement.contentkey) : null;
                result.push(record || { isSlot: true, index: i });
            }
            return result;
        }
        return allAchievements;
    }, [isEditable, selectionMethod, itemCount, allAchievements, placements]);

    // 4. Modal state for Full Editor
    const [editingRecord, setEditingRecord] = useState<any>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleSelectRecord = async (recordKey: string) => {
        if (pickingForIndex === null) return;
        setIsUpdatingConfig(true);
        try {
            // Find existing placement for this slot to update it, or create new
            const existingPlacement = placements.find((p: ComponentPlacement) => p.displayorder === pickingForIndex + 1);
            
            await upsertComponentData('componentplacement', {
                key: existingPlacement?.key || undefined,
                schoolkey: schoolKey,
                templatecomponentkey: component.key,
                componentcode: component.componentcode || 'schoolachievements',
                contenttable: tableName,
                contentkey: recordKey,
                displayorder: pickingForIndex + 1,
                isactive: true
            }, schoolKey);
            
            setPickingForIndex(null);
        } catch (err) {
            console.error("Failed to update placement:", err);
        } finally {
            setIsUpdatingConfig(false);
        }
    };

    const handleClearSlot = async (index: number) => {
        const placement = placements.find((p: ComponentPlacement) => p.displayorder === index + 1);
        if (!placement) return;

        setIsUpdatingConfig(true);
        try {
            await deleteComponentData('componentplacement', placement.key, schoolKey);
        } catch (err) {
            console.error("Failed to delete placement:", err);
        } finally {
            setIsUpdatingConfig(false);
        }
    };

    // Render Full Editor (Source Screen)
    if (isEditable) {
        return (
            <BaseEditor
                title={`${allAchievements[0]?.category || 'School'} Achievements`}
                description="Manage academic or sports achievements for the source list."
                icon={<AchievementsIcon />}
                isEditable={isEditable}
                parentScreenName={component.parentscreenname}
                selectionMethod={selectionMethod}
                error={error}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allAchievements.map((achievement: any) => (
                        <AchievementCard 
                            key={achievement.key} 
                            achievement={achievement} 
                            onClick={() => setEditingRecord(achievement)}
                        />
                    ))}
                    <button
                        onClick={() => setEditingRecord({ schoolkey: schoolKey, ...filters, title: "", year: new Date().getFullYear(), isactive: true })}
                        className="p-10 border-2 border-dashed border-gray-100 rounded-[28px] flex flex-col items-center justify-center gap-4 text-gray-400 hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/20 transition-all group min-h-[220px]"
                    >
                        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        </div>
                        <span className="text-[14px] font-black tracking-tight">Add New Achievement</span>
                    </button>
                </div>

                {/* CRUD Modal would go here (omitted for brevity, similar to Broadcast) */}
                {editingRecord && (
                    <AchievementModal 
                        record={editingRecord} 
                        onClose={() => setEditingRecord(null)} 
                        onSave={(data) => { saveRecord(data); setEditingRecord(null); }}
                        isSaving={isSaving}
                    />
                )}
            </BaseEditor>
        );
    }

    // Render Selector (Home Screen)
    return (
        <BaseEditor
            title={config.filters?.category === 'academics' ? "Academic Achievements" : "Sports Achievements"}
            description={selectionMethod === 'manual' ? "Select achievements to display on the home screen." : "Top achievements from the source list."}
            icon={<AchievementsIcon />}
            isEditable={isEditable}
            parentScreenName={component.parentscreenname}
            selectionMethod={selectionMethod}
            error={error}
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {slots.map((item: any, idx: number) => {
                    if (item.isSlot) {
                        return (
                            <button
                                key={`slot-${idx}`}
                                onClick={() => setPickingForIndex(idx)}
                                className="p-6 border-2 border-dashed border-gray-100 rounded-[24px] flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-blue-200 hover:text-blue-500 hover:bg-blue-50/20 transition-all group h-[180px]"
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-50 group-hover:bg-blue-100 flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                </div>
                                <div className="text-center">
                                    <p className="text-[12px] font-black uppercase tracking-tight">Slot {idx + 1}</p>
                                    <p className="text-[10px] font-medium text-gray-400">Click to select achievement</p>
                                </div>
                            </button>
                        );
                    }

                    return (
                        <div key={`${item.key}-${idx}`} className="group relative">
                            <AchievementCard achievement={item} />
                            {selectionMethod === 'manual' && (
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                                    <button
                                        onClick={() => setPickingForIndex(idx)}
                                        className="p-2 bg-white rounded-xl text-blue-500 hover:bg-blue-50 shadow-lg border border-gray-100 transition-all"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button
                                        onClick={() => handleClearSlot(idx)}
                                        className="p-2 bg-white rounded-xl text-red-500 hover:bg-red-50 shadow-lg border border-gray-100 transition-all"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Selection Dialog */}
            {pickingForIndex !== null && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#111827]/40 backdrop-blur-sm" onClick={() => setPickingForIndex(null)} />
                    <div className="relative bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-[18px] font-black text-gray-900 tracking-tight">Select Achievement for Slot {pickingForIndex + 1}</h3>
                            <button onClick={() => setPickingForIndex(null)} className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                            {allAchievements.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">No achievements found in the source list.</div>
                            ) : (
                                allAchievements.map((rec: any) => (
                                    <button
                                        key={rec.key}
                                        onClick={() => handleSelectRecord(rec.key)}
                                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${placements.some((p: ComponentPlacement) => p.contentkey === rec.key) ? "border-blue-500 bg-blue-50/50" : "border-gray-50 hover:border-gray-100 bg-white"}`}
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                                            {rec.imageurl && <img src={rec.imageurl} alt="" className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[14px] font-black text-gray-900 line-clamp-1">{rec.title}</p>
                                            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{rec.year} • {rec.awardlevel || 'No Category'}</p>
                                        </div>
                                        {placements.some((p: ComponentPlacement) => p.contentkey === rec.key) && (
                                            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </BaseEditor>
    );
}

// ── Sub-components ───────────────────────────────────────────

function AchievementsIcon() {
    return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
        </svg>
    );
}

function AchievementCard({ achievement, onClick }: { achievement: any; onClick?: () => void }) {
    return (
        <div 
            onClick={onClick}
            className={`bg-white border border-gray-100 rounded-[24px] hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-500/10 transition-all cursor-pointer overflow-hidden flex flex-col ${!achievement.isactive ? "opacity-60" : ""}`}
        >
            <div className="aspect-[16/10] bg-gray-50 overflow-hidden relative">
                {achievement.imageurl ? (
                    <img src={achievement.imageurl} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">No Image</div>
                )}
                <div className="absolute top-2.5 left-2.5">
                    <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[9px] font-black uppercase tracking-wider">
                        {achievement.year}
                    </span>
                </div>
            </div>
            <div className="p-4 flex-1">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{achievement.awardlevel || 'Achievement'}</p>
                <h4 className="text-[14px] font-black text-gray-900 line-clamp-2 leading-snug">{achievement.title}</h4>
            </div>
        </div>
    );
}

function AchievementModal({ record, onClose, onSave, isSaving }: { record: any; onClose: () => void; onSave: (data: any) => void; isSaving: boolean }) {
    const [formData, setFormData] = useState(record);

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#111827]/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col">
                <div className="p-6 md:p-8 border-b border-gray-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-[18px] font-black text-gray-900 tracking-tight">{record.key ? "Edit Achievement" : "New Achievement"}</h3>
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">Configure source data</p>
                    </div>
                </div>
                <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[70vh] no-scrollbar">
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Title</label>
                        <input 
                            type="text" 
                            value={formData.title} 
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-100 transition-all text-[15px] font-bold outline-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Year</label>
                            <input 
                                type="number" 
                                value={formData.year} 
                                onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-100 transition-all text-[15px] font-bold outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Award Level</label>
                            <input 
                                type="text" 
                                value={formData.awardlevel || ""} 
                                onChange={e => setFormData({ ...formData, awardlevel: e.target.value })}
                                placeholder="e.g. State Level, Gold Medal"
                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-100 transition-all text-[15px] font-bold outline-none"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                        <textarea 
                            value={formData.description || ""} 
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-100 transition-all text-[14px] font-medium min-h-[100px] outline-none resize-none"
                        />
                    </div>
                </div>
                <div className="p-6 md:p-8 border-t border-gray-50 bg-gray-50/30 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 text-[13px] font-bold text-gray-400 hover:text-gray-900 rounded-xl transition-all">Cancel</button>
                    <button 
                        onClick={() => onSave(formData)} 
                        disabled={isSaving || !formData.title}
                        className="px-8 py-3 bg-[#111827] text-white text-[13px] font-black rounded-xl hover:bg-black transition-all shadow-xl disabled:opacity-50"
                    >
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
