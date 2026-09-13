import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  label?: React.ReactNode;
  className?: string;
}

export default function LoadingState({ label, className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-8",
        className,
      )}
    >
      <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
      {label && <p className="text-sm text-muted-foreground mt-3">{label}</p>}
    </div>
  );
}