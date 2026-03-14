"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSchools, createAdminInvite } from "@/domains/invite/queries";
import { SchoolOption, AdminInviteParams } from "@/domains/invite/types";

export default function InvitePage() {
    const router = useRouter();
    const [schools, setSchools] = useState<SchoolOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [emailSent, setEmailSent] = useState(true);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const [formData, setFormData] = useState<AdminInviteParams>({
        pemail: "",
        pfullname: "",
        pphone: "",
        prole: "admin",
        pschoolkey: "",
    });

    useEffect(() => {
        async function loadSchools() {
            const data = await getSchools();
            setSchools(data);
            if (data.length > 0) {
                setFormData((prev) => ({ ...prev, pschoolkey: data[0].key }));
            }
            setLoading(false);
        }
        loadSchools();
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            const result = await createAdminInvite(formData);
            setSuccess(true);
            setEmailSent(result.emailSent);
            setInviteLink(result.inviteLink);

            // Only auto-redirect if email was successfully sent
            // if (result.emailSent) {
            //     setTimeout(() => router.push("/login"), 3000);
            // }
        } catch (err: any) {
            setError(err.message || "Failed to create invite");
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-red-100 border-t-[#EF4444] rounded-full animate-spin" />
                    <p className="text-sm font-medium text-gray-400">Loading schools...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center px-4">
            {/* Back to Login */}
            <div className="absolute top-8 left-8">
                <button
                    onClick={() => router.push("/login")}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Login
                </button>
            </div>

            <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
                <div className="mb-10">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 text-[#EF4444] mb-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Invite New Admin</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Create an invitation for a new administrator to manage EdDesk.
                    </p>
                </div>

                {success ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-8 text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-bold text-emerald-900">
                            {emailSent ? "Invite Sent Successfully!" : "Invite Link Generated!"}
                        </h2>
                        <p className="text-sm text-emerald-600 mt-2">
                            {emailSent
                                ? "An invitation email has been sent to the administrator."
                                : "The invitation has been created. You can share the link below manually."}
                        </p>

                        {inviteLink && (
                            <div className="mt-8 space-y-4">
                                <div className="p-4 bg-white border border-emerald-100 rounded-xl relative group shadow-sm transition-all hover:shadow-md">
                                    <div className="text-xs font-mono text-emerald-800 break-all text-left pr-12 min-h-[40px] flex items-center">
                                        {inviteLink}
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(inviteLink);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className={`absolute top-1/2 -translate-y-1/2 right-3 p-2 rounded-lg transition-all flex items-center gap-2 ${copied
                                                ? "bg-emerald-500 text-white"
                                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                            }`}
                                        title="Copy Link"
                                    >
                                        {copied ? (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="text-xs font-bold">Copied!</span>
                                            </>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>

                                <button
                                    onClick={() => router.push("/login")}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-sm shadow-emerald-100 mt-2"
                                >
                                    Done & Go to Login
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 px-0.5">
                                    Full Name
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="John Doe"
                                    value={formData.pfullname}
                                    onChange={(e) => setFormData({ ...formData, pfullname: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[14px] text-gray-900 focus:ring-2 focus:ring-[#EF4444] focus:border-transparent transition-all"
                                />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 px-0.5">
                                    Email
                                </label>
                                <input
                                    required
                                    type="email"
                                    placeholder="john@example.com"
                                    value={formData.pemail}
                                    onChange={(e) => setFormData({ ...formData, pemail: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[14px] text-gray-900 focus:ring-2 focus:ring-[#EF4444] focus:border-transparent transition-all"
                                />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 px-0.5">
                                    Phone Number
                                </label>
                                <input
                                    required
                                    type="tel"
                                    placeholder="+1 234 567 890"
                                    value={formData.pphone}
                                    onChange={(e) => setFormData({ ...formData, pphone: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[14px] text-gray-900 focus:ring-2 focus:ring-[#EF4444] focus:border-transparent transition-all"
                                />
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 px-0.5">
                                    Role
                                </label>
                                <select
                                    value={formData.prole}
                                    onChange={(e) => setFormData({ ...formData, prole: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[14px] text-gray-900 focus:ring-2 focus:ring-[#EF4444] focus:border-transparent transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat"
                                >
                                    <option value="admin">Admin</option>
                                    <option value="editor">Editor</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                            </div>

                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 px-0.5">
                                    School Selection
                                </label>
                                <select
                                    required
                                    value={formData.pschoolkey}
                                    onChange={(e) => setFormData({ ...formData, pschoolkey: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[14px] text-gray-900 focus:ring-2 focus:ring-[#EF4444] focus:border-transparent transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat"
                                >
                                    {schools.map((school) => (
                                        <option key={school.key} value={school.key}>
                                            {school.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 flex items-center gap-3">
                                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm text-red-600 font-medium">{error}</p>
                            </div>
                        )}

                        <button
                            id="invite-submit-btn"
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-gradient-to-r from-[#EF4444] to-[#F87171] hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded-lg shadow-sm shadow-red-200 transition-all flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : "Send Invitation"}
                        </button>
                    </form>
                )}
            </div>

            <p className="text-center text-xs text-gray-400 mt-12">
                EdDesk · Management System
            </p>
        </div>
    );
}
