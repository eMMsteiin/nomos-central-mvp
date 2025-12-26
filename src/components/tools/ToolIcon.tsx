import { icons, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ToolIconProps {
  icon: string;
  color?: string;
  logoUrl?: string;
  className?: string;
  size?: number;
}

export function ToolIcon({ icon, color, logoUrl, className, size = 16 }: ToolIconProps) {
  const [logoError, setLogoError] = useState(false);

  // If we have a logo URL and it hasn't errored, render the image
  if (logoUrl && !logoError) {
    return (
      <img 
        src={logoUrl}
        alt=""
        className={cn("object-contain", className)}
        style={{ width: size, height: size }}
        onError={() => setLogoError(true)}
      />
    );
  }

  // Check if it's an emoji (starts with non-ASCII character)
  const isEmoji = /^\p{Emoji}/u.test(icon);

  if (isEmoji) {
    return (
      <span 
        className={cn("flex items-center justify-center", className)}
        style={{ fontSize: size }}
      >
        {icon}
      </span>
    );
  }

  // Try to get Lucide icon
  const LucideIconComponent = icons[icon as keyof typeof icons] as LucideIcon | undefined;

  if (LucideIconComponent) {
    return (
      <LucideIconComponent 
        className={className}
        style={{ color, width: size, height: size }}
      />
    );
  }

  // Fallback to a generic icon
  const FallbackIcon = icons.ExternalLink;
  return (
    <FallbackIcon 
      className={className}
      style={{ color, width: size, height: size }}
    />
  );
}
