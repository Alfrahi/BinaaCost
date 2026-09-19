import { callRoute } from "./routes";

export interface MinimalUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

// Display-identity lookup that works with the owner-restricted users rules.
export async function fetchMinimalUsers(
  ids: string[],
): Promise<Map<string, MinimalUser>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const list = await callRoute<MinimalUser[]>("users/minimal", { ids: unique });
  return new Map(list.map((u) => [u.id, u]));
}
