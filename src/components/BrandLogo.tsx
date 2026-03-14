"use client";

import React from 'react';

interface BrandLogoProps {
    className?: string;
    variant?: 'icon' | 'full';
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function BrandLogo({ className = "", variant = 'full', size = 'md' }: BrandLogoProps) {
    const iconSizes = { sm: 24, md: 32, lg: 40, xl: 52 };
    const fullSizes = { sm: 100, md: 140, lg: 180, xl: 220 };

    const imageSrc = variant === 'icon' ? '/logo-icon.png' : '/logo-full.png';
    const imgSize = variant === 'icon' ? iconSizes[size] : fullSizes[size];

    const imgStyle: React.CSSProperties = variant === 'icon'
        ? { width: imgSize, height: imgSize, objectFit: 'contain' }
        : { width: imgSize, height: 'auto', objectFit: 'contain' };

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <img
                src={imageSrc}
                alt="EdDesk Logo"
                style={imgStyle}
            />
        </div>
    );
}
