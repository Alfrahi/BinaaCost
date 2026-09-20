// Re-export sub-features through clean public API
export * from "./project-core/hooks/useMyProjects";
export * from "./project-core/hooks/useSharedProjects";
export * from "./project-core/hooks/useProjectData";
export * from "./project-core/hooks/useCreateProject";
export * from "./project-core/hooks/useUpdateProject";
export * from "./project-core/hooks/useSoftDeleteProject";
export * from "./project-core/hooks/useProjectCardSummary";
export * from "./project-core/hooks/useProjectComments";
export { useProjectGroupsManager } from "./project-core/hooks/useProjectGroupsManager";
export * from "./project-core/hooks/useUpdateProjectFinancialSettings";
export type * from "./project-core/types/project";
export type * from "./project-core/types/form";

export * from "./project-costs/hooks/useProjectMaterials";
export * from "./project-costs/hooks/useProjectLabor";
export * from "./project-costs/hooks/useProjectEquipment";
export * from "./project-costs/hooks/useProjectAdditionalCosts";
export * from "./project-costs/hooks/useProjectRisks";
export * from "./project-costs/hooks/useAssemblyImport";
export * from "./project-costs/hooks/useProjectCsvImporter";
export type * from "./project-costs/types/items";
export type * from "./project-costs/types/schemas";

export * from "./project-sharing/hooks/useProjectSharing";
export * from "./project-versions/hooks/useProjectVersions";
export * from "./project-versions/hooks/useApplyProjectVersion";
export type * from "./project-versions/types/version";
export * from "./project-analytics/hooks/useProjectSimulator";
export * from "./project-analytics/hooks/useScenarioManager";
