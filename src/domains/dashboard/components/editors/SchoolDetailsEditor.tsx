"use client";

import { useState, useEffect } from "react";
import { AdminInitialData } from "@/domains/auth/types";
import MediaUpload from "@/components/ui/MediaUpload";
import { uploadFile } from "@/lib/supabase/storage";
import { createClient } from "@/lib/supabase/client";

interface SchoolDetailsEditorProps {
    adminData: AdminInitialData;
}

export default function SchoolDetailsEditor({ adminData }: SchoolDetailsEditorProps) {
    const school = adminData?.schools as any;
    const [isEditingSchool, setIsEditingSchool] = useState(false);
    const [formData, setFormData] = useState(school);
    const [isSaving, setIsSaving] = useState(false);

    // Staged upload state
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        return () => {
            if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        };
    }, [pendingPreviewUrl]);

    const handleFileSelect = (file: File) => {
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        const url = URL.createObjectURL(file);
        setPendingFile(file);
        setPendingPreviewUrl(url);
    };

    const handleSave = async () => {
        if (isEditingSchool) {
            setIsSaving(true);
            const supabase = createClient();
            
            try {
                let finalData = { ...formData };

                if (pendingFile) {
                    setIsUploading(true);
                    try {
                        const uploadedUrl = await uploadFile(pendingFile, school.key, "school-branding");
                        finalData.logourl = uploadedUrl;
                        setFormData(finalData);
                    } catch (err) {
                        console.error("Logo upload failed:", err);
                        alert("Failed to upload logo. Please try again.");
                        return;
                    } finally {
                        setIsUploading(false);
                    }
                }

                // Update the school record in Supabase
                const { error } = await supabase
                    .from("schools")
                    .update({
                        name: finalData.name,
                        email: finalData.email,
                        phone: finalData.phone,
                        address: finalData.address,
                        city: finalData.city,
                        state: finalData.state,
                        postal_code: finalData.postal_code,
                        logourl: finalData.logourl
                    })
                    .eq("key", school.key);

                if (error) throw error;
                
                // Reset staged states
                setPendingFile(null);
                setPendingPreviewUrl(null);
                setIsEditingSchool(false);
                alert("School details updated successfully!");
                
                // Refresh page or update parent state if needed
                // window.location.reload(); 
            } catch (err) {
                console.error("Save failed:", err);
                alert("Failed to save changes. Please try again.");
            } finally {
                setIsSaving(false);
            }
        } else {
            setIsEditingSchool(true);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* School Profile Section */}
            <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
                <div className="px-8 lg:px-12 py-8 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-white">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center p-2 shadow-sm overflow-hidden">
                            {(pendingPreviewUrl || formData.logourl) ? (
                                <img src={pendingPreviewUrl || formData.logourl} alt="" className="max-w-full max-h-full object-contain" />
                            ) : (
                                <img src="/school-logo-placeholder.png" alt="" className="max-w-full max-h-full object-contain opacity-40" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Institutional Profile</h2>
                            <p className="text-[13px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">School Settings & Compliance</p>
                        </div>
                    </div>
                    {!isEditingSchool && (
                        <button 
                            onClick={() => setIsEditingSchool(true)}
                            className="px-6 py-2.5 rounded-xl font-bold text-sm bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            Edit Information
                        </button>
                    )}
                </div>

                <div className="p-8 lg:p-12 space-y-12">
                    {isEditingSchool && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                            <MediaUpload
                                value={formData.logourl || ""}
                                type="image"
                                onChange={(url) => setFormData({ ...formData, logourl: url })}
                                onFileSelect={handleFileSelect}
                                isStaged={!!pendingFile}
                                stagedPreviewUrl={pendingPreviewUrl}
                                isExternalUploading={isUploading}
                                schoolKey={school.key}
                                category="school-branding"
                                label="School Logo"
                                description="Upload your school's official logo."
                                aspectRatio="square"
                                layout="horizontal"
                                placeholder="/school-logo-placeholder.png"
                            />
                        </div>
                    )}

                    {/* Basic Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-12">
                        <DetailItem label="School Name" value={formData?.name} isEditing={isEditingSchool} onChange={(val) => setFormData({ ...formData, name: val })} />
                        <DetailItem label="Custom Domain" value={formData?.customdomain} isEditing={false} color="blue" />
                        <DetailItem label="Portal Slug" value={formData?.slug} isEditing={false} />
                        <DetailItem label="Contact Email" value={formData?.email} isEditing={isEditingSchool} onChange={(val) => setFormData({ ...formData, email: val })} />
                        <DetailItem label="Contact Phone" value={formData?.phone} isEditing={isEditingSchool} onChange={(val) => setFormData({ ...formData, phone: val })} />
                        <DetailItem label="Website Status" value="Online" isEditing={false} badge="Published" color="emerald" />
                    </div>

                    <div className="h-[1px] bg-gray-50 w-full" />

                    {/* Address / Location Section */}
                    <div>
                        <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8">Location & Logistics</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <DetailItem label="Address" value={formData?.address} isEditing={isEditingSchool} onChange={(val) => setFormData({ ...formData, address: val })} />
                            <DetailItem label="City" value={formData?.city} isEditing={isEditingSchool} onChange={(val) => setFormData({ ...formData, city: val })} />
                            <DetailItem label="State / Province" value={formData?.state} isEditing={isEditingSchool} onChange={(val) => setFormData({ ...formData, state: val })} />
                            <DetailItem label="Postal Code" value={formData?.postal_code} isEditing={isEditingSchool} onChange={(val) => setFormData({ ...formData, postal_code: val })} />
                        </div>
                    </div>
                </div>

                {isEditingSchool && (
                    <div className="px-8 lg:px-12 py-6 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between">
                        <button 
                            onClick={() => {
                                setFormData(school);
                                setPendingFile(null);
                                setPendingPreviewUrl(null);
                                setIsEditingSchool(false);
                            }}
                            className="px-6 py-2.5 rounded-xl font-bold text-sm text-gray-400 hover:text-gray-600 transition-all flex items-center gap-2"
                            disabled={isSaving || isUploading}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving || isUploading}
                            className="px-8 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving || isUploading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    {isUploading ? "Uploading..." : "Saving..."}
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Support Disclaimer */}
            <div className="flex justify-center pb-8">
                <p className="text-[12px] text-gray-400 font-medium flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Some sensitive fields (Email, Domain) can only be updated by contacting EdDesk Support.
                </p>
            </div>
        </div>
    );
}

function DetailItem({ label, value, isEditing, badge, color = 'gray', onChange }: { label: string, value?: string | null, isEditing: boolean, badge?: string | null, color?: 'gray' | 'emerald' | 'blue', onChange?: (val: string) => void }) {
    const colorClasses = {
        gray: 'bg-gray-50 text-gray-600 border-gray-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        blue: 'bg-blue-50 text-blue-600 border-blue-100'
    };

    return (
        <div className="space-y-2 group">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block">{label}</label>
            {isEditing ? (
                <input 
                    type="text" 
                    value={value || ""}
                    onChange={(e) => onChange?.(e.target.value)}
                    className="w-full h-11 bg-gray-50 border-2 border-transparent focus:border-[#F54927]/20 focus:bg-white rounded-xl px-4 text-[13px] font-bold text-gray-900 transition-all outline-none shadow-sm"
                />
            ) : (
                <div className="flex items-center gap-2">
                    <p className="text-[15px] font-bold text-gray-900 truncate">
                        {value || <span className="text-gray-300 font-medium italic">Not set</span>}
                    </p>
                    {badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${colorClasses[color]}`}>
                            {badge}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
