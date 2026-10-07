import type { ReactNode } from "react";

export type AlertStatus = "success" | "error" | "info" | "warning";

const STATUS_CLASS: Record<AlertStatus, string> = {
  success: "alert-success",
  error: "alert-error",
  info: "alert-info",
  warning: "alert-warning",
};

export interface AlertProps {
  status: AlertStatus;
  children: ReactNode;
  className?: string;
}

export function Alert({ status, children, className = "" }: AlertProps) {
  return (
    <div role="alert" className={`alert ${STATUS_CLASS[status]} ${className}`}>
      {children}
    </div>
  );
}
