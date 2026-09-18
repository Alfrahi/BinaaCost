import { Button } from "@/shared/components/ui/button";
import { cn, getIconMarginClass } from "@/shared/lib/utils";
import { X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface Props {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
  isSelectMode?: boolean;
  onToggleSelectMode?: () => void;
}

export function BulkActionBar({
  count,
  onClear,
  children,
  isSelectMode = false,
  onToggleSelectMode,
}: Props) {
  const { t } = useTranslation("common");

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 start-0 end-0 z-modal bg-card border-t border-border shadow-xl px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 border-e border-border pe-4 me-2">
            <span className="font-semibold text-sm whitespace-nowrap">
              {count} {t("selected", "selected")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              className="h-11 w-11 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-between gap-4 overflow-x-auto">
            <div className="flex items-center gap-2">
              {children}
            </div>
            {onToggleSelectMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleSelectMode}
                className="h-11 text-sm whitespace-nowrap"
              >
                {isSelectMode
                  ? <Check className={cn("w-4 h-4", getIconMarginClass())} />
                  : <Check className={cn("w-4 h-4 opacity-0", getIconMarginClass())} />}
                {isSelectMode
                  ? t("project_detail:selectModeOn")
                  : t("project_detail:selectModeOff")}
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
