import type { HTMLAttributes } from 'react'

type Props = {
  size?: 'sm' | 'md'
  label?: string
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>

export function VerticalDotsLoader({ size = 'sm', label = 'Loading', className, ...rest }: Props) {
  const dotSize = size === 'md' ? 'h-2 w-2' : 'h-1.5 w-1.5'
  const gap = size === 'md' ? 'gap-1.5' : 'gap-1'

  return (
    <div
      role="status"
      aria-label={label}
      className={['snailer-vdots inline-flex flex-col items-center', gap, className].filter(Boolean).join(' ')}
      {...rest}
    >
      <span className={['snailer-vdot', dotSize, 'rounded-full bg-black'].join(' ')} />
      <span className={['snailer-vdot snailer-vdot-2', dotSize, 'rounded-full bg-black'].join(' ')} />
      <span className={['snailer-vdot snailer-vdot-3', dotSize, 'rounded-full bg-black'].join(' ')} />
      <span className="sr-only">{label}</span>
    </div>
  )
}

