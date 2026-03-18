"use client";

import { ReactNode } from "react";

interface BaseEditorProps {
    title: string;
    description: string;
    icon: ReactNode;
    children: ReactNode;
    isSaving?: boolean;
    onSave?: () => void;
    onCancel?: () => void;
    error?: string | null;
    headerActions?: ReactNode;
}

export default function BaseEditor({
    title,
    description,
    icon,
    children,
    isSaving,
    onSave,
    onCancel,
    error,
    headerActions
}: BaseEditorProps) {
    return (
        <div className="flex flex-col h-full bg-white relative animate-in fade-in duration-300">
            {/* Header Area */}
            <div className="p-6 md:p-8 border-b border-gray-50 bg-[#fafafa]/30">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-50 text-[#F54927] rounded-xl flex items-center justify-center shadow-sm border border-red-100/50">
                            {icon}
                        </div>
                        <div>
                            <h2 className="text-[17px] font-black text-gray-900 tracking-tight">{title} Editor</h2>
                            <p className="text-[12px] text-gray-500 font-medium">{description}</p>
                        </div>
                    </div>
                    {headerActions && (
                        <div className="flex items-center gap-3">
                            {headerActions}
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-[12px] font-bold">{error}</span>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-9 custom-scrollbar">
                <div className="max-w-4xl">
                    {children}
                </div>
            </div>

            {/* Footer / Actions Area */}
            {(onSave || onCancel) && (
                <div className="p-5 md:p-6 border-t border-gray-100 bg-white/80 backdrop-blur-md flex items-center justify-end gap-3 sticky bottom-0 z-10">
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            disabled={isSaving}
                            className="px-5 py-2.5 text-[13px] font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all active:scale-[0.97] disabled:opacity-50"
                        >
                            Discard
                        </button>
                    )}
                    {onSave && (
                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className={`
                                px-6 py-2.5 text-[13px] font-black rounded-xl shadow-lg shadow-red-500/10 transition-all active:scale-[0.97] flex items-center gap-2
                                ${isSaving
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-gradient-to-tr from-[#F54927] to-[#ff6b52] text-white hover:shadow-red-500/20"
                                }
                            `}
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Save Changes</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
