"use client";

import React, { useState, useMemo, useEffect } from "react";
import BaseEditor from "./BaseEditor";
import { useComponentData } from "@/domains/dashboard/hooks/useComponentData";
import { upsertComponentData, deleteComponentData } from "@/domains/dashboard/actions";
import { uploadFile } from "@/lib/supabase/storage";
import { generateId } from "@/lib/generateId";
import MediaUpload from "@/components/ui/MediaUpload";
import { 
    Calendar, 
    ChevronLeft, 
    ChevronRight, 
    Plus, 
    MapPin, 
    Clock, 
    Tag, 
    Trash2, 
    Pencil, 
    Check, 
    X,
    Eye,
    ChevronDown
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getEnrichedConfig } from "../../utils/componentUtils";

interface MonthwiseEventsEditorProps {
    component: any;
    schoolKey: string;
}

export default function MonthwiseEventsEditor({ component, schoolKey }: MonthwiseEventsEditorProps) {
    const config = getEnrichedConfig(component);
    const isEditable = component.iseditable;
    const tableName = (component.componentregistry as any)?.tablename || 'events';
    const router = useRouter();

    // 1. Month Selection State
    const [selectedDate, setSelectedDate] = useState(new Date());
    const selectedMonthStr = useMemo(() => {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }, [selectedDate]);

    // 1.5 Local Date Filter State
    const [selectedDayIso, setSelectedDayIso] = useState<string | null>(null);

    const daysInMonth = useMemo(() => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const numDays = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: numDays }, (_, i) => {
            const d = new Date(year, month, i + 1);
            return {
                day: i + 1,
                name: d.toLocaleString('default', { weekday: 'short' }),
                iso: `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
            };
        });
    }, [selectedDate]);

    // Reset local filter on month change
    useEffect(() => {
        setSelectedDayIso(null);
    }, [selectedMonthStr]);

    // 2. Data Fetching with Range Filter
    const filters = useMemo(() => {
        const startDay = `${selectedMonthStr}-01`;
        // Calculate the first day of the next month for the upper bound
        const nextMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
        const endDay = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

        return {
            logic: 'AND' as const,
            conditions: [
                { field: 'eventdate', operator: 'gte' as const, value: startDay },
                { field: 'eventdate', operator: 'lt' as const, value: endDay }
            ]
        };
    }, [selectedMonthStr, selectedDate]);

    // 1.7 Month/Year Picker State
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [pickerYear, setPickerYear] = useState(selectedDate.getFullYear());

    const {
        records: events,
        isLoading,
        error,
        saveRecord,
        removeRecord
    } = useComponentData({
        tableName,
        schoolKey,
        filters,
        orderBy: 'eventdate',
        initialRecords: []
    });

    // 3. Grouping Logic with Local Filter
    const groupedEvents = useMemo(() => {
        const groups: Record<string, any[]> = {};
        events.forEach(event => {
            const date = event.eventdate;
            // Apply local date filter if set
            if (selectedDayIso && date !== selectedDayIso) return;
            
            if (!groups[date]) groups[date] = [];
            groups[date].push(event);
        });
        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    }, [events, selectedDayIso]);

    // 4. Modal & Editing State
    const [editingItem, setEditingItem] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleCloseModal = () => {
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        setPendingFile(null);
        setPendingPreviewUrl(null);
        setEditingItem(null);
    };

    const handleFileSelect = (file: File) => {
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        const url = URL.createObjectURL(file);
        setPendingFile(file);
        setPendingPreviewUrl(url);
    };

    const handleAddNew = () => {
        // Use selectedDayIso if set, otherwise first day of selected month
        const defaultDate = selectedDayIso || `${selectedMonthStr}-01`;
        setEditingItem({
            key: generateId(),
            schoolkey: schoolKey,
            title: "",
            description: "",
            location: "",
            eventdate: defaultDate,
            starttime: "10:00 AM",
            endtime: "12:00 PM",
            category: "General",
            imageurl: "",
            isactive: true,
            isfeatured: false
        });
    };

    const handleSave = async () => {
        if (!editingItem.title || (!editingItem.imageurl && !pendingFile && !editingItem._usePlaceholder)) return;
        setIsSaving(true);
        try {
            const { _usePlaceholder, ...dataToSave } = editingItem;
            let finalItem = { ...dataToSave };

            if (pendingFile) {
                setIsUploading(true);
                try {
                    const uploadedUrl = await uploadFile(pendingFile, schoolKey, "events");
                    finalItem.imageurl = uploadedUrl;
                } finally {
                    setIsUploading(false);
                }
            }

            await saveRecord(finalItem);
            handleCloseModal();
            router.refresh();
        } catch (err) {
            console.error("Failed to save event:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setSelectedDate(newDate);
    };

    const formatMonthDisplay = (date: Date) => {
        return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    return (
        <BaseEditor
            title="Events Manager"
            description="Manage and schedule events on a monthly basis."
            icon={<Calendar className="w-5 h-5" />}
            error={error}
            isEditable={isEditable}
            component={component}
            headerActions={
                <button
                    onClick={handleAddNew}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#111827] text-white rounded-2xl text-[13px] font-black hover:bg-black transition-all active:scale-95 shadow-xl shadow-gray-200"
                >
                    <Plus className="w-4 h-4" />
                    <span>Create Event</span>
                </button>
            }
        >
            <div className="space-y-12">
                {/* Month Selector UI */}
                <div className="flex flex-col gap-8">
                    <div className="flex items-center justify-between bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => changeMonth(-1)}
                                className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-all border border-transparent hover:border-gray-100"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                                <button 
                                    onClick={() => {
                                        setPickerYear(selectedDate.getFullYear());
                                        setIsPickerOpen(true);
                                    }}
                                    className="group flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 min-w-[200px]"
                                >
                                    <h3 className="text-[20px] font-black text-gray-900 tracking-tight group-hover:text-[#F54927] flex items-center gap-2">
                                        {formatMonthDisplay(selectedDate)}
                                        <ChevronDown className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-y-0.5 transition-all" />
                                    </h3>
                                    <p className="text-[11px] font-black text-[#F54927] uppercase tracking-widest mt-0.5">
                                        Showing {events.length} Events
                                    </p>
                                </button>
                            <button 
                                onClick={() => changeMonth(1)}
                                className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-all border border-transparent hover:border-gray-100"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>

                        <button 
                            onClick={() => setSelectedDate(new Date())}
                            className="px-4 py-2 text-[12px] font-black text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
                        >
                            Go to Today
                        </button>
                    </div>

                    {/* LOCAL - DATE WISE FILTER SCROLLER */}
                    <div className="flex items-center gap-4 bg-white p-4 rounded-[28px] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto no-scrollbar scroll-smooth">
                        <button
                            onClick={() => setSelectedDayIso(null)}
                            className={`flex flex-col items-center justify-center min-w-[60px] h-[74px] rounded-[22px] transition-all duration-300 ${!selectedDayIso ? 'bg-[#111827] text-white shadow-lg shadow-gray-200' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest mb-1">ALL</span>
                        </button>

                        {daysInMonth.map((d) => {
                            const hasEvents = events.some(e => e.eventdate === d.iso);
                            const isActive = selectedDayIso === d.iso;
                            
                            return (
                                <button
                                    key={d.iso}
                                    onClick={() => setSelectedDayIso(d.iso)}
                                    className={`relative flex flex-col items-center justify-center min-w-[60px] h-[74px] rounded-[22px] transition-all duration-300 shrink-0 ${isActive ? 'bg-[#111827] text-white shadow-lg shadow-gray-200' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 active:scale-95'}`}
                                >
                                    <span className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">
                                        {d.name.slice(0, 3)}
                                    </span>
                                    <span className="text-[16px] font-black leading-none">
                                        {d.day}
                                    </span>
                                    
                                    {hasEvents && (
                                        <div className={`absolute bottom-2.5 w-1 h-1 rounded-full ${isActive ? 'bg-[#F54927]' : 'bg-[#F54927]'}`} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Event List Grouped by Date */}
                <div className="space-y-10">
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-gray-400">
                            <div className="w-8 h-8 border-4 border-gray-100 border-t-[#F54927] rounded-full animate-spin" />
                            <p className="text-[13px] font-bold">Synchronizing events...</p>
                        </div>
                    ) : groupedEvents.length === 0 ? (
                        <div className="py-24 flex flex-col items-center justify-center text-center px-6">
                            <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center mb-6 text-gray-200">
                                <Calendar className="w-10 h-10" />
                            </div>
                            <h4 className="text-[18px] font-black text-gray-900 tracking-tight">No events for this month</h4>
                            <p className="text-[14px] text-gray-400 mt-2 max-w-xs leading-relaxed">
                                Use the selector above to navigate or create your first event for {formatMonthDisplay(selectedDate)}.
                            </p>
                            <button 
                                onClick={handleAddNew}
                                className="mt-8 px-8 py-3 bg-white border-2 border-gray-100 rounded-2xl text-[13px] font-black text-gray-900 hover:border-[#F54927]/30 hover:bg-red-50/10 transition-all flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add First Event</span>
                            </button>
                        </div>
                    ) : (
                        groupedEvents.map(([date, dateEvents]) => (
                            <div key={date} className="space-y-6">
                                {/* Date Header */}
                                <div className="flex items-center gap-4 px-2">
                                    <div className="flex flex-col items-center p-3 bg-gray-900 rounded-[20px] min-w-[70px] shadow-lg shadow-gray-200">
                                        <span className="text-[18px] font-black text-white leading-none">
                                            {new Date(date).getDate()}
                                        </span>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                            {new Date(date).toLocaleString('default', { month: 'short' })}
                                        </span>
                                    </div>
                                    <div className="h-px flex-1 bg-gray-100" />
                                </div>

                                {/* Event Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {dateEvents.map(item => (
                                        <div key={item.key} className="group relative bg-white border border-gray-100 rounded-[32px] p-6 hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-500 flex gap-6 overflow-hidden">
                                            {/* Image Sidebar */}
                                            <div className="w-32 h-32 rounded-[24px] bg-gray-50 overflow-hidden shrink-0">
                                                {item.imageurl ? (
                                                    <img src={item.imageurl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                                                        <Calendar className="w-8 h-8" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1 min-w-0 pr-12">
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    <span className="px-3 py-1 bg-red-50 text-[#F54927] text-[9px] font-black uppercase tracking-widest rounded-full">
                                                        {item.category || "General"}
                                                    </span>
                                                    {item.isfeatured && (
                                                        <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest rounded-full">
                                                            Featured
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="text-[17px] font-black text-gray-900 group-hover:text-[#F54927] transition-colors truncate mb-1">
                                                    {item.title}
                                                </h4>
                                                <div className="flex items-center gap-4 text-gray-400 mb-3">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <Clock className="w-3.5 h-3.5 text-gray-300" />
                                                        <span className="text-[12px] font-bold truncate">{item.starttime}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <MapPin className="w-3.5 h-3.5 text-gray-300" />
                                                        <span className="text-[12px] font-bold truncate">{item.location || "On Campus"}</span>
                                                    </div>
                                                </div>
                                                <p className="text-[13px] text-gray-500 line-clamp-2 leading-relaxed font-medium">
                                                    {item.description}
                                                </p>
                                            </div>

                                            {/* STANDARDS: Floating Pen Icon overlay */}
                                            <div className="absolute top-6 right-6 p-3 bg-white rounded-2xl shadow-2xl border border-gray-100 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 flex flex-col gap-2">
                                                <button 
                                                    onClick={() => setEditingItem(item)}
                                                    className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[#F54927] transition-all active:scale-90"
                                                >
                                                    <Pencil className="w-5 h-5" strokeWidth={2.5} />
                                                </button>
                                                <button 
                                                    onClick={() => { if(confirm('Delete this event?')) removeRecord(item.key); }}
                                                    className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-600 transition-all active:scale-90"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Premium Split-View Modal */}
            {editingItem && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-xl animate-in fade-in duration-500" onClick={handleCloseModal} />
                    
                    <div className="relative bg-white w-full max-w-[1000px] h-[85vh] rounded-[48px] overflow-hidden shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] flex animate-in zoom-in-95 duration-500">
                        
                        {/* Left Panel: Live Preview Section */}
                        <div className="w-[380px] bg-gray-50/50 border-r border-gray-100 flex flex-col p-10 overflow-y-auto no-scrollbar">
                            <div className="mb-8">
                                <h4 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em]">Live Preview</h4>
                                <p className="text-[11px] font-medium text-gray-400 mt-1">Real-time event card preview</p>
                            </div>

                            {/* Preview Card */}
                            <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden group">
                                <div className="aspect-video relative overflow-hidden bg-gray-100">
                                    {(pendingPreviewUrl || editingItem.imageurl) ? (
                                        <img 
                                            src={pendingPreviewUrl || editingItem.imageurl} 
                                            className="w-full h-full object-cover transition-transform duration-700" 
                                            alt=""
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-200">
                                            <Calendar className="w-10 h-10 mb-2 opacity-20" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">No Image</span>
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4 p-2 bg-white/90 backdrop-blur-md rounded-xl min-w-[45px] text-center">
                                        <div className="text-[14px] font-black text-gray-900 leading-none">
                                            {editingItem.eventdate ? new Date(editingItem.eventdate).getDate() : '--'}
                                        </div>
                                        <div className="text-[8px] font-black text-[#F54927] uppercase tracking-widest mt-0.5">
                                            {editingItem.eventdate ? new Date(editingItem.eventdate).toLocaleString('default', { month: 'short' }) : 'Mon'}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="flex gap-2 mb-3">
                                        <span className="px-3 py-1 bg-red-50 text-[#F54927] text-[8px] font-black uppercase tracking-widest rounded-full">
                                            {editingItem.category || "General"}
                                        </span>
                                    </div>
                                    <h4 className="text-[16px] font-black text-gray-900 line-clamp-1 mb-2">
                                        {editingItem.title || "Untitled Event"}
                                    </h4>
                                    <div className="flex items-center gap-3 text-gray-400 mb-4">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <Clock className="w-3 h-3" />
                                            <span className="text-[11px] font-bold truncate">{editingItem.starttime}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <MapPin className="w-3 h-3" />
                                            <span className="text-[11px] font-bold truncate">{editingItem.location || "On Campus"}</span>
                                        </div>
                                    </div>
                                    <p className="text-[12px] text-gray-500 line-clamp-2 leading-relaxed font-medium opacity-60">
                                        {editingItem.description || "Enter a description on the right to see it update here..."}
                                    </p>
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="mt-auto p-6 bg-[#111827] rounded-[24px] text-white">
                                <div className="flex items-center gap-3 mb-3">
                                    <Eye className="w-4 h-4 text-[#F54927]" />
                                    <span className="text-[11px] font-black uppercase tracking-widest">Dashboard Sync</span>
                                </div>
                                <p className="text-[12px] text-gray-400 leading-relaxed font-medium">
                                    All modifications are synchronized with the {tableName} datasource immediately after saving.
                                </p>
                            </div>
                        </div>

                        {/* Right Panel: Content Fields */}
                        <div className="flex-1 flex flex-col min-w-0">
                            {/* Modal Header */}
                            <div className="px-12 pt-12 pb-6 flex items-center justify-between">
                                <div>
                                    <h3 className="text-[24px] font-black text-gray-900 tracking-tight">
                                        {events.some(e => e.key === editingItem.key) ? 'Edit Event' : 'Create New Event'}
                                    </h3>
                                    <p className="text-[11px] font-black text-[#F54927] uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                                        <span>•</span> Standardized Event Protocol
                                    </p>
                                </div>
                                <button onClick={handleCloseModal} className="w-14 h-14 flex items-center justify-center bg-gray-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all active:scale-95 group">
                                    <X className="w-7 h-7 group-hover:rotate-90 transition-all duration-300" />
                                </button>
                            </div>

                            {/* Scrollable Form */}
                            <div className="flex-1 overflow-y-auto px-12 pb-12 space-y-10 no-scrollbar">
                                {/* Basic Info Section */}
                                <section className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Event Title</label>
                                        <input
                                            type="text"
                                            value={editingItem.title}
                                            onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                                            className="w-full px-7 py-5 bg-neutral-50/80 border-2 border-transparent focus:bg-white focus:border-[#F54927] rounded-[24px] transition-all text-[15px] font-bold outline-none shadow-sm"
                                            placeholder="e.g. Annual Sports Day 2026"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Target Date</label>
                                            <input
                                                type="date"
                                                value={editingItem.eventdate}
                                                onChange={e => setEditingItem({ ...editingItem, eventdate: e.target.value })}
                                                className="w-full px-7 py-5 bg-neutral-50/80 border-2 border-transparent focus:bg-white focus:border-[#F54927] rounded-[24px] transition-all text-[14px] font-bold outline-none shadow-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Event Category</label>
                                            <select
                                                value={editingItem.category || ""}
                                                onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                                                className="w-full px-7 py-5 bg-neutral-50/80 border-2 border-transparent focus:bg-white focus:border-[#F54927] rounded-[24px] transition-all text-[14px] font-bold outline-none shadow-sm appearance-none cursor-pointer"
                                            >
                                                <option value="General">General</option>
                                                <option value="Academic">Academic</option>
                                                <option value="Arts">Arts & Culture</option>
                                                <option value="Sports">Sports</option>
                                                <option value="Holiday">Holiday</option>
                                                <option value="Workshop">Workshop</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Start Time</label>
                                            <input
                                                type="text"
                                                value={editingItem.starttime}
                                                onChange={e => setEditingItem({ ...editingItem, starttime: e.target.value })}
                                                className="w-full px-7 py-5 bg-neutral-50/80 border-2 border-transparent focus:bg-white focus:border-[#F54927] rounded-[24px] transition-all text-[14px] font-bold outline-none shadow-sm text-center"
                                                placeholder="e.g. 09:00 AM"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Location</label>
                                            <input
                                                type="text"
                                                value={editingItem.location}
                                                onChange={e => setEditingItem({ ...editingItem, location: e.target.value })}
                                                className="w-full px-7 py-5 bg-neutral-50/80 border-2 border-transparent focus:bg-white focus:border-[#F54927] rounded-[24px] transition-all text-[14px] font-bold outline-none shadow-sm"
                                                placeholder="e.g. Main Auditorium"
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Media Section */}
                                <section className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Featured Visual</label>
                                        <MediaUpload
                                            value={editingItem.imageurl || ""}
                                            type="image"
                                            onChange={(url) => setEditingItem({ ...editingItem, imageurl: url, _usePlaceholder: false })}
                                            onFileSelect={handleFileSelect}
                                            isStaged={!!pendingFile}
                                            stagedPreviewUrl={pendingPreviewUrl}
                                            isExternalUploading={isUploading}
                                            schoolKey={schoolKey}
                                            category="events"
                                            label="Event Banner"
                                            description="Upload a photo for this event"
                                            aspectRatio="video"
                                            showPlaceholderCheckbox={true}
                                            isPlaceholderActive={!!editingItem._usePlaceholder}
                                            onPlaceholderToggle={(active) => setEditingItem({ ...editingItem, _usePlaceholder: active, imageurl: active ? "" : editingItem.imageurl })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Public Description</label>
                                        <textarea
                                            value={editingItem.description}
                                            onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                                            rows={5}
                                            className="w-full px-7 py-6 bg-neutral-50/80 border-2 border-transparent focus:bg-white focus:border-[#F54927] rounded-[32px] transition-all text-[14px] font-medium text-gray-700 outline-none resize-none shadow-sm leading-relaxed"
                                            placeholder="Clearly explain the agenda and target audience for this event..."
                                        />
                                    </div>

                                    <div className="flex items-center gap-3 bg-neutral-50/50 p-6 rounded-[32px] border border-gray-100">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                            <Tag className="w-5 h-5 text-[#F54927]" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Visibility Status</p>
                                            <div className="flex items-center gap-6 mt-1">
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={editingItem.isfeatured}
                                                        onChange={e => setEditingItem({ ...editingItem, isfeatured: e.target.checked })}
                                                        className="w-5 h-5 rounded-lg border-2 border-gray-200 text-[#F54927] focus:ring-[#F54927] transition-all"
                                                    />
                                                    <span className="text-[13px] font-bold text-gray-700 group-hover:text-gray-900 transition-colors">Featured on Home Screen</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Standard Action Footer */}
                            <div className="px-12 py-8 bg-gray-50/30 flex items-center justify-between border-t border-gray-100">
                                {events.some(e => e.key === editingItem.key) && (
                                    <button
                                        onClick={() => { if (confirm("Archive this event?")) { removeRecord(editingItem.key); handleCloseModal(); } }}
                                        className="px-6 py-4 text-[13px] font-black text-gray-400 hover:text-red-600 rounded-2xl transition-all active:scale-95 flex items-center gap-3"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Archive Entry</span>
                                    </button>
                                )}

                                <div className="flex gap-4 ml-auto">
                                    <button
                                        onClick={handleCloseModal}
                                        className="px-8 py-4 text-[13px] font-black text-gray-500 hover:text-gray-900 transition-all rounded-2xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={isSaving || isUploading || (!editingItem.imageurl && !pendingFile && !editingItem._usePlaceholder)}
                                        onClick={handleSave}
                                        className="px-12 py-4 bg-neutral-900 text-white text-[14px] font-black rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-50 flex items-center gap-3 min-w-[200px] justify-center"
                                    >
                                        {isSaving || isUploading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>{isUploading ? "Uploading..." : "Processing..."}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>{events.some(e => e.key === editingItem.key) ? 'Update Records' : 'Publish Event'}</span>
                                                <Check className="w-4 h-4" strokeWidth={3} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Month/Year Quick Picker Modal */}
            {isPickerOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setIsPickerOpen(false)}
                    />
                    <div className="relative bg-white w-full max-w-[440px] rounded-[40px] shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-300">
                        {/* Header */}
                        <div className="p-8 border-b border-gray-100">
                            <div className="flex items-center justify-between mb-8">
                                <h4 className="text-[18px] font-black tracking-tight text-gray-900">Select Month</h4>
                                <button 
                                    onClick={() => setIsPickerOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                            
                            <div className="flex items-center justify-between bg-gray-50 p-2 rounded-2xl">
                                <button 
                                    onClick={() => setPickerYear(prev => prev - 1)}
                                    className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-400 hover:text-gray-900"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="text-[16px] font-black text-gray-900">{pickerYear}</span>
                                <button 
                                    onClick={() => setPickerYear(prev => prev + 1)}
                                    className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-400 hover:text-gray-900"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Month Grid */}
                        <div className="p-8 grid grid-cols-3 gap-3">
                            {Array.from({ length: 12 }, (_, i) => {
                                const monthName = new Date(2000, i, 1).toLocaleString('default', { month: 'short' });
                                const isActive = selectedDate.getMonth() === i && selectedDate.getFullYear() === pickerYear;
                                
                                return (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            const nextDate = new Date(pickerYear, i, 1);
                                            setSelectedDate(nextDate);
                                            setIsPickerOpen(false);
                                        }}
                                        className={`py-4 rounded-2xl text-[14px] font-black transition-all ${isActive ? 'bg-[#111827] text-white shadow-lg shadow-gray-200' : 'bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-[#F54927]'}`}
                                    >
                                        {monthName}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </BaseEditor>
    );
}
