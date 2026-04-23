"use client";

import { useState } from "react";
import { AdminInitialData } from "@/domains/auth/types";

interface FeedbackEditorProps {
    adminData: AdminInitialData;
}

export default function FeedbackEditor({ adminData }: FeedbackEditorProps) {
    const adminEmail = (adminData?.adminusers as any)?.email || "";
    
    const [rating, setRating] = useState<number | null>(null);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [email, setEmail] = useState(adminEmail);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const sentiments = [
        { value: 1, emoji: "😠", label: "Poor" },
        { value: 2, emoji: "🙁", label: "Fair" },
        { value: 3, emoji: "😐", label: "Good" },
        { value: 4, emoji: "😊", label: "Very Good" },
        { value: 5, emoji: "😍", label: "Excellent" },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rating || !content) return;

        setIsSubmitting(true);
        
        try {
            const response = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rating,
                    feedback: content,
                    contactEmail: email
                })
            });

            if (!response.ok) throw new Error("Failed to send feedback");
            
            setIsSubmitted(true);
        } catch (err) {
            console.error("Feedback error:", err);
            alert("Failed to send feedback. Please try again or contact support.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white border border-gray-100 rounded-[32px] p-12 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]">
                    <div className="w-24 h-24 bg-[#F54927]/5 text-[#F54927] rounded-full flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-500">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-4">You're Awesome!</h2>
                    <p className="text-gray-500 text-lg max-w-sm mx-auto leading-relaxed mb-10">
                        Thank you for sharing your thoughts. Your feedback helps us build a better experience for everyone.
                    </p>
                    <button 
                        onClick={() => {
                            setIsSubmitted(false);
                            setRating(null);
                            setTitle("");
                            setContent("");
                        }}
                        className="px-8 py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95"
                    >
                        Share More Feedback
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-gray-50/50 to-white px-8 lg:px-12 py-10">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-3">
                        Share Your Thoughts
                    </h1>
                    <p className="text-gray-500 text-[15px] font-medium max-w-lg leading-relaxed">
                        We're constantly evolving EdDesk to serve you better. Help us understand what's working and what we can improve.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="px-8 lg:px-12 pb-12 space-y-10">
                    {/* Sentiment Rating */}
                    <div className="space-y-12 pt-4">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-4"> How was your experience?</label>
                        <div className="flex items-center justify-between max-w-md">
                            {sentiments.map((s) => (
                                <button
                                    key={s.value}
                                    type="button"
                                    onClick={() => setRating(s.value)}
                                    className={`group flex flex-col items-center gap-4 transition-all duration-300 ${rating === s.value ? 'scale-110' : 'opacity-40 grayscale-[0.5] hover:opacity-100 hover:grayscale-0'}`}
                                >
                                    <span className="text-4xl lg:text-5xl group-hover:scale-110 transition-transform duration-300">{s.emoji}</span>
                                    <span className={`text-[10px] font-black uppercase tracking-wider transition-colors ${rating === s.value ? 'text-[#F54927]' : 'text-gray-400'}`}>
                                        {s.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Email Field */}
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Contact Email</label>
                            <input 
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-14 bg-gray-50 border-2 border-transparent focus:border-[#F54927]/20 focus:bg-white rounded-2xl px-5 text-sm font-bold text-gray-900 transition-all outline-none"
                                placeholder="Your email address"
                                required
                            />
                        </div>

                        {/* Optional Title */}
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Subject <span className="text-gray-300 ml-1 font-medium">(Optional)</span></label>
                            <input 
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full h-14 bg-gray-50 border-2 border-transparent focus:border-[#F54927]/20 focus:bg-white rounded-2xl px-5 text-sm font-bold text-gray-900 transition-all outline-none"
                                placeholder="E.g. Performance issue, suggestion..."
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-3">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Detailed Feedback</label>
                        <textarea 
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={6}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-[#F54927]/20 focus:bg-white rounded-2xl p-6 text-sm font-medium text-gray-700 transition-all outline-none resize-none leading-relaxed"
                            placeholder="Tell us more about your experience..."
                            required
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-gray-100">
                        <button 
                            type="button"
                            onClick={() => {
                                setRating(null);
                                setTitle("");
                                setContent("");
                            }}
                            className="px-6 py-2.5 rounded-xl font-bold text-sm text-gray-400 hover:text-gray-600 transition-all flex items-center gap-2"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>

                        <div className="flex-1 flex items-center gap-3 text-gray-400 px-4">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-[11px] font-medium leading-tight">
                                Your feedback is anonymous and used only <br/> to improve the system.
                            </p>
                        </div>
 
                        <button 
                            type="submit"
                            disabled={isSubmitting || !rating || !content}
                            className={`min-w-[200px] h-14 flex items-center justify-center gap-3 rounded-2xl font-black text-sm tracking-wide transition-all active:scale-95 ${
                                isSubmitting || !rating || !content
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-[#F54927] hover:bg-[#E03D1D] text-white shadow-[0_12px_24px_-8px_rgba(245,73,39,0.3)] hover:shadow-[0_16px_32px_-8px_rgba(245,73,39,0.4)]'
                            }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    Submit Feedback
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Bottom Tip */}
            <div className="mt-8 flex justify-center">
                <div className="px-6 py-3 bg-white border border-gray-100 rounded-full shadow-sm flex items-center gap-2">
                    <span className="text-[12px] font-bold text-gray-400 tracking-tight">Need technical support?</span>
                    <button onClick={() => window.location.hash = 'help'} className="text-[12px] font-bold text-[#F54927] hover:underline">Contact Help Center</button>
                </div>
            </div>
        </div>
    );
}
