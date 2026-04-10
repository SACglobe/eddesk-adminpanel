"use client";

import { useState } from "react";
import { AdminInitialData } from "@/domains/auth/types";

interface AccountDetailsEditorProps {
    adminData: AdminInitialData;
}

export default function AccountDetailsEditor({ adminData }: AccountDetailsEditorProps) {
    const admin = adminData?.adminusers as any;
    const school = adminData?.schools as any;

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isEditingSchool, setIsEditingSchool] = useState(false);

    // Mock initials for avatar if no image
    const initials = admin?.fullname ? admin.fullname.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'AD';

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 1. Subscription & Billing Section */}
            <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
                <div className="px-8 lg:px-12 py-8 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-white">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center p-3">
                            <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Subscription & Billing</h2>
                            <p className="text-[13px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Plan Details & Renewals</p>
                        </div>
                    </div>
                    <div className="px-4 py-1.5 bg-gray-50 rounded-full text-[12px] font-black text-gray-500 uppercase tracking-wider">
                        Secure Billing Hub
                    </div>
                </div>

                <div className="p-8 lg:p-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-12">
                    <DetailItem label="Active Plan" value={adminData?.plans?.name} isEditing={false} badge={adminData?.plans?.code} color="blue" />
                    <DetailItem label="Billing Frequency" value={adminData?.plans?.billingcycle} isEditing={false} />
                    <DetailItem label="Investment" value={`${adminData?.plans?.price} ${(adminData?.plans as any)?.currency || 'INR'}`} isEditing={false} />
                    <DetailItem label="Subscription Status" value={adminData?.subscriptions?.status} isEditing={false} badge="Active" color="emerald" />
                    <DetailItem label="Last Payment" value={adminData?.subscriptions?.startdate ? new Date(adminData.subscriptions.startdate).toLocaleDateString() : 'N/A'} isEditing={false} />
                    <DetailItem label="Renewal Date" value={adminData?.subscriptions?.enddate ? new Date(adminData.subscriptions.enddate).toLocaleDateString() : 'N/A'} isEditing={false} color="blue" />
                </div>
            </div>

            {/* 2. Admin Profile Section */}
            <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
                <div className="px-8 lg:px-12 py-8 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-white">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#F54927] to-[#ff6b52] flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-[#F54927]/20">
                            {initials}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Administrator Profile</h2>
                            <p className="text-[13px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Personal Identity & Access</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsEditingProfile(!isEditingProfile)}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${isEditingProfile ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    >
                        {isEditingProfile ? (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Save Changes
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                Edit Profile
                            </>
                        )}
                    </button>
                </div>

                <div className="p-8 lg:p-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-12">
                    <DetailItem label="Full Name" value={admin?.fullname} isEditing={isEditingProfile} />
                    <DetailItem label="Email Address" value={admin?.email} isEditing={false} />
                    <DetailItem label="Phone Number" value={admin?.phone} isEditing={isEditingProfile} />
                    <DetailItem label="Designation" value={admin?.role} isEditing={false} badge="Admin" />
                    <DetailItem label="Account Status" value={admin?.status} isEditing={false} badge="Active" color="emerald" />
                    <DetailItem label="Member Since" value={admin?.createdat ? new Date(admin.createdat).toLocaleDateString() : 'N/A'} isEditing={false} />
                </div>
            </div>

            {/* 3. School Profile Section */}
            <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
                <div className="px-8 lg:px-12 py-8 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-white">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center p-3">
                            {school?.logo_url ? (
                                <img src={school.logo_url} alt={school.name} className="max-w-full max-h-full object-contain" />
                            ) : (
                                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Institutional Profile</h2>
                            <p className="text-[13px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">School Settings & Compliance</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsEditingSchool(!isEditingSchool)}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${isEditingSchool ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    >
                        {isEditingSchool ? (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Save Changes
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                Edit Information
                            </>
                        )}
                    </button>
                </div>

                <div className="p-8 lg:p-12 space-y-12">
                    {/* Basic Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-12">
                        <DetailItem label="School Name" value={school?.name} isEditing={isEditingSchool} />
                        <DetailItem label="Custom Domain" value={school?.customdomain} isEditing={false} color="blue" />
                        <DetailItem label="Portal Slug" value={school?.slug} isEditing={false} />
                        <DetailItem label="Contact Email" value={school?.email} isEditing={isEditingSchool} />
                        <DetailItem label="Contact Phone" value={school?.phone} isEditing={isEditingSchool} />
                        <DetailItem label="Website Status" value="Online" isEditing={false} badge="Published" color="emerald" />
                    </div>

                    <div className="h-[1px] bg-gray-50 w-full" />

                    {/* Address / Location Section */}
                    <div>
                        <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8">Location & Logistics</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <DetailItem label="Address" value={school?.address} isEditing={isEditingSchool} />
                            <DetailItem label="City" value={school?.city} isEditing={isEditingSchool} />
                            <DetailItem label="State / Province" value={school?.state} isEditing={isEditingSchool} />
                            <DetailItem label="Postal Code" value={school?.postal_code} isEditing={isEditingSchool} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Support Disclaimer */}
            <div className="flex justify-center pb-8">
                <p className="text-[12px] text-gray-400 font-medium flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Some sensitive fields (Email, Role, Domain, Billing) can only be updated by contacting EdDesk Support.
                </p>
            </div>
        </div>
    );
}

function DetailItem({ label, value, isEditing, badge, color = 'gray' }: { label: string, value?: string, isEditing: boolean, badge?: string, color?: 'gray' | 'emerald' | 'blue' }) {
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
                    defaultValue={value}
                    className="w-full h-11 bg-gray-50 border-2 border-transparent focus:border-[#F54927]/20 focus:bg-white rounded-xl px-4 text-[13px] font-bold text-gray-900 transition-all outline-none"
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
