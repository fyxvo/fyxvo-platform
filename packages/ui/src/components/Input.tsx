import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label?: string;
  readonly hint?: string;
  readonly error?: string;
  readonly leadingAdornment?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, hint, error, leadingAdornment, id, ...props },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="flex w-full flex-col gap-1.5 text-sm">
      {label ? (
        <span className="font-medium text-[var(--fyxvo-text-soft)]">{label}</span>
      ) : null}
      <span
        className={cn(
          "flex items-center gap-3 rounded-xl border bg-[var(--fyxvo-panel-soft)] px-4",
          "transition-[border-color,box-shadow] duration-150",
          "focus-within:ring-2 focus-within:ring-brand-400 focus-within:ring-offset-2 focus-within:ring-offset-[var(--fyxvo-bg)]",
          error
            ? "border-rose-500/70 focus-within:ring-rose-400"
            : "border-[var(--fyxvo-border)] focus-within:border-brand-400/50"
        )}
      >
        {leadingAdornment ? (
          <span className="text-[var(--fyxvo-text-muted)]" aria-hidden="true">
            {leadingAdornment}
          </span>
        ) : null}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "h-11 w-full border-none bg-transparent p-0 text-[var(--fyxvo-text)] outline-none",
            "placeholder:text-[var(--fyxvo-text-muted)]",
            className
          )}
          {...props}
        />
      </span>
      {error ? (
        <span className="text-xs text-rose-500">{error}</span>
      ) : hint ? (
        <span className="text-xs text-[var(--fyxvo-text-muted)]">{hint}</span>
      ) : null}
    </label>
  );
});
