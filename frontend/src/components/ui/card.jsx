import { cn } from '@/lib/utils'

export function Card({ className, ...props }) {
  return <div className={cn('bg-surface rounded-2xl border border-border', className)} {...props} />
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('p-4 pb-0', className)} {...props} />
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-4', className)} {...props} />
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('font-semibold text-primary', className)} {...props} />
}
