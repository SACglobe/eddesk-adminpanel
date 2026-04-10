"use client";

import React, { useState, useEffect } from "react";
import { Upload, X, Image as ImageIcon, Video, ExternalLink, Play, Check, AlertCircle } from "lucide-react";
import { uploadFile, StorageCategory } from "@/lib/supabase/storage";

interface MediaUploadProps {
    value: string;
    type: "image" | "video";
    onChange: (url: string, type: "image" | "video") => void;
    schoolKey: string;
    category: StorageCategory;
    label?: string;
    description?: string;
    allowVideo?: boolean;
    allowImage?: boolean;
    aspectRatio?: "video" | "square" | "portrait" | "any" | "16:10";
    lockType?: boolean;
    // New props for staged mode
    onFileSelect?: (file: File) => void;
    isStaged?: boolean;
    stagedPreviewUrl?: string | null;
    isExternalUploading?: boolean;
}

export default function MediaUpload({
    value,
    type,
    onChange,
    schoolKey,
    category,
    label,
    description,
    allowVideo = true,
    allowImage = true,
    aspectRatio = "video",
    lockType = false,
    onFileSelect,
    isStaged = false,
    stagedPreviewUrl,
    isExternalUploading = false
}: MediaUploadProps) {
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
    const [internalUploading, setInternalUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isUploading = internalUploading || isExternalUploading;
    const effectivePreviewUrl = stagedPreviewUrl || pendingPreviewUrl || value;
    const currentIsStaged = isStaged || !!pendingFile;

    useEffect(() => {
        return () => {
            if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        };
    }, [pendingPreviewUrl]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset internal state
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        setError(null);

        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");

        if (isVideo && !allowVideo) {
            setError("Video uploads are not allowed for this field.");
            return;
        }

        if (isImage && !allowImage) {
            setError("Image uploads are not allowed for this field.");
            return;
        }

        if (!isImage && !isVideo) {
            setError("Only images and videos are supported.");
            return;
        }

        // If parent wants to handle staging
        if (onFileSelect) {
            onFileSelect(file);
            return;
        }

        // Regular internal auto-upload mode
        const blobUrl = URL.createObjectURL(file);
        setPendingFile(file);
        setPendingPreviewUrl(blobUrl);
        
        const newType = isVideo ? "video" : "image";
        
        setInternalUploading(true);
        try {
            const url = await uploadFile(file, schoolKey, category);
            onChange(url, newType);
            setPendingFile(null);
        } catch (err: any) {
            setError(err.message || "Upload failed");
            setPendingFile(null);
            if (blobUrl) URL.revokeObjectURL(blobUrl);
            setPendingPreviewUrl(null);
        } finally {
            setInternalUploading(false);
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setPendingFile(null);
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        setPendingPreviewUrl(null);
        setError(null);
        onChange("", type);
        // If parent is handling staging, they should also have a clear mechanism
    };

    const aspectClasses = {
        video: "aspect-video",
        square: "aspect-square",
        portrait: "aspect-[3/4]",
        any: "min-h-[200px]",
        "16:10": "aspect-[16/10]"
    };

    return (
        <div className="space-y-3">
            {(label || description) && (
                <div className="flex flex-col gap-0.5 px-1">
                    {label && <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{label}</label>}
                    {description && <p className="text-[10px] font-medium text-gray-400">{description}</p>}
                </div>
            )}

            <div className="space-y-4">
                <div className={`relative ${aspectClasses[aspectRatio]} rounded-[24px] overflow-hidden bg-gray-50 border-2 border-gray-100 shadow-inner group`}>
                    {effectivePreviewUrl ? (
                        <>
                            {type === "video" ? (
                                <video 
                                    src={effectivePreviewUrl} 
                                    className="w-full h-full object-cover" 
                                    autoPlay 
                                    loop 
                                    muted 
                                    playsInline 
                                />
                            ) : (
                                <img src={effectivePreviewUrl} alt="" className="w-full h-full object-cover" />
                            )}
                            
                            {/* Staged Badge */}
                            {currentIsStaged && (
                                <div className="absolute top-4 left-4 right-4 z-20">
                                    <div className="bg-[#F59E0B] text-white px-4 py-2 rounded-full shadow-lg flex items-center justify-center gap-2 animate-in slide-in-from-top-4 duration-300">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.1em]">New File Staged — Uploads on Publish</span>
                                    </div>
                                </div>
                            )}

                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 z-10">
                                <button
                                    onClick={handleClear}
                                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-gray-300">
                            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-50">
                                <ImageIcon className="w-8 h-8" />
                            </div>
                            <p className="text-[11px] font-black uppercase tracking-widest">No Media Preview</p>
                        </div>
                    )}
                    
                    {isUploading && (
                        <div className="absolute inset-0 bg-[#111827]/60 backdrop-blur-[2px] z-[30] flex flex-col items-center justify-center gap-3">
                            <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                            <p className="text-white text-[11px] font-black uppercase tracking-widest">Uploading...</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <input
                            type="file"
                            id={`media-upload-${category}-${schoolKey}`}
                            className="hidden"
                            accept={allowVideo && allowImage ? "image/*,video/*" : allowVideo ? "video/mp4,video/webm,video/ogg,video/quicktime" : "image/jpeg,image/png,image/gif,image/webp"}
                            onChange={handleFileSelect}
                            disabled={isUploading}
                        />
                        <label
                            htmlFor={`media-upload-${category}-${schoolKey}`}
                            className={`w-full h-full min-h-[110px] border-2 border-dashed rounded-[24px] flex flex-col items-center justify-center gap-3 transition-all cursor-pointer relative overflow-hidden group ${isUploading ? 'opacity-50 pointer-events-none' : 'bg-gray-50 border-gray-100 hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/5'}`}
                        >
                            <div className={`w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-colors ${currentIsStaged ? 'bg-[#F59E0B] text-white' : 'bg-white text-gray-400 group-hover:text-[#F59E0B]'}`}>
                                {currentIsStaged ? <Check className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                            </div>
                            <div className="text-center px-4">
                                <p className={`text-[11px] font-black uppercase tracking-wider ${currentIsStaged ? 'text-[#F59E0B]' : 'text-gray-500'}`}>
                                    {currentIsStaged ? 'File Selected' : (value ? 'Change Media' : 'Upload File')}
                                </p>
                                {currentIsStaged && (
                                    <p className="text-[9px] font-bold text-[#F59E0B]/70 uppercase tracking-widest mt-1">Staged — will upload on publish</p>
                                )}
                            </div>
                        </label>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Or Paste URL</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={value}
                                    onChange={e => onChange(e.target.value, type)}
                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-100 transition-all text-[13px] font-bold outline-none shadow-inner"
                                    placeholder="https://..."
                                />
                                <ExternalLink className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-red-400 transition-colors" />
                            </div>
                        </div>
                        {!allowVideo && (
                            <div className="py-3 px-4 bg-gray-100/50 rounded-[16px] flex items-center gap-2 border border-gray-100">
                                <ImageIcon className="w-4 h-4 text-gray-400" />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Image only</span>
                            </div>
                        )}
                        {!allowImage && (
                            <div className="py-3 px-4 bg-gray-100/50 rounded-[16px] flex items-center gap-2 border border-gray-100">
                                <Video className="w-4 h-4 text-gray-400" />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Video only</span>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <p className="text-[11px] font-bold text-red-500">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
