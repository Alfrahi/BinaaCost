import React from "react";
import { cn } from "@/lib/utils";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export function Heading({
  level = 1,
  className,
  children,
  ...props
}: HeadingProps) {
  const Tag = `h${level}` as const;

  const baseClasses = {
    1: "text-2xl font-bold",
    2: "text-xl font-semibold",
    3: "text-lg font-semibold",
    4: "text-base font-semibold",
    5: "text-sm font-semibold",
    6: "text-xs font-semibold",
  };

  return (
    <Tag className={cn(baseClasses[level], className)} {...props}>
      {children}
    </Tag>
  );
}
