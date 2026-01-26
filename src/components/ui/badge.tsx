import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-black/5 text-[color:var(--color-text-secondary)]',
        success: 'bg-[color:var(--color-success)]/60 text-black',
        warning: 'bg-[color:var(--color-warning)]/70 text-black',
        error: 'bg-[color:var(--color-error)]/70 text-black',
        info: 'bg-[color:var(--color-info)]/60 text-black',
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

