import { useEffect, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { Heading } from "@/shared/components/ui/heading";
import { Input } from "@/shared/components/ui/input";
import { useTranslation } from "react-i18next";
import { Assembly } from "@/features/cost-library/assemblies/types/assemblies";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Textarea } from "@/shared/components/ui/textarea";

const assemblySchema = z.object({
  name: z.string().min(1, "resources:assemblies.nameRequired"),
  description: z.string().nullable(),
  category: z.string().nullable(),
});

type AssemblyFormValues = z.infer<typeof assemblySchema>;

interface AssemblyFormProps {
  initialData?: Assembly | null;
  onSubmit: (data: AssemblyFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function AssemblyForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: AssemblyFormProps) {
  const { t } = useTranslation(["resources", "common"]);

  const form = useForm<AssemblyFormValues>({
    resolver: zodResolver(assemblySchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || null,
      category: initialData?.category || null,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        description: initialData.description,
        category: initialData.category,
      });
    } else {
      form.reset({
        name: "",
        description: null,
        category: null,
      });
    }
  }, [initialData, form]);

  const handleSubmit = useCallback(
    (values: AssemblyFormValues) => {
      onSubmit(values);
    },
    [onSubmit],
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="border rounded-lg p-4 bg-muted space-y-3"
      >
        <div className="flex justify-between items-center">
          <Heading level={3}>
            {initialData ? t("common:edit") : t("common:add")}{" "}
            {t("resources:assemblies.assembly")}
          </Heading>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                {t("resources:assemblies.name")}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t("resources:assemblies.namePlaceholder")}
                  className="text-sm"
                />
              </FormControl>
              <FormMessage className="text-sm" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                {t("common:description")}
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder={t("common:columns.descriptionPlaceholder")}
                  rows={3}
                  className="text-sm"
                />
              </FormControl>
              <FormMessage className="text-sm" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">
                {t("resources:assemblies.category")}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder={t("resources:assemblies.categoryPlaceholder")}
                  className="text-sm"
                />
              </FormControl>
              <FormMessage className="text-sm" />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-sm"
          >
            {t("common:cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting} className="text-sm">
            {isSubmitting ? t("common:saving") : t("common:save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
