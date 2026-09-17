"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const toasterPresets = {
  success: {
    className: "group toast group-[.toaster]:bg-success/10 group-[.toaster]:text-success group-[.toaster]:border-success",
  },
  error: {
    className: "group toast group-[.toaster]:bg-destructive/10 group-[.toaster]:text-destructive group-[.toaster]:border-destructive",
  },
  warning: {
    className: "group toast group-[.toaster]:bg-warning/10 group-[.toaster]:text-warning group-[.toaster]:border-warning",
  },
  info: {
    className: "group toast group-[.toaster]:bg-info/10 group-[.toaster]:text-info group-[.toaster]:border-info",
  },
} as const;

type ToastVariant = keyof typeof toasterPresets;

const defaultToastOptions = {
  classNames: {
    toast:
      "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
    description: "group-[.toast]:text-muted-foreground",
    actionButton:
      "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
    cancelButton:
      "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
  },
} as const;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={defaultToastOptions}
      {...props}
    />
  );
};

export { Toaster, toasterPresets, type ToastVariant };