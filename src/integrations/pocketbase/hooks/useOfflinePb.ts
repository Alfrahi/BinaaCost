import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { offlineManager, isNetworkOrTransientError } from "@/shared/lib/offline";
import { executePbMutation } from "@/integrations/pocketbase/executor";
import { ClientResponseError } from "pocketbase";
import { mapRecord } from "@/integrations/pocketbase/mappers";
import { useAuth } from "@/features/auth";
import i18n from "@/i18n";
import {
  PbQueryConfig,
  PbMutationConfig,
} from "@/integrations/pocketbase/utils";

import { handleError } from "@/shared/lib/toast";

export function useOfflinePb() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const useQueryWrapper = <T>({
    queryKey,
    queryFn,
    enabled = true,
    staleTime,
    gcTime,
  }: PbQueryConfig<T>) =>
    useQuery<T, Error | ClientResponseError>({
      queryKey,
      queryFn: async () => {
        try {
          return await queryFn();
        } catch (error) {
          if (isNetworkOrTransientError(error)) {
            offlineManager.setIsOnline(false);
          }
          throw error;
        }
      },
      networkMode: "offlineFirst",
      enabled,
      staleTime,
      gcTime,
    });

  const useMutationWrapper = <TVariables = any, TData = any>({
    queryKey,
    table,
    operation,
    optimisticUpdater,
    onSuccess,
    onError,
    disableOfflineQueue,
  }: PbMutationConfig<TVariables, TData>) =>
    useMutation<TData, Error | ClientResponseError, TVariables>({
      // default networkMode "online" pauses the mutation when the browser is
      // offline — mutationFn would never run and the offline queue below
      // would never engage. offlineFirst lets mutationFn run so it can queue.
      networkMode: "offlineFirst",
      mutationFn: async (payload: TVariables) => {
        if (offlineManager.getIsOnline()) {
          try {
            return await executePbMutation<TData>({ table, operation, payload });
          } catch (error) {
            // OFFL-04: Catch transient network errors and fallback to offline queue
            if (isNetworkOrTransientError(error)) {
              if (disableOfflineQueue) {
                throw error;
              }

              if (!user?.id) {
                throw error;
              }

              offlineManager.setIsOnline(false);

              await offlineManager.addMutation({
                type: operation,
                table,
                payload: payload,
                queryKey: queryKey,
                userId: user.id,
              });

              return payload as unknown as TData;
            }

            throw error;
          }
        } else {
          if (disableOfflineQueue) {
            throw new Error(i18n.t("common:offlineOperationNotAllowed"));
          }

          if (!user?.id) {
            throw new Error(i18n.t("common:mustBeLoggedIn"));
          }

          await offlineManager.addMutation({
            type: operation,
            table,
            payload: payload,
            queryKey: queryKey,
            userId: user.id,
          });
          return payload as unknown as TData;
        }
      },
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey });
        const previousData = queryClient.getQueryData<TData>(queryKey);

        if (optimisticUpdater) {
          queryClient.setQueryData<TData>(queryKey, (old) =>
            optimisticUpdater(old, variables, operation),
          );
        }

        return { previousData };
      },
      onError: (err, variables, context: any) => {
        if (context?.previousData) {
          queryClient.setQueryData(queryKey, context.previousData);
        }
        if (onError) {
          onError(err, variables, context);
        } else {
          handleError(err);
        }
      },
      onSuccess: (data, variables, context) => {
        if (queryKey) {
          if (
            operation === "INSERT" &&
            data &&
            typeof data === "object" &&
            "id" in data &&
            typeof (data as any).id === "string"
          ) {
            const serverId = (data as any).id;
            queryClient.setQueriesData({ queryKey }, (old: any) => {
              if (!old) return old;
              let mapped: any;
              try {
                mapped = mapRecord(data as any);
              } catch {
                mapped = data;
              }
              if (Array.isArray(old)) {
                let replaced = false;
                return old.map((item) => {
                  if (
                    !replaced &&
                    item &&
                    typeof item === "object" &&
                    "id" in item &&
                    !/^[a-zA-Z0-9]{15}$/.test(String(item.id))
                  ) {
                    replaced = true;
                    return { ...item, ...mapped, id: serverId };
                  }
                  return item;
                });
              }
              if (old && typeof old === "object" && Array.isArray(old.data)) {
                let replaced = false;
                return {
                  ...old,
                  data: old.data.map((item: any) => {
                    if (
                      !replaced &&
                      item &&
                      typeof item === "object" &&
                      "id" in item &&
                      !/^[a-zA-Z0-9]{15}$/.test(String(item.id))
                    ) {
                      replaced = true;
                      return { ...item, ...mapped, id: serverId };
                    }
                    return item;
                  }),
                };
              }
              return old;
            });
          }
          queryClient.invalidateQueries({ queryKey });
        }
        onSuccess?.(data, variables, context);
      },
    });

  return {
    useQuery: useQueryWrapper,
    useMutation: useMutationWrapper,
  };
}
