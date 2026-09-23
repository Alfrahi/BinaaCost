

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useScenarioManager } from "@/features/projects/project-analytics/hooks/useScenarioManager";
import { useProjectSimulator } from "@/features/projects/project-analytics/hooks/useProjectSimulator";
import { useProjectRisks } from "@/features/projects/project-costs/hooks/useProjectRisks";
import { ScenarioSelector } from "./ScenarioSelector";
import { SimulationResults } from "./SimulationResults";
import { ManageScenariosDialog } from "./ManageScenariosDialog";
import { ScenarioFormDialog } from "./ScenarioFormDialog";
import DeleteConfirmationDialog from "@/shared/components/DeleteConfirmationDialog";
import { toast } from "sonner";

export function ScenarioAnalysisTab({
  projectId,
  currency,
  canEdit,
  additionalCategories,
  riskProbabilities,
}: {
  projectId: string;
  currency: string;
  canEdit: boolean;
  additionalCategories: { value: string; label: string }[];
  riskProbabilities: { value: string; label: string }[];
}) {
  const { t } = useTranslation(["scenario_analysis", "common"]);

  const { data: projectRisks = [] } = useProjectRisks(projectId);

  const {
    scenarios,
    isLoadingScenarios,
    addScenario,
    updateScenario,
    deleteScenario,
    isAddingScenario,
    isUpdatingScenario,
    isDeletingScenario,
    formatRulesForDb,
    formatRulesForForm,
  } = useScenarioManager();

  const {
    simulationResult,
    isSimulating,
    runSimulation,
    clearSimulationResult,
  } = useProjectSimulator();

  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [isManageScenariosOpen, setIsManageScenariosOpen] = useState(false);
  const [isScenarioFormOpen, setIsScenarioFormOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<any | null>(null);
  const [deleteTargetScenario, setDeleteTargetScenario] = useState<any | null>(null);

  const handleRunSimulation = useCallback(async () => {
    if (!selectedScenarioId) {
      toast.error(t("selectScenarioToRun"));
      return;
    }
    const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId);
    if (!selectedScenario) {
      toast.error(t("scenarioNotFound"));
      return;
    }
    await runSimulation(projectId, selectedScenario);
  }, [selectedScenarioId, scenarios, projectId, runSimulation, t]);

  const openScenarioForm = useCallback((scenario: any | null) => {
    setEditingScenario(scenario);
    setIsScenarioFormOpen(true);
  }, []);

  const handleScenarioFormOpenChange = useCallback((open: boolean) => {
    setIsScenarioFormOpen(open);
    if (!open) {
      setEditingScenario(null);
    }
  }, []);

  const handleDeleteScenario = useCallback((scenario: any) => {
    setDeleteTargetScenario(scenario);
  }, []);

  const handleManageCreateNew = useCallback(() => {
    openScenarioForm(null);
  }, [openScenarioForm]);

  const handleManageEdit = useCallback((scenario: any) => {
    openScenarioForm(scenario);
  }, [openScenarioForm]);

  return (
    <div className="space-y-6 text-sm">
      <ScenarioSelector
        scenarios={scenarios}
        isLoadingScenarios={isLoadingScenarios}
        isSimulating={isSimulating}
        selectedScenarioId={selectedScenarioId}
        onSelectScenario={setSelectedScenarioId}
        onRunSimulation={handleRunSimulation}
        onManageScenarios={() => setIsManageScenariosOpen(true)}
        canEdit={canEdit}
      />

      <SimulationResults
        simulationResult={simulationResult}
        currency={currency}
        onClose={clearSimulationResult}
      />

      <ManageScenariosDialog
        open={isManageScenariosOpen}
        onOpenChange={setIsManageScenariosOpen}
        scenarios={scenarios}
        isLoadingScenarios={isLoadingScenarios}
        canEdit={canEdit}
        onCreateNew={handleManageCreateNew}
        onEditScenario={handleManageEdit}
        onDeleteScenario={handleDeleteScenario}
      />

      <ScenarioFormDialog
        open={isScenarioFormOpen}
        onOpenChange={handleScenarioFormOpenChange}
        editingScenario={editingScenario}
        scenarios={scenarios}
        currency={currency}
        projectRisks={projectRisks}
        additionalCategories={additionalCategories}
        riskProbabilities={riskProbabilities}
        isAddingScenario={isAddingScenario}
        isUpdatingScenario={isUpdatingScenario}
        formatRulesForDb={formatRulesForDb}
        formatRulesForForm={formatRulesForForm}
        addScenario={addScenario}
        updateScenario={updateScenario}
      />

      <DeleteConfirmationDialog
        open={!!deleteTargetScenario}
        onOpenChange={() => setDeleteTargetScenario(null)}
        onConfirm={async () => {
          if (deleteTargetScenario) {
            const targetId = deleteTargetScenario.id;
            setDeleteTargetScenario(null);
            await deleteScenario(targetId);
          }
        }}
        itemName={deleteTargetScenario?.name}
        loading={isDeletingScenario}
      />
    </div>
  );
}
