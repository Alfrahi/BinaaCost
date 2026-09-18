"use client";


interface MobileBarProps {
  isMobile: boolean;
  isDirty: boolean;
  currency: string;
  grandTotal: number;
  format: (value: number, currency: string) => string;
  t: (key: string, options?: any) => string;
}

export function MobileBar({ isMobile, isDirty, currency, grandTotal, format, t }: MobileBarProps) {
  if (!isMobile || !isDirty) return null;

  return (
    <div
      className="fixed bottom-0 start-0 end-0 z-modal bg-card border-t border-border shadow-xl p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-lg font-medium">{t("project_detail:profit_pricing.finalProjectTotal")}</span>
          <span className="text-sm text-muted-foreground">({t("project_detail:profit_pricing.editing")})</span>
        </div>
        <span className="text-2xl font-bold tabular-nums">{format(grandTotal, currency)}</span>
      </div>
    </div>
  );
}