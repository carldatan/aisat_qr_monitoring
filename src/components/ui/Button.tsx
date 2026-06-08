import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'success' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', fullWidth, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'font-mono font-bold rounded cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-primary text-white border border-primary hover:bg-primary-dark': variant === 'primary',
            'bg-success text-white border border-success hover:opacity-90': variant === 'success',
            'bg-danger text-white border border-danger hover:opacity-90': variant === 'danger',
            'bg-transparent text-primary border border-primary hover:bg-blue-50': variant === 'outline',
            'bg-surface text-gray-700 border border-border hover:bg-gray-100': variant === 'ghost',
          },
          {
            'px-3 py-2 text-sm': size === 'sm',
            'px-4 py-3 text-base': size === 'md',
            'px-4 py-3.5 text-lg': size === 'lg',
          },
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
