import React from "react";

export const CHART_CONTAINER_HEIGHT_CLASSES =
  "w-full h-[320px] sm:h-[360px] lg:h-[400px]";

export default function ChartContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={CHART_CONTAINER_HEIGHT_CLASSES}>{children}</div>;
}
