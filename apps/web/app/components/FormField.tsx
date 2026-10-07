import type { ReactNode } from "react";

export interface FormFieldProps {
  label: string;
  name: string;
  as?: "input" | "textarea" | "select";
  type?: string;
  defaultValue?: string | number;
  value?: string | number;
  placeholder?: string;
  required?: boolean;
  error?: string;
  help?: string;
  rows?: number;
  children?: ReactNode;
  className?: string;
  controlClassName?: string;
  disabled?: boolean;
  autoComplete?: string;
  min?: number;
  max?: number;
  step?: string | number;
  /** Optional controlled callback; when provided the field becomes controlled. */
  onChange?: (value: string) => void;
}

export function FormField({
  label,
  name,
  as = "input",
  type = "text",
  defaultValue,
  value,
  placeholder,
  required,
  error,
  help,
  rows = 6,
  children,
  className = "",
  controlClassName = "",
  disabled,
  autoComplete,
  min,
  max,
  step,
  onChange,
}: FormFieldProps) {
  const id = `field-${name}`;
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  const controlClass = [
    "w-full",
    as === "input" ? "input" : as === "textarea" ? "textarea" : "select",
    error
      ? as === "input"
        ? "input-error"
        : as === "textarea"
          ? "textarea-error"
          : "select-error"
      : "",
    controlClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const shared = {
    id,
    name,
    required,
    disabled,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  } as const;

  const valueProps =
    value !== undefined ? { value } : { defaultValue };
  const changeProps = onChange
    ? { onChange: (event: { target: { value: string } }) => onChange(event.target.value) }
    : {};

  return (
    <div className={`w-full ${className}`}>
      <label className="label" htmlFor={id}>
        <span className="text-sm font-medium">
          {label}
          {required ? <span className="text-error"> *</span> : null}
        </span>
      </label>

      {as === "input" ? (
        <input
          {...shared}
          {...valueProps}
          {...changeProps}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          min={min}
          max={max}
          step={step}
          className={controlClass}
        />
      ) : as === "textarea" ? (
        <textarea
          {...shared}
          {...valueProps}
          {...changeProps}
          rows={rows}
          placeholder={placeholder}
          className={controlClass}
        />
      ) : (
        <select {...shared} {...valueProps} {...changeProps} className={controlClass}>
          {children}
        </select>
      )}

      {help ? (
        <p id={helpId} className="label">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="label text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
