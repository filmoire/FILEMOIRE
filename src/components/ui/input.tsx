import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-md border border-line bg-white px-3.5 text-[16px] text-ink placeholder:text-ink-soft shadow-[inset_0_1px_2px_rgba(52,32,45,.04)] transition-colors hover:border-or focus-visible:border-prune focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-terre/40 disabled:bg-creme-200 disabled:text-ink-muted aria-[invalid=true]:border-danger";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(base, "h-12", className)} {...p} />
));
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(base, "min-h-[140px] py-3 leading-relaxed", className)} {...p} />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select ref={ref} className={cn(base, "h-12 pr-8", className)} {...p} />
));
Select.displayName = "Select";
