import React from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Heading } from "@/components/ui/heading";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumb?: boolean;
  className?: string;
}

export default function PageHeader({
  title,
  description,
  actions,
  breadcrumb = true,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {breadcrumb && <Breadcrumbs />}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <Heading level={1}>{title}</Heading>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}