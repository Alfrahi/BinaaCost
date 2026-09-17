import { useState, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Heading } from "@/shared/components/ui/heading";
import EmptyState from "@/shared/components/ui/EmptyState";
import { Plus, ArrowLeft, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { useTranslation } from "react-i18next";
import { Assembly, AssemblyItem } from "@/features/cost-library/assemblies/types/assemblies";
import { useAssemblyItems } from "@/features/projects/project-costs/hooks/useAssemblyItems";
import { AssemblyItemForm } from "./AssemblyItemForm";
import { AssemblyItemsTable } from "./AssemblyItemsTable";
import DeleteConfirmationDialog from "@/shared/components/DeleteConfirmationDialog";
import LoadingState from "@/shared/components/ui/LoadingState";
import { useQuery } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecord } from "@/shared/lib/pb-mapper";
import { handleError } from "@/shared/lib/toast";
import { useAuth } from "@/features/auth";
import { cn } from "@/shared/lib/utils";
import { useSettingsOptions } from "@/features/admin/hooks/useSettingsOptions";
import { useLibrarySyncManager } from "@/features/cost-library/hooks/useLibrarySyncManager";

interface AssemblyDetailProps {
  assemblyId: string;
  onBack: () => void;
}

interface AssemblyItemManagerProps {
  assemblyId: string;
  items: AssemblyItem[];
  materialUnits: { value: string; label: string }[];
  isLoadingMaterialUnits: boolean;
  rentalOptions: { value: string; label: string }[];
  isLoadingRentalOptions: boolean;
  periodUnits: { value: string; label: string }[];
  isLoadingPeriodUnits: boolean;
  additionalCategories: { value: string; label: string }[];
  isLoadingAdditionalCategories: boolean;
}

function AssemblyItemManager({
  assemblyId,
  items,
  materialUnits,
  isLoadingMaterialUnits,
  rentalOptions,
  isLoadingRentalOptions,
  periodUnits,
  isLoadingPeriodUnits,
  additionalCategories,
  isLoadingAdditionalCategories,
}: AssemblyItemManagerProps) {
  const { t } = useTranslation(["resources", "common", "project_detail"]);
  const { user } = useAuth();
  const { createItem, updateItem, deleteItem } = useAssemblyItems(assemblyId);

  const { createItem: createLibraryMaterial } = useLibrarySyncManager({
    tableName: "library_materials",
    queryKey: ["library_materials"],
    userId: user?.id,
    page: 0,
    pageSize: 1000,
    select: "*",
    order: "name",
  });
  const { createItem: createLibraryLabor } = useLibrarySyncManager({
    tableName: "library_labor",
    queryKey: ["library_labor"],
    userId: user?.id,
    page: 0,
    pageSize: 1000,
    select: "*",
    order: "worker_type",
  });
  const { createItem: createLibraryEquipment } = useLibrarySyncManager({
    tableName: "library_equipment",
    queryKey: ["library_equipment"],
    userId: user?.id,
    page: 0,
    pageSize: 1000,
    select: "*",
    order: "name",
  });

  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AssemblyItem | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<AssemblyItem | null>(
    null,
  );
  const [initialItemType, setInitialItemType] = useState<
    "material" | "labor" | "equipment" | "additional"
  >("material");

  const handleItemSubmit = useCallback(
    async (
      values: Omit<
        AssemblyItem,
        "id" | "user_id" | "created_at" | "updated_at" | "assembly_id"
      >,
    ) => {
      if (!user?.id) {
        handleError(new Error(t("common:mustBeLoggedIn")));
        return;
      }
      try {
        if (editingItem) {
          await updateItem.mutateAsync({ id: editingItem.id, ...values });
        } else {
          await createItem.mutateAsync({
            ...values,
            assembly_id: assemblyId,
            user_id: user.id,
          });
        }

        switch (values.item_type) {
          case "material": {
            const itemToSync = {
              name: values.description,
              description: null,
              unit: values.unit || "unit",
              unit_price: values.unit_price,
              user_id: user.id,
            };
            await createLibraryMaterial.mutateAsync(itemToSync);
            break;
          }
          case "labor": {
            const itemToSync = {
              worker_type: values.description,
              daily_rate: values.unit_price,
              user_id: user.id,
            };
            await createLibraryLabor.mutateAsync(itemToSync);
            break;
          }
          case "equipment": {
            const equipmentDetails = values.details as any;
            const itemToSync = {
              name: values.description,
              type: equipmentDetails?.type ?? null,
              rental_or_purchase:
                equipmentDetails?.rental_or_purchase || "Rental",
              cost_per_period: values.unit_price,
              period_unit: values.unit || "Day",
              user_id: user.id,
            };
            await createLibraryEquipment.mutateAsync(itemToSync);
            break;
          }
          case "additional":
            break;
        }

        setItemFormOpen(false);
        setEditingItem(null);
      } catch (error: any) {
        handleError(error);
      }
    },
    [
      user?.id,
      t,
      editingItem,
      updateItem,
      createItem,
      assemblyId,
      createLibraryMaterial,
      createLibraryLabor,
      createLibraryEquipment,
    ],
  );

  const openItemForm = useCallback(
    (
      type: "material" | "labor" | "equipment" | "additional",
      item?: AssemblyItem,
    ) => {
      setInitialItemType(type);
      setEditingItem(item || null);
      setItemFormOpen(true);
    },
    [],
  );

  const closeItemForm = useCallback(() => {
    setItemFormOpen(false);
    setEditingItem(null);
  }, []);

  const handleDeleteItem = useCallback(async () => {
    if (!deleteItemTarget) return;
    try {
      await deleteItem.mutateAsync({ id: deleteItemTarget.id });
      setDeleteItemTarget(null);
    } catch (error: any) {
      handleError(error);
    }
  }, [deleteItemTarget, deleteItem]);

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <Heading level={3} className="text-foreground">
          {t("resources:assemblies.itemsList")} ({items.length})
        </Heading>
        {!itemFormOpen && (
          <Button
            onClick={() => openItemForm("material")}
            size="icon"
            aria-label={t("common:add")}
            className="text-sm"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {itemFormOpen && (
        <AssemblyItemForm
          initialData={editingItem || undefined}
          initialType={initialItemType}
          onSubmit={handleItemSubmit}
          onCancel={closeItemForm}
          isSubmitting={createItem.isPending || updateItem.isPending}
          materialUnits={materialUnits}
          isLoadingMaterialUnits={isLoadingMaterialUnits}
          rentalOptions={rentalOptions}
          isLoadingRentalOptions={isLoadingRentalOptions}
          periodUnits={periodUnits}
          isLoadingPeriodUnits={isLoadingPeriodUnits}
          additionalCategories={additionalCategories}
          isLoadingAdditionalCategories={isLoadingAdditionalCategories}
        />
      )}

      {items.length === 0 && !itemFormOpen ? (
        <EmptyState message={t("common:noItems")} />
      ) : (
        <AssemblyItemsTable
          items={items}
          onEdit={(item) => openItemForm(item.item_type, item)}
          onDelete={setDeleteItemTarget}
          materialUnits={materialUnits}
          periodUnits={periodUnits}
          additionalCategories={additionalCategories}
        />
      )}

      <DeleteConfirmationDialog
        open={!!deleteItemTarget}
        onOpenChange={() => setDeleteItemTarget(null)}
        onConfirm={handleDeleteItem}
        itemName={deleteItemTarget?.description}
        loading={deleteItem.isPending}
      />
    </Card>
  );
}

export function AssemblyDetail({ assemblyId, onBack }: AssemblyDetailProps) {
  const { t, i18n } = useTranslation(["resources", "common"]);

  const { options: materialUnits, isLoading: isLoadingMaterialUnits } =
    useSettingsOptions("material_unit");
  const { options: rentalOptions, isLoading: isLoadingRentalOptions } =
    useSettingsOptions("equipment_rental_purchase");
  const { options: periodUnits, isLoading: isLoadingPeriodUnits } =
    useSettingsOptions("equipment_period_unit");
  const {
    options: additionalCategories,
    isLoading: isLoadingAdditionalCategories,
  } = useSettingsOptions("additional_cost_category");

  const {
    data: assembly,
    isLoading: isLoadingAssembly,
    error: assemblyError,
  } = useQuery<Assembly>({
    queryKey: ["assembly", assemblyId],
    queryFn: async () =>
      mapRecord<Assembly>(
        await pb.collection("cost_assemblies").getOne(assemblyId!),
      ),
    enabled: !!assemblyId,
  });

  const {
    itemsQuery: { data: items = [], isLoading: isLoadingItems },
  } = useAssemblyItems(assemblyId || undefined);

  if (isLoadingAssembly || isLoadingItems) {
    return <LoadingState className="h-64" />;
  }

  if (assemblyError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="text-base">{t("common:error")}</AlertTitle>
        <AlertDescription className="text-sm">{assemblyError.message}</AlertDescription>
      </Alert>
    );
  }

  if (!assembly) {
    return <EmptyState message={t("resources:assemblies.notFound")} />;
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label={t("common:back")}
        >
          <ArrowLeft
            className={cn("w-5 h-5", i18n.dir() === "rtl" && "rotate-180")}
            aria-hidden="true"
          />
        </Button>
        <div>
          <Heading level={2} className="text-foreground">
            {assembly.name}
          </Heading>
          <p className="text-sm text-muted-foreground">
            {assembly.description || t("common:noDescription")}
          </p>
        </div>
      </div>

      <AssemblyItemManager
        assemblyId={assemblyId}
        items={items}
        materialUnits={materialUnits}
        isLoadingMaterialUnits={isLoadingMaterialUnits}
        rentalOptions={rentalOptions}
        isLoadingRentalOptions={isLoadingRentalOptions}
        periodUnits={periodUnits}
        isLoadingPeriodUnits={isLoadingPeriodUnits}
        additionalCategories={additionalCategories}
        isLoadingAdditionalCategories={isLoadingAdditionalCategories}
      />
    </div>
  );
}
