"use client";
import { generateId } from '@/lib/generateId';

import { useState, useEffect, useMemo, useRef } from "react";
import { useLoading } from "@/providers/LoadingProvider";
import BaseEditor from "./BaseEditor";
import { useComponentData, getInitialValuesFromFilters } from "@/domains/dashboard/hooks/useComponentData";
import { uploadFile } from "@/lib/supabase/storage";
import { createClient } from "@/lib/supabase/client";
import { upsertComponentData, deleteComponentData } from "@/domains/dashboard/actions";
import type { TemplateComponent, TemplateScreen, ComponentPlacement } from "@/domains/auth/types";
import { Check, X } from "lucide-react";
import MediaUpload from "@/components/ui/MediaUpload";

interface HeroEditorProps {
    component: TemplateComponent;
    screen: TemplateScreen;
    schoolKey: string;
    allScreens: TemplateScreen[];
    allowedMediaType?: 'image' | 'video' | 'both';
    onRefreshData?: () => Promise<void>;
    activeComponentData?: any;
    adminData?: any;
}

export default function HeroEditor({ component, screen, schoolKey, allScreens, activeComponentData, allowedMediaType, onRefreshData, adminData }: HeroEditorProps) {
    const { setLoading } = useLoading();
    const supabase = createClient();
    const tableName = (component.componentregistry as any)?.tablename;
    const initialItems = (component as any).content || [];
    const customDomain = adminData?.schools?.customdomain || "";

    const config = component.config as any;
    const isEditable = component.iseditable;

    // Determine the effective contenttype for this component:
    // Priority: config.filters.contenttype > config.variant > allowedMediaType > 'image'
    const effectiveContentType: string = (() => {
        if (config?.filters?.contenttype) return config.filters.contenttype;
        if (config?.variant === 'video') return 'video';
        if (config?.variant === 'image') return 'image';
        if (allowedMediaType === 'video') return 'video';
        return 'image';
    })();

    const isVideoVariant = effectiveContentType === 'video';

    const filters = useMemo(() => {
        return {
            ...(config?.filters || {}),
            contenttype: effectiveContentType,  // Always enforce contenttype filter
            screenslug: screen.screenslug
        };
    }, [config?.filters, screen.screenslug, effectiveContentType]);

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
        filters,
        initialRecords: initialItems
    });
    
    // Normalize slides — DB column is contenttype; fall back gracefully for any legacy records
    const normalizedSlides = useMemo(() => {
        return slides.map((s: any) => ({
            ...s,
            contenttype: s.contenttype || s.mediatype || 'image'
        }));
    }, [slides]);

    const [editingSlide, setEditingSlide] = useState<any>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isUpdatingSetting, setIsUpdatingSetting] = useState(false);
    const [updatingType, setUpdatingType] = useState<string | null>(null);

    // Deferred upload: holds the raw File and a local blob URL for preview before publish
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);

    // The URL to show in preview: local blob if a new file is staged, otherwise the stored URL
    const previewMediaUrl = pendingPreviewUrl ?? editingSlide?.mediaurl ?? null;
    
    // Video Player State
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleMetadataLoaded = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleSeek = (time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleFileSelect = (file: File) => {
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        const url = URL.createObjectURL(file);
        setPendingFile(file);
        setPendingPreviewUrl(url);
    };

    // Simple mobile detection for layout replacement
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Use config itemCount, or 1 for video, or default to 1 if not specified
    const itemCount = isVideoVariant ? 1 : (config?.itemcount ? parseInt(config.itemcount) : 1);
    const isFixedMode = true; // Always fixed mode now

    // 2. State for Manual Selection
    const [pickingForIndex, setPickingForIndex] = useState<number | null>(null);

    const placements = useMemo(() => {
        return (component.contentplacements || [])
            .filter((p: ComponentPlacement) => p.isactive !== false)
            .sort((a: ComponentPlacement, b: ComponentPlacement) => (a.displayorder || 0) - (b.displayorder || 0));
    }, [component.contentplacements]);

    // Map slides to slots
    const slots = useMemo(() => {
        const result = [];
        const count = itemCount || 0;

        if (config?.selectionmethod === 'manual') {
            for (let i = 0; i < count; i++) {
                const placement = placements.find((p: ComponentPlacement) => p.displayorder === i + 1);
                const record = placement ? normalizedSlides.find((s: any) => s.key === placement.contentkey) : null;
                result.push(record || { isSkeleton: true, displayorder: i + 1, isSlot: true });
            }
        } else {
            // Auto mode or Fixed Auto
            for (let i = 0; i < count; i++) {
                const existing = normalizedSlides.find((s: any) => s.displayorder === i + 1);
                result.push(existing || { isSkeleton: true, displayorder: i + 1 });
            }
        }
        return result;
    }, [normalizedSlides, itemCount, config?.selectionmethod, placements]);

    const handleAddNew = (displayOrder?: number) => {
        // Reset any pending file state before opening a new slide
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        setPendingFile(null);
        setPendingPreviewUrl(null);
        setUploadError(null);
        setEditingSlide({
            key: generateId(),
            schoolkey: schoolKey,
            ...getInitialValuesFromFilters(filters),
            contenttype: effectiveContentType,
            mediaurl: "",
            headline: "",
            subheadline: "",
            primarybuttontext: "",
            primarybuttonurl: "home",
            secondarybuttontext: "",
            secondarybuttonurl: "home",
            displayorder: displayOrder ?? slides.length + 1,
            isactive: true,
            updatedat: new Date().toISOString()
        });
    };

    // handleCancel: clear pending file state and close modal
    const handleCancel = () => {
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        setPendingFile(null);
        setPendingPreviewUrl(null);
        setUploadError(null);
        setEditingSlide(null);
    };

    const handleSelectRecord = async (recordKey: string) => {
        if (pickingForIndex === null) return;
        setIsUpdatingSetting(true);
        try {
            const existingPlacement = placements.find((p: ComponentPlacement) => p.displayorder === pickingForIndex + 1);
            
            await upsertComponentData('componentplacement', {
                key: existingPlacement?.key || undefined,
                schoolkey: schoolKey,
                templatecomponentkey: component.key,
                componentcode: component.componentcode || 'hero',
                contenttable: tableName,
                contentkey: recordKey,
                displayorder: pickingForIndex + 1,
                isactive: true
            }, schoolKey);
            
            setPickingForIndex(null);
        } catch (err) {
            console.error("Failed to update placement:", err);
        } finally {
            setIsUpdatingSetting(false);
        }
    };

    const handleClearSlot = async (index: number) => {
        const placement = placements.find((p: ComponentPlacement) => p.displayorder === index + 1);
        if (!placement) return;

        setIsUpdatingSetting(true);
        try {
            await deleteComponentData('componentplacement', placement.key, schoolKey);
        } catch (err) {
            console.error("Failed to delete placement:", err);
        } finally {
            setIsUpdatingSetting(false);
        }
    };

    // handlePublish: upload pending file if any, then save record to DB
    const handlePublish = async () => {
        if (!editingSlide.mediaurl && !pendingFile && !editingSlide._usePlaceholder) return;
        let finalSlide = { ...editingSlide };
        if (pendingFile) {
            setIsUploading(true);
            setUploadError(null);
            try {
                const url = await uploadFile(pendingFile, schoolKey, "banners");
                finalSlide = { ...finalSlide, mediaurl: url, _usePlaceholder: false };
            } catch (err: any) {
                setUploadError("Upload failed: " + err.message);
                setIsUploading(false);
                return; // Keep modal open so user can see the error
            } finally {
                setIsUploading(false);
            }
        }

        const { _usePlaceholder, ...dataToSave } = finalSlide;

        // Ensure URLs are complete if they only contain slugs
        if (dataToSave.primarybuttonurl && !dataToSave.primarybuttonurl.includes('.') && customDomain) {
            let slug = dataToSave.primarybuttonurl;
            if (slug === 'home') {
                slug = '/';
            } else {
                slug = slug.startsWith('/') ? slug : `/${slug}`;
            }
            dataToSave.primarybuttonurl = `${customDomain}${slug}`;
        }
        if (dataToSave.secondarybuttonurl && !dataToSave.secondarybuttonurl.includes('.') && customDomain) {
            let slug = dataToSave.secondarybuttonurl;
            if (slug === 'home') {
                slug = '/';
            } else {
                slug = slug.startsWith('/') ? slug : `/${slug}`;
            }
            dataToSave.secondarybuttonurl = `${customDomain}${slug}`;
        }

        saveRecord(dataToSave);
        // Cleanup blob URL
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        setPendingFile(null);
        setPendingPreviewUrl(null);
        setUploadError(null);
        setEditingSlide(null);
    };

    async function updateSchoolMediaSetting(type: 'image' | 'video' | 'both') {
        if (isUpdatingSetting) return;

        setIsUpdatingSetting(true);
        setUpdatingType(type);
        setLoading(true);

        try {
            const { data: schoolData, error: fetchError } = await supabase
                .from('schools')
                .select('componentvariants')
                .eq('key', schoolKey)
                .single();

            if (fetchError) throw fetchError;

            const currentVariants = (schoolData?.componentvariants as any) || {};
            const screenSlug = screen.screenslug || 'home';
            const updatedVariants = { 
                ...currentVariants, 
                [screenSlug]: {
                    ...(currentVariants[screenSlug] || {}),
                    hero: type 
                }
            };

            const { error: updateError } = await supabase
                .from('schools')
                .update({ componentvariants: updatedVariants })
                .eq('key', schoolKey);

            if (updateError) throw updateError;
            
            // If refresh callback exists, use it instead of reload for smoother UX
            if (onRefreshData) {
                await onRefreshData();
            } else {
                window.location.reload(); 
            }
        } catch (err: any) {
            console.error("Failed to update school setting:", err);
            alert("Failed to update section setting: " + err.message);
        } finally {
            setIsUpdatingSetting(false);
            setUpdatingType(null);
            setLoading(false);
        }
    }

    const showMediaTypeToggle = activeComponentData?.isGroup && (activeComponentData?.allComponents || activeComponentData?.components)?.length > 1;

    const MediaTypeToggle = () => (
        <div className="flex p-1 bg-gray-100 rounded-xl gap-1">
            {(['image', 'video'] as const).map((type) => {
                const isActive = allowedMediaType === type;
                return (
                    <button
                        key={type}
                        onClick={() => updateSchoolMediaSetting(type)}
                        disabled={isUpdatingSetting}
                        className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${isActive 
                            ? "bg-white text-gray-900 shadow-sm" 
                            : "text-gray-400 hover:text-gray-600"} ${isUpdatingSetting ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        {isUpdatingSetting && updatingType === type ? (
                            <div className="w-3 h-3 border-2 border-[#F54927] border-t-transparent rounded-full animate-spin mx-auto" />
                        ) : type}
                    </button>
                );
            })}
        </div>
    );

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
                            {previewMediaUrl ? (
                                editingSlide.contenttype === 'video' ? (
                                    <video src={previewMediaUrl} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                                ) : (
                                    <img src={previewMediaUrl} alt="" className="w-full h-full object-cover" />
                                )
                            ) : "No Media"}
                            {pendingFile && (
                                <div className="absolute bottom-2 left-2 right-2 bg-amber-500/90 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg text-center">
                                    Pending — will upload on publish
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1.5 text-center">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Upload Media</label>
                                <div className="mt-2">
                                    <input
                                        type="file"
                                        id="mobile-media-upload"
                                        className="hidden"
                                        accept={effectiveContentType === 'video' ? 'video/*' : 'image/*'}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            // Validate against effective type
                                            if (effectiveContentType === 'image' && !file.type.startsWith('image/')) {
                                                setUploadError("Only images are allowed for this component variant.");
                                                return;
                                            }
                                            if (effectiveContentType === 'video' && !file.type.startsWith('video/')) {
                                                setUploadError("Only videos are allowed for this component variant.");
                                                return;
                                            }

                                            // Revoke previous blob if any
                                            if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);

                                            // Stage file locally — no upload yet
                                            const blobUrl = URL.createObjectURL(file);
                                            const contenttype: any = effectiveContentType;
                                            setPendingFile(file);
                                            setPendingPreviewUrl(blobUrl);
                                            setUploadError(null);
                                            setEditingSlide({ ...editingSlide, contenttype });
                                        }}
                                    />
                                    <label
                                        htmlFor="mobile-media-upload"
                                        className={`w-full py-4 px-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${pendingFile ? 'bg-amber-50 border-amber-200' : 'bg-red-50/20 border-red-100 hover:border-red-200'}`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        </div>
                                        <span className="text-[12px] font-black text-red-500 uppercase tracking-wider">
                                            {pendingFile ? `📎 ${pendingFile.name.slice(0, 20)}...` : 'Choose File'}
                                        </span>
                                        {pendingFile && <span className="text-[9px] font-bold text-amber-600">Will upload on publish</span>}
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
                                    value={(() => {
                                        const url = editingSlide.primarybuttonurl || "";
                                        if (url.includes(customDomain) && customDomain) {
                                            const slug = url.replace(customDomain, '').replace(/^\//, '') || "";
                                            return slug === "" ? "home" : slug;
                                        }
                                        return url;
                                    })()}
                                    onChange={e => setEditingSlide({ ...editingSlide, primarybuttonurl: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-[12px] font-medium text-gray-700 outline-none appearance-none pr-10 cursor-pointer"
                                >
                                    <option value="">Select screen...</option>
                                    {allScreens.map(scr => (
                                        <option key={scr.key} value={scr.screenslug ?? ''}>{scr.screenname ?? scr.screenslug}</option>
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
                                    value={(() => {
                                        const url = editingSlide.secondarybuttonurl || "";
                                        if (url.includes(customDomain) && customDomain) {
                                            const slug = url.replace(customDomain, '').replace(/^\//, '') || "";
                                            return slug === "" ? "home" : slug;
                                        }
                                        return url;
                                    })()}
                                    onChange={e => setEditingSlide({ ...editingSlide, secondarybuttonurl: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-[12px] font-medium text-gray-700 outline-none appearance-none pr-10 cursor-pointer"
                                >
                                    <option value="">Select screen...</option>
                                    {allScreens.map(scr => (
                                        <option key={scr.key} value={scr.screenslug ?? ''}>{scr.screenname ?? scr.screenslug}</option>
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
                        {itemCount > 1 && (
                            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                <span className="text-[13px] font-black text-gray-900">Display Order</span>
                                <input
                                    type="number"
                                    value={editingSlide.displayorder}
                                    onChange={e => setEditingSlide({ ...editingSlide, displayorder: parseInt(e.target.value) || 0 })}
                                    className="w-16 px-2 py-2 bg-gray-50 text-center border-2 border-transparent rounded-lg transition-all text-[14px] font-black outline-none"
                                />
                            </div>
                        )}
                    </div>

                    {/* Mobile Delete */}
                    {!isFixedMode && slides.some(s => s.key === editingSlide.key) && (
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
                    )}
                </div>

                {/* Mobile Footer Actions */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-gray-100 flex items-center gap-3 z-50 pb-[env(safe-area-inset-bottom,16px)]">
                    <button
                        onClick={handleCancel}
                        className="flex-1 py-4 text-[14px] font-black text-gray-400 hover:text-gray-900 rounded-2xl transition-all active:scale-95"
                    >
                        Discard
                    </button>
                    <button
                        disabled={isUploading || isSaving}
                        onClick={handlePublish}
                        className="flex-[2] py-4 bg-[#10B981] text-white text-[14px] font-black rounded-2xl hover:bg-[#059669] transition-all active:scale-95 flex items-center justify-center h-[56px] shadow-lg shadow-emerald-500/20 disabled:opacity-70"
                    >
                        {isUploading ? "Uploading..." : isSaving ? "Saving..." : "Publish Changes"}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <BaseEditor
            title={`${screen.screenname ?? screen.screenslug} Hero Section`}
            description={`Manage the banner slides for the ${screen.screenname?.toLowerCase() ?? screen.screenslug} section.`}
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            }
            error={error}
            headerActions={showMediaTypeToggle ? <MediaTypeToggle /> : null}
            component={component}
        >
            <div className="space-y-8">
                {/* Responsive Slides Grid */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                    {slots.map((slide: any, index: number) => {
                        const isSkeleton = slide.isSkeleton;
                        
                        if (isSkeleton) {
                            return (
                                <div
                                    key={`skeleton-${slide.displayorder}`}
                                    onClick={() => isEditable ? handleAddNew(slide.displayorder) : (config?.selectionmethod === 'manual' ? setPickingForIndex(index) : undefined)}
                                    className="border-2 border-dashed border-gray-100 rounded-[20px] flex flex-col items-center justify-center gap-3 text-gray-300 hover:border-red-100 hover:bg-red-50/10 transition-all group cursor-pointer aspect-[4/3]"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-red-50 transition-colors">
                                        <svg className="w-5 h-5 text-gray-300 group-hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 group-hover:text-red-500">Slot {slide.displayorder}</p>
                                        <p className="text-[9px] font-bold text-gray-300 italic">{isEditable ? "No Content Assigned" : "Select Slide to Display"}</p>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={slide.key}
                                className="group bg-white border border-gray-100 rounded-[20px] hover:border-red-100 hover:shadow-2xl hover:shadow-red-500/10 transition-all cursor-pointer relative flex flex-col overflow-hidden"
                                onClick={() => { 
                                    if (isEditable) {
                                        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl); 
                                        setPendingFile(null); 
                                        setPendingPreviewUrl(null); 
                                        setUploadError(null); 
                                        setEditingSlide(slide); 
                                    } else if (config?.selectionmethod === 'manual') {
                                        setPickingForIndex(index);
                                    }
                                }}
                            >
                                {/* Card Media Section — full width, 4:3 ratio, clear preview */}
                                <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-50 flex-shrink-0">
                                    {slide.mediaurl ? (
                                        slide.contenttype === 'video' ? (
                                            <div className="relative w-full h-full">
                                                <video src={slide.mediaurl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" autoPlay loop muted playsInline />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                    <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                                        <svg className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M8 5v14l11-7z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <img src={slide.mediaurl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        )
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-300">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-[10px] font-bold uppercase tracking-wider">No Media</span>
                                        </div>
                                    )}

                                    {/* Status badge — always shown top-left */}
                                    <div className="absolute top-2.5 left-2.5">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm ${
                                            slide.isactive ? "bg-emerald-500 text-white" : "bg-gray-500 text-white"
                                        }`}>
                                            {slide.isactive ? "Active" : "Draft"}
                                        </span>
                                    </div>
                                </div>

                                {/* Text content */}
                                <div className="flex-1 min-w-0 w-full p-4">
                                    <p className="text-[9px] font-black text-[#F54927] uppercase tracking-widest mb-1">Order {slide.displayorder}</p>
                                    <h4 className="text-[14px] font-black text-gray-900 group-hover:text-[#F54927] transition-colors leading-snug mb-1 line-clamp-2">{slide.headline}</h4>
                                    <p className="text-[11px] text-gray-400 line-clamp-1 font-medium">{slide.subheadline}</p>
                                </div>



                                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 z-10">
                                    {isEditable ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditingSlide(slide); }}
                                            className="p-3 bg-white rounded-2xl text-gray-400 hover:text-[#F54927] shadow-lg border border-gray-100 transition-all active:scale-90"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    ) : config?.selectionmethod === 'manual' && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setPickingForIndex(index); }}
                                                className="p-3 bg-white rounded-2xl text-gray-400 hover:text-[#F54927] shadow-lg border border-gray-100 transition-all active:scale-90"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleClearSlot(index); }}
                                                className="p-3 bg-white rounded-2xl text-gray-400 hover:text-red-500 shadow-lg border border-gray-100 transition-all active:scale-90"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}


                </div>

                {/* --- DESKTOP MODAL --- */}
                {editingSlide && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#111827]/60 backdrop-blur-md animate-in fade-in duration-500">
                        <div className="absolute inset-0" onClick={handleCancel} />
                        <div className="relative bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col max-h-[95vh]">

                            {/* Right Side: Form */}
                            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col bg-white">
                                <div className="p-8 border-b border-gray-50 flex items-center justify-between sticky top-0 bg-white z-20">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-[#F54927]/10 text-[#F54927] rounded-2xl flex items-center justify-center">
                                            <Check className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-[20px] font-black text-gray-900 tracking-tight">Slide Design</h3>
                                            <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Configure appearance and action</p>
                                        </div>
                                    </div>
                                    <button onClick={handleCancel} className="w-12 h-12 flex items-center justify-center bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-[#F54927] rounded-full transition-all">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="p-8 space-y-10 flex-1 overflow-y-auto no-scrollbar">
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
                                    {/* Media Section */}
                                    <div className="space-y-6">
                                        <MediaUpload
                                            value={editingSlide.mediaurl || ""}
                                            type={editingSlide.contenttype || (isVideoVariant ? "video" : "image")}
                                            onChange={(url: string) => setEditingSlide({ ...editingSlide, mediaurl: url, _usePlaceholder: false })}
                                            onFileSelect={handleFileSelect}
                                            isStaged={!!pendingFile}
                                            stagedPreviewUrl={pendingPreviewUrl}
                                            isExternalUploading={isUploading}
                                            schoolKey={schoolKey}
                                            category="banners"
                                            label="Banner Media"
                                            description={isVideoVariant ? "Upload a high-quality video (MP4/WebM)" : "Upload a high-resolution banner image"}
                                            allowVideo={isVideoVariant}
                                            allowImage={!isVideoVariant}
                                            aspectRatio="video"
                                            showPlaceholderCheckbox={true}
                                            isPlaceholderActive={!!editingSlide._usePlaceholder}
                                            onPlaceholderToggle={(active) => setEditingSlide({ ...editingSlide, _usePlaceholder: active, mediaurl: active ? "" : editingSlide.mediaurl })}
                                        />
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
                                                    value={(() => {
                                                        const url = editingSlide.primarybuttonurl || "";
                                                        if (url.includes(customDomain) && customDomain) {
                                                            const slug = url.replace(customDomain, '').replace(/^\//, '') || "";
                                                            return slug === "" ? "home" : slug;
                                                        }
                                                        return url;
                                                    })()}
                                                    onChange={e => setEditingSlide({ ...editingSlide, primarybuttonurl: e.target.value })}
                                                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-[12px] font-medium text-gray-700 outline-none appearance-none pr-10 cursor-pointer focus:border-red-100 focus:ring-1 focus:ring-red-100 transition-all"
                                                >
                                                    <option value="">Select action screen...</option>
                                                    {allScreens.map(scr => (
                                                        <option key={scr.key} value={scr.screenslug ?? ''}>{scr.screenname ?? scr.screenslug}</option>
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
                                                    value={(() => {
                                                        const url = editingSlide.secondarybuttonurl || "";
                                                        if (url.includes(customDomain) && customDomain) {
                                                            const slug = url.replace(customDomain, '').replace(/^\//, '') || "";
                                                            return slug === "" ? "home" : slug;
                                                        }
                                                        return url;
                                                    })()}
                                                    onChange={e => setEditingSlide({ ...editingSlide, secondarybuttonurl: e.target.value })}
                                                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-[12px] font-medium text-gray-700 outline-none appearance-none pr-10 cursor-pointer focus:border-red-100 focus:ring-1 focus:ring-red-100 transition-all"
                                                >
                                                    <option value="">Select action screen...</option>
                                                    {allScreens.map(scr => (
                                                        <option key={scr.key} value={scr.screenslug ?? ''}>{scr.screenname ?? scr.screenslug}</option>
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
                                            <span className="text-[11px] text-gray-400 font-bold">Visible on your website</span>
                                        </div>
                                        <div className="relative inline-flex items-center">
                                            <input type="checkbox" className="sr-only peer" checked={editingSlide.isactive} readOnly />
                                            <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[19px] after:w-[19px] after:transition-all peer-checked:bg-emerald-500"></div>
                                        </div>
                                    </div>
                                    </div>
                                </div>

                                <div className="p-8 border-t border-gray-50 bg-white sticky bottom-0 z-20 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                                    {slides.some(s => s.key === editingSlide.key) && (
                                        <button
                                            onClick={() => { if (confirm('Delete slide?')) { removeRecord(editingSlide.key); handleCancel(); } }}
                                            className="px-6 py-3.5 text-[13px] font-black text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                        >
                                            Delete
                                        </button>
                                    )}
                                    <div className="flex items-center gap-3 ml-auto">
                                        <button onClick={handleCancel} className="px-6 py-3 text-[13px] font-bold text-gray-400 hover:text-gray-900 transition-all">Cancel</button>
                                        <button
                                            disabled={isUploading || isSaving || (!editingSlide.mediaurl && !pendingFile && !editingSlide._usePlaceholder)}
                                            onClick={handlePublish}
                                            className="px-10 py-3.5 bg-[#111827] text-white text-[14px] font-black rounded-2xl hover:bg-black transition-all shadow-xl disabled:opacity-50 flex items-center gap-3 h-[52px]"
                                        >
                                            {isSaving || isUploading ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    {isUploading ? "Uploading..." : "Saving..."}
                                                </>
                                            ) : (
                                                <>
                                                    {slides.some(s => s.key === editingSlide.key) ? 'Update Slide' : 'Publish Banner'}
                                                    <Check className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Selection Dialog (Manual Selection Mode only) */}
                {pickingForIndex !== null && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm shadow-2xl">
                        <div className="absolute inset-0" onClick={() => setPickingForIndex(null)} />
                        <div className="relative bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                                <h3 className="text-[18px] font-black text-gray-900 tracking-tight">Select Slide for Slot {pickingForIndex + 1}</h3>
                                <button onClick={() => setPickingForIndex(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                                {normalizedSlides.filter(rec => rec.contenttype === effectiveContentType).length === 0 ? (
                                    <div className="text-center py-20">
                                        <p className="text-gray-400 font-bold">No {effectiveContentType === 'video' ? 'video' : 'image'} slides found.</p>
                                        <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-widest leading-loose">Switch to Source Screen to create<br/>new {effectiveContentType} content first.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        {normalizedSlides.filter(rec => rec.contenttype === effectiveContentType).map((rec: any) => (
                                            <button
                                                key={rec.key}
                                                onClick={() => handleSelectRecord(rec.key)}
                                                className={`group relative aspect-video rounded-2xl border-2 text-left transition-all overflow-hidden ${placements.some((p: ComponentPlacement) => p.contentkey === rec.key) ? "border-red-500 bg-red-50/20" : "border-gray-50 hover:border-red-200 bg-white"}`}
                                            >
                                                {rec.mediaurl ? (
                                                    rec.contenttype === 'video' ? (
                                                        <video src={rec.mediaurl} className="w-full h-full object-cover opacity-60" muted />
                                                    ) : (
                                                        <img src={rec.mediaurl} alt="" className="w-full h-full object-cover opacity-60" />
                                                    )
                                                ) : <div className="w-full h-full bg-gray-100" />}
                                                
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end text-white">
                                                    <p className="text-[12px] font-black leading-tight line-clamp-1">{rec.headline || "No Headline"}</p>
                                                    <p className="text-[10px] font-bold text-white/70 line-clamp-1">{rec.subheadline}</p>
                                                </div>

                                                {placements.some((p: ComponentPlacement) => p.contentkey === rec.key) && (
                                                    <div className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg">
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
            </div>
        </BaseEditor>
    );
}
