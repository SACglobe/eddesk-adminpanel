"use client";

import { useState } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData } from "@/domains/dashboard/hooks/useComponentData";
import type { TemplateComponent } from "@/domains/auth/types";

interface ContactDetailsEditorProps {
    component: TemplateComponent;
    schoolKey: string;
}

export default function ContactDetailsEditor({ component, schoolKey }: ContactDetailsEditorProps) {
    const tableName = "contactdetails";
    const isEditable = component.iseditable;
    
    const {
        records,
        isSaving,
        error,
        saveRecord
    } = useComponentData({
        tableName,
        schoolKey,
        initialRecords: (component as any).content || []
    });

    const contactInfo = records.length > 0 ? records[0] : null;

    const [editingDetails, setEditingDetails] = useState<any>(null);

    const handleEdit = () => {
        if (contactInfo) {
            setEditingDetails({ ...contactInfo });
        } else {
            setEditingDetails({
                key: crypto.randomUUID(),
                schoolkey: schoolKey,
                address: "",
                phone: "",
                email: "",
                mapembedurl: "",
                facebook: "",
                twitter: "",
                instagram: "",
                youtube: "",
                isactive: true
            });
        }
    };

    return (
        <BaseEditor
            title="Contact Details"
            description="Manage your school's official contact information, social links, and map location."
            icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            }
            error={error}
            isEditable={isEditable}
            parentScreenName={component.parentscreenname}
            selectionMethod="auto"
            emptySlotsCount={0} // Singleton editor, no empty slots logic required.
        >
            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm flex flex-col md:flex-row gap-10">
                <div className="flex-1 space-y-6">
                    <div>
                        <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Primary Email</h4>
                        <p className="text-[16px] font-bold text-gray-900">{contactInfo?.email || <span className="text-gray-400 italic">No Email Provided</span>}</p>
                    </div>
                    <div>
                        <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Phone Number</h4>
                        <p className="text-[16px] font-bold text-gray-900">{contactInfo?.phone || <span className="text-gray-400 italic">No Phone Provided</span>}</p>
                    </div>
                    <div>
                        <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Physical Address</h4>
                        <p className="text-[15px] font-medium text-gray-600 leading-relaxed max-w-sm">
                            {contactInfo?.address || <span className="text-gray-400 italic">No Address Provided</span>}
                        </p>
                    </div>
                    <div className="pt-4 border-t border-gray-100 flex items-center gap-4">
                        <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mr-2">Social Hub</h4>
                        <a href={contactInfo?.facebook || "#"} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${contactInfo?.facebook ? "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white" : "bg-gray-50 text-gray-300"}`}>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>
                        </a>
                        <a href={contactInfo?.twitter || "#"} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${contactInfo?.twitter ? "bg-sky-50 text-sky-500 hover:bg-sky-500 hover:text-white" : "bg-gray-50 text-gray-300"}`}>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
                        </a>
                        <a href={contactInfo?.instagram || "#"} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${contactInfo?.instagram ? "bg-pink-50 text-pink-600 hover:bg-gradient-to-tr hover:from-yellow-400 hover:to-purple-500 hover:text-white" : "bg-gray-50 text-gray-300"}`}>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                        </a>
                        <a href={contactInfo?.youtube || "#"} target="_blank" rel="noopener noreferrer" className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${contactInfo?.youtube ? "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white" : "bg-gray-50 text-gray-300"}`}>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                        </a>
                    </div>
                    {isEditable && (
                        <div className="pt-6">
                            <button
                                onClick={handleEdit}
                                className="px-6 py-3 bg-[#111827] text-white text-[13px] font-black rounded-xl hover:bg-black transition-all shadow-xl"
                            >
                                Edit Contact Information
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex-1 min-h-[250px] bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden relative">
                    {contactInfo?.mapembedurl ? (
                        <iframe 
                            src={contactInfo.mapembedurl}
                            className="absolute inset-0 w-full h-full border-0"
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                            <svg className="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            <p className="text-[12px] font-bold">No Map Embed Configured</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {editingDetails && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={() => setEditingDetails(null)} />
                    <div className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-[16px] font-black text-gray-900 capitalize">Update Contact Details</h3>
                            <button onClick={() => setEditingDetails(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-full text-gray-400 hover:text-red-500 transition-all">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-8 space-y-6 overflow-y-auto no-scrollbar flex-1">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Email Address</label>
                                    <input
                                        type="email"
                                        value={editingDetails.email || ""}
                                        onChange={e => setEditingDetails({ ...editingDetails, email: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none"
                                        placeholder="e.g. info@school.edu"
                                    />
                                </div>
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={editingDetails.phone || ""}
                                        onChange={e => setEditingDetails({ ...editingDetails, phone: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none"
                                        placeholder="e.g. +1 234 567 8900"
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Physical Address</label>
                                    <textarea
                                        value={editingDetails.address || ""}
                                        onChange={e => setEditingDetails({ ...editingDetails, address: e.target.value })}
                                        rows={3}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none resize-none"
                                        placeholder="Full building and street address"
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Google Maps Embed URL</label>
                                    <input
                                        type="url"
                                        value={editingDetails.mapembedurl || ""}
                                        onChange={e => setEditingDetails({ ...editingDetails, mapembedurl: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-red-200 transition-all text-[14px] font-bold outline-none"
                                        placeholder="https://www.google.com/maps/embed?..."
                                    />
                                    <p className="text-[10px] text-gray-400 font-medium px-2">Go to Google Maps → Share → Embed a map, and copy only the "src" URL.</p>
                                </div>
                                <div className="col-span-2 border-t border-gray-100 pt-6 mt-2">
                                    <h4 className="text-[13px] font-black text-gray-900 mb-4">Social Media Links</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Facebook</label>
                                            <input
                                                type="url"
                                                value={editingDetails.facebook || ""}
                                                onChange={e => setEditingDetails({ ...editingDetails, facebook: e.target.value })}
                                                className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent rounded-[16px] focus:bg-white focus:border-blue-200 transition-all text-[13px] font-bold outline-none"
                                                placeholder="https://facebook.com/..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Twitter / X</label>
                                            <input
                                                type="url"
                                                value={editingDetails.twitter || ""}
                                                onChange={e => setEditingDetails({ ...editingDetails, twitter: e.target.value })}
                                                className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent rounded-[16px] focus:bg-white focus:border-sky-200 transition-all text-[13px] font-bold outline-none"
                                                placeholder="https://twitter.com/..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Instagram</label>
                                            <input
                                                type="url"
                                                value={editingDetails.instagram || ""}
                                                onChange={e => setEditingDetails({ ...editingDetails, instagram: e.target.value })}
                                                className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent rounded-[16px] focus:bg-white focus:border-pink-200 transition-all text-[13px] font-bold outline-none"
                                                placeholder="https://instagram.com/..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">YouTube</label>
                                            <input
                                                type="url"
                                                value={editingDetails.youtube || ""}
                                                onChange={e => setEditingDetails({ ...editingDetails, youtube: e.target.value })}
                                                className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent rounded-[16px] focus:bg-white focus:border-red-200 transition-all text-[13px] font-bold outline-none"
                                                placeholder="https://youtube.com/..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-50 bg-gray-50/30 flex items-center justify-end">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setEditingDetails(null)}
                                    className="px-6 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-900 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isSaving}
                                    onClick={async () => {
                                        await saveRecord(editingDetails);
                                        setEditingDetails(null);
                                    }}
                                    className="px-8 py-3 bg-[#111827] text-white text-[13px] font-black rounded-xl hover:bg-black transition-all shadow-xl disabled:opacity-50"
                                >
                                    {isSaving ? "Saving..." : "Save Contact Details"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </BaseEditor>
    );
}
