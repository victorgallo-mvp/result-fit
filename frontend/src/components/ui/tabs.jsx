import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

export const Tabs      = TabsPrimitive.Root
export const TabsList  = ({ className, ...props }) => (
  <TabsPrimitive.List
    className={cn('flex gap-1 p-1 rounded-xl bg-raised', className)}
    {...props}
  />
)
export const TabsTrigger = ({ className, ...props }) => (
  <TabsPrimitive.Trigger
    className={cn(
      'flex-1 h-9 rounded-lg text-sm font-medium text-muted transition-all',
      'data-[state=active]:bg-surface data-[state=active]:text-primary data-[state=active]:shadow-sm',
      className
    )}
    {...props}
  />
)
export const TabsContent = TabsPrimitive.Content
