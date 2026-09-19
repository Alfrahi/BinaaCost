

import { useTranslation } from "react-i18next";
import { Button } from "@/shared/components/ui/button";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { cn, getIconMarginClass } from "@/shared/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { ScrollArea } from "@/shared/components/ui/scroll-area";

import LoadingState from "@/shared/components/ui/LoadingState";
import EmptyState from "@/shared/components/ui/EmptyState";
import { useAuth } from "@/features/auth";

interface ManageScenariosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarios: any[];
  isLoadingScenarios: boolean;
  canEdit: boolean;
  onCreateNew: () => void;
  onEditScenario: (scenario: any) => void;
  onDeleteScenario: (scenario: any) => void;
}

export function ManageScenariosDialog({
  open,
  onOpenChange,
  scenarios,
  isLoadingScenarios,
  canEdit,
  onCreateNew,
  onEditScenario,
  onDeleteScenario,
}: ManageScenariosDialogProps) {
  const { t } = useTranslation(["scenario_analysis", "common"]);
  const { user } = useAuth();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{t("manageScenarios")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {canEdit && (
            <Button onClick={onCreateNew} className="text-sm">
              <Plus className={cn("w-4 h-4", getIconMarginClass())} />
              {t("createNewScenario")}
            </Button>
          )}
          <h4 className="font-semibold text-base">{t("existingScenarios")}</h4>
          {isLoadingScenarios ? (
            <LoadingState />
          ) : scenarios.length === 0 ? (
            <EmptyState message={t("noScenarios")} />
          ) : (
            <ScrollArea className="h-64 border rounded-lg">
              <div className="divide-y divide-border">
                {scenarios.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 hover:bg-muted">
                    <div>
                      <div className="font-medium text-sm">{s.name} {s.is_public && `(${t("public")})`}</div>
                      <div className="text-xs text-muted-foreground">{s.description || t("common:noDescription")}</div>
                    </div>
                    <div className="flex gap-1">
                      {canEdit && s.user_id === user?.id && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => onEditScenario(s)}
                            aria-label={`${t("common:edit")} ${s.name}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => onDeleteScenario(s)}
                            aria-label={`${t("common:delete")} ${s.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-sm">
            {t("common:close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}