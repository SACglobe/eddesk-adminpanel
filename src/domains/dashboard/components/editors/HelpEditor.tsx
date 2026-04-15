"use client";

import { useState, useEffect } from "react";
import { AdminInitialData } from "@/domains/auth/types";

interface HelpEditorProps {
    adminData: AdminInitialData;
}

export default function HelpEditor({ adminData }: HelpEditorProps) {
    const adminEmail = (adminData?.adminusers as any)?.email || "";
    const adminName = (adminData?.adminusers as any)?.fullname || "Admin User";
    const schoolName = adminData?.schools?.name || "EdDesk School";

    const [replyTo, setReplyTo] = useState(adminEmail);
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isSent, setIsSent] = useState(false);

    // Auto-set subject options
    const subjectSuggestions = [
        "Feature Request",
        "Technical Issue",
        "Billing & Subscription",
        "General Inquiry",
        "Training Request"
    ];

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject || !message) return;

        setIsSending(true);
        
        try {
            const response = await fetch("/api/help", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject,
                    message,
                    contactEmail: replyTo
                })
            });

            if (!response.ok) throw new Error("Failed to send help request");

            setIsSent(true);
        } catch (err) {
            console.error("Support error:", err);
            alert("Failed to send request. Please try again or contact support.");
        } finally {
            setIsSending(false);
        }
    };

    if (isSent) {
        return (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-4">Message Sent Successfully!</h2>
                    <p className="text-gray-500 text-lg max-w-md mx-auto leading-relaxed mb-10">
                        Thank you for reaching out. Your message has been sent to the EdDesk management team. We usually reply within 2-4 business hours.
                    </p>
                    <button 
                        onClick={() => {
                            setIsSent(false);
                            setSubject("");
                            setMessage("");
                        }}
                        className="px-8 py-3.5 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-sm transition-all shadow-lg hover:shadow-xl active:scale-95"
                    >
                        Send Another Message
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
                {/* Header */}
                <div className="bg-gray-50/50 px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Compose Support Message</h2>
                        <p className="text-[13px] text-gray-500 font-medium mt-0.5">Connect with EdDesk management team</p>
                    </div>
                    <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-[#F54927] shadow-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    </div>
                </div>

                <form onSubmit={handleSend} className="p-8 space-y-6">
                    {/* Fixed Recipient */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 border-b border-gray-50 pb-4">
                        <label className="w-20 text-[13px] font-bold text-gray-400 uppercase tracking-wider">To</label>
                        <div className="flex-1 flex items-center gap-2">
                            <div className="px-3 py-1 bg-[#F54927]/5 text-[#F54927] rounded-lg text-sm font-bold border border-[#F54927]/10 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#F54927] animate-pulse" />
                                EdDesk Management
                                <span className="opacity-50 font-medium">&lt;support@eddesk.in&gt;</span>
                            </div>
                        </div>
                    </div>

                    {/* Reply To */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 border-b border-gray-50 pb-4">
                        <label className="w-20 text-[13px] font-bold text-gray-400 uppercase tracking-wider">Reply To</label>
                        <input 
                            type="email"
                            value={replyTo}
                            onChange={(e) => setReplyTo(e.target.value)}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 placeholder-gray-300 p-0"
                            placeholder="your@email.com"
                            required
                        />
                    </div>

                    {/* Subject */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 border-b border-gray-50 pb-4">
                        <label className="w-20 text-[13px] font-bold text-gray-400 uppercase tracking-wider">Subject</label>
                        <input 
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-900 placeholder-gray-300 p-0"
                            placeholder="What can we help you with?"
                            required
                        />
                    </div>

                    {/* Subject Sugestions */}
                    <div className="flex flex-wrap gap-2 ml-0 sm:ml-26">
                        {subjectSuggestions.map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setSubject(s)}
                                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${subject === s ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-100'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {/* Message Body */}
                    <div className="pt-2">
                        <textarea 
                            rows={10}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl p-6 text-sm font-medium text-gray-700 placeholder-gray-400 focus:bg-white focus:border-[#F54927]/30 focus:ring-4 focus:ring-[#F54927]/5 transition-all outline-none resize-none leading-relaxed"
                            placeholder={"Hello EdDesk Management,\n\nI am writing to inquire about..."}
                            required
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-50">
                        <div className="flex items-center gap-2 text-[12px] text-gray-400 font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Your school details ({schoolName}) will be attached.
                        </div>
                        <button 
                            type="submit"
                            disabled={isSending || !subject || !message}
                            className={`flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95 ${
                                isSending 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                                : 'bg-[#F54927] hover:bg-[#E03D1D] text-white shadow-[#F54927]/20 hover:shadow-[#F54927]/30'
                            }`}
                        >
                            {isSending ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent animate-spin rounded-full" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                    Send Message
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Support Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
                <div className="bg-white border border-gray-100 p-6 rounded-2xl flex items-start gap-4 shadow-sm">
                    <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-[14px] font-bold text-gray-900 mb-1">Response Time</h4>
                        <p className="text-[12px] text-gray-500 leading-normal">Expect a reply within 2-4 business hours.</p>
                    </div>
                </div>
                <div className="bg-white border border-gray-100 p-6 rounded-2xl flex items-start gap-4 shadow-sm">
                    <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-[14px] font-bold text-gray-900 mb-1">Working Hours</h4>
                        <p className="text-[12px] text-gray-500 leading-normal">Mon - Sat: 9:00 AM to 6:00 PM IST.</p>
                    </div>
                </div>
                <div className="bg-white border border-gray-100 p-6 rounded-2xl flex items-start gap-4 shadow-sm">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-[14px] font-bold text-gray-900 mb-1">Encrypted</h4>
                        <p className="text-[12px] text-gray-500 leading-normal">Your communication is secure and private.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
