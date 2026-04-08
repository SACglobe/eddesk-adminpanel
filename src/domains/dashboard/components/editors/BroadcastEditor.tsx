"use client";
import { generateId } from '@/lib/generateId';

import { useState, useMemo, useEffect } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData, getInitialValuesFromFilters } from "@/domains/dashboard/hooks/useComponentData";
import { upsertComponentData, deleteComponentData } from "@/domains/dashboard/actions";
import type { TemplateComponent, TemplateScreen, ComponentPlacement } from "@/domains/auth/types";

interface BroadcastEditorProps {
    component: TemplateComponent;
    screen: TemplateScreen;
    schoolKey: string;
}

const PRIORITY_CONFIG = {
    1: { label: "Low", color: "blue",   dot: "bg-blue-400",   badge: "bg-blue-50 text-blue-600 border-blue-100",   border: "border-l-blue-400",   preview: "from-blue-500 to-blue-600" },
    2: { label: "Medium", color: "orange", dot: "bg-orange-400", badge: "bg-orange-50 text-orange-600 border-orange-100", border: "border-l-orange-400", preview: "from-orange-500 to-orange-600" },
    3: { label: "High", color: "red",   dot: "bg-red-400",    badge: "bg-red-50 text-red-600 border-red-100",       border: "border-l-red-500",    preview: "from-red-500 to-[#F54927]" },
} as const;

function getExpiryInfo(expiresat: string | null): { isExpired: boolean; label: string | null } {
    if (!expiresat) return { isExpired: false, label: null };
    const exp = new Date(expiresat);
    const now = new Date();
    const diffMs = exp.getTime() - now.getTime();
    const isExpired = diffMs < 0;
    if (isExpired) return { isExpired: true, label: "Expired" };
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return { isExpired: false, label: "Expires today" };
    if (diffDays === 1) return { isExpired: false, label: "Expires tomorrow" };
    return { isExpired: false, label: `Expires in ${diffDays}d` };
}

export default function BroadcastEditor({ component, screen, schoolKey }: BroadcastEditorProps) {
    const tableName = (component.componentregistry as any)?.tablename;
    const initialItems = (component as any).content || [];

    const config = component.config as any;
    const itemCount = config?.itemcount ? parseInt(config.itemcount) : null;
    const isFixedMode = itemCount !== null;

    const filters = useMemo(() => ({
        ...(config?.filters || {}),
        screenslug: screen.screenslug
    }), [config?.filters, screen.screenslug]);

    const {
        records: broadcasts,
        isSaving,
        error,
        saveRecord,
        removeRecord
    } = useComponentData({
        tableName,
        schoolKey,
        filters,
        initialRecords: initialItems,
        orderBy: "priority"
    });

    const [pickingForIndex, setPickingForIndex] = useState<number | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const placements = useMemo(() => {
        return (component.contentplacements || [])
            .filter((p: ComponentPlacement) => p.isactive !== false)
            .sort((a: ComponentPlacement, b: ComponentPlacement) => (a.displayorder || 0) - (b.displayorder || 0));
    }, [component.contentplacements]);

    // Fixed slots logic
    const slots = useMemo(() => {
        const count = itemCount || 1; // Default to 1 slot if not specified
        const result = [];
        for (let i = 0; i < count; i++) {
            if (config?.selectionmethod === "manual") {
                const placement = placements.find((p: ComponentPlacement) => p.displayorder === i + 1);
                const broadcast = placement ? broadcasts.find((b: any) => b.key === placement.contentkey) : null;
                result.push(broadcast || { isSkeleton: true, displayorder: i + 1 });
            } else {
                const broadcast = broadcasts.find((b: any) => b.displayorder === i + 1);
                result.push(broadcast || { isSkeleton: true, displayorder: i + 1 });
            }
        }
        return result;
    }, [broadcasts, itemCount, placements, config?.selectionmethod]);

    const handleSelectRecord = async (recordKey: string) => {
        if (pickingForIndex === null) return;
        setIsUpdating(true);
        try {
            const existingPlacement = placements.find((p: ComponentPlacement) => p.displayorder === pickingForIndex + 1);
            
            await upsertComponentData('componentplacement', {
                key: existingPlacement?.key || undefined,
                schoolkey: schoolKey,
                templatecomponentkey: component.key,
                componentcode: component.componentcode || 'broadcast',
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

    const [editingBroadcast, setEditingBroadcast] = useState<any>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handleAddNew = (displayOrder?: number) => {
        setEditingBroadcast({
            key: generateId(),
            schoolkey: schoolKey,
            ...getInitialValuesFromFilters(filters),
            title: "",
            message: "",
            priority: 1,
            expiresat: null,
            isactive: true,
            displayorder: displayOrder || broadcasts.length + 1
        });
    };

    const handleSave = () => {
        saveRecord(editingBroadcast);
        setEditingBroadcast(null);
    };

    const confirmDelete = () => {
        if (editingBroadcast?.key) {
            removeRecord(editingBroadcast.key);
        }
        setEditingBroadcast(null);
        setShowDeleteConfirm(false);
    };

    return (
        <BaseEditor
            title="Broadcast"
            description="Post announcements, alerts and important updates to your school."
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.167H3.33a1.732 1.732 0 01-1.468-2.651l1.192-1.986a1.732 1.732 0 011.468-.769h1.106l2.147-6.167a1.76 1.76 0 013.417.592zM16.126 14.156A4.1 4.1 0 0017.5 11a4.1 4.1 0 00-1.374-3.156m3.07 9.312A8.106 8.106 0 0021.5 11c0-2.39-1.026-4.542-2.674-6.037" />
                </svg>
            }
            error={error}
            isEditable={component.iseditable}
            parentScreenName={component.parentscreenname}
            selectionMethod={config?.selectionmethod}
            component={component}
        >
            {/* Grid of Broadcasts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {slots.map((broadcast: any, index: number) => {
                    if (broadcast.isSkeleton) {
                        return (
                            <button
                                key={`empty-${index}`}
                                type="button"
                                onClick={() => component.iseditable ? handleAddNew(index + 1) : setPickingForIndex(index)}
                                className="p-6 border-2 border-dashed border-gray-100 rounded-[20px] flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/20 transition-all active:scale-[0.98] group min-h-[160px]"
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-50 group-hover:bg-red-100 flex items-center justify-center transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <p className="text-[13px] font-black tracking-tight">Slot {index + 1}</p>
                                    <p className="text-[11px] font-medium text-gray-400">{component.iseditable ? "Click to add broadcast" : "Select broadcast"}</p>
                                </div>
                            </button>
                        );
                    }

                    const p = PRIORITY_CONFIG[broadcast.priority as 1 | 2 | 3] ?? PRIORITY_CONFIG[1];
                    const { isExpired, label: expiryLabel } = getExpiryInfo(broadcast.expiresat);
                    const isInactive = !broadcast.isactive;
                    return (
                        <div
                            key={broadcast.key}
                            onClick={() => component.iseditable ? setEditingBroadcast(broadcast) : setPickingForIndex(index)}
                            className={`group bg-white border border-gray-100 rounded-[20px] hover:border-red-100 hover:shadow-2xl hover:shadow-red-500/10 transition-all cursor-pointer relative flex flex-col overflow-hidden ${isInactive || isExpired ? "opacity-60" : ""}`}
                        >
                            <div className={`h-1.5 w-full bg-gradient-to-r ${p.preview} flex-shrink-0`} />
                            <div className="flex-1 p-4 space-y-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${p.badge}`}>{p.label}</span>
                                    {isExpired && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-gray-100 text-gray-400 border-gray-200">Expired</span>}
                                    {isInactive && !isExpired && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border bg-gray-100 text-gray-400 border-gray-200">Inactive</span>}
                                    {!isExpired && !isInactive && broadcast.isactive && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">Live</span>}
                                </div>
                                <h4 className="text-[14px] font-black text-gray-900 group-hover:text-[#F54927] tracking-tight leading-snug transition-colors line-clamp-2">
                                    {broadcast.title || "No Title"}
                                </h4>
                                <p className="text-[11px] text-gray-400 font-medium line-clamp-3 leading-relaxed">
                                    {broadcast.message}
                                </p>
                            </div>
                            {expiryLabel && (
                                <div className="px-4 pb-3 flex items-center gap-1.5">
                                    <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-[10px] font-bold text-gray-400">{expiryLabel}</span>
                                </div>
                            )}
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all">
                                {component.iseditable ? (
                                    <button
                                        type="button"
                                        onClick={e => { e.stopPropagation(); setEditingBroadcast(broadcast); }}
                                        className="p-2 bg-white rounded-xl text-gray-400 hover:text-[#F54927] shadow-lg border border-gray-100 transition-all"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={e => { e.stopPropagation(); setPickingForIndex(index); }}
                                            className="p-2 bg-white rounded-xl text-gray-400 hover:text-blue-500 shadow-lg border border-gray-100 transition-all"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={e => { e.stopPropagation(); handleClearSlot(index); }}
                                            className="p-2 bg-white rounded-xl text-gray-400 hover:text-red-500 shadow-lg border border-gray-100 transition-all"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}


            </div>

            {/* ── SHARED MODAL LOGIC ─────────────────────────────────────────── */}
            {editingBroadcast && (
                <>
                    {/* Background Overlay */}
                    <div 
                        className="fixed inset-0 z-[200] bg-[#111827]/30 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setEditingBroadcast(null)}
                    />

                    {/* Modal Container */}
                    <div className={`fixed z-[201] transition-all duration-300 ${
                        isMobile 
                            ? "inset-0 bg-white flex flex-col" 
                            : "inset-6 md:inset-12 lg:inset-24 flex items-center justify-center p-4 pointer-events-none"
                    }`}>
                        <div 
                            className={`bg-white shadow-2xl overflow-hidden animate-in duration-300 flex pointer-events-auto ${
                                isMobile 
                                    ? "w-full h-full flex-col" 
                                    : "w-full max-w-4xl max-h-full rounded-[32px] zoom-in-95"
                            }`}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 md:p-7 border-b border-gray-50 flex items-center justify-between bg-white z-10">
                                <div>
                                    <h3 className="text-[17px] font-black text-gray-900 tracking-tight">
                                        {editingBroadcast.title ? "Edit Broadcast" : "New Broadcast"}
                                    </h3>
                                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Configure Announcement Details</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEditingBroadcast(null)}
                                    className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-[#F54927] rounded-full transition-all"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className={`flex-1 overflow-hidden flex ${isMobile ? "flex-col" : "flex-row"}`}>
                                {/* Left/Top — Preview */}
                                <div className={`${isMobile ? "p-6 bg-gray-50/50 border-b" : "w-1/3 p-7 bg-[#f8f8f8] border-r"} border-gray-100 flex flex-col gap-5 overflow-y-auto`}>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Live Preview</p>
                                        <div className="rounded-2xl overflow-hidden shadow-sm border border-red-100 flex items-center h-12 bg-white">
                                            <div className="flex-shrink-0 flex items-center gap-1.5 bg-[#F54927] text-white px-3.5 h-full">
                                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Broadcast</span>
                                            </div>
                                            <div className="flex-1 overflow-hidden px-4">
                                                <div className="whitespace-nowrap animate-[marquee_12s_linear_infinite] inline-block">
                                                    {(editingBroadcast.title || editingBroadcast.message)
                                                        ? <><span className="text-[14px] font-black text-gray-900">{editingBroadcast.title || "No Title"}:</span>{" "}<span className="text-[14px] font-normal text-gray-600">{editingBroadcast.message || "No Message"}</span></>
                                                        : <span className="text-[14px] italic font-normal text-gray-400">Your message will scroll here...</span>
                                                    }
                                                    &nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;
                                                    {(editingBroadcast.title || editingBroadcast.message)
                                                        ? <><span className="text-[14px] font-black text-gray-900">{editingBroadcast.title || "No Title"}:</span>{" "}<span className="text-[14px] font-normal text-gray-600">{editingBroadcast.message || "No Message"}</span></>
                                                        : <span className="text-[14px] italic font-normal text-gray-400">Your message will scroll here...</span>
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <style>{`
                                        @keyframes marquee {
                                            0%   { transform: translateX(60%); }
                                            100% { transform: translateX(-100%); }
                                        }
                                    `}</style>
                                    <div className="text-[11px] text-gray-400 font-medium leading-relaxed">
                                        This is how the ticker appears on the school website.
                                    </div>
                                </div>

                                {/* Right/Bottom — Form */}
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-7 no-scrollbar">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Title</label>
                                            <input
                                                type="text"
                                                value={editingBroadcast.title || ""}
                                                onChange={e => setEditingBroadcast({ ...editingBroadcast, title: e.target.value })}
                                                placeholder="Announcement headline…"
                                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[18px] focus:bg-white focus:border-[#F54927]/20 transition-all text-[15px] font-bold outline-none placeholder:text-gray-300"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Message</label>
                                            <textarea
                                                value={editingBroadcast.message || ""}
                                                onChange={e => setEditingBroadcast({ ...editingBroadcast, message: e.target.value })}
                                                placeholder="Provide more details here…"
                                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[18px] focus:bg-white focus:border-[#F54927]/20 transition-all text-[14px] font-medium outline-none min-h-[120px] resize-none placeholder:text-gray-300"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Priority</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {([1, 2, 3] as const).map(level => {
                                                    const cfg = PRIORITY_CONFIG[level];
                                                    const isSelected = editingBroadcast.priority === level;
                                                    return (
                                                        <button
                                                            key={level}
                                                            type="button"
                                                            onClick={() => setEditingBroadcast({ ...editingBroadcast, priority: level })}
                                                            className={`py-3.5 rounded-[16px] border-2 text-[12px] font-black uppercase tracking-wider transition-all ${
                                                                isSelected ? `bg-gradient-to-br ${cfg.preview} text-white border-transparent shadow-md` : `bg-white text-gray-400 border-gray-100 hover:border-gray-200`
                                                            }`}
                                                        >
                                                            {cfg.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Expiry Date</label>
                                            <input
                                                type="date"
                                                value={editingBroadcast.expiresat ? new Date(editingBroadcast.expiresat).toISOString().split("T")[0] : ""}
                                                onChange={e => setEditingBroadcast({ ...editingBroadcast, expiresat: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[18px] focus:bg-white focus:border-[#F54927]/20 transition-all text-[14px] font-bold outline-none"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-5 bg-gray-50 rounded-[18px]">
                                            <div>
                                                <p className="text-[13px] font-black text-gray-900">Active Status</p>
                                                <p className="text-[11px] text-gray-400 font-medium">Toggle visibility on website</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={editingBroadcast.isactive}
                                                    onChange={e => setEditingBroadcast({ ...editingBroadcast, isactive: e.target.checked })}
                                                />
                                                <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[20px] after:w-[20px] after:transition-all peer-checked:bg-emerald-500" />
                                            </label>
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div className="p-6 md:p-7 border-t border-gray-50 bg-gray-50/30 flex items-center justify-between flex-shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="px-5 py-3 text-[13px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            Delete
                                        </button>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setEditingBroadcast(null)}
                                                className="px-6 py-3 text-[13px] font-bold text-gray-400 hover:text-gray-900 rounded-xl transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isSaving || !editingBroadcast.title}
                                                onClick={handleSave}
                                                className="px-8 py-3 bg-[#111827] text-white text-[13px] font-black rounded-xl hover:bg-black transition-all shadow-xl disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {isSaving ? "Saving..." : (editingBroadcast.title ? "Save Changes" : "Post Broadcast")}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Custom Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-[#111827]/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setShowDeleteConfirm(false)}
                    />
                    <div className="relative bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-red-100">
                        <div className="p-8 text-center space-y-4">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2 border border-red-100">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-[18px] font-black text-gray-900 tracking-tight">Delete Broadcast?</h3>
                                <p className="text-[13px] text-gray-500 font-medium px-4 mt-1">This announcement will be permanently removed from your website. This cannot be undone.</p>
                            </div>
                            <div className="pt-2 flex flex-col gap-3">
                                <button
                                    type="button"
                                    onClick={confirmDelete}
                                    className="w-full py-4 bg-red-500 hover:bg-red-600 text-white text-[14px] font-black rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-[0.98]"
                                >
                                    Yes, Delete Broadcast
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 text-[14px] font-black rounded-2xl transition-all active:scale-[0.98]"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
                {/* Selection Dialog */}
                {pickingForIndex !== null && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm shadow-2xl">
                        <div className="absolute inset-0" onClick={() => setPickingForIndex(null)} />
                        <div className="relative bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                                <h3 className="text-[18px] font-black text-gray-900 tracking-tight">Select Broadcast for Slot {pickingForIndex + 1}</h3>
                                <button onClick={() => setPickingForIndex(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
                                {broadcasts.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 font-bold">No broadcasts found in the source.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {broadcasts.map((rec: any) => (
                                            <button
                                                key={rec.key}
                                                onClick={() => handleSelectRecord(rec.key)}
                                                className={`w-full flex items-center gap-4 p-4 rounded-3xl border-2 text-left transition-all ${placements.some((p: ComponentPlacement) => p.contentkey === rec.key) ? "border-red-500 bg-red-50/10" : "border-gray-50 hover:border-red-200 bg-white"}`}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-[14px] font-black text-gray-900 truncate">{rec.title}</h4>
                                                    <p className="text-[12px] text-gray-400 line-clamp-1">{rec.message}</p>
                                                </div>
                                                {placements.some((p: ComponentPlacement) => p.contentkey === rec.key) && (
                                                    <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
        </BaseEditor>
    );
}
