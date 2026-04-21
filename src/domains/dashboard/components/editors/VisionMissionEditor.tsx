"use client";
import { generateId } from '@/lib/generateId';

import React, { useState } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData } from "@/domains/dashboard/hooks/useComponentData";
import type { TemplateComponent, TemplateScreen } from "@/domains/auth/types";

interface VisionMissionEditorProps {
    component: TemplateComponent;
    screen: TemplateScreen;
    schoolKey: string;
}

export default function VisionMissionEditor({ component, screen, schoolKey }: VisionMissionEditorProps) {
    const tableName = (component.componentregistry as any)?.tablename || "schoolidentity";
    const isEditable = component.iseditable;
    
    const {
        records,
        isSaving,
        error,
        saveRecord
    } = useComponentData({
        tableName,
        schoolKey,
        orderBy: "createdat",
        initialRecords: (component as any).content || []
    });

    const identity = records.length > 0 ? records[0] : null;
    const [editingItem, setEditingItem] = useState<any>(null);

    const handleEdit = () => {
        if (identity) {
            setEditingItem({ ...identity });
        } else {
            setEditingItem({
                key: generateId(),
                schoolkey: schoolKey,
                vision: "",
                mission: "",
                motto: "",
                isactive: true
            });
        }
    };

    const cards = [
        {
            id: "vision",
            title: "Our Vision",
            value: identity?.vision,
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            ),
            color: "blue"
        },
        {
            id: "mission",
            title: "Our Mission",
            value: identity?.mission,
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            ),
            color: "orange"
        },
        {
            id: "motto",
            title: "School Motto",
            value: identity?.motto,
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
                </svg>
            ),
            color: "purple"
        }
    ];

    return (
        <BaseEditor
            title={component.componentregistry?.componentname ?? "Vision & Mission"}
            description="Define your school's core identity, mission statement, and guiding motto."
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            }
            error={error}
            isEditable={isEditable}
            parentScreenName={component.parentscreenname}
            selectionMethod="auto"
            emptySlotsCount={0}
            component={component}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card) => (
                        <div 
                        key={card.id}
                        onClick={isEditable ? handleEdit : undefined}
                        className={`group relative bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col items-center text-center gap-6 min-h-[320px] ${
                            card.color === "blue" ? "hover:shadow-blue-500/10" : 
                            card.color === "orange" ? "hover:shadow-orange-500/10" : 
                            "hover:shadow-purple-500/10"
                        } ${isEditable ? "cursor-pointer" : ""}`}
                    >
                        {/* Hover Pencil Icon */}
                        {isEditable && (
                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit();
                                    }}
                                    className="p-3 bg-white rounded-2xl shadow-2xl border border-gray-100 text-gray-400 hover:text-[#F54927] transition-all active:scale-90"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-colors shadow-inner ${
                            card.color === "blue" ? "bg-blue-50 text-blue-500 group-hover:bg-blue-100" : 
                            card.color === "orange" ? "bg-orange-50 text-orange-500 group-hover:bg-orange-100" : 
                            "bg-purple-50 text-purple-500 group-hover:bg-purple-100"
                        }`}>
                            {card.icon}
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-[18px] font-black text-gray-900 tracking-tight">{card.title}</h3>
                            <p className="text-[14px] font-medium text-gray-500 leading-relaxed line-clamp-4 italic">
                                {card.value || <span className="opacity-40 tracking-normal font-normal">Not yet defined...</span>}
                            </p>
                        </div>

                        {/* Decoration */}
                        <div className={`absolute bottom-0 inset-x-0 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-[32px] ${
                            card.color === "blue" ? "shadow-[0_4px_20px_-2px_rgba(59,130,246,0.3)] bg-blue-400" : 
                            card.color === "orange" ? "shadow-[0_4px_20px_-2px_rgba(249,115,22,0.3)] bg-orange-400" : 
                            "shadow-[0_4px_20px_-2px_rgba(168,85,247,0.3)] bg-purple-400"
                        }`} />
                    </div>
                ))}
            </div>

            {/* Edit Modal */}
            {editingItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={() => setEditingItem(null)} />
                    <div className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-50 text-[#F54927] rounded-lg">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </div>
                                <h3 className="text-[16px] font-black text-gray-900">Update Core Identity</h3>
                            </div>
                            <button onClick={() => setEditingItem(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-8 space-y-8 overflow-y-auto no-scrollbar flex-1">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">School Motto</label>
                                <input
                                    type="text"
                                    value={editingItem.motto || ""}
                                    onChange={e => setEditingItem({ ...editingItem, motto: e.target.value })}
                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[15px] font-bold outline-none"
                                    placeholder="e.g. Excellence in Education"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Our Vision</label>
                                <textarea
                                    value={editingItem.vision || ""}
                                    onChange={e => setEditingItem({ ...editingItem, vision: e.target.value })}
                                    rows={4}
                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none resize-none"
                                    placeholder="Describe the school's long-term vision..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Our Mission</label>
                                <textarea
                                    value={editingItem.mission || ""}
                                    onChange={e => setEditingItem({ ...editingItem, mission: e.target.value })}
                                    rows={4}
                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none resize-none"
                                    placeholder="Describe the school's immediate goals and mission..."
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-50 bg-gray-50/30 flex items-center justify-end">
                            <div className="flex items-center gap-3 ml-auto">
                                <button
                                    onClick={() => setEditingItem(null)}
                                    className="px-6 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-900 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isSaving}
                                    onClick={async () => {
                                        await saveRecord(editingItem);
                                        setEditingItem(null);
                                    }}
                                    className="px-8 py-3 bg-[#111827] text-white text-[13px] font-black rounded-xl hover:bg-black transition-all shadow-xl disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : "Update Identity"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </BaseEditor>
    );
}
