"use client";
import ProjectForm from "@/components/project/ProjectForm";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useCreateProject } from "@/hooks/useCreateProject";

export default function CreateProject() {
  const { form, handleSubmit, isPending, error } = useCreateProject();

  return (
    <div className="max-w-2xl mx-auto text-sm">
      <Breadcrumbs />
      <ProjectForm
        form={form}
        onSubmit={handleSubmit}
        isEditing={false}
        loading={isPending}
        error={error}
      />
    </div>
  );
}
