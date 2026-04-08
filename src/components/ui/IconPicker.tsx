"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { Search, X } from 'lucide-react';
import DynamicIcon from './DynamicIcon';
import { FLUENT_ICONS } from './FluentIcon';

interface IconPickerProps {
    value: string;
    onChange: (iconName: string) => void;
    label?: string;
}

// A curated list of common icons to show by default
const COMMON_ICONS = [
    "Layout", "Info", "Image", "Video", "FileText", "Users", "Calendar", "Star", 
    "Award", "Quote", "Building", "MapPin", "Phone", "Mail", "Globe", "HelpCircle",
    "Zap", "Shield", "Heart", "Bell", "Settings", "Camera", "Mic", "Music",
    "Book", "Briefcase", "Clock", "Coffee", "Compass", "CreditCard", "Database",
    "Eye", "Flag", "Folder", "Gift", "Home", "Key", "Layers", "LifeBuoy", "Link",
    "List", "Lock", "Moon", "Package", "Paperclip", "PieChart", "Play", "Search"
];

// Expanded Categories for School Portfolio needs
const FLUENT_CATEGORIES = {
    "Education": ["graduation", "backpack", "books", "bookmark", "notebook", "pencil", "ruler", "abacus", "student", "teacher", "school", "certificate"],
    "Science": ["atom", "dna", "microscope", "telescope", "test-tube", "petri-dish", "magnet", "brain", "rocket", "bulb"],
    "Sports": ["trophy", "medal-1", "medal-2", "medal-3", "soccer", "basketball", "football", "tennis", "volleyball", "running", "bicycle", "swimming"],
    "Arts & Music": ["palette", "camera", "video", "guitar", "piano", "violin", "trumpet", "drum", "music", "studio-mic", "headphones"],
    "Campus": ["bus", "building", "stadium", "bell", "calendar", "clock", "flag", "globe", "map", "compass-alt"],
    "UI Icons": ["heart", "star", "fire", "shield", "gift", "bulb", "search", "lock", "key", "link", "chart", "money", "sun", "moon", "cloud"]
};

const VOLUMETRIC_SAMPLES = [
    "streamline-plump-color:school-building",
    "streamline-plump-color:graduation-cap",
    "streamline-plump-color:educational-books",
    "streamline-plump-color:pencil",
    "streamline-plump-color:trophy",
    "streamline-plump-color:microscope",
    "streamline-plump-color:artist-palette",
    "streamline-plump-color:music-note",
    "streamline-plump-color:camera",
    "streamline-plump-color:briefcase",
    "streamline-plump-color:calendar",
    "streamline-plump-color:shield",
    "streamline-cyber-color:rocket",
    "streamline-cyber-color:brain",
    "streamline-cyber-color:atom",
    "streamline-cyber-color:globe",
    "streamline-cyber-color:lock",
    "streamline-cyber-color:setting"
];

const IconPicker = ({ value, onChange, label = "Select Icon" }: IconPickerProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<'standard' | 'premium' | 'volumetric'>('standard');
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [openUpward, setOpenUpward] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);

    // Reset category when switching tabs
    useEffect(() => {
        setActiveCategory(null);
    }, [activeTab]);

    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const expectedHeight = 350; // Max height
            setOpenUpward(spaceBelow < expectedHeight);
        }
    }, [isOpen]);

    // Get all icon names from Lucide
    const allLucideIconNames = useMemo(() => {
        return Object.keys(LucideIcons).filter(name => 
            typeof (LucideIcons as any)[name] === 'function' || 
            (typeof (LucideIcons as any)[name] === 'object' && (LucideIcons as any)[name].$$typeof)
        );
    }, []);

    const premiumIconNames = useMemo(() => Object.keys(FLUENT_ICONS).map(name => `fluent:${name}`), []);

    const premiumIconGroups = useMemo(() => {
        const groups: Record<string, string[]> = {};
        Object.entries(FLUENT_CATEGORIES).forEach(([category, icons]) => {
            groups[category] = icons.map(name => `fluent:${name}`);
        });
        return groups;
    }, []);

    const filteredIcons = useMemo(() => {
        if (activeTab === 'standard') {
            const sourceData = searchTerm ? allLucideIconNames : COMMON_ICONS;
            if (!searchTerm) return sourceData;
            return sourceData.filter(name => 
                name.toLowerCase().includes(searchTerm.toLowerCase())
            ).slice(0, 100);
        } else if (activeTab === 'premium') {
            if (searchTerm) {
                return Object.keys(FLUENT_ICONS)
                    .filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(name => `fluent:${name}`);
            }
            if (activeCategory) {
                return premiumIconGroups[activeCategory] || [];
            }
            // Show all if no category and no search
            return Object.keys(FLUENT_ICONS).map(name => `fluent:${name}`);
        } else {
            // Volumetric tab
            if (!searchTerm) return VOLUMETRIC_SAMPLES;
            return VOLUMETRIC_SAMPLES.filter(name => 
                name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
    }, [searchTerm, allLucideIconNames, activeTab, activeCategory, premiumIconGroups]);

    return (
        <div className="relative w-full" ref={triggerRef}>
            {label && <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-2">{label}</label>}
            
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:border-red-500 transition-colors text-left shadow-sm group"
            >
                <div className="w-8 h-8 bg-gray-50 rounded-md flex items-center justify-center text-gray-400 group-hover:text-red-500 transition-colors">
                    <DynamicIcon name={value} size={20} />
                </div>
                <span className="flex-1 text-[14px] font-medium text-gray-700 truncate">
                    {value || "Pick an icon..."}
                </span>
                <div className="text-gray-400">
                    <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
                    <div className={`absolute ${openUpward ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl z-40 overflow-hidden animate-in fade-in ${openUpward ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'} duration-200 flex flex-col`}>
                        {/* Tabs */}
                        <div className="flex border-b border-gray-100 bg-gray-50/50 p-1 gap-1">
                            <button
                                onClick={() => setActiveTab('standard')}
                                className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'standard' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Standard
                            </button>
                            <button
                                onClick={() => setActiveTab('premium')}
                                className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'premium' ? 'bg-white text-[#ebb017] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                3D Emojis
                            </button>
                            <button
                                onClick={() => setActiveTab('volumetric')}
                                className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'volumetric' ? 'bg-white text-emerald-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Volumetric
                            </button>
                        </div>

                        {/* Categories for Premium or Volumetric */}
                        {activeTab === 'premium' && !searchTerm && (
                            <div className="px-2 py-2 border-b border-gray-100 bg-white flex gap-1 overflow-x-auto no-scrollbar scroll-smooth">
                                <button
                                    onClick={() => setActiveCategory(null)}
                                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full whitespace-nowrap transition-all ${!activeCategory ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >
                                    All
                                </button>
                                {Object.keys(FLUENT_CATEGORIES).map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="p-3 border-b border-gray-100 flex items-center gap-2 bg-white">
                            <Search size={16} className="text-gray-400" />
                            <input
                                autoFocus
                                type="text"
                                placeholder={`Search ${activeTab} icons...`}
                                className="flex-1 bg-transparent border-none outline-none text-[14px] font-medium text-gray-700"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm("")} className="text-gray-400 hover:text-gray-600">
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        <div className="max-h-64 overflow-y-auto p-3 grid grid-cols-6 gap-2 no-scrollbar bg-white">
                            {filteredIcons.map((iconName) => (
                                <button
                                    key={iconName}
                                    type="button"
                                    title={iconName}
                                    onClick={() => {
                                        onChange(iconName);
                                        setIsOpen(false);
                                    }}
                                    className={`aspect-square flex items-center justify-center rounded-lg transition-all ${
                                        value === iconName 
                                        ? 'bg-red-50 text-red-600 ring-2 ring-red-500/20' 
                                        : 'hover:bg-gray-50 text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    <DynamicIcon name={iconName} size={20} />
                                </button>
                            ))}
                            {filteredIcons.length === 0 && (
                                <div className="col-span-6 py-8 text-center text-[13px] text-gray-400 font-bold">
                                    No {activeTab} icons found.
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default IconPicker;
