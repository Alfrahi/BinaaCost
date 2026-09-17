"use client";

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Layers, PackagePlus } from "lucide-react";
import { MaterialsTable } from "./MaterialsTable";
import { LaborTable } from "./LaborTable";
import { EquipmentTable } from "./EquipmentTable";
import { AdditionalCostsTable } from "./AdditionalCostsTable";
import ProjectGroupsManager from "../../project-core/components/ProjectGroupsManager";
import AssemblyImporter from "../../project-core/components/AssemblyImporter";
import { cn, getIconMarginClass } from "@/shared/lib/utils";
import { useIsMobile } from "@/shared/hooks/useMobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

interface CostsTabProps {
  projectId: string;
  materials: any[];
  labor: any[];
  equipment: any[];
  additional: any[];
  groups: any[];
  canEdit: boolean;
  currency: string;
  onOpenComments: (item: any, itemType: string) => void;
  materialUnits: { value: string; label: string }[];
  isLoadingMaterialUnits: boolean;
  rentalOptions: { value: string; label: string }[];
  isLoadingRentalOptions: boolean;
  periodUnits: { value: string; label: string }[];
  isLoadingPeriodUnits: boolean;
  additionalCategories: { value: string; label: string }[];
  isLoadingAdditionalCategories: boolean;
  locationFactor?: number;
  locationLabel?: string;
}

export default function CostsTab({
  projectId,
  materials,
  labor,
  equipment,
  additional,
  groups,
  canEdit,
  currency,
  onOpenComments,
  materialUnits,
  isLoadingMaterialUnits,
  rentalOptions,
  isLoadingRentalOptions,
  periodUnits,
  isLoadingPeriodUnits,
  additionalCategories,
  isLoadingAdditionalCategories,
  locationFactor = 1,
  locationLabel,
}: CostsTabProps) {
  const { t } = useTranslation(["project_detail", "project_tabs", "common"]);
  const isMobile = useIsMobile();
  const [showGroupsManager, setShowGroupsManager] = useState(false);
  const [showAssemblyImporter, setShowAssemblyImporter] = useState(false);
  const [activeCostTab, setActiveCostTab] = useState("materials");

  const costTabItems = useMemo(
    () => [
      { value: "materials", labelKey: "project_tabs:materials" },
      { value: "labor", labelKey: "project_tabs:labor" },
      { value: "equipment", labelKey: "project_tabs:equipment" },
      { value: "additional", labelKey: "project_tabs:additional" },
    ],
    [],
  );

  return (
    <div className="space-y-4 text-sm">
      {canEdit && (
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => setShowGroupsManager(true)}
            variant="outline"
            className="text-sm"
          >
            <Layers
              className={cn("w-4 h-4", getIconMarginClass())}
              aria-hidden="true"
            />
            {t("project_detail:groups.manageGroups")}
          </Button>
          <Button
            onClick={() => setShowAssemblyImporter(true)}
            variant="outline"
            className="text-sm"
          >
            <PackagePlus
              className={cn("w-4 h-4", getIconMarginClass())}
              aria-hidden="true"
            />
            {t("project_detail:assembly_importer.importFromAssembly")}
          </Button>
        </div>
      )}

      {canEdit && showGroupsManager && (
        <ProjectGroupsManager
          projectId={projectId}
          groups={groups}
          onClose={() => setShowGroupsManager(false)}
        />
      )}

      {canEdit && showAssemblyImporter && (
        <AssemblyImporter
          projectId={projectId}
          onCancel={() => setShowAssemblyImporter(false)}
        />
      )}

      <Tabs
        value={activeCostTab}
        onValueChange={setActiveCostTab}
        className="w-full bg-card rounded-lg shadow p-4 sm:p-6"
      >
        {isMobile ? (
          <Select value={activeCostTab} onValueChange={setActiveCostTab}>
            <SelectTrigger className="w-full text-sm mb-4">
              <SelectValue placeholder={t("project_tabs:selectCostCategory")} />
            </SelectTrigger>
            <SelectContent>
              {costTabItems.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className="text-sm"
                >
                  {t(item.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <TabsList className="grid w-full grid-cols-4">
            {costTabItems.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {t(item.labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>
        )}

        <TabsContent value="materials" className="mt-4">
          <MaterialsTable
            projectId={projectId}
            materials={materials}
            groups={groups}
            canEdit={canEdit}
            currency={currency}
            onOpenComments={(item) => onOpenComments(item, "material")}
            materialUnits={materialUnits}
            isLoadingMaterialUnits={isLoadingMaterialUnits}
            locationFactor={locationFactor}
            locationLabel={locationLabel}
          />
        </TabsContent>

        <TabsContent value="labor" className="mt-4">
          <LaborTable
            projectId={projectId}
            labor={labor}
            groups={groups}
            canEdit={canEdit}
            currency={currency}
            onOpenComments={(item) => onOpenComments(item, "labor")}
            locationFactor={locationFactor}
            locationLabel={locationLabel}
          />
        </TabsContent>

        <TabsContent value="equipment" className="mt-4">
          <EquipmentTable
            projectId={projectId}
            equipment={equipment}
            groups={groups}
            canEdit={canEdit}
            currency={currency}
            onOpenComments={(item) => onOpenComments(item, "equipment")}
            rentalOptions={rentalOptions}
            isLoadingRentalOptions={isLoadingRentalOptions}
            periodUnits={periodUnits}
            isLoadingPeriodUnits={isLoadingPeriodUnits}
            locationFactor={locationFactor}
            locationLabel={locationLabel}
          />
        </TabsContent>

        <TabsContent value="additional" className="mt-4">
          <AdditionalCostsTable
            projectId={projectId}
            additionalCosts={additional}
            groups={groups}
            canEdit={canEdit}
            currency={currency}
            onOpenComments={(item) => onOpenComments(item, "additional")}
            additionalCategories={additionalCategories}
            isLoadingAdditionalCategories={isLoadingAdditionalCategories}
            locationFactor={locationFactor}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
