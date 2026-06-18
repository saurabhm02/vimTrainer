import React from 'react';

type BadgeVariant = 'default' | 'accent' | 'success' | 'error' | 'warning' | 'muted';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Badge = React.memo(function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  className = '',
}: BadgeProps) {
  const classes = ['badge', `badge--${variant}`, size === 'sm' ? 'badge--sm' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      {dot && <span className="badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
});
