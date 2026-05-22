import { cn } from '@/lib/utils'

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'w-full h-11 px-4 rounded-xl bg-raised border border-border text-primary placeholder:text-muted',
        'focus:outline-none focus:border-accent transition-colors text-sm',
        className
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'w-full px-4 py-3 rounded-xl bg-raised border border-border text-primary placeholder:text-muted',
        'focus:outline-none focus:border-accent transition-colors text-sm resize-none',
        className
      )}
      {...props}
    />
  )
}
