import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

export function Label({ className, ...props }) {
  return (
    <LabelPrimitive.Root
      className={cn('block text-sm font-medium text-muted mb-1.5', className)}
      {...props}
    />
  )
}
