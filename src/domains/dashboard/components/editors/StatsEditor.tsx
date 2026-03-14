"use client";

import { useState } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData } from "@/domains/dashboard/hooks/useComponentData";
import type { TemplateComponent, TemplateScreen } from "@/domains/auth/types";

interface StatsEditorProps {
    component: TemplateComponent;
    screen: TemplateScreen;
    schoolKey: string;
}

export default function StatsEditor({ component, screen, schoolKey }: StatsEditorProps) {
    const tableName = component.componentregistry?.tablename || "schoolstats";
    const initialItems = (component as any).content || [];

    const {
        records: stats,
        isSaving,
        error,
        saveRecord,
        removeRecord,
        reorderRecords
    } = useComponentData({
        tableName,
        schoolKey,
        initialRecords: initialItems
    });

    const [editingStat, setEditingStat] = useState<any>(null);

    const handleAddNew = () => {
        setEditingStat({
            key: crypto.randomUUID(),
            screenslug: screen.screenslug,
            label: "New Stat",
            value: "0",
            suffix: "+",
            icon: "star",
            displayorder: stats.length + 1,
            isactive: true
        });
    };

    return (
        <BaseEditor
            title="Statistics Section"
            description="Highlight key numbers like student count, faculty, or awards."
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            }
            error={error}
        >
            <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.map((stat: any) => (
                        <div
                            key={stat.key}
                            className="group p-6 bg-white border border-gray-100 rounded-2xl hover:border-red-100 hover:shadow-xl hover:shadow-red-500/5 transition-all cursor-pointer relative"
                            onClick={() => setEditingStat(stat)}
                        >
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const index = stats.indexOf(stat);
                                        if (index > 0) {
                                            const newOrder = [...stats];
                                            [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                                            reorderRecords(newOrder);
                                        }
                                    }}
                                    disabled={stats.indexOf(stat) === 0}
                                    className="p-1.5 bg-white shadow-sm border border-gray-100 rounded-lg text-gray-400 hover:text-[#F54927] disabled:opacity-30"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const index = stats.indexOf(stat);
                                        if (index < stats.length - 1) {
                                            const newOrder = [...stats];
                                            [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
                                            reorderRecords(newOrder);
                                        }
                                    }}
                                    disabled={stats.indexOf(stat) === stats.length - 1}
                                    className="p-1.5 bg-white shadow-sm border border-gray-100 rounded-lg text-gray-400 hover:text-[#F54927] disabled:opacity-30"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setEditingStat(stat); }}
                                    className="p-1.5 bg-white shadow-sm border border-gray-100 rounded-lg text-gray-400 hover:text-[#F54927]"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-[24px] font-black text-gray-900 tracking-tight">{stat.value}</span>
                                <span className="text-[14px] font-bold text-[#F54927]">{stat.suffix}</span>
                            </div>
                            <p className="text-[13px] font-bold text-gray-500 mt-1 uppercase tracking-wide">{stat.label}</p>
                        </div>
                    ))}

                    <button
                        onClick={handleAddNew}
                        className="p-6 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/30 transition-all active:scale-[0.98]"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-[13px] font-black tracking-tight">Add New Stat</span>
                    </button>
                </div>

                {editingStat && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                                <h3 className="text-[16px] font-black text-gray-900 capitalize">Edit Statistic</h3>
                                <button onClick={() => setEditingStat(null)} className="p-2 text-gray-400 hover:text-gray-900">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Label</label>
                                    <input
                                        type="text"
                                        value={editingStat.label}
                                        onChange={e => setEditingStat({ ...editingStat, label: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-red-100 transition-all text-[14px] font-bold outline-none"
                                        placeholder="e.g. Students Enrolled"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Value</label>
                                        <input
                                            type="text"
                                            value={editingStat.value}
                                            onChange={e => setEditingStat({ ...editingStat, value: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-red-100 transition-all text-[14px] font-bold outline-none"
                                            placeholder="e.g. 500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Suffix</label>
                                        <input
                                            type="text"
                                            value={editingStat.suffix}
                                            onChange={e => setEditingStat({ ...editingStat, suffix: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-red-100 transition-all text-[14px] font-bold outline-none"
                                            placeholder="e.g. +"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-50 bg-gray-50/30 flex items-center justify-between">
                                <button
                                    onClick={() => { removeRecord(editingStat.key); setEditingStat(null); }}
                                    className="px-4 py-2.5 text-[13px] font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    Delete
                                </button>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setEditingStat(null)}
                                        className="px-5 py-2.5 text-[13px] font-bold text-gray-500 hover:text-gray-900 rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={isSaving}
                                        onClick={() => { saveRecord(editingStat); setEditingStat(null); }}
                                        className="px-6 py-2.5 bg-[#111827] text-white text-[13px] font-black rounded-xl hover:bg-black transition-all"
                                    >
                                        {isSaving ? "Saving..." : "Update Stat"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ BaseEditor>
    );
}
