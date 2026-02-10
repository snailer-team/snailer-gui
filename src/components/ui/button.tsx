import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border border-[color:var(--color-border)] bg-[color:var(--color-panel)] text-[color:var(--color-text-primary)] shadow-[var(--shadow-sm)] hover:bg-[#f8fafc]',
        primary:
          'bg-[color:var(--color-primary)] text-white shadow-[var(--shadow-sm)] hover:bg-black',
        ghost: 'text-[color:var(--color-text-secondary)] hover:bg-[#e9edf3] hover:text-[color:var(--color-text-primary)]',
        destructive: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-9 px-4',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'
