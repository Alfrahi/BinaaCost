import * as React from "react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

export interface TableActionButtonProps
  extends React.ComponentPropsWithoutRef<typeof Button> {
  title?: string;
  ariaLabel?: string;
}

const TableActionButton = React.forwardRef<
  React.ElementRef<typeof Button>,
  TableActionButtonProps
>(({ className, title, ariaLabel, children, ...props }, ref) => {
  const accessibleName =
    ariaLabel || title || "Action";
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", className)}
      title={title}
      aria-label={accessibleName}
      {...props}
    >
      {children}
    </Button>
  );
});

TableActionButton.displayName = "TableActionButton";

export { TableActionButton };
