import { Button } from "@/shared/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationControlsProps) {
  const { t, i18n } = useTranslation("common");
  const isRtl = i18n.dir() === "rtl";

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-end gap-2 py-4 gap-2 text-sm">
      <div className="text-sm text-muted-foreground">
        {t("pageOf", {
          current: currentPage + 1,
          total: Math.max(1, totalPages),
        })}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(0, currentPage - 1))}
        disabled={currentPage === 0}
        className="flex items-center gap-1 text-sm"
      >
        {isRtl ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
        {t("previous")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
        disabled={currentPage >= totalPages - 1}
        className="flex items-center gap-1 text-sm"
      >
        {t("next")}
        {isRtl ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
