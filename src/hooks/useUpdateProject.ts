import { useParams, useNavigate } from "react-router-dom";
import { pb } from "@/integrations/pocketbase/client";
import { mapRecord } from "@/lib/pb-mapper";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOfflinePb } from "@/hooks/useOfflinePb";
import { useForm } from "react-hook-form";
import { projectSchema, ProjectFormValues } from "@/types/project-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useCallback } from "react";
import { sanitizeText } from "@/utils/sanitizeText";
import { useCurrencyConversionDialog } from "./useCurrencyConversionDialog";
import { handleError } from "@/utils/toast";

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  type: string;
  size: number | null;
  size_unit: string;
  location: string | null;
  client_requirements: string | null;
  duration_days: number | null;
  duration_unit: string | null;
  currency: string;
  user_id: string;
  financial_settings: any;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export function useUpdateProject() {
  const { t } = useTranslation(["project_form", "common"]);
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { useMutation: useOfflineMutation } = useOfflinePb();
  const queryClient = useQueryClient();

  const {
    data: initialData,
    isLoading: loading,
    error: fetchError,
  } = useQuery<ProjectData>({
    queryKey: ["project", id],
    queryFn: async () => {
      const record = await pb.collection("projects").getOne(id!);
      return mapRecord<ProjectData>(record);
    },
    enabled: !!id,
  });

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "",
      size: undefined,
      size_unit: "",
      location: "",
      client_requirements: "",
      duration_days: undefined,
      duration_unit: "",
      currency: "USD",
    },
  });

  const [originalProjectCurrency, setOriginalProjectCurrency] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || "",
        description: initialData.description || "",
        type: initialData.type || "",
        size: initialData.size ?? undefined,
        size_unit: initialData.size_unit || "",
        location: initialData.location || "",
        client_requirements: initialData.client_requirements || "",
        duration_days: initialData.duration_days ?? undefined,
        duration_unit: initialData.duration_unit || "",
        currency: initialData.currency || "USD",
      });
      setOriginalProjectCurrency(initialData.currency);
    }
  }, [initialData, form]);

  const optimisticUpdater = (
    old: ProjectData | undefined,
    variables: any,
    operation: string,
  ) => {
    if (operation === "UPDATE") {
      return {
        ...old,
        ...variables,
        updated_at: new Date().toISOString(),
      };
    }
    return old;
  };

  const updateProjectMutation = useOfflineMutation<any, ProjectData>({
    queryKey: ["project", id],
    table: "projects",
    operation: "UPDATE",
    optimisticUpdater: optimisticUpdater,
    onSuccess: () => {
      toast.success(t("project_form:success_updated"));
      queryClient.invalidateQueries({ queryKey: ["materials", id] });
      queryClient.invalidateQueries({ queryKey: ["labor_items", id] });
      queryClient.invalidateQueries({ queryKey: ["equipment_items", id] });
      queryClient.invalidateQueries({ queryKey: ["additional_costs", id] });
      queryClient.invalidateQueries({ queryKey: ["risks", id] });
      queryClient.invalidateQueries({ queryKey: ["project_groups", id] });
      queryClient.invalidateQueries({ queryKey: ["myProjects"] });
      queryClient.invalidateQueries({ queryKey: ["sharedProjects"] });
      queryClient.invalidateQueries({ queryKey: ["analytics_projects_data"] });
      navigate(`/projects/${id}`);
    },
    onError: (error: any) => {
      handleError(error);
    },
  });

  const onCurrencyConversionConfirmed = useCallback(
    async (_newCurrency: string, _formData: ProjectFormValues) => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
    [id, queryClient],
  );

  const onCurrencyConversionCancelled = useCallback(
    (revertCurrency: string) => {
      form.setValue("currency", revertCurrency);
    },
    [form],
  );

  const {
    showCurrencyConversionDialog,
    setShowCurrencyConversionDialog,
    pendingNewCurrency,
    originalCurrency,
    isConverting,
    openConversionDialog,
    handleConfirmConversion,
    handleCancelConversion,
  } = useCurrencyConversionDialog({
    projectId: id!,
    onConfirmConversion: onCurrencyConversionConfirmed,
    onCancelConversion: onCurrencyConversionCancelled,
  });

  const handleSubmit = useCallback(
    async (formData: ProjectFormValues) => {
      try {
        let validatedData = projectSchema.parse(formData);
        if (!user?.id) {
          toast.error(t("common:mustBeLoggedIn"));
          return;
        }

        validatedData = {
          ...validatedData,
          name: sanitizeText(validatedData.name) || "",
          description: sanitizeText(validatedData.description),
          location: sanitizeText(validatedData.location),
          client_requirements: sanitizeText(validatedData.client_requirements),
          type: sanitizeText(validatedData.type) || "",
          size_unit: sanitizeText(validatedData.size_unit) || "",
          duration_unit: sanitizeText(validatedData.duration_unit),
          currency: sanitizeText(validatedData.currency) || "USD",
        };

        if (
          originalProjectCurrency &&
          originalProjectCurrency !== validatedData.currency
        ) {
          openConversionDialog(
            originalProjectCurrency,
            validatedData.currency,
            formData,
          );
          return;
        }

        updateProjectMutation.mutate({
          id,
          ...validatedData,
          user_id: user?.id,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach((err) => {
            toast.error(t(err.message));
          });
        } else {
          handleError(error);
        }
      }
    },
    [
      originalProjectCurrency,
      user?.id,
      t,
      id,
      updateProjectMutation,
      openConversionDialog,
    ],
  );

  return {
    form,
    loading,
    fetchError,
    initialData,
    handleSubmit,
    isPending: updateProjectMutation.isPending,
    error: updateProjectMutation.error
      ? updateProjectMutation.error.message
      : null,
    showCurrencyConversionDialog,
    setShowCurrencyConversionDialog,
    pendingNewCurrency,
    originalCurrency,
    isConverting,
    handleConfirmConversion,
    handleCancelConversion,
  };
}
