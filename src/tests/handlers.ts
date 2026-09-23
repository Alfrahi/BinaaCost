import { http, HttpResponse } from "msw";

export const handlers = [
  http.patch("*/api/collections/:collection/records/:id", async ({ request, params }) => {
    const data = await request.json() as any;
    
    // Simulate backend schema rejecting payload without 'version' for projects
    if (params.collection === "projects" && data.version === undefined) {
      return HttpResponse.json(
        { message: "version is a required field" },
        { status: 400 }
      );
    }
    
    return HttpResponse.json({
      id: params.id,
      ...data,
      updated_at: new Date().toISOString(),
    });
  }),
  
  http.get("*/api/collections/:collection/records/:id", async ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: "Old Name",
      description: "Old Desc",
      type: "Commercial",
      size: 500,
      size_unit: "sqm",
      location: "Riyadh",
      client_requirements: "Specs",
      duration_days: 100,
      duration_unit: "Day",
      currency: "USD",
      user_id: "owner-999",
      updated_at: "2026-09-20 12:00:00.000Z",
      version: 1
    });
  }),
  
  http.get("*/api/collections/:collection/records", async () => {
    return HttpResponse.json({
      page: 1,
      perPage: 30,
      totalItems: 0,
      totalPages: 1,
      items: []
    });
  }),
  
  http.post("*/api/collections/:collection/records", async ({ request }) => {
    const data = await request.json() as any;
    return HttpResponse.json({
      ...data,
      id: data.id || "new-uuid-123",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }),
  
  http.post("*/api/projects/:id/clone", async ({ request}) => {
    const data = await request.json() as any;
    if (!data.customName) {
        return HttpResponse.json({ message: "customName is required" }, { status: 400 });
    }
    return HttpResponse.json({
      id: "new-proj-999",
      name: data.customName
    });
  }),
];
