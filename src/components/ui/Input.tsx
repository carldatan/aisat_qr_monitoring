import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="relative w-full">
        <input
          ref={ref}
          id={inputId}
          placeholder=" "
          className={cn(
            'peer w-full px-3.5 pt-5 pb-2 bg-white text-gray-800 border border-border rounded',
            'font-mono text-base',
            'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary',
            'transition-colors placeholder-transparent',
            className
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            'absolute left-3.5 top-3.5 text-base text-gray-400 font-mono',
            'transition-all duration-150 pointer-events-none',
            'peer-focus:top-1.5 peer-focus:text-sm peer-focus:text-primary',
            'peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-sm peer-[:not(:placeholder-shown)]:text-gray-500'
          )}
        >
          {label}
        </label>
      </div>
    )
  }
)
Input.displayName = 'Input'
