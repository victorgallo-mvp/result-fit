import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog       = DialogPrimitive.Root
export const DialogTrigger= DialogPrimitive.Trigger
export const DialogClose  = DialogPrimitive.Close

export function DialogContent({ children, className, title, ...props }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 left-0 right-0 bottom-0 mx-auto max-w-lg',
          'bg-surface border border-border rounded-t-3xl p-6 pb-safe-bottom',
          'animate-slide-up max-h-[92vh] overflow-y-auto',
          className
        )}
        {...props}
      >
        {title && (
          <div className="flex items-center justify-between mb-5">
            <DialogPrimitive.Title className="text-lg font-bold text-primary">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close className="p-1 rounded-lg text-muted hover:text-primary hover:bg-raised transition-colors">
              <X size={20} />
            </DialogPrimitive.Close>
          </div>
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
