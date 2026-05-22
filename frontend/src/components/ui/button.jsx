import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:pointer-events-none active:scale-95',
  {
    variants: {
      variant: {
        default:   'bg-accent text-white hover:bg-accent-dim',
        secondary: 'bg-raised text-primary border border-border hover:bg-border',
        outline:   'border border-border text-primary hover:bg-raised',
        ghost:     'text-primary hover:bg-raised',
        danger:    'bg-danger/10 text-danger hover:bg-danger/20',
        success:   'bg-success/10 text-success hover:bg-success/20',
      },
      size: {
        sm:   'h-8  px-3 text-sm',
        md:   'h-10 px-4 text-sm',
        lg:   'h-12 px-6 text-base',
        xl:   'h-14 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
)

export function Button({ className, variant, size, asChild, ...props }) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
