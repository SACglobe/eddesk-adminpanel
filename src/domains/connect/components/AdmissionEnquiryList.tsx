"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, Filter, RotateCcw, Eye, CheckCircle, Clock, XCircle, Phone, Mail, GraduationCap, Calendar, User, MapPin, ArrowRight } from "lucide-react";
import { getAdmissionEnquiries, updateSubmissionStatus, FormSubmission } from "../queries";

interface AdmissionEnquiryListProps {
    schoolKey: string;
}

export default function AdmissionEnquiryList({ schoolKey }: AdmissionEnquiryListProps) {
    const [enquiries, setEnquiries] = useState<FormSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedEnquiry, setSelectedEnquiry] = useState<FormSubmission | null>(null);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const getParsedPayload = (enq: FormSubmission) => {
        if (typeof enq.payload === 'string') {
            try {
                return JSON.parse(enq.payload);
            } catch (e) {
                return {};
            }
        }
        return enq.payload || {};
    };

    useEffect(() => {
        fetchEnquiries();
    }, [schoolKey]);

    async function fetchEnquiries() {
        setIsLoading(true);
        const { data, error } = await getAdmissionEnquiries(schoolKey);
        if (data) setEnquiries(data);
        setIsLoading(false);
    }

    const filteredEnquiries = useMemo(() => {
        return enquiries.filter(enq => {
            const payload = getParsedPayload(enq) as any;
            const studentName = payload.studentinfo?.studentname?.toLowerCase() || "";
            const parentName = payload.fatherinfo?.name?.toLowerCase() || payload.motherinfo?.name?.toLowerCase() || "";
            const matchesSearch = studentName.includes(searchQuery.toLowerCase()) || parentName.includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === "all" || enq.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [enquiries, searchQuery, statusFilter, getParsedPayload]);

    async function handleStatusUpdate(key: string, newStatus: string) {
        setIsUpdating(key);
        const { error } = await updateSubmissionStatus(key, newStatus);
        if (!error) {
            setEnquiries(prev => prev.map(enq => enq.key === key ? { ...enq, status: newStatus } : enq));
            if (selectedEnquiry?.key === key) {
                setSelectedEnquiry(prev => prev ? { ...prev, status: newStatus } : null);
            }
        }
        setIsUpdating(null);
    }

    const getStatusStyle = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'contacted': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'resolved': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'junk': return 'bg-gray-50 text-gray-700 border-gray-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending': return <Clock className="w-3.5 h-3.5" />;
            case 'contacted': return <Phone className="w-3.5 h-3.5" />;
            case 'resolved': return <CheckCircle className="w-3.5 h-3.5" />;
            case 'junk': return <XCircle className="w-3.5 h-3.5" />;
            default: return <Clock className="w-3.5 h-3.5" />;
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header / Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search student or parent name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-[14px] font-medium outline-none focus:ring-2 focus:ring-red-100 focus:border-red-200 transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center bg-white border border-gray-200 rounded-2xl p-1 gap-1 w-full sm:w-auto overflow-x-auto no-scrollbar">
                        {['all', 'pending', 'contacted', 'resolved', 'junk'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-2 rounded-xl text-[12px] font-bold capitalize transition-all whitespace-nowrap ${statusFilter === status ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-red-100 border-t-red-500 rounded-full animate-spin" />
                        <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest">Loading Enquiries...</p>
                    </div>
                </div>
            ) : filteredEnquiries.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white border border-dashed border-gray-200 rounded-[32px]">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <Mail className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-[18px] font-black text-gray-900 tracking-tight">No enquiries found</h3>
                    <p className="text-[14px] text-gray-500 mt-2">Adjust your filters or search query to see more results.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {filteredEnquiries.map((enq) => {
                        const payload = getParsedPayload(enq) as any;
                        const student = payload.studentinfo;
                        const father = payload.fatherinfo;
                        const mother = payload.motherinfo;
                        
                        return (
                            <div 
                                key={enq.key}
                                className="group bg-white border border-gray-100 rounded-[28px] hover:border-red-100 hover:shadow-xl hover:shadow-gray-200/40 transition-all duration-300"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center p-5 lg:p-4 lg:px-6 gap-6">
                                    {/* Student Info */}
                                    <div className="flex items-center gap-4 lg:w-[25%]">
                                        <div className="w-12 h-12 bg-red-50 text-[#F54927] rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-[18px]">
                                            {student?.studentname?.[0] || "?"}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-[15px] font-black text-gray-900 leading-tight group-hover:text-[#F54927] transition-colors truncate">
                                                {student?.studentname || "Unknown"}
                                            </h4>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-[12px] font-bold text-gray-500 whitespace-nowrap">Class {student?.seekingclass || "N/A"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Parent Info */}
                                    <div className="hidden lg:flex items-center gap-3 lg:w-[20%]">
                                        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Parent</span>
                                            <span className="text-[13px] font-bold text-gray-700 truncate">{father?.name || mother?.name || "N/A"}</span>
                                        </div>
                                    </div>

                                    {/* Contact Info */}
                                    <div className="hidden lg:flex items-center gap-3 lg:w-[15%]">
                                        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                                            <Phone className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Contact</span>
                                            <span className="text-[13px] font-bold text-gray-700 truncate">{father?.mobileno || mother?.mobileno || "N/A"}</span>
                                        </div>
                                    </div>

                                    {/* Date Info */}
                                    <div className="hidden xl:flex items-center gap-3 lg:w-[20%]">
                                        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                                            <Calendar className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Submitted On</span>
                                            <span className="text-[13px] font-bold text-gray-700 whitespace-nowrap">
                                                {new Date(enq.createdat).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status & Action */}
                                    <div className="flex items-center justify-between lg:justify-end gap-3 lg:flex-1 lg:ml-auto">
                                        <div className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${getStatusStyle(enq.status)}`}>
                                            {getStatusIcon(enq.status)}
                                            {enq.status}
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            {/* Action: Re-open (if Resolved or Junk) */}
                                            {(enq.status === 'resolved' || enq.status === 'junk') && (
                                                <div className="relative group/tooltip">
                                                    <button 
                                                        disabled={isUpdating === enq.key}
                                                        onClick={() => handleStatusUpdate(enq.key, 'pending')}
                                                        className="w-9 h-9 flex items-center justify-center bg-gray-50 hover:bg-gray-900 border border-gray-100 hover:text-white rounded-xl transition-all active:scale-90"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                    </button>
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900/95 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-2xl scale-90 group-hover/tooltip:scale-100 origin-bottom border border-white/10">
                                                        Move back to Pending
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900/95" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action: Mark as Contacted (if Pending) */}
                                            {enq.status === 'pending' && (
                                                <div className="relative group/tooltip">
                                                    <button 
                                                        disabled={isUpdating === enq.key}
                                                        onClick={() => handleStatusUpdate(enq.key, 'contacted')}
                                                        className="w-9 h-9 flex items-center justify-center bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl transition-all active:scale-90"
                                                    >
                                                        <Phone className="w-3.5 h-3.5" />
                                                    </button>
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900/95 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-2xl scale-90 group-hover/tooltip:scale-100 origin-bottom border border-white/10">
                                                        Mark as Contacted
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900/95" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action: Mark as Resolved (if NOT Resolved) */}
                                            {enq.status !== 'resolved' && (
                                                <div className="relative group/tooltip">
                                                    <button 
                                                        disabled={isUpdating === enq.key}
                                                        onClick={() => handleStatusUpdate(enq.key, 'resolved')}
                                                        className="w-9 h-9 flex items-center justify-center bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-xl transition-all active:scale-90"
                                                    >
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                    </button>
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900/95 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-2xl scale-90 group-hover/tooltip:scale-100 origin-bottom border border-white/10">
                                                        Mark as Resolved
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900/95" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action: Mark as Junk (if NOT Junk) */}
                                            {enq.status !== 'junk' && (
                                                <div className="relative group/tooltip">
                                                    <button 
                                                        disabled={isUpdating === enq.key}
                                                        onClick={() => handleStatusUpdate(enq.key, 'junk')}
                                                        className="w-9 h-9 flex items-center justify-center bg-red-50 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all active:scale-90"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" />
                                                    </button>
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900/95 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-2xl scale-90 group-hover/tooltip:scale-100 origin-bottom border border-white/10">
                                                        Mark as Junk
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900/95" />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="w-px h-4 bg-gray-200 mx-1" />

                                            <div className="relative group/tooltip">
                                                <button 
                                                    onClick={() => setSelectedEnquiry(enq)}
                                                    className="px-4 py-2 bg-gray-50 hover:bg-gray-900 hover:text-white text-gray-600 font-black text-[11px] rounded-xl transition-all flex items-center justify-center gap-2 group/btn"
                                                >
                                                    Details
                                                    <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                                                </button>
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900/95 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-2xl scale-90 group-hover/tooltip:scale-100 origin-bottom border border-white/10">
                                                    View Full Details
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900/95" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Details Modal */}
            {selectedEnquiry && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedEnquiry(null)} />
                    <div className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-gray-100 flex items-start justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-gradient-to-tr from-[#F54927] to-[#ff6b52] text-white rounded-[24px] flex items-center justify-center font-black text-[24px] shadow-xl shadow-red-500/20">
                                    {(getParsedPayload(selectedEnquiry) as any).studentinfo?.studentname?.[0] || "?"}
                                </div>
                                <div>
                                    <h2 className="text-[24px] font-black text-gray-900 tracking-tight leading-none mb-2">{(getParsedPayload(selectedEnquiry) as any).studentinfo?.studentname}</h2>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className={`px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 ${getStatusStyle(selectedEnquiry.status)}`}>
                                            {getStatusIcon(selectedEnquiry.status)}
                                            {selectedEnquiry.status}
                                        </div>
                                        <span className="text-gray-300">•</span>
                                        <span className="text-[13px] font-bold text-gray-500">ID: {selectedEnquiry.key.split('-')[0].toUpperCase()}</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedEnquiry(null)}
                                className="w-12 h-12 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-full transition-all active:scale-90"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-gray-50/30">
                            {(() => {
                                const payload = getParsedPayload(selectedEnquiry) as any;
                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Student Info Section */}
                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <div className="w-1 h-3 bg-red-500 rounded-full" />
                                                    Student Information
                                                </h3>
                                                <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
                                                    <DetailItem label="Full Name" value={payload.studentinfo?.studentname} />
                                                    <DetailItem label="Date of Birth" value={payload.studentinfo?.dateofbirth} />
                                                    <DetailItem label="Seeking Class" value={payload.studentinfo?.seekingclass} />
                                                    <DetailItem label="Blood Group" value={payload.studentinfo?.bloodgroup} />
                                                    <DetailItem label="Aadhar No" value={payload.studentinfo?.aadharno} />
                                                    <DetailItem label="Religion" value={payload.studentinfo?.religion} />
                                                    <DetailItem label="EMIS No" value={payload.studentinfo?.emisno} />
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <div className="w-1 h-3 bg-blue-500 rounded-full" />
                                                    Previous School Details
                                                </h3>
                                                <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
                                                    <DetailItem label="School Name" value={payload.previousschool?.lastschoolname} />
                                                    <DetailItem label="District/Block" value={`${payload.previousschool?.lastschooldistrict} / ${payload.previousschool?.lastschoolblock}`} />
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <div className="w-1 h-3 bg-amber-500 rounded-full" />
                                                    Documents Status
                                                </h3>
                                                <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm grid grid-cols-1 gap-4">
                                                    <StatusCheck label="TC Submitted" checked={payload.documents?.tcsubmitted} />
                                                    <StatusCheck label="Attendance Cert." checked={payload.documents?.attendancecertificate} />
                                                    <StatusCheck label="Marksheet Submitted" checked={payload.documents?.marksheetsubmitted} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Parents Info Section */}
                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                                                    Father's Information
                                                </h3>
                                                <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
                                                    <DetailItem label="Name" value={payload.fatherinfo?.name} />
                                                    <DetailItem label="Occupation" value={payload.fatherinfo?.occupation} />
                                                    <DetailItem label="Qualification" value={payload.fatherinfo?.qualification} />
                                                    <DetailItem label="Annual Income" value={payload.fatherinfo?.annualincome} />
                                                    <DetailItem label="Mobile No" value={payload.fatherinfo?.mobileno} />
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <div className="w-1 h-3 bg-pink-500 rounded-full" />
                                                    Mother's Information
                                                </h3>
                                                <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
                                                    <DetailItem label="Name" value={payload.motherinfo?.name} />
                                                    <DetailItem label="Occupation" value={payload.motherinfo?.occupation} />
                                                    <DetailItem label="Qualification" value={payload.motherinfo?.qualification} />
                                                    <DetailItem label="Annual Income" value={payload.motherinfo?.annualincome} />
                                                    <DetailItem label="Mobile No" value={payload.motherinfo?.mobileno} />
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                                                    General & Address
                                                </h3>
                                                <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">Residential Address</span>
                                                        <span className="text-[14px] font-bold text-gray-700 leading-relaxed">{payload.general?.residentialaddress}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <DetailItem label="Distance" value={`${payload.general?.distancefromschool} km`} />
                                                        <StatusCheck label="Conveyance Req." checked={payload.general?.conveyancerequired} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 border-t border-gray-100 bg-white sticky bottom-0 z-10">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                                <div>
                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Update Submission Status</p>
                                    <div className="flex items-center gap-2">
                                        {['pending', 'contacted', 'resolved', 'junk'].map((status) => (
                                            <button
                                                key={status}
                                                disabled={isUpdating === selectedEnquiry.key}
                                                onClick={() => handleStatusUpdate(selectedEnquiry.key, status)}
                                                className={`px-4 py-2 rounded-xl text-[12px] font-black capitalize transition-all border-2 ${selectedEnquiry.status === status ? 'bg-gray-900 border-gray-900 text-white shadow-xl' : 'border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50'}`}
                                            >
                                                {isUpdating === selectedEnquiry.key && selectedEnquiry.status === status ? '...' : status}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <button 
                                        className="flex-1 sm:flex-initial px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[14px] rounded-[20px] transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                                        onClick={() => handleStatusUpdate(selectedEnquiry.key, 'resolved')}
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        Mark as Resolved
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailItem({ label, value }: { label: string; value: string | undefined }) {
    return (
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">{label}</span>
            <span className="text-[14px] font-bold text-gray-700 truncate">{value || "Not Provided"}</span>
        </div>
    );
}

function StatusCheck({ label, checked }: { label: string; checked: boolean | undefined }) {
    return (
        <div className="flex items-center justify-between py-1">
            <span className="text-[13px] font-bold text-gray-600">{label}</span>
            {checked ? (
                <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5" />
                </div>
            ) : (
                <div className="w-5 h-5 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center">
                    <XCircle className="w-3.5 h-3.5" />
                </div>
            )}
        </div>
    );
}
