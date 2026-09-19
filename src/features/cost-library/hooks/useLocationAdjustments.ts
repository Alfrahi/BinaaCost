import { pb } from "@/integrations/pocketbase/client";
import { mapRecords } from "@/integrations/pocketbase/mappers";
import { useAuth } from "@/features/auth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useOfflinePb } from "@/integrations/pocketbase/hooks/useOfflinePb";
import { LocationAdjustment } from "@/features/cost-library/databases/types/databases";

export function useLocationAdjustments(databaseId?: string) {
  const { t } = useTranslation("pages");
  const { user } = useAuth();
  const { useMutation: useOfflineMutation, useQuery: useOfflineQuery } =
    useOfflinePb();

  const queryKey = ["location-adjustments", databaseId, user?.id];

  const locationsQuery = useOfflineQuery<LocationAdjustment[]>({
    queryKey,
    queryFn: async () => {
      if (!databaseId || !user?.id) return [];
      const records = await pb.collection("location_adjustments").getFullList({
        filter: `database_id="${databaseId}" && user_id="${user.id}"`,
      });
      return mapRecords<LocationAdjustment>(records);
    },
    enabled: !!databaseId && !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const optimisticSingleUpdater = (
    old: LocationAdjustment[] | undefined,
    variables: any,
    operation: string,
  ) => {
    const oldData = old ?? [];
    if (operation === "INSERT") {
      return [
        ...oldData,
        {
          ...variables,
          id: variables.id || crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    }
    if (operation === "UPDATE") {
      return oldData.map((item) =>
        item.id === variables.id
          ? {
              ...item,
              ...variables,
              updated_at: new Date().toISOString(),
            }
          : item,
      );
    }
    if (operation === "DELETE") {
      return oldData.filter((item) => item.id !== variables.id);
    }
    return oldData;
  };

  const addLocation = useOfflineMutation<
    Omit<LocationAdjustment, "id" | "created_at" | "updated_at"> & {
      id?: string;
    },
    LocationAdjustment[]
  >({
    queryKey,
    table: "location_adjustments",
    operation: "INSERT",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => {
      toast.success(t("cost_databases.success_location_added"));
    },
    onError: (err: any) =>
      toast.error(t("cost_databases.error_add", { message: err.message })),
  });

  const updateLocation = useOfflineMutation<
    Partial<LocationAdjustment> & { id: string },
    LocationAdjustment[]
  >({
    queryKey,
    table: "location_adjustments",
    operation: "UPDATE",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => {
      toast.success(t("cost_databases.success_location_updated"));
    },
    onError: (err: any) =>
      toast.error(t("cost_databases.error_update", { message: err.message })),
  });

  const deleteLocation = useOfflineMutation<
    { id: string },
    LocationAdjustment[]
  >({
    queryKey,
    table: "location_adjustments",
    operation: "DELETE",
    optimisticUpdater: optimisticSingleUpdater,
    onSuccess: () => {
      toast.success(t("cost_databases.success_location_deleted"));
    },
    onError: (err: any) =>
      toast.error(t("cost_databases.error_delete", { message: err.message })),
  });

  return {
    locations: locationsQuery.data || [],
    isLoading: locationsQuery.isLoading,
    error: locationsQuery.error,
    addLocation,
    updateLocation,
    deleteLocation,
  };
}
