"use client";

import { useState } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData } from "@/domains/dashboard/hooks/useComponentData";
import type { TemplateComponent, TemplateScreen } from "@/domains/auth/types";

interface BroadcastEditorProps {
    component: TemplateComponent;
    screen: TemplateScreen;
    schoolKey: string;
}

export default function BroadcastEditor({ component, screen, schoolKey }: BroadcastEditorProps) {
    const tableName = (component.componentregistry as any)?.tablename || "broadcastcontent";
    const initialItems = (component as any).content || [];

    const {
        records: broadcasts,
        isSaving,
        error,
        saveRecord,
        removeRecord
    } = useComponentData({
        tableName,
        schoolKey,
        initialRecords: initialItems,
        orderBy: "priority" // Broadcasts use priority instead of displayorder
    });

    const [editingBroadcast, setEditingBroadcast] = useState<any>(null);

    const handleAddNew = () => {
        setEditingBroadcast({
            key: crypto.randomUUID(),
            schoolkey: schoolKey,
            title: "",
            message: "",
            priority: 1,
            expiresat: null,
            isactive: true
        });
    };

    const getPriorityBadgeColor = (priority: number) => {
        if (priority >= 3) return "bg-red-100 text-red-600 border-red-200";
        if (priority === 2) return "bg-orange-100 text-orange-600 border-orange-200";
        return "bg-blue-100 text-blue-600 border-blue-200";
    };

    return (
        <BaseEditor
            title="Broadcast Editor"
            description="Manage announcements, alerts, and news for your school."
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.167H3.33a1.732 1.732 0 01-1.468-2.651l1.192-1.986a1.732 1.732 0 011.468-.769h1.106l2.147-6.167a1.76 1.76 0 013.417.592zM16.126 14.156A4.1 4.1 0 0017.5 11a4.1 4.1 0 00-1.374-3.156m3.07 9.312A8.106 8.106 0 0021.5 11c0-2.39-1.026-4.542-2.674-6.037" />
                </svg>
            }
            error={error}
        >
            <div className="space-y-8">
                <div className="grid grid-cols-1 gap-4">
                    {broadcasts.map((broadcast: any) => (
                        <div
                            key={broadcast.key}
                            className={`
                                group p-6 bg-white border rounded-2xl transition-all cursor-pointer relative flex flex-col gap-4
                                ${broadcast.isactive
                                    ? "border-gray-100 hover:border-red-100 hover:shadow-xl hover:shadow-red-500/5"
                                    : "border-gray-100 opacity-60 bg-gray-50/50"}
                            `}
                            onClick={() => setEditingBroadcast(broadcast)}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getPriorityBadgeColor(broadcast.priority)}`}>
                                            Priority {broadcast.priority}
                                        </span>
                                        {!broadcast.isactive && (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border bg-gray-100 text-gray-500 border-gray-200">
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="text-[16px] font-black text-gray-900 tracking-tight leading-tight">
                                        {broadcast.title || "Untitled Announcement"}
                                    </h4>
                                    <p className="text-[13px] text-gray-500 font-medium line-clamp-2">
                                        {broadcast.message}
                                    </p>
                                </div>

                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEditingBroadcast(broadcast); }}
                                        className="p-2 bg-white shadow-sm border border-gray-100 rounded-xl text-gray-400 hover:text-[#F54927] hover:border-red-100 transition-all"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {broadcast.expiresat && (
                                <div className="flex items-center gap-2 pt-4 border-t border-gray-50">
                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                        Expires: {new Date(broadcast.expiresat).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}

                    <button
                        onClick={handleAddNew}
                        className="p-8 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/30 transition-all active:scale-[0.98]"
                    >
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-red-50 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <span className="block text-[14px] font-black tracking-tight">Post New Broadcast</span>
                            <span className="text-[12px] font-medium text-gray-400">Add an announcement or important update.</span>
                        </div>
                    </button>
                </div>

                {editingBroadcast && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-[#fafafa]/50">
                                <h3 className="text-[16px] font-black text-gray-900 capitalize">
                                    {editingBroadcast.key ? "Edit Broadcast" : "New Broadcast"}
                                </h3>
                                <button onClick={() => setEditingBroadcast(null)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="p-8 space-y-6 overflow-y-auto">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Title</label>
                                    <input
                                        type="text"
                                        value={editingBroadcast.title}
                                        onChange={e => setEditingBroadcast({ ...editingBroadcast, title: e.target.value })}
                                        className="w-full px-4 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-red-100 transition-all text-[14px] font-bold outline-none placeholder:text-gray-300"
                                        placeholder="Headline of the announcement..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Message</label>
                                    <textarea
                                        value={editingBroadcast.message}
                                        onChange={e => setEditingBroadcast({ ...editingBroadcast, message: e.target.value })}
                                        className="w-full px-4 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-red-100 transition-all text-[14px] font-bold outline-none min-h-[120px] resize-none placeholder:text-gray-300"
                                        placeholder="Provide more details here..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Priority</label>
                                        <select
                                            value={editingBroadcast.priority}
                                            onChange={e => setEditingBroadcast({ ...editingBroadcast, priority: Number(e.target.value) })}
                                            className="w-full px-4 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-red-100 transition-all text-[14px] font-bold outline-none appearance-none"
                                        >
                                            <option value={1}>Low Priority (Blue)</option>
                                            <option value={2}>Medium Priority (Orange)</option>
                                            <option value={3}>High Priority (Red)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Expires At</label>
                                        <input
                                            type="date"
                                            value={editingBroadcast.expiresat ? new Date(editingBroadcast.expiresat).toISOString().split('T')[0] : ""}
                                            onChange={e => setEditingBroadcast({ ...editingBroadcast, expiresat: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                            className="w-full px-4 py-3.5 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-red-100 transition-all text-[14px] font-bold outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <input
                                        type="checkbox"
                                        id="isactive"
                                        checked={editingBroadcast.isactive}
                                        onChange={e => setEditingBroadcast({ ...editingBroadcast, isactive: e.target.checked })}
                                        className="w-5 h-5 rounded-md border-gray-300 text-[#F54927] focus:ring-[#F54927]"
                                    />
                                    <label htmlFor="isactive" className="text-[13px] font-bold text-gray-700 cursor-pointer select-none">
                                        Active and visible to students/users
                                    </label>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-50 bg-gray-50/30 flex items-center justify-between">
                                <button
                                    onClick={() => {
                                        if (confirm("Are you sure you want to delete this broadcast?")) {
                                            removeRecord(editingBroadcast.key);
                                            setEditingBroadcast(null);
                                        }
                                    }}
                                    className="px-4 py-2.5 text-[13px] font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    Delete
                                </button>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setEditingBroadcast(null)}
                                        className="px-5 py-2.5 text-[13px] font-bold text-gray-500 hover:text-gray-900 rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={isSaving}
                                        onClick={() => {
                                            saveRecord(editingBroadcast);
                                            setEditingBroadcast(null);
                                        }}
                                        className="px-6 py-2.5 bg-[#111827] text-white text-[13px] font-black rounded-xl hover:bg-black transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {isSaving ? "Saving..." : editingBroadcast.key ? "Update Broadcast" : "Post Broadcast"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </BaseEditor>
    );
}
