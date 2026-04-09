"use client";
import { generateId } from '@/lib/generateId';

import React, { useState } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData } from "@/domains/dashboard/hooks/useComponentData";
import type { TemplateComponent, TemplateScreen } from "@/domains/auth/types";

interface BoardMessageEditorProps {
    component: TemplateComponent;
    screen: TemplateScreen;
    schoolKey: string;
}

export default function BoardMessageEditor({ component, screen, schoolKey }: BoardMessageEditorProps) {
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
                boardmessage: "",
                isactive: true
            });
        }
    };

    return (
        <BaseEditor
            title="Board Members Message"
            description="Edit the common message board shared by all members of the school board."
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            }
            error={error}
            isEditable={isEditable}
            parentScreenName={component.parentscreenname}
            selectionMethod="auto"
            emptySlotsCount={0}
            component={component}
        >
            <div className="max-w-4xl mx-auto">
                <div 
                    onClick={isEditable ? handleEdit : undefined}
                    className={`group relative bg-white rounded-[40px] p-12 border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col items-center text-center gap-8 ${isEditable ? "cursor-pointer" : ""}`}
                >
                    {/* Hover Pencil Icon */}
                    {isEditable && (
                        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-2 z-10">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit();
                                }}
                                className="p-3 bg-white rounded-2xl shadow-xl border border-gray-100 text-gray-400 hover:text-[#F54927] hover:border-red-100 transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                        </div>
                    )}

                    <div className="w-24 h-24 rounded-3xl bg-red-50 text-[#F54927] flex items-center justify-center transition-colors group-hover:bg-red-100 shadow-inner">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </div>

                    <div className="space-y-4 max-w-2xl">
                        <h3 className="text-[24px] font-black text-gray-900 tracking-tight">Management Message Board</h3>
                        <div className="text-[16px] font-medium text-gray-500 leading-relaxed italic whitespace-pre-wrap">
                            {identity?.boardmessage || <span className="opacity-40 tracking-normal font-normal">Add a common message for the board members...</span>}
                        </div>
                    </div>

                    {/* Decoration */}
                    <div className="absolute bottom-0 inset-x-0 h-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-[40px] bg-gradient-to-r from-[#F54927] to-orange-400" />
                </div>
            </div>

            {/* Edit Modal */}
            {editingItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={() => setEditingItem(null)} />
                    <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-50 text-[#F54927] rounded-xl text-xl">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-[18px] font-black text-gray-900 tracking-tight">Common Message Board</h3>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Edit Management Statement</p>
                                </div>
                            </div>
                            <button onClick={() => setEditingItem(null)} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-10 space-y-2 overflow-y-auto no-scrollbar flex-1">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Message Content</label>
                            <textarea
                                value={editingItem.boardmessage || ""}
                                onChange={e => setEditingItem({ ...editingItem, boardmessage: e.target.value })}
                                rows={12}
                                className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-[32px] focus:bg-white focus:border-red-100 transition-all text-[15px] font-bold outline-none resize-none no-scrollbar shadow-inner"
                                placeholder="Enter the official statement from the board of members..."
                            />
                            <p className="text-[11px] font-medium text-gray-400 px-4">This message will be visible as a primary statement on the board members page.</p>
                        </div>

                        <div className="p-8 border-t border-gray-50 bg-gray-50/30 flex items-center justify-end">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setEditingItem(null)}
                                    className="px-8 py-4 text-[13px] font-bold text-gray-400 hover:text-gray-900 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isSaving}
                                    onClick={async () => {
                                        await saveRecord(editingItem);
                                        setEditingItem(null);
                                    }}
                                    className="px-10 py-4 bg-[#111827] text-white text-[14px] font-black rounded-[20px] hover:bg-black transition-all shadow-xl disabled:opacity-50 flex items-center gap-3"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : "Update Message"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </BaseEditor>
    );
}
