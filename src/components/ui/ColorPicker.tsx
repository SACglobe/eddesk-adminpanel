"use client";

import React, { useState } from 'react';
import { Pipette } from 'lucide-react';

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    label?: string;
}

const PRESET_COLORS = [
    "#F54927", "#111827", "#2563eb", "#ebb017", "#10b981", "#8b5cf6", 
    "#ec4899", "#f97316", "#06b6d4", "#64748b", "#3f6212", "#9f1239"
];

const ColorPicker = ({ value, onChange, label = "Select Color" }: ColorPickerProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative w-full">
            {label && <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest pl-2 mb-2">{label}</label>}
            
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={value || "#F54927"}
                        onChange={e => onChange(e.target.value)}
                        className="w-full px-6 py-4 pl-14 bg-gray-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-red-100 transition-all text-[15px] font-bold outline-none shadow-inner"
                        placeholder="#HEXCODE"
                    />
                    <div 
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full shadow-sm border border-gray-100"
                        style={{ backgroundColor: value || "#F54927" }}
                    />
                </div>
                
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-14 h-14 bg-gray-50 border-2 border-transparent hover:border-red-100 hover:bg-white rounded-2xl flex items-center justify-center text-gray-400 hover:text-[#F54927] transition-all shadow-inner group"
                    >
                        <Pipette size={20} className="group-hover:rotate-12 transition-transform" />
                    </button>

                    {isOpen && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
                            <div className="absolute bottom-full right-0 mb-4 bg-white border border-gray-200 rounded-[32px] shadow-2xl z-40 p-6 w-64 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <h4 className="text-[12px] font-black text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-50 pb-2">Presets</h4>
                                <div className="grid grid-cols-4 gap-3 mb-6">
                                    {PRESET_COLORS.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => {
                                                onChange(color);
                                                setIsOpen(false);
                                            }}
                                            className={`w-10 h-10 rounded-xl transition-all hover:scale-110 shadow-sm ${value === color ? 'ring-4 ring-gray-100 scale-105' : 'hover:shadow-md'}`}
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-[12px] font-black text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">Custom</h4>
                                    <input
                                        type="color"
                                        value={value || "#F54927"}
                                        onChange={e => onChange(e.target.value)}
                                        className="w-full h-12 rounded-xl bg-transparent cursor-pointer p-0 border-0"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ColorPicker;
