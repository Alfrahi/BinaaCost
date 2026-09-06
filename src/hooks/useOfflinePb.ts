import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { offlineManager } from "@/lib/offline";
import { executePbMutation } from "@/lib/pb-executor";
import { ClientResponseError } from "pocketbase";
import { useAuth } from "@/components/AuthProvider";
import i18n from "@/i18n";
import {
  PbQueryConfig,
  PbMutationConfig,
} from "@/lib/pb-utils";

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
      queryFn,
      enabled: enabled && offlineManager.getIsOnline(),
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
          return executePbMutation<TData>({ table, operation, payload });
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
        onError?.(err, variables, context);
      },
      onSuccess: (data, variables, context) => {
        onSuccess?.(data, variables, context);
      },
    });

  return {
    useQuery: useQueryWrapper,
    useMutation: useMutationWrapper,
  };
}
