// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";

// C1 regression tests: csv import route must authorize per database_id.
// Live tests against PocketBase at VITE_POCKETBASE_URL (or 127.0.0.1:8090);
// skip cleanly when no server is up.

const BASE = process.env.VITE_POCKETBASE_URL || "http://127.0.0.1:8090";

async function api(
  method: string,
  path: string,
  body?: any,
  token?: string,
): Promise<{ status: number; json: any }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function makeUser(email: string) {
  const r = await api("POST", "/api/collections/users/records", {
    email,
    password: "testpass123",
    passwordConfirm: "testpass123",
    role: "user",
  });
  return r.json.id as string;
}

async function login(email: string) {
  const r = await api("POST", "/api/collections/users/auth-with-password", {
    identity: email,
    password: "testpass123",
  });
  return r.json.token as string;
}

async function suToken() {
  const r = await api("POST", "/api/collections/_superusers/auth-with-password", {
    identity: "admin@local.dev",
    password: "localdev123",
  });
  return r.json.token as string;
}

const REACHABLE = await fetch(`${BASE}/api/health`).then((r) => r.ok).catch(() => false);
const itLive = REACHABLE ? it : it.skip;

describe("C1: csv import route authz", () => {
  let su: string;
  let uidA: string;
  let tokA: string;
  let uidB: string;
  let tokB: string;
  let victimDbId: string;

  beforeAll(async () => {
    if (!REACHABLE) return;
    su = "Bearer " + (await suToken());
    const RUN = String(Date.now());
    const emailA = `it-c1-a-${RUN}@local.dev`;
    const emailB = `it-c1-b-${RUN}@local.dev`;

    uidA = await makeUser(emailA);
    tokA = "Bearer " + (await login(emailA));
    uidB = await makeUser(emailB);
    tokB = "Bearer " + (await login(emailB));

    const db = await api("POST", "/api/collections/cost_databases/records",
      { user_id: uidA, name: "Victim DB", currency: "USD" }, tokA);
    victimDbId = db.json.id;
    await api("POST", "/api/collections/cost_database_items/records",
      { database_id: victimDbId, user_id: uidA, csi_code: "03 30 00", description: "orig", unit_price: 10 }, tokA);
  });

  afterAll(async () => {
    if (!REACHABLE) return;
    if (victimDbId) {
      await api("DELETE", `/api/collections/cost_databases/records/${victimDbId}`, undefined, su);
    }
    for (const id of [uidA, uidB]) {
      if (id) await api("DELETE", `/api/collections/users/records/${id}`, undefined, su);
    }
  });

  const listItems = () =>
    api("GET", `/api/collections/cost_database_items/records?filter=database_id%3D%22${victimDbId}%22`, undefined, tokA);

  itLive("attacker cannot overwrite items in another user's database", async () => {
    const r = await api("POST", "/api/import/cost_database_items", {
      strategy: "overwrite",
      items: [{ database_id: victimDbId, csi_code: "03 30 00", description: "pwned", unit_price: 999 }],
    }, tokB);
    expect(r.status).toBe(403);
    const items = await listItems();
    expect(items.json.items[0].description).toBe("orig");
    expect(items.json.items[0].unit_price).toBe(10);
  });

  itLive("attacker cannot insert items into another user's database", async () => {
    const r = await api("POST", "/api/import/cost_database_items", {
      strategy: "skip",
      items: [{ database_id: victimDbId, csi_code: "99 99 99", description: "new row", unit_price: 1 }],
    }, tokB);
    expect(r.status).toBe(403);
    const items = await listItems();
    expect(items.json.items).toHaveLength(1);
  });
  itLive("owner can import into own database (skip then overwrite)", async () => {
    const skip = await api("POST", "/api/import/cost_database_items", {
      strategy: "skip",
      items: [
        { database_id: victimDbId, csi_code: "03 30 00", description: "should skip", unit_price: 55 },
        { database_id: victimDbId, csi_code: "05 12 00", description: "new", unit_price: 20 },
      ],
    }, tokA);
    expect(skip.status).toBe(200);
    expect(skip.json).toMatchObject({ inserted: 1, updated: 0, skipped: 1 });

    const ow = await api("POST", "/api/import/cost_database_items", {
      strategy: "overwrite",
      items: [{ database_id: victimDbId, csi_code: "03 30 00", description: "updated", unit_price: 42 }],
    }, tokA);
    expect(ow.status).toBe(200);
    expect(ow.json).toMatchObject({ inserted: 0, updated: 1, skipped: 0 });

    const items = await listItems();
    const row = items.json.items.find((i: any) => i.csi_code === "03 30 00");
    expect(row.description).toBe("updated");
    expect(row.unit_price).toBe(42);
  });

  itLive("rejects payloads over 5000 items", async () => {
    const items = Array.from({ length: 5001 }, (_, i) => ({
      database_id: victimDbId, csi_code: `c${i}`, unit_price: 1,
    }));
    const r = await api("POST", "/api/import/cost_database_items", { strategy: "skip", items }, tokA);
    expect(r.status).toBe(400);
  });
});

