import { AssemblyItem } from "@/features/cost-library/assemblies/types/assemblies";

/** Filter assembly items to only include the given item types. */
export function filterAssemblyItemsByType(
  items: AssemblyItem[],
  types: Array<string>,
): AssemblyItem[] {
  return items.filter((item) => types.includes(item.item_type));
}
