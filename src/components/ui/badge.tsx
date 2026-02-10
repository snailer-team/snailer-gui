import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'border-[color:var(--color-border)] bg-[color:var(--color-panel-muted)] text-[color:var(--color-text-secondary)]',
        success: 'border-emerald-200 bg-[color:var(--color-success)] text-emerald-700',
        warning: 'border-amber-200 bg-[color:var(--color-warning)] text-amber-700',
        error: 'border-red-200 bg-[color:var(--color-error)] text-red-700',
        info: 'border-blue-200 bg-[color:var(--color-info)] text-blue-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
