import React from 'react';

// Using a clsx-like function for cleaner class management
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

const baseClasses = "inline-flex items-center justify-center rounded-full font-medium focus:outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm";

const variantClasses = {
  primary: "bg-sky-600 text-white hover:bg-sky-500 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 focus-visible:ring-offset-gray-900",
  secondary: "border border-sky-600 text-sky-500 hover:bg-sky-500/10 dark:border-sky-500 dark:text-sky-400 dark:hover:bg-sky-500/10 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 focus-visible:ring-offset-gray-900",
  ghost: "border border-transparent text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 focus-visible:ring-offset-gray-900",
  chip: "border border-white/15 text-gray-200 hover:bg-white/10",
  danger: "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 focus-visible:ring-offset-gray-900",
  success: "bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-gray-900",
  'danger-ghost': "bg-red-500/10 text-red-500 hover:bg-red-500/20",
  'success-ghost': "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  'warning-ghost': "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
};

const sizeClasses = {
    default: "h-9 px-4",
    sm: "h-8 px-3 text-xs",
    icon: "h-9 w-9",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  active?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'default', active = false, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
            baseClasses, 
            variantClasses[variant],
            sizeClasses[size],
            active && 'bg-sky-600 text-white hover:bg-sky-500 border-transparent',
            className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export default Button;