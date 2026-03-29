"use client";

import React from 'react';
import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';

interface DynamicIconProps extends LucideProps {
  name: string;
}

const DynamicIcon = ({ name, ...props }: DynamicIconProps) => {
  // Try to find the icon by name (case-sensitive normally, but let's be safe)
  // Lucide usually uses PascalCase: "Home", "User", "CheckCircle"
  const IconComponent = (LucideIcons as any)[name];

  if (!IconComponent) {
    // Fallback to a default if not found
    return <LucideIcons.HelpCircle {...props} />;
  }

  return <IconComponent {...props} />;
};

export default DynamicIcon;
