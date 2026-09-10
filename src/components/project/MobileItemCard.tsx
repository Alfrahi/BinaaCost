import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface MobileItemCardProps {
  name: string;
  subtitle?: string;
  total: string;
  selected: boolean;
  onToggle: () => void;
  isOwner: boolean;
  actions: React.ReactNode;
}

/**
 * Mobile line-item card: name, qty × rate subtitle, total, and actions.
 * Replaces the horizontally-scrolled table on small screens.
 */
export function MobileItemCard({
  name,
  subtitle,
  total,
  selected,
  onToggle,
  isOwner,
  actions,
}: MobileItemCardProps) {
  return (
    <div
      className={cn(
        "border rounded-lg p-3 bg-card",
        selected && "border-primary",
      )}
    >
      <div className="flex items-start gap-3">
        {isOwner && (
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            aria-label={`Select ${name}`}
            className="mt-1"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{name}</div>
          {subtitle && (
            <div className="text-xs text-muted-foreground mt-0.5">
              <bdi>{subtitle}</bdi>
            </div>
          )}
          <div className="text-sm font-semibold tabular-nums mt-1">
            {total}
          </div>
        </div>
        {actions}
      </div>
    </div>
  );
}