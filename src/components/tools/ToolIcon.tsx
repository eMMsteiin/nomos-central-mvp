import { icons, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolIconProps {
  icon: string;
  color?: string;
  className?: string;
  size?: number;
}

export function ToolIcon({ icon, color, className, size = 16 }: ToolIconProps) {
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
