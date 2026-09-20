import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import {
  offlineManager,
  OfflineMutation,
} from "@/shared/lib/offline";
import {
  AlertTriangle,
  RefreshCw,
  Trash2,
  Download,
  ChevronDown,
  ChevronRight,
  Clock,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface DeadLetterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mutations: OfflineMutation[];
}

export function DeadLetterDrawer({
  open,
  onOpenChange,
  mutations,
}: DeadLetterDrawerProps) {
  const { t, i18n } = useTranslation(["common"]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRetry = async (id: string) => {
    setIsProcessing(true);
    try {
      await offlineManager.retryDeadLetter(id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetryAll = async () => {
    setIsProcessing(true);
    try {
      await offlineManager.retryAllDeadLetters();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = async (id: string) => {
    setIsProcessing(true);
    try {
      await offlineManager.dismissDeadLetter(id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearAll = async () => {
    setIsProcessing(true);
    try {
      await offlineManager.clearDeadLetters();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(mutations, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `failed-offline-mutations-${new Date().toISOString().slice(0, 10)}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const isRtl = i18n.dir() === "rtl";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isRtl ? "left" : "right"}
        className="w-full sm:max-w-xl flex flex-col p-0 gap-0"
      >
        <SheetHeader className="p-6 pb-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <SheetTitle className="text-lg">
              {t("common:deadLetterTitle")}
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground mt-1">
            {t("common:deadLetterDesc")}
          </SheetDescription>

          {mutations.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-3">
              <Button
                size="sm"
                variant="default"
                onClick={handleRetryAll}
                disabled={isProcessing}
                className="h-8 text-xs gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t("common:retryAll")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportJson}
                className="h-8 text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {t("common:exportData")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearAll}
                disabled={isProcessing}
                className="h-8 text-xs gap-1.5 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t("common:clearAll")}
              </Button>
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          {mutations.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {t("common:noDeadLetters")}
            </div>
          ) : (
            <div className="space-y-4">
              {mutations.map((m) => {
                const isExpanded = expandedIds.has(m.id);
                return (
                  <div
                    key={m.id}
                    className="border border-border rounded-lg bg-card p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="font-mono text-xs">
                          {m.table}
                        </Badge>
                        <Badge
                          className={cn(
                            "text-xs font-semibold",
                            m.type === "DELETE" || m.type === "BULK_DELETE"
                              ? "bg-destructive/15 text-destructive border-destructive/30"
                              : m.type === "INSERT"
                                ? "bg-success/15 text-success border-success/30"
                                : "bg-primary/15 text-primary border-primary/30",
                          )}
                        >
                          {m.type}
                        </Badge>
                        <span className="flex items-center text-xs text-muted-foreground gap-1 ms-1">
                          <Clock className="w-3 h-3" />
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(m.id)}
                          disabled={isProcessing}
                          className="h-7 px-2 text-xs"
                          aria-label={t("common:retry")}
                        >
                          <RefreshCw className="w-3 h-3 me-1" />
                          {t("common:retry")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDismiss(m.id)}
                          disabled={isProcessing}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                          aria-label={t("common:dismiss")}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {m.error && (
                      <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                        <span className="font-semibold">{t("common:error")}: </span>
                        {m.error}
                      </div>
                    )}

                    <div>
                      <button
                        type="button"
                        onClick={() => toggleExpand(m.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                        {isExpanded
                          ? t("common:hidePayload")
                          : t("common:viewPayload")}
                      </button>

                      {isExpanded && (
                        <pre className="mt-2 p-2.5 rounded-md bg-muted font-mono text-[11px] overflow-x-auto text-foreground border border-border">
                          {JSON.stringify(m.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <SheetFooter className="p-4 border-t border-border bg-muted/20">
          <Button
            variant="outline"
            className="w-full sm:w-auto text-sm"
            onClick={() => onOpenChange(false)}
          >
            {t("common:close")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
