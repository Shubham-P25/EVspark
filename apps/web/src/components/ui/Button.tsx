import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({ variant = "primary", size = "md", loading = false, className, children, disabled, ...props }: ButtonProps) {
  const variants = { primary: "bg-primary text-bg hover:bg-text", secondary: "border border-border text-text hover:border-primary hover:text-primary", danger: "border border-red text-red hover:bg-red-dim", ghost: "text-muted hover:bg-surface-3 hover:text-text" };
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" };
  return <button className={cn("inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50", variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>{loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : children}</button>;
}