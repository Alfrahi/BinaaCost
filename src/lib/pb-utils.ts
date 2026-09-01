import { QueryKey } from "@tanstack/react-query";
import { ClientResponseError } from "pocketbase";

export type CrudOperation =
  | "INSERT"
  | "UPDATE"
  | "DELETE"
  | "BULK_DELETE"
  | "BULK_UPDATE"
  | "UPSERT"
  | "RPC";

export interface PbQueryConfig<T> {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

export interface PbMutationConfig<TVariables = any, TData = any> {
  queryKey: QueryKey;
  table: string;
  operation: CrudOperation;
  optimisticUpdater?: (
    old: TData | undefined,
    variables: TVariables,
    operation: CrudOperation,
  ) => TData | undefined;
  onSuccess?: (data: any, variables: TVariables, context: any) => void;
  onError?: (
    error: Error | ClientResponseError,
    variables: TVariables,
    context: any,
  ) => void;
  disableOfflineQueue?: boolean;
}
