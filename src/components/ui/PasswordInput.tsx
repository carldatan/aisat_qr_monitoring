'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, id, ...props }, ref) => {
    const [show, setShow] = useState(false)
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="relative w-full">
        <input
          ref={ref}
          id={inputId}
          type={show ? 'text' : 'password'}
          placeholder=" "
          className={cn(
            'peer w-full px-3.5 pt-5 pb-2 pr-16 bg-white text-gray-800 border border-border rounded',
            'font-mono text-sm',
            'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary',
            'transition-colors placeholder-transparent',
            className
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            'absolute left-3.5 top-3.5 text-sm text-gray-400 font-mono',
            'transition-all duration-150 pointer-events-none',
            'peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-primary',
            'peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-500'
          )}
        >
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-primary text-xs font-bold font-mono hover:text-primary-dark"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    )
  }
)
PasswordInput.displayName = 'PasswordInput'
