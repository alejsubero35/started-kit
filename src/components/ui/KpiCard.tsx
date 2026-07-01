import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type KpiVariant = 'navy' | 'orange' | 'gold' | 'danger' | 'success' | 'teal';

const VARIANT_STYLES: Record<
  KpiVariant,
  { gradient: string; title: string; value: string; icon: string }
> = {
  navy: {
    gradient: 'bg-gradient-to-br from-[#103B73] via-[#164a8f] to-[#1e5fad]',
    title: 'text-white/80',
    value: 'text-white',
    icon: 'text-white/60',
  },
  orange: {
    gradient: 'bg-gradient-to-br from-[#F2811D] via-[#e8872a] to-[#f5a040]',
    title: 'text-white/85',
    value: 'text-white',
    icon: 'text-white/65',
  },
  gold: {
    gradient: 'bg-gradient-to-br from-[#D9AD29] via-[#c99a1f] to-[#e8c04a]',
    title: 'text-[#103B73]/80',
    value: 'text-[#103B73]',
    icon: 'text-[#103B73]/55',
  },
  danger: {
    gradient: 'bg-gradient-to-br from-[#BF2A2A] via-[#a82424] to-[#d64545]',
    title: 'text-white/85',
    value: 'text-white',
    icon: 'text-white/65',
  },
  success: {
    gradient: 'bg-gradient-to-br from-[#2E7D32] via-[#388e3c] to-[#43a047]',
    title: 'text-white/85',
    value: 'text-white',
    icon: 'text-white/65',
  },
  teal: {
    gradient: 'bg-gradient-to-br from-[#0891b2] via-[#0e7490] to-[#06b6d4]',
    title: 'text-white/85',
    value: 'text-white',
    icon: 'text-white/65',
  },
};

export interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ElementType;
  variant?: KpiVariant;
  compact?: boolean;
  className?: string;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  variant = 'navy',
  compact = false,
  className,
}: KpiCardProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-0 shadow-md',
        styles.gradient,
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-6 -left-2 h-16 w-16 rounded-full bg-black/5"
        aria-hidden
      />
      <CardHeader className={cn('relative flex flex-row items-center justify-between', compact ? 'px-3 py-2 pb-1' : 'pb-2')}>
        <CardTitle className={cn('font-medium', compact ? 'text-[11px]' : 'text-sm', styles.title)}>
          {title}
        </CardTitle>
        <Icon className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4', styles.icon)} />
      </CardHeader>
      <CardContent className={cn('relative', compact ? 'px-3 pb-2 pt-0' : '')}>
        <div
          className={cn(
            'font-bold leading-none',
            compact ? 'text-xs truncate' : 'text-2xl',
            styles.value,
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
