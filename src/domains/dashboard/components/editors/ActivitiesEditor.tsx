"use client";

import { useState, useMemo, useEffect } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData, type FilterConfig } from "@/domains/dashboard/hooks/useComponentData";
import { upsertComponentData, deleteComponentData } from "@/domains/dashboard/actions";
import MediaUpload from "@/components/ui/MediaUpload";
import type { TemplateComponent, TemplateScreen, ComponentPlacement } from "@/domains/auth/types";
import { Check, X, Activity, PenLine, Trash2, Plus } from "lucide-react";
import { uploadFile } from "@/lib/supabase/storage";

interface ActivitiesEditorProps {
    component: TemplateComponent;
    screen: TemplateScreen;
    schoolKey: string;
}

export default function ActivitiesEditor({ component, screen, schoolKey }: ActivitiesEditorProps) {
    const isEditable = component.iseditable;
    const config = component.config || {};
    const tableName = (component.componentregistry as any)?.tablename || config.datasource || "activities";
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

    // 1. Fetch data from the content table
    const {
        records: allActivities,
        isSaving,
        error,
        saveRecord,
        removeRecord
    } = useComponentData({
        tableName,
        schoolKey,
        filters,
        initialRecords: [],
        orderBy: "displayorder"
    });

    // 2. State for Manual Selection
    const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
    const [pickingForIndex, setPickingForIndex] = useState<number | null>(null);

    const placements = useMemo(() => {
        return (component.contentplacements || [])
            .filter((p: ComponentPlacement) => p.isactive !== false)
            .sort((a: ComponentPlacement, b: ComponentPlacement) => (a.displayorder || 0) - (b.displayorder || 0));
    }, [component.contentplacements]);

    // 3. Map activities to slots
    const slots = useMemo(() => {
        if (isEditable) {
            // Source Screen: Show all activities in the master collection
            const result = [...allActivities];
            // Add empty slots up to itemCount if defined, or at least one if not
            if (itemCount && result.length < itemCount) {
                const start = result.length;
                for (let i = start; i < itemCount; i++) {
                    result.push({ isSlot: true, index: i, displayorder: i + 1 });
                }
            } else if (!itemCount) {
                result.push({ isSlot: true, index: result.length, displayorder: result.length + 1 });
            }
            return result;
        }

        // Selector/Home Screen Mode: Show either placements or auto-filled top items
        if (selectionMethod === "manual" && itemCount) {
            const result = [];
            for (let i = 0; i < itemCount; i++) {
                const placement = placements.find((p: ComponentPlacement) => p.displayorder === i + 1);
                const record = placement ? allActivities.find((a: any) => a.key === placement.contentkey) : null;
                result.push(record || { isSlot: true, index: i, displayorder: i + 1 });
            }
            return result;
        }

        // Auto Mode: Show top N activities based on itemCount
        if (itemCount) {
            const result = allActivities.slice(0, itemCount);
            return result;
        }

        return allActivities;
    }, [isEditable, selectionMethod, itemCount, allActivities, placements]);

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

    const handleSave = async (data: any) => {
        if (!data.title) return;

        try {
            let finalRecord = { ...data };

            if (pendingFile) {
                setIsUploading(true);
                try {
                    const uploadedUrl = await uploadFile(pendingFile, schoolKey, "activities");
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
            const existingPlacement = placements.find((p: ComponentPlacement) => p.displayorder === pickingForIndex + 1);
            
            await upsertComponentData('componentplacement', {
                key: existingPlacement?.key || undefined,
                schoolkey: schoolKey,
                templatecomponentkey: component.key,
                componentcode: component.componentcode || 'activitieslist',
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

    if (isEditable) {
        return (
            <BaseEditor
                title="School Activities"
                description="Manage all activities, sports, and cultural events."
                icon={<Activity className="w-5 h-5" />}
                isEditable={isEditable}
                parentScreenName={component.parentscreenname}
                selectionMethod={selectionMethod}
                error={error}
                component={component}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {slots.map((activity: any, index: number) => {
                        if (activity.isSlot) {
                            return (
                                <button
                                    key={`slot-${index}`}
                                    onClick={() => {
                                        setEditingRecord({ 
                                            schoolkey: schoolKey, 
                                            title: "", 
                                            tag: "General",
                                            description: "",
                                            displayorder: index + 1,
                                            contenttype: config?.mediatype === "video" ? "video" : "image",
                                            isactive: true 
                                        });
                                    }}
                                    className="p-10 border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center gap-4 text-gray-400 hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/20 transition-all group min-h-[260px]"
                                >
                                    <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                                        <Plus className="w-6 h-6" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[14px] font-black tracking-tight">Add Activity</p>
                                        <p className="text-[11px] font-medium text-gray-400">Slot {index + 1}</p>
                                    </div>
                                </button>
                            );
                        }
                        return (
                            <ActivityCard 
                                key={activity.key} 
                                activity={activity} 
                                onClick={() => setEditingRecord(activity)}
                            />
                        );
                    })}
                </div>

                {editingRecord && (
                    <ActivityModal 
                        record={editingRecord} 
                        onClose={handleCloseModal} 
                        onSave={handleSave}
                        isSaving={isSaving}
                        isUploading={isUploading}
                        config={config}
                        handleFileSelect={handleFileSelect}
                        pendingFile={pendingFile}
                        pendingPreviewUrl={pendingPreviewUrl}
                        showDeleteConfirm={showDeleteConfirm}
                        setShowDeleteConfirm={setShowDeleteConfirm}
                        removeRecord={removeRecord}
                        allActivities={allActivities}
                        schoolKey={schoolKey}
                    />
                )}
            </BaseEditor>
        );
    }

    return (
        <BaseEditor
            title="School Activities"
            description={selectionMethod === 'manual' ? "Select activities to showcase on this screen." : "Top activities displayed automatically."}
            icon={<Activity className="w-5 h-5" />}
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
                                className="p-6 border-2 border-dashed border-gray-100 rounded-[28px] flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-blue-200 hover:text-blue-500 hover:bg-blue-50/20 transition-all group h-[200px]"
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-50 group-hover:bg-blue-100 flex items-center justify-center">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <div className="text-center">
                                    <p className="text-[12px] font-black uppercase tracking-tight">Slot {idx + 1}</p>
                                    <p className="text-[10px] font-medium text-gray-400">Select Activity</p>
                                </div>
                            </button>
                        );
                    }

                    return (
                        <div key={`${item.key}-${idx}`} className="group relative">
                            <ActivityCard activity={item} />
                            {selectionMethod === 'manual' && (
                                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all flex gap-2 z-20">
                                    <button
                                        onClick={() => setPickingForIndex(idx)}
                                        className="p-3 bg-white rounded-2xl text-[#111827] hover:text-[#F54927] hover:bg-red-50 shadow-xl border border-gray-100 transition-all active:scale-90"
                                    >
                                        <PenLine className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleClearSlot(idx)}
                                        className="p-3 bg-white rounded-2xl text-red-500 hover:bg-red-50 shadow-xl border border-gray-100 transition-all active:scale-90"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {pickingForIndex !== null && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#111827]/40 backdrop-blur-sm" onClick={() => setPickingForIndex(null)} />
                    <div className="relative bg-white w-full max-w-2xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-[20px] font-black text-gray-900 tracking-tight">Select Activity</h3>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Assign an activity to Slot {pickingForIndex + 1}</p>
                            </div>
                            <button onClick={() => setPickingForIndex(null)} className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                            {allActivities.length === 0 ? (
                                <div className="py-20 text-center">
                                    <p className="text-gray-400 font-bold">No activities found.</p>
                                    <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest leading-loose">Go to the Source Screen to create<br/>new activity content first.</p>
                                </div>
                            ) : (
                                allActivities.map((rec: any) => (
                                    <button
                                        key={rec.key}
                                        onClick={() => handleSelectRecord(rec.key)}
                                        className={`w-full p-5 rounded-[24px] border-2 text-left transition-all flex items-center gap-5 ${placements.some((p: ComponentPlacement) => p.contentkey === rec.key) ? "border-[#F54927] bg-red-50/30" : "border-gray-50 hover:border-gray-100 bg-white"}`}
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden flex-shrink-0">
                                            {rec.imageurl && <img src={rec.imageurl} alt="" className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[15px] font-black text-gray-900 line-clamp-1">{rec.title}</p>
                                            <p className="text-[11px] text-[#F54927] font-black uppercase tracking-wider">{rec.tag || 'General'}</p>
                                        </div>
                                        {placements.some((p: ComponentPlacement) => p.contentkey === rec.key) && (
                                            <div className="w-8 h-8 bg-[#F54927] text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                                                <Check className="w-5 h-5" strokeWidth={3} />
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

function ActivityCard({ activity, onClick }: { activity: any; onClick?: () => void }) {
    return (
        <div 
            onClick={onClick}
            className={`bg-white border-2 border-gray-50 rounded-[32px] shadow-sm hover:border-red-100 hover:shadow-2xl hover:shadow-red-500/5 transition-all cursor-pointer overflow-hidden flex flex-col group ${!activity.isactive ? "opacity-60" : ""}`}
        >
            <div className="aspect-[4/3] bg-gray-50 overflow-hidden relative">
                {activity.imageurl ? (
                    activity.contenttype === 'video' ? (
                        <video src={activity.imageurl} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                    ) : (
                        <img src={activity.imageurl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    )
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Activity className="w-12 h-12 opacity-20" />
                    </div>
                )}
                <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[#F54927] text-[10px] font-black uppercase tracking-wider shadow-sm">
                        {activity.tag || 'General'}
                    </span>
                </div>
                {onClick && (
                    <div className="absolute top-6 right-6 p-3 bg-white rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 text-gray-900 active:scale-90 z-20">
                        <PenLine className="w-5 h-5" />
                    </div>
                )}
            </div>
            <div className="p-6 flex-1">
                <h4 className="text-[16px] font-black text-gray-900 line-clamp-2 leading-tight tracking-tight">{activity.title}</h4>
                <p className="text-[12px] text-gray-500 font-medium mt-2 line-clamp-2 leading-relaxed">{activity.description}</p>
            </div>
        </div>
    );
}

function ActivityModal({ record, onClose, onSave, isSaving, isUploading, config, handleFileSelect, pendingFile, pendingPreviewUrl, showDeleteConfirm, setShowDeleteConfirm, removeRecord, allActivities, schoolKey }: any) {
    const [formData, setFormData] = useState(record);

    if (showDeleteConfirm) {
        return (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
                <div className="bg-white p-10 rounded-[40px] max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-200">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                        <Trash2 className="w-10 h-10" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900">Delete Activity?</h3>
                        <p className="text-[14px] text-gray-500 mt-2">This will permanently remove this activity. This action cannot be undone.</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <button onClick={async () => { await removeRecord(record.key); onClose(); }} className="w-full py-4 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-[0.98]">Yes, Delete Activity</button>
                        <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.98]">No, Keep it</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-10 bg-gray-900/60 backdrop-blur-md">
            <div className="absolute inset-0" onClick={onClose} />
            <div className="relative bg-white w-full max-w-[1000px] rounded-[48px] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-300">
                {/* Left Panel: Preview */}
                <div className="w-full md:w-[420px] bg-gray-50/50 border-r border-gray-100 flex flex-col p-8 lg:p-12 overflow-y-auto no-scrollbar">
                    <div className="mb-8">
                        <span className="text-[11px] font-black text-[#F54927] uppercase tracking-[0.2em]">Preview</span>
                        <h3 className="text-[24px] font-black text-gray-900 tracking-tight mt-1">Live Representation</h3>
                    </div>
                    
                    <div className="sticky top-0">
                        <ActivityCard activity={{ ...formData, imageurl: pendingPreviewUrl || formData.imageurl }} />
                    </div>
                </div>

                {/* Right Panel: Content */}
                <div className="flex-1 flex flex-col min-w-0 bg-white">
                    <div className="p-8 lg:p-12 border-b border-gray-50 flex items-center justify-between">
                        <div>
                            <h2 className="text-[20px] font-black text-gray-900 tracking-tight">{record.key ? "Update Activity" : "New Activity Entry"}</h2>
                            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mt-1">Refine activity details and media</p>
                        </div>
                        <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all active:scale-90">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-10 no-scrollbar">
                        <section className="space-y-6">
                            <MediaUpload
                                value={formData.imageurl || ""}
                                type={formData.contenttype || "image"}
                                onChange={(url) => setFormData({ ...formData, imageurl: url })}
                                onFileSelect={handleFileSelect}
                                isStaged={!!pendingFile}
                                stagedPreviewUrl={pendingPreviewUrl}
                                isExternalUploading={isUploading}
                                schoolKey={schoolKey}
                                category="activities"
                                label="Activity Media"
                                description="High-resolution photography or action video"
                                allowVideo={true}
                                allowImage={true}
                                aspectRatio="16:10"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Activity Title</label>
                                    <input 
                                        type="text" 
                                        value={formData.title} 
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. Annual Sports Day"
                                        className="w-full px-6 py-4 bg-neutral-50/80 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-[#F54927] transition-all text-[15px] font-bold outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Category / Tag</label>
                                    <input 
                                        type="text" 
                                        value={formData.tag} 
                                        onChange={e => setFormData({ ...formData, tag: e.target.value })}
                                        placeholder="e.g. Sports, Cultural"
                                        className="w-full px-6 py-4 bg-neutral-50/80 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-[#F54927] transition-all text-[15px] font-bold outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Short Description</label>
                                <textarea 
                                    value={formData.description || ""} 
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Write a brief overview of the activity..."
                                    className="w-full px-6 py-4 bg-neutral-50/80 border-2 border-transparent rounded-[32px] focus:bg-white focus:border-[#F54927] transition-all text-[14px] font-medium min-h-[140px] outline-none resize-none no-scrollbar"
                                />
                            </div>
                        </section>
                    </div>

                    <div className="p-8 lg:p-12 bg-gray-50/50 flex items-center justify-between border-t border-gray-100">
                        {allActivities.some((a: any) => a.key === record.key) ? (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-2 px-6 py-4 text-[13px] font-black text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Entry
                            </button>
                        ) : <div />}

                        <div className="flex gap-4 ml-auto">
                            <button
                                onClick={onClose}
                                className="px-8 py-4 text-[13px] font-black text-gray-400 hover:text-gray-900 transition-all"
                            >
                                Discard
                            </button>
                            <button
                                disabled={isSaving || isUploading || (!formData.imageurl && !pendingFile) || !formData.title}
                                onClick={() => onSave(formData)}
                                className="px-10 py-4 bg-[#111827] text-white text-[14px] font-black rounded-[20px] hover:bg-black transition-all shadow-xl disabled:opacity-30 disabled:grayscale flex items-center gap-3 h-[60px]"
                            >
                                {isSaving || isUploading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        {isUploading ? "Uploading..." : "Processing..."}
                                    </>
                                ) : (
                                    <>
                                        {record.key ? 'Update Activity' : 'Publish Activity'}
                                        <Check className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
