import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

export const Tabs      = TabsPrimitive.Root
export const TabsList  = ({ className, ...props }) => (
  <TabsPrimitive.List
    className={cn('flex gap-1 p-1 rounded-xl bg-raised border border-border', className)}
    {...props}
  />
)
export const TabsTrigger = ({ className, ...props }) => (
  <TabsPrimitive.Trigger
    className={cn(
      'flex-1 h-9 rounded-lg text-sm font-medium text-muted transition-all',
      'data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:font-semibold',
      className
    )}
    {...props}
  />
)
export const TabsContent = TabsPrimitive.Content
