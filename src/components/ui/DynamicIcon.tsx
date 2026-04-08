"use client";

import React from 'react';
import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';
import { Icon as IconifyIcon } from '@iconify/react';
import FluentIcon from './FluentIcon';

interface DynamicIconProps extends LucideProps {
  name: string;
}

const DynamicIcon = ({ name, ...props }: DynamicIconProps) => {
  if (!name) return <LucideIcons.HelpCircle {...props} />;

  // Support Fluent 3D icons
  if (name.startsWith("fluent:")) {
    return <FluentIcon name={name} size={+(props.size || 24)} className={props.className} style={props.style} />;
  }

  // Support generic Iconify icons (e.g. "streamline-plump-color:...")
  if (name.includes(':')) {
    return (
      <IconifyIcon 
        icon={name} 
        width={props.size || 24} 
        height={props.size || 24} 
        className={props.className}
        style={props.style}
      />
    );
  }

  // Try to find the icon by name in Lucide
  const IconComponent = (LucideIcons as any)[name];

  if (!IconComponent) {
    // Fallback to a default
    return <LucideIcons.HelpCircle {...props} />;
  }

  return <IconComponent {...props} />;
};

export default DynamicIcon;
