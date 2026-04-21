"use client";

import { useState, useMemo, useEffect } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData, type FilterConfig } from "@/domains/dashboard/hooks/useComponentData";
import { updateComponentConfig, upsertComponentData, deleteComponentData } from "@/domains/dashboard/actions";
import MediaUpload from "@/components/ui/MediaUpload";
import type { TemplateComponent, TemplateScreen, ComponentPlacement } from "@/domains/auth/types";
import { Check, X } from "lucide-react";
import { uploadFile } from "@/lib/supabase/storage";

interface AchievementsEditorProps {
    component: TemplateComponent;
    screen: TemplateScreen;
    schoolKey: string;
}

export default function AchievementsEditor({ component, screen, schoolKey }: AchievementsEditorProps) {
    const isEditable = component.iseditable;
    const config = component.config || {};
    const tableName = (component.componentregistry as any)?.tablename;
    const selectionMethod = config.selectionmethod || "auto"; 
    const itemCount = config.itemcount ? parseInt(String(config.itemcount)) : null;
    const filters = useMemo(() => (config.filters || {}), [config.filters]) as any;

    const effectiveMediaType = useMemo(() => {
        const type = config?.variant || config?.mediatype;
        if (!type) return "image";
        const lowType = String(type).toLowerCase();
        if (lowType === "video" || lowType === "videos") return "video";
        return "image";
    }, [config?.variant, config?.mediatype]);

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
        // Manual mode: Map placements to actual records
        if (itemCount) {
            const result = [];
            for (let i = 0; i < itemCount; i++) {
                // Find placement for this slot (displayorder is 1-indexed)
                const placement = placements.find((p: ComponentPlacement) => p.displayorder === i + 1);
                const record = placement ? allAchievements.find((a: any) => a.key === placement.contentkey) : null;
                result.push(record || { isSlot: true, index: i, displayorder: i + 1 });
            }
            return result;
        }
        
        // Auto mode or Default: Strictly itemCount slots
        const limit = itemCount || allAchievements.length;
        const result = [];
        for (let i = 0; i < limit; i++) {
            result.push(allAchievements.find((a: any) => a.displayorder === i + 1) || { isSlot: true, index: i, displayorder: i + 1 });
        }
        return result;
    }, [isEditable, selectionMethod, itemCount, allAchievements, placements]);

    // 4. Modal state for Full Editor
    const [editingRecord, setEditingRecord] = useState<any>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Staged upload state
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        return () => {
            if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        };
    }, [pendingPreviewUrl]);

    const handleSave = async () => {
        if (!editingRecord.title || (!editingRecord.imageurl && !pendingFile)) return;

        try {
            let finalRecord = { ...editingRecord };

            if (pendingFile) {
                setIsUploading(true);
                try {
                    const uploadedUrl = await uploadFile(pendingFile, schoolKey, "achievements");
                    finalRecord.imageurl = uploadedUrl;
                } catch (err) {
                    console.error("Upload failed:", err);
                    throw err;
                } finally {
                    setIsUploading(false);
                }
            }

            await saveRecord(finalRecord);
            handleCloseModal();
        } catch (err) {
            console.error("Save failed:", err);
        }
    };

    const handleCloseModal = () => {
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        setPendingFile(null);
        setPendingPreviewUrl(null);
        setEditingRecord(null);
        setShowDeleteConfirm(false);
    };

    const handleFileSelect = (file: File) => {
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        const url = URL.createObjectURL(file);
        setPendingFile(file);
        setPendingPreviewUrl(url);
    };

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
                emptySlotsCount={0}
                component={component}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {slots.map((achievement: any, index: number) => {
                        if (achievement.isSlot) {
                            return (
                                <button
                                    key={`slot-${index}`}
                                    onClick={() => {
                                        const initialValues: Record<string, any> = {};
                                        if (filters && typeof filters === 'object' && 'logic' in filters && 'conditions' in filters) {
                                            (filters as FilterConfig).conditions.forEach(c => {
                                                if (c.operator === 'equals') {
                                                    initialValues[c.field] = c.value;
                                                }
                                            });
                                        } else if (filters && !('logic' in filters)) {
                                            Object.assign(initialValues, filters);
                                        }

                                        setEditingRecord({ 
                                            schoolkey: schoolKey, 
                                            ...initialValues, 
                                            title: "", 
                                            year: new Date().getFullYear(),
                                            displayorder: index + 1,
                                            contenttype: config?.mediatype === "video" ? "video" : "image",
                                            isactive: true 
                                        });
                                    }}
                                    className="p-10 border-2 border-dashed border-gray-100 rounded-[28px] flex flex-col items-center justify-center gap-4 text-gray-400 hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/20 transition-all group min-h-[220px]"
                                >
                                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[14px] font-black tracking-tight">Slot {index + 1}</p>
                                        <p className="text-[11px] font-medium text-gray-400">Click to add achievement</p>
                                    </div>
                                </button>
                            );
                        }
                        return (
                            <AchievementCard 
                                key={achievement.key} 
                                achievement={achievement} 
                                onClick={() => setEditingRecord(achievement)}
                            />
                        );
                    })}
                </div>

                {editingRecord && (
                    <AchievementModal 
                        record={editingRecord} 
                        onClose={handleCloseModal} 
                        onSave={handleSave}
                        isSaving={isSaving}
                        isUploading={isUploading}
                        config={config}
                        handleFileSelect={handleFileSelect}
                        pendingFile={pendingFile}
                        pendingPreviewUrl={pendingPreviewUrl}
                        setEditingRecord={setEditingRecord}
                        showDeleteConfirm={showDeleteConfirm}
                        setShowDeleteConfirm={setShowDeleteConfirm}
                        removeRecord={removeRecord}
                        allAchievements={allAchievements}
                        schoolKey={schoolKey}
                    />
                )}
            </BaseEditor>
        );
    }

    // Render Selector (Home Screen)
    return (
        <BaseEditor
            title={(config.filters as any)?.category === 'academics' ? "Academic Achievements" : "Sports Achievements"}
            description={selectionMethod === 'manual' ? "Select achievements to display on the home screen." : "Top achievements from the source list."}
            icon={<AchievementsIcon />}
            isEditable={isEditable}
            parentScreenName={component.parentscreenname}
            selectionMethod={selectionMethod}
            error={error}
            component={component}
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
                            <AchievementCard 
                                achievement={item} 
                                onClick={isEditable ? () => setEditingRecord(item) : undefined} 
                            />
                            {selectionMethod === 'manual' && (
                                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all flex gap-2 z-20">
                                    <button
                                        onClick={() => setPickingForIndex(idx)}
                                        className="p-3 bg-white rounded-2xl text-[#111827] hover:text-[#F54927] hover:bg-red-50 shadow-xl border border-gray-100 transition-all active:scale-90"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button
                                        onClick={() => handleClearSlot(idx)}
                                        className="p-3 bg-white rounded-2xl text-red-500 hover:bg-red-50 shadow-xl border border-gray-100 transition-all active:scale-90"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
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
                            {allAchievements.filter((rec: any) => rec.contenttype === effectiveMediaType).length === 0 ? (
                                <div className="py-20 text-center">
                                    <p className="text-gray-400 font-bold">No {effectiveMediaType} achievements found.</p>
                                    <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest leading-loose">Switch to Source Screen to create<br/>new {effectiveMediaType} content first.</p>
                                </div>
                            ) : (
                                allAchievements
                                    .filter((rec: any) => rec.contenttype === effectiveMediaType)
                                    .map((rec: any) => (
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
            className={`group bg-white border border-gray-100 rounded-[24px] shadow-sm hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-500/10 transition-all cursor-pointer overflow-hidden flex flex-col relative ${!achievement.isactive ? "opacity-60" : ""}`}
        >
            <div className="aspect-[16/10] bg-gray-50 overflow-hidden relative">
                {achievement.imageurl ? (
                    achievement.contenttype === 'video' ? (
                        <div className="relative w-full h-full">
                            <video 
                                src={achievement.imageurl} 
                                className="w-full h-full object-cover" 
                                autoPlay 
                                loop 
                                muted 
                                playsInline 
                            />
                        </div>
                    ) : (
                        <img src={achievement.imageurl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    )
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold uppercase tracking-widest text-[10px]">No Media</div>
                )}
                <div className="absolute top-2.5 left-2.5">
                    <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[9px] font-black uppercase tracking-wider">
                        {achievement.year}
                    </span>
                </div>

                {onClick && (
                    <div className="absolute top-6 right-6 p-3 bg-white rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 text-gray-900 active:scale-90 z-20">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </div>
                )}
            </div>
            <div className="p-4 flex-1">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{achievement.awardlevel || 'Achievement'}</p>
                <h4 className="text-[14px] font-black text-gray-900 group-hover:text-blue-500 transition-colors line-clamp-2 leading-snug">{achievement.title}</h4>
            </div>
        </div>
    );
}

function AchievementModal({ record, onClose, onSave, isSaving, isUploading, config, handleFileSelect, pendingFile, pendingPreviewUrl, setEditingRecord, showDeleteConfirm, setShowDeleteConfirm, removeRecord, allAchievements, schoolKey }: any) {
    const [formData, setFormData] = useState(record);

    if (showDeleteConfirm) {
        return (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
                <div className="bg-white p-8 rounded-[32px] max-w-sm w-full text-center space-y-4">
                    <h3 className="text-lg font-black">Delete Achievement?</h3>
                    <p className="text-sm text-gray-500">This action cannot be undone.</p>
                    <div className="flex gap-3 pt-4">
                        <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all">No, Keep it</button>
                        <button onClick={async () => { await removeRecord(record.key); onClose(); }} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">Yes, Delete</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
            <div className="absolute inset-0" onClick={onClose} />
            <div className="relative bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white/50">
                    <div>
                        <h3 className="text-[20px] font-black text-gray-900 tracking-tight">{record.key ? "Update Achievement" : "New Achievement"}</h3>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage achievement details and photo</p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 no-scrollbar">
                    <MediaUpload
                        value={formData.imageurl || ""}
                        type="image"
                        onChange={(url) => setFormData({ ...formData, imageurl: url })}
                        onFileSelect={handleFileSelect}
                        isStaged={!!pendingFile}
                        stagedPreviewUrl={pendingPreviewUrl}
                        isExternalUploading={isUploading}
                        schoolKey={schoolKey}
                        category="achievements"
                        label="Achievement Banner"
                        description="Upload a high-quality photo of the achievement"
                        allowVideo={config?.mediatype !== "image"}
                        allowImage={config?.mediatype !== "video"}
                        aspectRatio="video"
                    />
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Title</label>
                        <input 
                            type="text" 
                            value={formData.title} 
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-100 transition-all text-[15px] font-bold outline-none shadow-inner"
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
                <div className="p-6 bg-gray-50/50 flex items-center justify-between border-t border-gray-50">
                    {allAchievements.some((a: any) => a.key === record.key) && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-6 py-3.5 text-[13px] font-black text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                        >
                            Delete
                        </button>
                    )}
                    <div className="flex gap-3 ml-auto">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 text-[13px] font-bold text-gray-400 hover:text-gray-900 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={isSaving || isUploading || (!formData.imageurl && !pendingFile)}
                            onClick={() => onSave()}
                            className="px-10 py-3.5 bg-[#111827] text-white text-[14px] font-black rounded-2xl hover:bg-black transition-all shadow-xl disabled:opacity-50 flex items-center gap-3 h-[52px]"
                        >
                            {isSaving || isUploading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {isUploading ? "Uploading..." : "Saving..."}
                                </>
                            ) : (
                                <>
                                    {record.key ? 'Update Achievement' : 'Add to Collection'}
                                    <Check className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
