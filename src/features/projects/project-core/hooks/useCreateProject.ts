import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useOfflinePb } from "@/shared/hooks/useOfflinePb";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { projectSchema, ProjectFormValues } from "@/features/projects/project-core/types/form";
import { sanitizeText } from "@/shared/lib/sanitizeText";
import { handleError } from "@/shared/lib/toast";

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  user_id: string;
}

export function useCreateProject() {
  const { t } = useTranslation(["project_form", "common"]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { useMutation: useOfflineMutation } = useOfflinePb();

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

  const optimisticUpdater = (
    old: { data: ProjectData[]; count: number } | undefined,
    variables: any,
    operation: string,
  ) => {
    const oldData = old?.data ?? [];
    const oldCount = old?.count ?? 0;
    if (operation === "INSERT") {
      return {
        data: [
          ...oldData,
          {
            ...variables,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
          },
        ],
        count: oldCount + 1,
      };
    }
    return { data: oldData, count: oldCount };
  };

  const createProjectMutation = useOfflineMutation<
    any,
    { data: ProjectData[]; count: number }
  >({
    queryKey: ["myProjects"],
    table: "projects",
    operation: "INSERT",
    optimisticUpdater: optimisticUpdater,
    onSuccess: (data: any) => {
      toast.success(t("project_form:success_created"));
      const id = data?.id as string | undefined;
      // Offline fallback: queued inserts return the payload, not a record id,
      // so land on the dashboard when no server id is available.
      navigate(id ? `/projects/${id}` : "/");
    },
    onError: (error: any) => {
      handleError(error);
    },
  });

  const handleSubmit = async (formData: ProjectFormValues) => {
    try {
      const validatedData = projectSchema.parse(formData);
      if (!user?.id) {
        toast.error(t("common:mustBeLoggedIn"));
        return;
      }

      const projectData = {
        name: sanitizeText(validatedData.name),
        description: sanitizeText(validatedData.description),
        type: sanitizeText(validatedData.type),
        size: validatedData.size || null,
        size_unit: sanitizeText(validatedData.size_unit),
        location: sanitizeText(validatedData.location),
        client_requirements: sanitizeText(validatedData.client_requirements),
        duration_days: validatedData.duration_days || null,
        duration_unit: sanitizeText(validatedData.duration_unit),
        currency: sanitizeText(validatedData.currency),
        user_id: user?.id,
        financial_settings: {
          overhead_percent: 10,
          markup_percent: 20,
          tax_percent: 0,
          contingency_percent: 5,
        },
      };

      createProjectMutation.mutate(projectData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(t(err.message));
        });
      } else {
        handleError(error);
      }
    }
  };

  return {
    form,
    handleSubmit,
    isPending: createProjectMutation.isPending,
    error: createProjectMutation.error
      ? createProjectMutation.error.message
      : null,
  };
}
