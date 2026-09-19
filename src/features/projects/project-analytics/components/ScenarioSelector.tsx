

import { useTranslation } from "react-i18next";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Loader2, Play, Settings } from "lucide-react";
import { cn, getIconMarginClass } from "@/shared/lib/utils";
import { Heading } from "@/shared/components/ui/heading";
import { Card } from "@/shared/components/ui/card";

interface ScenarioSelectorProps {
  scenarios: any[];
  isLoadingScenarios: boolean;
  isSimulating: boolean;
  selectedScenarioId: string | null;
  onSelectScenario: (id: string | null) => void;
  onRunSimulation: () => void;
  onManageScenarios: () => void;
  canEdit: boolean;
}

export function ScenarioSelector({
  scenarios,
  isLoadingScenarios,
  isSimulating,
  selectedScenarioId,
  onSelectScenario,
  onRunSimulation,
  onManageScenarios,
  canEdit,
}: ScenarioSelectorProps) {
  const { t } = useTranslation(["scenario_analysis", "common", "project_tabs"]);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <Heading level={3}>{t("title")}</Heading>
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onManageScenarios}
            className="text-muted-foreground hover:text-foreground"
            aria-label={t("manageScenarios")}
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </Button>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Select
          value={selectedScenarioId || ""}
          onValueChange={onSelectScenario}
          disabled={isLoadingScenarios || isSimulating}
        >
          <SelectTrigger className="w-full text-sm">
            <SelectValue placeholder={t("selectScenario")} />
          </SelectTrigger>
          <SelectContent>
            {isLoadingScenarios ? (
              <SelectItem value="loading" disabled className="text-sm">
                {t("common:loading")}
              </SelectItem>
            ) : scenarios.length === 0 ? (
              <SelectItem value="no-scenarios" disabled className="text-sm">
                {t("noScenarios")}
              </SelectItem>
            ) : (
              scenarios.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-sm">
                  {s.name} {s.is_public && `(${t("public")})`}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {canEdit && (
          <Button
            onClick={onRunSimulation}
            disabled={!selectedScenarioId || isSimulating}
            className="text-sm w-full sm:w-auto"
          >
            {isSimulating ? (
              <>
                <Loader2
                  className={cn("w-4 h-4", getIconMarginClass(), "animate-spin")}
                />
                {t("common:running")}
              </>
            ) : (
              <>
                <Play className={cn("w-4 h-4", getIconMarginClass())} />
                {t("runSimulation")}
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}