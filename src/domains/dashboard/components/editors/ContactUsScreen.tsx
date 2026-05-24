"use client";

import React, { useState } from "react";

export default function ContactUsScreen() {
    const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedLabel(label);
        setTimeout(() => setCopiedLabel(null), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Contact Cards Section */}
            <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
                <div className="px-8 lg:px-12 py-8 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-white">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center p-3">
                            <svg className="w-8 h-8 text-[#F54927]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Contact & Support</h2>
                            <p className="text-[13px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Get in touch with us</p>
                        </div>
                    </div>
                    {copiedLabel && (
                        <div className="px-4 py-1.5 bg-emerald-50 rounded-full text-[12px] font-black text-emerald-600 uppercase tracking-wider animate-in fade-in zoom-in duration-200">
                            {copiedLabel} Copied!
                        </div>
                    )}
                </div>

                <div className="p-8 lg:p-12">
                    {/* Grid of contact information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* EMAIL US */}
                        <div 
                            onClick={() => handleCopy("support@eddesk.in", "Email")}
                            className="group p-6 bg-gray-50/30 hover:bg-red-50/10 border border-gray-100 hover:border-red-100 rounded-[24px] cursor-pointer transition-all duration-300 flex flex-col gap-4 shadow-sm hover:shadow-md"
                        >
                            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#F54927]">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-[#F54927] uppercase tracking-widest leading-none">Email Us</p>
                                <h4 className="text-[16px] font-black text-gray-900 mt-2 tracking-tight group-hover:text-[#F54927] transition-colors">support@eddesk.in</h4>
                                <p className="text-[12px] text-gray-400 font-medium mt-1">We respond within 24 hours</p>
                            </div>
                        </div>

                        {/* CALL US */}
                        <div 
                            onClick={() => handleCopy("+91 81223 3929", "Phone")}
                            className="group p-6 bg-gray-50/30 hover:bg-red-50/10 border border-gray-100 hover:border-red-100 rounded-[24px] cursor-pointer transition-all duration-300 flex flex-col gap-4 shadow-sm hover:shadow-md"
                        >
                            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#F54927]">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-[#F54927] uppercase tracking-widest leading-none">Call Us</p>
                                <h4 className="text-[16px] font-black text-gray-900 mt-2 tracking-tight group-hover:text-[#F54927] transition-colors">+91 81223 3929</h4>
                                <p className="text-[12px] text-gray-400 font-medium mt-1">Mon-Sat, 9 AM to 6 PM IST</p>
                            </div>
                        </div>

                        {/* VISIT US */}
                        <div 
                            onClick={() => handleCopy("49/3, Nadar Street, Keela Eral, Tuticorin, Tamil Nadu – 628908", "Address")}
                            className="group p-6 bg-gray-50/30 hover:bg-red-50/10 border border-gray-100 hover:border-red-100 rounded-[24px] cursor-pointer transition-all duration-300 flex flex-col gap-4 shadow-sm hover:shadow-md"
                        >
                            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#F54927]">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-[#F54927] uppercase tracking-widest leading-none">Visit Us</p>
                                <h4 className="text-[13px] font-bold text-gray-900 mt-2 leading-relaxed tracking-tight group-hover:text-[#F54927] transition-colors whitespace-pre-line">
                                    49/3, Nadar Street
                                    Keela Eral, Tuticorin
                                    Tamil Nadu – 628908
                                </h4>
                                <p className="text-[12px] text-gray-400 font-medium mt-1">Registered Office</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Legal & Agreements Section */}
            <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
                <div className="px-8 lg:px-12 py-8 border-b border-gray-50 bg-gradient-to-r from-gray-50/50 to-white">
                    <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Legal Policies & Agreements</h3>
                    <p className="text-[12px] text-gray-400 font-medium mt-1">Read our compliance policies and platform service agreements.</p>
                </div>
                <div className="p-8 lg:p-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Privacy Policy Card */}
                    <a
                        href="https://www.eddesk.in/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group p-6 border border-gray-100 hover:border-red-100 hover:bg-red-50/5 rounded-[24px] transition-all duration-300 flex items-center justify-between shadow-sm hover:shadow-md"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-red-50 flex items-center justify-center text-gray-400 group-hover:text-[#F54927] transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-[15px] font-black text-gray-900 tracking-tight group-hover:text-[#F54927] transition-colors">Privacy Policy</h4>
                                <p className="text-[12px] text-gray-400 font-medium mt-0.5">How we handle and protect school data</p>
                            </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-300 group-hover:text-[#F54927] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </a>

                    {/* Terms & Conditions Card */}
                    <a
                        href="https://www.eddesk.in/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group p-6 border border-gray-100 hover:border-red-100 hover:bg-red-50/5 rounded-[24px] transition-all duration-300 flex items-center justify-between shadow-sm hover:shadow-md"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-red-50 flex items-center justify-center text-gray-400 group-hover:text-[#F54927] transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-[15px] font-black text-gray-900 tracking-tight group-hover:text-[#F54927] transition-colors">Terms & Conditions</h4>
                                <p className="text-[12px] text-gray-400 font-medium mt-0.5">Platform rules and service agreement</p>
                            </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-300 group-hover:text-[#F54927] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </a>
                </div>
            </div>
        </div>
    );
}
