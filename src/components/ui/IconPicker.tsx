"use client";

import React, { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { Search, X } from 'lucide-react';
import DynamicIcon from './DynamicIcon';

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

const IconPicker = ({ value, onChange, label = "Select Icon" }: IconPickerProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Get all icon names from Lucide
    const allIconNames = useMemo(() => {
        return Object.keys(LucideIcons).filter(name => 
            typeof (LucideIcons as any)[name] === 'function' || 
            (typeof (LucideIcons as any)[name] === 'object' && (LucideIcons as any)[name].$$typeof)
        );
    }, []);

    const filteredIcons = useMemo(() => {
        if (!searchTerm) return COMMON_ICONS;
        return allIconNames.filter(name => 
            name.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 100); // Limit results for performance
    }, [searchTerm, allIconNames]);

    return (
        <div className="relative w-full">
            {label && <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>}
            
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
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                            <Search size={16} className="text-gray-400" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search icons..."
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
                        <div className="max-h-64 overflow-y-auto p-3 grid grid-cols-6 gap-2 no-scrollbar">
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
                                <div className="col-span-6 py-8 text-center text-[13px] text-gray-400">
                                    No icons found for "{searchTerm}"
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
