import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Assembly, AssemblyItem } from "@/types/assemblies";
import { useAssemblyItems } from "@/hooks/useAssemblyItems";
import { AssemblyItemForm } from "./AssemblyItemForm";
import { AssemblyItemsTable } from "./AssemblyItemsTable";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecord } from "@/lib/pb-mapper";
import { handleError } from "@/utils/toast";
import { useAuth } from "@/components/AuthProvider";
import { cn } from "@/lib/utils";
import { useSettingsOptions } from "@/hooks/useSettingsOptions";
import { useLibrarySyncManager } from "@/hooks/useLibrarySyncManager";

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
        <h3 className="font-semibold text-lg text-foreground">
          {t("resources:assemblies.itemsList")} ({items.length})
        </h3>
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
        <div className="text-center py-8 text-sm text-muted-foreground">
          {t("common:noItems")}
        </div>
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
    return (
      <div className="flex items-center justify-center h-64 text-sm">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (assemblyError) {
    return (
      <div className="text-destructive text-base">
        {t("common:error")}: {assemblyError.message}
      </div>
    );
  }

  if (!assembly) {
    return (
      <div className="text-center py-8 text-base text-muted-foreground">
        {t("resources:assemblies.notFound")}
      </div>
    );
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
          <h2 className="text-xl font-bold text-foreground">
            {assembly.name}
          </h2>
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
