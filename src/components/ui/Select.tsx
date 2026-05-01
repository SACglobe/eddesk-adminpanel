"use client";

import { useState, useEffect, useRef } from "react";

export interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    /** Unique ID used to distinguish multiple selects on the same page */
    id?: string;
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    /** Extra classes applied to the trigger button */
    className?: string;
    disabled?: boolean;
}

/**
 * EdDesk Admin Panel — Universal Custom Select
 *
 * Renders a fully custom dropdown that looks identical on every OS/browser.
 * Drop-in replacement for all native <select> elements across the panel.
 *
 * Usage:
 *   <Select
 *     value={selectedValue}
 *     onChange={(v) => setSelectedValue(v)}
 *     options={[{ value: "admin", label: "Admin" }, ...]}
 *     placeholder="Choose a role…"
 *   />
 */
export default function Select({
    id,
    value,
    onChange,
    options,
    placeholder = "Select an option…",
    className = "",
    disabled = false,
}: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((o) => o.value === value);
    const displayLabel = selectedOption?.label ?? placeholder;
    const hasValue = !!selectedOption;

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [isOpen]);

    return (
        <div ref={ref} className={`relative ${className}`} id={id}>
            {/* Trigger */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen((prev) => !prev)}
                className={[
                    "w-full flex items-center justify-between px-4 py-3 bg-white border rounded-xl text-[13px] font-medium transition-all outline-none cursor-pointer",
                    isOpen
                        ? "border-[#F54927]/30 ring-2 ring-[#F54927]/10"
                        : "border-gray-200 hover:border-gray-300",
                    disabled ? "opacity-50 cursor-not-allowed" : "",
                ].join(" ")}
            >
                <span className={hasValue ? "text-gray-800 font-semibold" : "text-gray-400"}>
                    {displayLabel}
                </span>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[999] bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="py-1.5 max-h-60 overflow-y-auto no-scrollbar">
                        {placeholder && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => { onChange(""); setIsOpen(false); }}
                                    className={`w-full flex items-center px-4 py-2.5 text-[12px] font-medium text-left transition-colors ${
                                        !hasValue
                                            ? "bg-[#F54927]/5 text-[#F54927] font-bold"
                                            : "text-gray-400 hover:bg-gray-50"
                                    }`}
                                >
                                    {placeholder}
                                </button>
                                <div className="h-px bg-gray-100 mx-3 my-1" />
                            </>
                        )}

                        {options.map((option) => {
                            const isSelected = value === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => { onChange(option.value); setIsOpen(false); }}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-[13px] text-left transition-colors ${
                                        isSelected
                                            ? "bg-[#F54927]/5 text-[#F54927] font-bold"
                                            : "text-gray-700 font-medium hover:bg-gray-50"
                                    }`}
                                >
                                    <span>{option.label}</span>
                                    {isSelected && (
                                        <svg
                                            className="w-4 h-4 text-[#F54927] shrink-0"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
