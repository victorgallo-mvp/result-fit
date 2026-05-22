import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Select        = SelectPrimitive.Root
export const SelectValue   = SelectPrimitive.Value
export const SelectGroup   = SelectPrimitive.Group
export const SelectLabel   = SelectPrimitive.Label

export function SelectTrigger({ className, children, ...props }) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex items-center justify-between w-full h-11 px-4 rounded-xl',
        'bg-raised border border-border text-sm text-primary',
        'focus:outline-none focus:border-accent transition-colors',
        'data-[placeholder]:text-muted',
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon><ChevronDown size={16} className="text-muted" /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

export function SelectContent({ className, children, ...props }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          'z-[100] min-w-[180px] rounded-xl bg-white border border-border shadow-xl overflow-hidden',
          className
        )}
        position="popper"
        sideOffset={4}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function SelectItem({ className, children, ...props }) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary cursor-pointer',
        'hover:bg-raised focus:bg-raised outline-none',
        'data-[state=checked]:text-accent',
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemIndicator><Check size={14} /></SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}
