"use client";

import { useState, useEffect, useMemo } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData } from "@/domains/dashboard/hooks/useComponentData";
import { uploadFile } from "@/lib/supabase/storage";
import type { TemplateComponent, TemplateScreen } from "@/domains/auth/types";

interface HeroEditorProps {
    component: TemplateComponent;
    screen: TemplateScreen;
    schoolKey: string;
    allScreens: TemplateScreen[];
}

export default function HeroEditor({ component, screen, schoolKey, allScreens }: HeroEditorProps) {
    const tableName = component.componentregistry?.tablename || "herocontent";
    const initialItems = (component as any).content || [];

    const {
        records: slides,
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

    const [editingSlide, setEditingSlide] = useState<any>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Simple mobile detection for layout replacement
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleAddNew = () => {
        setEditingSlide({
            key: crypto.randomUUID(),
            screenslug: screen.screenslug,
            mediatype: "image",
            mediaurl: "",
            headline: "New Hero Slide",
            subheadline: "Excellence in Education",
            primarybuttontext: "Get Started",
            primarybuttonurl: "",
            secondarybuttontext: "Learn More",
            secondarybuttonurl: "",
            displayorder: slides.length + 1,
            isactive: true,
            updatedat: new Date().toISOString()
        });
    };

    // --- MOBILE EDIT VIEW (Replacement) ---
    if (isMobile && editingSlide) {
        return (
            <div className="flex flex-col h-full bg-white absolute inset-0 z-[60] animate-in slide-in-from-right duration-300">
                {/* Mobile Header */}
                <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-100 flex-shrink-0 bg-white sticky top-0 z-10">
                    <button
                        onClick={() => setEditingSlide(null)}
                        className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-900 active:bg-gray-50 rounded-full transition-all"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="flex-1">
                        <h3 className="text-[14px] font-black text-gray-900 leading-none">Slide Configuration</h3>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">
                            {editingSlide.key === slides[slides.length - 1]?.key ? 'Creating New' : 'Editing'} Slide
                        </p>
                    </div>
                </div>

                {/* Mobile Form Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-8 bg-[#fcfcfc] pb-32">
                    {/* Media Preview & URL */}
                    <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm space-y-4">
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-50 border border-gray-100 italic flex items-center justify-center text-[10px] text-gray-400">
                            {editingSlide.mediaurl ? (
                                <img src={editingSlide.mediaurl} alt="" className="w-full h-full object-cover" />
                            ) : "No Media"}
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1.5 text-center">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Upload Media</label>
                                <div className="mt-2">
                                    <input
                                        type="file"
                                        id="mobile-media-upload"
                                        className="hidden"
                                        accept="image/*,video/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            setIsUploading(true);
                                            setUploadError(null);
                                            try {
                                                const url = await uploadFile(file, schoolKey, "banners");
                                                setEditingSlide({ ...editingSlide, mediaurl: url, mediatype: file.type.startsWith('video') ? 'video' : 'image' });
                                            } catch (err: any) {
                                                setUploadError(err.message);
                                            } finally {
                                                setIsUploading(false);
                                            }
                                        }}
                                    />
                                    <label
                                        htmlFor="mobile-media-upload"
                                        className={`w-full py-4 px-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${isUploading ? 'bg-gray-50 border-gray-200' : 'bg-red-50/20 border-red-100 hover:border-red-200'}`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                            {isUploading ? (
                                                <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            )}
                                        </div>
                                        <span className="text-[12px] font-black text-red-500 uppercase tracking-wider">{isUploading ? 'Uploading...' : 'Choose File'}</span>
                                    </label>
                                    {uploadError && <p className="mt-2 text-[10px] text-red-500 font-bold">{uploadError}</p>}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Or Paste URL</label>
                                <input
                                    type="text"
                                    value={editingSlide.mediaurl}
                                    onChange={e => setEditingSlide({ ...editingSlide, mediaurl: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-red-100 transition-all text-[13px] font-bold outline-none"
                                />
                            </div>
                            <div className="flex gap-2">
                                {(['image', 'video'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setEditingSlide({ ...editingSlide, mediatype: type })}
                                        className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${editingSlide.mediatype === type ? 'bg-[#111827] text-white border-transparent' : 'bg-white text-gray-400 border-gray-100'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Text Content */}
                    <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm space-y-4">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Headline</label>
                                <input
                                    type="text"
                                    value={editingSlide.headline}
                                    onChange={e => setEditingSlide({ ...editingSlide, headline: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-red-100 transition-all text-[14px] font-black outline-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Sub Headline</label>
                                <textarea
                                    rows={2}
                                    value={editingSlide.subheadline}
                                    onChange={e => setEditingSlide({ ...editingSlide, subheadline: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-red-100 transition-all text-[13px] font-bold outline-none no-scrollbar"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#111827]" />
                                <p className="text-[11px] font-black text-gray-900 uppercase tracking-wider">Primary Action</p>
                            </div>
                            <input
                                type="text"
                                placeholder="Button Text"
                                value={editingSlide.primarybuttontext || ""}
                                onChange={e => setEditingSlide({ ...editingSlide, primarybuttontext: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-[13px] font-bold outline-none"
                            />
                            <div className="relative">
                                <select
                                    value={editingSlide.primarybuttonurl || ""}
                                    onChange={e => setEditingSlide({ ...editingSlide, primarybuttonurl: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-[12px] font-medium text-gray-700 outline-none appearance-none pr-10 cursor-pointer"
                                >
                                    <option value="">Select screen...</option>
                                    {allScreens.map(scr => (
                                        <option key={scr.key} value={scr.screenslug}>{scr.screenname ?? scr.screenslug}</option>
                                    ))}
                                </select>
                                <svg className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>

                            <div className="flex items-center gap-2 mb-2 pt-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Secondary Action</p>
                            </div>
                            <input
                                type="text"
                                placeholder="Button Text"
                                value={editingSlide.secondarybuttontext || ""}
                                onChange={e => setEditingSlide({ ...editingSlide, secondarybuttontext: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-[13px] font-bold outline-none"
                            />
                            <div className="relative">
                                <select
                                    value={editingSlide.secondarybuttonurl || ""}
                                    onChange={e => setEditingSlide({ ...editingSlide, secondarybuttonurl: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-[12px] font-medium text-gray-700 outline-none appearance-none pr-10 cursor-pointer"
                                >
                                    <option value="">Select screen...</option>
                                    {allScreens.map(scr => (
                                        <option key={scr.key} value={scr.screenslug}>{scr.screenname ?? scr.screenslug}</option>
                                    ))}
                                </select>
                                <svg className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>

                    {/* Active Toggle & Order */}
                    <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <span className="text-[13px] font-black text-gray-900">Active Slide</span>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={editingSlide.isactive}
                                    onChange={e => setEditingSlide({ ...editingSlide, isactive: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[20px] after:w-[20px] after:transition-all peer-checked:bg-emerald-500"></div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                            <span className="text-[13px] font-black text-gray-900">Display Order</span>
                            <input
                                type="number"
                                value={editingSlide.displayorder}
                                onChange={e => setEditingSlide({ ...editingSlide, displayorder: parseInt(e.target.value) || 0 })}
                                className="w-16 px-2 py-2 bg-gray-50 text-center border-2 border-transparent rounded-lg transition-all text-[14px] font-black outline-none"
                            />
                        </div>
                    </div>

                    {/* Mobile Delete */}
                    <button
                        onClick={() => {
                            if (confirm("Delete this slide?")) {
                                removeRecord(editingSlide.key);
                                setEditingSlide(null);
                            }
                        }}
                        className="w-full py-4 text-[13px] font-black text-red-500 bg-red-50 rounded-[20px] transition-all active:scale-[0.98]"
                    >
                        Delete Slide
                    </button>
                </div>

                {/* Mobile Footer Actions */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-gray-100 flex items-center gap-3 z-50 pb-[env(safe-area-inset-bottom,16px)]">
                    <button
                        onClick={() => setEditingSlide(null)}
                        className="flex-1 py-4 text-[14px] font-black text-gray-400 hover:text-gray-900 rounded-2xl transition-all active:scale-95"
                    >
                        Discard
                    </button>
                    <button
                        disabled={isSaving}
                        onClick={() => { saveRecord(editingSlide); setEditingSlide(null); }}
                        className="flex-[2] py-4 bg-[#10B981] text-white text-[14px] font-black rounded-2xl hover:bg-[#059669] transition-all active:scale-95 flex items-center justify-center h-[56px] shadow-lg shadow-emerald-500/20"
                    >
                        {isSaving ? "Syncing..." : "Publish Changes"}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <BaseEditor
            title="Hero Section"
            description="Manage the main banner slides of your homepage."
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            }
            error={error}
        >
            <div className="space-y-8">
                {/* Responsive Slides Grid */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                    {slides.map((slide: any) => (
                        <div
                            key={slide.key}
                            className="group p-3 lg:p-5 bg-white border border-gray-100 rounded-[20px] lg:rounded-[24px] hover:border-red-100 hover:shadow-2xl hover:shadow-red-500/10 transition-all cursor-pointer relative flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-start gap-3 sm:gap-4 lg:gap-0"
                            onClick={() => setEditingSlide(slide)}
                        >
                            {/* Card Media Section */}
                            <div className="relative w-full aspect-[16/10] sm:w-16 sm:h-16 sm:aspect-square lg:w-full lg:aspect-[16/9] lg:mb-4 rounded-xl lg:rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                                {slide.mediaurl ? (
                                    <img src={slide.mediaurl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="flex items-center justify-center h-full opacity-20">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}
                                {/* Status Toggle (Visual) */}
                                <div className={`absolute top-2 right-2 sm:top-1 sm:right-1 w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full border-2 border-white shadow-sm ${slide.isactive ? "bg-emerald-500" : "bg-gray-300"}`} />

                                {/* Status Tags Desktop */}
                                <div className="hidden lg:flex absolute top-2 left-2 items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm ${slide.isactive ? "bg-emerald-500 text-white" : "bg-gray-500 text-white"}`}>
                                        {slide.isactive ? "Active" : "Draft"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 min-w-0 w-full">
                                <div className="flex items-center justify-between lg:block mb-1 sm:mb-2 lg:mb-0">
                                    <p className="text-[9px] font-black text-[#F54927] uppercase tracking-tighter lg:mb-0.5">Order {slide.displayorder}</p>
                                    <span className={`lg:hidden px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${slide.isactive ? "bg-emerald-50/50 text-emerald-600 border-emerald-100" : "bg-gray-50 text-gray-400 border-gray-100"}`}>
                                        {slide.isactive ? "Active" : "Draft"}
                                    </span>
                                </div>
                                <h4 className="text-[13px] sm:text-[12px] lg:text-[15px] font-black text-gray-900 group-hover:text-[#F54927] transition-colors leading-tight mb-0.5 sm:mb-1 truncate">{slide.headline}</h4>
                                <p className="text-[11px] sm:text-[10px] lg:text-[11px] text-gray-500 line-clamp-1 font-medium leading-relaxed">{slide.subheadline}</p>
                            </div>

                            {/* Desktop Meta & Hover Actions */}
                            <div className="hidden lg:flex w-full mt-4 pt-4 border-t border-gray-50 items-center justify-between">
                                <div className="flex gap-1.5">
                                    {slide.primarybuttontext && <span className="w-2 h-2 rounded-full bg-[#111827]" />}
                                    {slide.secondarybuttontext && <span className="w-2 h-2 rounded-full bg-gray-300" />}
                                </div>
                                <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">Order {slide.displayorder}</span>
                            </div>

                            <div className="absolute top-3 right-3 lg:top-4 lg:right-4 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 z-10">
                                <div className="hidden lg:flex bg-white/95 p-1 rounded-xl shadow-lg border border-gray-100">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const index = slides.indexOf(slide);
                                            if (index > 0) {
                                                const newOrder = [...slides];
                                                [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                                                reorderRecords(newOrder);
                                            }
                                        }}
                                        disabled={slides.indexOf(slide) === 0}
                                        className="p-1.5 text-gray-400 hover:text-[#F54927] disabled:opacity-20 transition-colors"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const index = slides.indexOf(slide);
                                            if (index < slides.length - 1) {
                                                const newOrder = [...slides];
                                                [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
                                                reorderRecords(newOrder);
                                            }
                                        }}
                                        disabled={slides.indexOf(slide) === slides.length - 1}
                                        className="p-1.5 text-gray-400 hover:text-[#F54927] disabled:opacity-20 transition-colors"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setEditingSlide(slide); }}
                                    className="p-2 lg:p-2.5 bg-white rounded-xl text-gray-400 hover:text-[#F54927] shadow-lg border border-gray-100 transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={handleAddNew}
                        className="p-5 lg:p-10 border-2 border-dashed border-gray-100 rounded-[20px] lg:rounded-[28px] flex flex-col items-center justify-center gap-2 lg:gap-4 text-gray-400 hover:border-red-200 hover:text-[#F54927] hover:bg-red-50/20 transition-all group min-h-[100px] lg:min-h-[220px]"
                    >
                        <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                            <svg className="w-4 h-4 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <span className="text-[11px] lg:text-[14px] font-black tracking-tight">Add New Slide</span>
                    </button>
                </div>

                {/* --- DESKTOP MODAL --- */}
                {editingSlide && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 md:p-12 bg-[#111827]/30 backdrop-blur-sm animate-in fade-in duration-500">
                        <div className="bg-white w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col md:flex-row max-h-[90vh]">

                            {/* Left Side: Preview */}
                            <div className="hidden md:flex w-[380px] bg-gray-50 border-r border-gray-100 flex-col overflow-hidden">
                                <div className="p-8 border-b border-gray-100">
                                    <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-4">Preview</h3>
                                    <div className="relative aspect-[4/5] rounded-[24px] overflow-hidden shadow-2xl border border-white">
                                        {editingSlide.mediaurl ? (
                                            <img src={editingSlide.mediaurl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full bg-gray-200 text-gray-400">No Media</div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                                            <h4 className="text-white text-[18px] font-black leading-tight mb-1">{editingSlide.headline || "Slide Headline"}</h4>
                                            <p className="text-white/80 text-[12px] font-medium mb-4">{editingSlide.subheadline || "Description text"}</p>
                                            <div className="flex gap-2">
                                                {editingSlide.primarybuttontext && (
                                                    <div className="px-4 py-1.5 bg-white text-black text-[10px] font-black rounded-lg uppercase tracking-wider">{editingSlide.primarybuttontext}</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 flex-1 flex flex-col justify-end">
                                    <p className="text-[10px] text-gray-400 font-bold leading-relaxed">Headlines and subheadlines should be concise to ensure readability across all devices.</p>
                                </div>
                            </div>

                            {/* Right Side: Form */}
                            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col bg-white">
                                <div className="p-8 border-b border-gray-50 flex items-center justify-between sticky top-0 bg-white z-10">
                                    <div>
                                        <h3 className="text-[18px] font-black text-gray-900 tracking-tight">Slide Configuration</h3>
                                        <p className="text-[11px] text-gray-400 font-bold">Manage banner content and interactions</p>
                                    </div>
                                    <button onClick={() => setEditingSlide(null)} className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-[#F54927] rounded-full transition-all">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="p-8 space-y-10">
                                    {/* General Content */}
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Headline</label>
                                                <input
                                                    type="text"
                                                    value={editingSlide.headline}
                                                    onChange={e => setEditingSlide({ ...editingSlide, headline: e.target.value })}
                                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[18px] focus:bg-white focus:border-[#F54927]/20 transition-all text-[15px] font-bold outline-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Sub Headline</label>
                                                <input
                                                    type="text"
                                                    value={editingSlide.subheadline}
                                                    onChange={e => setEditingSlide({ ...editingSlide, subheadline: e.target.value })}
                                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[18px] focus:bg-white focus:border-[#F54927]/20 transition-all text-[15px] font-bold outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Media Section */}
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Upload Media</label>
                                                    <div className="relative">
                                                        <input
                                                            type="file"
                                                            id="desktop-media-upload"
                                                            className="hidden"
                                                            accept="image/*,video/*"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;
                                                                setIsUploading(true);
                                                                setUploadError(null);
                                                                try {
                                                                    const url = await uploadFile(file, schoolKey, "banners");
                                                                    setEditingSlide({ ...editingSlide, mediaurl: url, mediatype: file.type.startsWith('video') ? 'video' : 'image' });
                                                                } catch (err: any) {
                                                                    setUploadError(err.message);
                                                                } finally {
                                                                    setIsUploading(false);
                                                                }
                                                            }}
                                                        />
                                                        <label
                                                            htmlFor="desktop-media-upload"
                                                            className={`w-full py-4 px-6 border-2 border-dashed rounded-2xl flex items-center justify-center gap-4 transition-all cursor-pointer ${isUploading ? 'bg-gray-50 border-gray-200' : 'bg-red-50/20 border-red-100 hover:border-red-200'}`}
                                                        >
                                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                                {isUploading ? (
                                                                    <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                                ) : (
                                                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                                )}
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-[14px] font-black text-red-500 uppercase tracking-tightleading-none">{isUploading ? 'Uploading...' : 'Choose Media File'}</p>
                                                                <p className="text-[10px] text-gray-400 font-bold mt-0.5">Images or Videos</p>
                                                            </div>
                                                        </label>
                                                    </div>
                                                    {uploadError && <p className="text-[10px] text-red-500 font-bold pl-2">{uploadError}</p>}
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Media Type</label>
                                                        <div className="flex p-1.5 bg-gray-50 rounded-[18px] gap-1 h-[58px]">
                                                            {(['image', 'video'] as const).map(type => (
                                                                <button
                                                                    key={type}
                                                                    type="button"
                                                                    onClick={() => setEditingSlide({ ...editingSlide, mediatype: type })}
                                                                    className={`flex-1 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${editingSlide.mediatype === type ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                                >
                                                                    {type}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Or Paste Direct URL</label>
                                                <input
                                                    type="text"
                                                    value={editingSlide.mediaurl}
                                                    onChange={e => setEditingSlide({ ...editingSlide, mediaurl: e.target.value })}
                                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[18px] focus:bg-white focus:border-red-100 transition-all text-[14px] font-bold outline-none"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>

                                    {/* Interaction */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="bg-gray-50 p-5 rounded-[24px] space-y-4">
                                            <p className="text-[11px] font-black text-gray-900 uppercase tracking-wider mb-2">Primary CTA</p>
                                            <input
                                                type="text"
                                                placeholder="Text"
                                                value={editingSlide.primarybuttontext || ""}
                                                onChange={e => setEditingSlide({ ...editingSlide, primarybuttontext: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-[13px] font-bold outline-none"
                                            />
                                            <div className="relative">
                                                <select
                                                    value={editingSlide.primarybuttonurl || ""}
                                                    onChange={e => setEditingSlide({ ...editingSlide, primarybuttonurl: e.target.value })}
                                                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-[12px] font-medium text-gray-700 outline-none appearance-none pr-10 cursor-pointer focus:border-red-100 focus:ring-1 focus:ring-red-100 transition-all"
                                                >
                                                    <option value="">Select action screen...</option>
                                                    {allScreens.map(scr => (
                                                        <option key={scr.key} value={scr.screenslug}>{scr.screenname ?? scr.screenslug}</option>
                                                    ))}
                                                </select>
                                                <svg className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 p-5 rounded-[24px] space-y-4">
                                            <p className="text-[11px] font-black text-gray-900 uppercase tracking-wider mb-2">Secondary CTA</p>
                                            <input
                                                type="text"
                                                placeholder="Text"
                                                value={editingSlide.secondarybuttontext || ""}
                                                onChange={e => setEditingSlide({ ...editingSlide, secondarybuttontext: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-[13px] font-bold outline-none"
                                            />
                                            <div className="relative">
                                                <select
                                                    value={editingSlide.secondarybuttonurl || ""}
                                                    onChange={e => setEditingSlide({ ...editingSlide, secondarybuttonurl: e.target.value })}
                                                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-[12px] font-medium text-gray-700 outline-none appearance-none pr-10 cursor-pointer focus:border-red-100 focus:ring-1 focus:ring-red-100 transition-all"
                                                >
                                                    <option value="">Select action screen...</option>
                                                    {allScreens.map(scr => (
                                                        <option key={scr.key} value={scr.screenslug}>{scr.screenname ?? scr.screenslug}</option>
                                                    ))}
                                                </select>
                                                <svg className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Active Toggle */}
                                    <div className="pt-6 border-t border-gray-100 flex items-center justify-between cursor-pointer" onClick={() => setEditingSlide({ ...editingSlide, isactive: !editingSlide.isactive })}>
                                        <div className="flex flex-col">
                                            <span className="text-[14px] font-black text-gray-900 tracking-tight">Active Status</span>
                                            <span className="text-[11px] text-gray-400 font-bold">Visible on public homepage</span>
                                        </div>
                                        <div className="relative inline-flex items-center">
                                            <input type="checkbox" className="sr-only peer" checked={editingSlide.isactive} readOnly />
                                            <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[19px] after:w-[19px] after:transition-all peer-checked:bg-emerald-500"></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 border-t border-gray-50 bg-white sticky bottom-0 z-10 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.03)] focus-within:z-50">
                                    <button
                                        onClick={() => { if (confirm('Delete slide?')) { removeRecord(editingSlide.key); setEditingSlide(null); } }}
                                        className="px-6 py-3 text-[13px] font-black text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                    >
                                        Delete Slide
                                    </button>
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setEditingSlide(null)} className="px-6 py-3 text-[13px] font-black text-gray-400 hover:text-gray-900 rounded-2xl transition-all">Cancel</button>
                                        <button
                                            disabled={isSaving}
                                            onClick={() => { saveRecord(editingSlide); setEditingSlide(null); }}
                                            className="px-8 py-3 bg-[#10B981] text-white text-[13px] font-black rounded-2xl hover:bg-[#059669] transition-all active:scale-[0.97] shadow-lg shadow-emerald-500/20"
                                        >
                                            {isSaving ? "Saving..." : "Publish Changes"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </BaseEditor>
    );
}
