"use client";
import { generateId } from '@/lib/generateId';

import { useState, useMemo, useEffect } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData, getInitialValuesFromFilters } from "@/domains/dashboard/hooks/useComponentData";
import { upsertComponentData, deleteComponentData } from "@/domains/dashboard/actions";
import type { TemplateComponent, TemplateScreen, ComponentPlacement } from "@/domains/auth/types";

interface AcademicResultsEditorProps {
    component: TemplateComponent;
    screen: TemplateScreen;
    schoolKey: string;
}

export default function AcademicResultsEditor({ component, screen, schoolKey }: AcademicResultsEditorProps) {
    const isEditable = component.iseditable;
    const tableName = (component.componentregistry as any)?.tablename;
    const initialItems = (component as any).content || [];

    const config = component.config as any;
    const itemCount = config?.itemcount ? parseInt(config.itemcount) : null;
    const isFixedMode = itemCount !== null;

    const filters = useMemo(() => ({
        ...(config?.filters || {})
    }), [config?.filters]);

    // Debug Log on mount
    useEffect(() => {
        console.log(`[AcademicResultsEditor] Opened.`, {
            componentKey: component.key,
            tableName,
            schoolKey,
            filters,
            itemCount,
            selectionMethod: config?.selectionmethod || 'auto',
            isEditable,
            parentScreen: component.parentscreenname
        });
    }, []);

    const {
        records: results,
        isSaving,
        error,
        saveRecord,
        removeRecord,
        reorderRecords
    } = useComponentData({
        tableName,
        schoolKey,
        filters,
        initialRecords: initialItems,
        orderBy: "" // override default displayorder to disable ordering
    });

    // 2. State for Manual Selection
    const [isUpdating, setIsUpdating] = useState(false);
    const [pickingForIndex, setPickingForIndex] = useState<number | null>(null);

    const placements = useMemo(() => {
        return (component.contentplacements || [])
            .filter((p: ComponentPlacement) => p.isactive !== false)
            .sort((a: ComponentPlacement, b: ComponentPlacement) => (a.displayorder || 0) - (b.displayorder || 0));
    }, [component.contentplacements]);

    // 3. Fixed slots logic
    const slots = useMemo(() => {
        const result = [];
        const count = itemCount || 1; // Default to 1 slot if not specified

        if (config?.selectionmethod === 'manual') {
            for (let i = 0; i < count; i++) {
                const placement = placements.find((p: ComponentPlacement) => p.displayorder === i + 1);
                const record = placement ? results.find((r: any) => r.key === placement.contentkey) : null;
                result.push(record || null);
            }
        } else {
            // Auto mode: just fill slots with results based on displayorder
            for (let i = 0; i < count; i++) {
                result.push(results.find((r: any) => r.displayorder === i + 1) || null);
            }
        }
        return result;
    }, [results, itemCount, config?.selectionmethod, placements]);

    const [editingResult, setEditingResult] = useState<any>(null);

    const handleSelectRecord = async (recordKey: string) => {
        if (pickingForIndex === null) return;
        setIsUpdating(true);
        try {
            const existingPlacement = placements.find((p: ComponentPlacement) => p.displayorder === pickingForIndex + 1);
            
            await upsertComponentData('componentplacement', {
                key: existingPlacement?.key || undefined,
                schoolkey: schoolKey,
                templatecomponentkey: component.key,
                componentcode: component.componentcode || 'academicresults',
                contenttable: tableName,
                contentkey: recordKey,
                displayorder: pickingForIndex + 1,
                isactive: true
            }, schoolKey);
            
            setPickingForIndex(null);
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
            await deleteComponentData('componentplacement', placement.key, schoolKey);
        } catch (err) {
            console.error("Failed to delete placement:", err);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAddNew = (displayOrder?: number) => {
        const currentYear = new Date().getFullYear();
        setEditingResult({
            key: generateId(),
            schoolkey: schoolKey,
            ...getInitialValuesFromFilters(filters),
            year: currentYear,
            passpercentage: 100,
            distinctions: 0,
            firstclass: 0,
            legacyquote: "",
            isactive: true,
            displayorder: displayOrder || results.length + 1
        });
    };

    return (
        <BaseEditor
            title="Academic Results Section"
            description={isEditable ? "Manage and showcase student academic performance data." : "Preview of your school's latest academic results."}
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
            }
            isEditable={isEditable}
            parentScreenName={component.parentscreenname}
            selectionMethod={config?.selectionmethod || 'auto'}
            error={error}
            component={component}
        >
            <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative">
                    {slots.map((result: any, index: number) => {
                        if (!result) {
                            if (!isEditable) return (
                                <div key={`empty-${index}`} className="p-6 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-300 min-h-[160px] bg-gray-50/30">
                                    <p className="text-[12px] font-medium italic">Result data not yet added</p>
                                </div>
                            );
                            return (
                                <button
                                    key={`empty-${index}`}
                                    onClick={() => isEditable ? handleAddNew(index + 1) : setPickingForIndex(index)}
                                    className="p-6 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/30 transition-all active:scale-[0.98] min-h-[160px] bg-gray-50/50"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <div className="text-center">
                                        <p className="text-[14px] font-black tracking-tight">Slot {index + 1}</p>
                                        <p className="text-[12px] font-medium text-gray-400">{isEditable ? "Add result data" : "Select result to display"}</p>
                                    </div>
                                </button>
                            );
                        }

                        return (
                            <div
                                key={`${result.key}-${index}`}
                                className={`group p-6 bg-white border border-gray-100 rounded-2xl transition-all relative shadow-sm ${isEditable ? 'hover:border-red-100 hover:shadow-2xl hover:shadow-red-500/10 cursor-pointer' : ''}`}
                                onClick={() => isEditable && setEditingResult(result)}
                            >
                                 {isEditable && (
                                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                                        {config?.selectionmethod === 'manual' && !isEditable ? (
                                             <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setPickingForIndex(index); }}
                                                    className="p-3 bg-white rounded-2xl shadow-2xl border border-gray-100 text-gray-400 hover:text-[#F54927] transition-all active:scale-90"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleClearSlot(index); }}
                                                    className="p-3 bg-white rounded-2xl shadow-2xl border border-gray-100 text-gray-400 hover:text-red-500 transition-all active:scale-90"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                             </div>
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setEditingResult(result); }}
                                                className="p-3 bg-white rounded-2xl shadow-2xl border border-gray-100 text-gray-400 hover:text-[#F54927] transition-all active:scale-90"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div className="space-y-4">
                                    <span className="text-[22px] font-black tracking-tight bg-gradient-to-r from-[#F54927] to-[#ff6b52] bg-clip-text text-transparent">{result.year}</span>
                                    
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between border-b border-gray-50 pb-1">
                                            <span className="text-[12px] text-gray-500 uppercase font-bold tracking-wider">Passes</span>
                                            <span className="text-[15px] font-black text-gray-900">{result.passpercentage}%</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-gray-50 pb-1">
                                            <span className="text-[12px] text-gray-500 uppercase font-bold tracking-wider">Distinctions</span>
                                            <span className="text-[15px] font-black text-gray-900">{result.distinctions}</span>
                                        </div>
                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-[12px] text-gray-500 uppercase font-bold tracking-wider">1st Class</span>
                                            <span className="text-[15px] font-black text-gray-900">{result.firstclass}</span>
                                        </div>
                                    </div>

                                    {result.legacyquote && (
                                        <div className="pt-2 border-t border-gray-50">
                                            <p className="text-[13px] font-medium text-gray-500 italic line-clamp-2 px-1 border-l-2 border-red-100">"{result.legacyquote}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}


                </div>

                {editingResult && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-lg rounded-[28px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-full">
                            <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div>
                                    <h3 className="text-[16px] font-black text-gray-900 capitalize tracking-tight">Edit Academic Result</h3>
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Edit year details</p>
                                </div>
                                <button onClick={() => setEditingResult(null)} className="p-2 text-gray-400 hover:text-gray-900 bg-white shadow-sm border border-gray-200 rounded-full hover:bg-gray-50 transition-all active:scale-95">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Academic Year</label>
                                    <input
                                        type="number"
                                        value={editingResult.year || ""}
                                        onChange={e => setEditingResult({ ...editingResult, year: parseInt(e.target.value) || "" })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-red-400 focus:ring-4 focus:ring-red-500/10 transition-all text-[14px] font-bold outline-none shadow-inner"
                                        placeholder="e.g. 2023"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 relative">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Pass %</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={editingResult.passpercentage || ""}
                                                onChange={e => setEditingResult({ ...editingResult, passpercentage: parseFloat(e.target.value) || "" })}
                                                className="w-full px-4 py-3 pr-8 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-red-400 focus:ring-4 focus:ring-red-500/10 transition-all text-[14px] font-bold outline-none shadow-inner"
                                                placeholder="e.g. 98"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Distinctions</label>
                                        <input
                                            type="number"
                                            value={editingResult.distinctions || ""}
                                            onChange={e => setEditingResult({ ...editingResult, distinctions: parseInt(e.target.value) || "" })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-red-400 focus:ring-4 focus:ring-red-500/10 transition-all text-[14px] font-bold outline-none shadow-inner"
                                            placeholder="e.g. 45"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">First Class / Honours</label>
                                    <input
                                        type="number"
                                        value={editingResult.firstclass || ""}
                                        onChange={e => setEditingResult({ ...editingResult, firstclass: parseInt(e.target.value) || "" })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-red-400 focus:ring-4 focus:ring-red-500/10 transition-all text-[14px] font-bold outline-none shadow-inner"
                                        placeholder="e.g. 120"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
                                        <span>Legacy Quote / Summary</span>
                                        <span className="font-medium text-gray-300 lowercase">optional</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={editingResult.legacyquote || ""}
                                        onChange={e => setEditingResult({ ...editingResult, legacyquote: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-red-400 focus:ring-4 focus:ring-red-500/10 transition-all text-[14px] font-bold outline-none shadow-inner resize-none"
                                        placeholder="e.g. Highest number of distinctions in the state."
                                    />
                                </div>
                            </div>

                            <div className="p-5 sm:p-6 border-t border-gray-100 bg-gray-50/80 flex justify-between items-center rounded-b-[28px]">
                                <button
                                    onClick={() => { removeRecord(editingResult.key); setEditingResult(null); }}
                                    className="px-5 py-3 text-[13px] font-black text-red-500 hover:text-white hover:bg-red-500 shadow-sm border border-red-100 hover:border-transparent rounded-xl transition-all active:scale-95 bg-white"
                                >
                                    Delete
                                </button>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setEditingResult(null)}
                                        className="px-5 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-900 rounded-xl transition-all hover:bg-white border border-transparent hover:border-gray-200 active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={isSaving}
                                        onClick={() => { saveRecord(editingResult); setEditingResult(null); }}
                                        className="px-8 py-3 bg-gradient-to-r from-gray-900 to-black text-white text-[13px] font-black rounded-xl hover:shadow-lg hover:shadow-black/20 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        {isSaving ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Selection Dialog (Manual Selection Mode only) */}
                {pickingForIndex !== null && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm shadow-2xl">
                        <div className="absolute inset-0" onClick={() => setPickingForIndex(null)} />
                        <div className="relative bg-white w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                                <h3 className="text-[18px] font-black text-gray-900 tracking-tight">Select Academic Year for Slot {pickingForIndex + 1}</h3>
                                <button onClick={() => setPickingForIndex(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
                                {results.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400">No academic results found.</div>
                                ) : (
                                    results.map((rec: any) => (
                                        <button
                                            key={rec.key}
                                            onClick={() => handleSelectRecord(rec.key)}
                                            className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${placements.some((p: ComponentPlacement) => p.contentkey === rec.key) ? "border-red-500 bg-red-50/30" : "border-gray-50 hover:border-gray-100 bg-white"}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className="text-[18px] font-black text-gray-900">{rec.year}</span>
                                                <div className="text-[12px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-lg">
                                                    {rec.passpercentage}% pass rate
                                                </div>
                                            </div>
                                            {placements.some((p: ComponentPlacement) => p.contentkey === rec.key) && (
                                                <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center">
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
            </div>
        </BaseEditor>
    );
}
