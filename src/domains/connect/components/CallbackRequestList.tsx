"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, Filter, RotateCcw, Eye, CheckCircle, Clock, XCircle, Phone, User, Calendar, ArrowRight, Bell } from "lucide-react";
import { getCallbackRequests, updateSubmissionStatus, FormSubmission } from "../queries";

interface CallbackRequestListProps {
    schoolKey: string;
}

export default function CallbackRequestList({ schoolKey }: CallbackRequestListProps) {
    const [requests, setRequests] = useState<FormSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedRequest, setSelectedRequest] = useState<FormSubmission | null>(null);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const getParsedPayload = (req: FormSubmission) => {
        if (typeof req.payload === 'string') {
            try {
                return JSON.parse(req.payload);
            } catch (e) {
                return {};
            }
        }
        return req.payload || {};
    };

    useEffect(() => {
        fetchRequests();
    }, [schoolKey]);

    async function fetchRequests() {
        setIsLoading(true);
        const { data, error } = await getCallbackRequests(schoolKey);
        if (data) setRequests(data);
        setIsLoading(false);
    }

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const payload = getParsedPayload(req) as any;
            const name = payload.name?.toLowerCase() || "";
            const mobile = payload.mobileno?.toLowerCase() || "";
            const matchesSearch = name.includes(searchQuery.toLowerCase()) || mobile.includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === "all" || req.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [requests, searchQuery, statusFilter]);

    async function handleStatusUpdate(key: string, newStatus: string) {
        setIsUpdating(key);
        const { error } = await updateSubmissionStatus(key, newStatus);
        if (!error) {
            setRequests(prev => prev.map(req => req.key === key ? { ...req, status: newStatus } : req));
            if (selectedRequest?.key === key) {
                setSelectedRequest(prev => prev ? { ...prev, status: newStatus } : null);
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

    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return "N/A";
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('en-US', { 
                month: 'short', 
                day: '2-digit', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: true 
            });
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or mobile..."
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
                        <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest">Fetching Callbacks...</p>
                    </div>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white border border-dashed border-gray-200 rounded-[32px]">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <Bell className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-[18px] font-black text-gray-900 tracking-tight">No requests found</h3>
                    <p className="text-[14px] text-gray-500 mt-2">All caught up! No pending callback requests matching your filters.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {filteredRequests.map((req) => {
                        const payload = getParsedPayload(req) as any;
                        
                        return (
                            <div 
                                key={req.key}
                                className="group bg-white border border-gray-100 rounded-[28px] hover:border-red-100 hover:shadow-xl hover:shadow-gray-200/40 transition-all duration-300"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center p-5 lg:p-4 lg:px-6 gap-6">
                                    {/* Requester Info */}
                                    <div className="flex items-center gap-4 lg:w-[25%]">
                                        <div className="w-12 h-12 bg-red-50 text-[#F54927] rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-[18px]">
                                            {payload.name?.[0] || "?"}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-[15px] font-black text-gray-900 leading-tight group-hover:text-[#F54927] transition-colors truncate">
                                                {payload.name || "Unknown"}
                                            </h4>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-[12px] font-bold text-gray-500">{payload.mobileno || "N/A"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Scheduled Date (PRIORITY) */}
                                    <div className="flex items-center gap-3 lg:w-[35%]">
                                        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shadow-sm">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest leading-none mb-1">Callback Scheduled For</span>
                                            <span className="text-[15px] font-black text-gray-900 truncate">
                                                {formatDateTime(payload.callbackdate)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Submission Date */}
                                    <div className="hidden lg:flex items-center gap-3 lg:w-[15%]">
                                        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                                            <Calendar className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Requested On</span>
                                            <span className="text-[12px] font-bold text-gray-500 whitespace-nowrap">
                                                {new Date(req.createdat).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status & Actions */}
                                    <div className="flex items-center justify-between lg:justify-end gap-3 lg:flex-1 lg:ml-auto">
                                        <div className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${getStatusStyle(req.status)}`}>
                                            {getStatusIcon(req.status)}
                                            {req.status}
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            {/* Action: Re-open (if Resolved or Junk) */}
                                            {(req.status === 'resolved' || req.status === 'junk') && (
                                                <div className="relative group/tooltip">
                                                    <button 
                                                        disabled={isUpdating === req.key}
                                                        onClick={() => handleStatusUpdate(req.key, 'pending')}
                                                        className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-900 border border-gray-100 hover:text-white rounded-xl transition-all active:scale-90"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                    </button>
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900/95 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-2xl scale-90 group-hover/tooltip:scale-100 origin-bottom border border-white/10">
                                                        Move to Pending
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900/95" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action: Mark as Contacted (if Pending) */}
                                            {req.status === 'pending' && (
                                                <div className="relative group/tooltip">
                                                    <button 
                                                        disabled={isUpdating === req.key}
                                                        onClick={() => handleStatusUpdate(req.key, 'contacted')}
                                                        className="w-10 h-10 flex items-center justify-center bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl transition-all active:scale-90"
                                                    >
                                                        <Phone className="w-4 h-4" />
                                                    </button>
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900/95 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-2xl scale-90 group-hover/tooltip:scale-100 origin-bottom border border-white/10">
                                                        Mark as Contacted
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900/95" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action: Mark as Resolved (if NOT Resolved) */}
                                            {req.status !== 'resolved' && (
                                                <div className="relative group/tooltip">
                                                    <button 
                                                        disabled={isUpdating === req.key}
                                                        onClick={() => handleStatusUpdate(req.key, 'resolved')}
                                                        className="w-10 h-10 flex items-center justify-center bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-xl transition-all active:scale-90 shadow-sm shadow-emerald-500/10"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900/95 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-2xl scale-90 group-hover/tooltip:scale-100 origin-bottom border border-white/10">
                                                        Mark as Resolved
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900/95" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action: Mark as Junk (if NOT Junk) */}
                                            {req.status !== 'junk' && (
                                                <div className="relative group/tooltip">
                                                    <button 
                                                        disabled={isUpdating === req.key}
                                                        onClick={() => handleStatusUpdate(req.key, 'junk')}
                                                        className="w-10 h-10 flex items-center justify-center bg-red-50 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all active:scale-90"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900/95 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-2xl scale-90 group-hover/tooltip:scale-100 origin-bottom border border-white/10">
                                                        Mark as Junk
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900/95" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
