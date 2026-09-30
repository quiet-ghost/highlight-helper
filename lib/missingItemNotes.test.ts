import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

interface RecordedRequest {
  method: string | undefined;
  url: URL;
  body: unknown;
}

let server: Server;
let missingItems: typeof import("./missingItems");
const requests: RecordedRequest[] = [];
let responseStatus = 200;
let responseBody: unknown = { notes: "Checked receiving" };
const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

beforeAll(async () => {
  server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk.toString();
    requests.push({
      method: request.method,
      url: new URL(request.url ?? "/", "http://localhost"),
      body: body ? JSON.parse(body) : null,
    });
    response.writeHead(responseStatus, { "Content-Type": "application/json" });
    response.end(JSON.stringify(responseBody));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Test server did not bind a port");
  process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${address.port}`;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-public-key";
  missingItems = await import("./missingItems");
});

afterAll(async () => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

describe("missing item notes", () => {
  it("updates only notes on the active item in its warehouse", async () => {
    const result = await missingItems.updateMissingItemNotes("running", 7, "Checked receiving");
    expect(result).toEqual({ ok: true, notes: "Checked receiving" });
    const request = requests.at(-1);
    expect(request?.method).toBe("PATCH");
    expect(request?.body).toEqual({ notes: "Checked receiving" });
    expect(request?.url.pathname).toBe("/rest/v1/missing_items");
    expect(request?.url.searchParams.get("id")).toBe("eq.7");
    expect(request?.url.searchParams.get("page_type")).toBe("eq.running");
    expect(request?.url.searchParams.get("cleared_at")).toBe("is.null");
  });

  it("supports removing a Tennis note", async () => {
    responseBody = { notes: "" };
    expect(await missingItems.updateMissingItemNotes("tennis", 8, "")).toEqual({ ok: true, notes: "" });
    expect(requests.at(-1)?.body).toEqual({ notes: "" });
    expect(requests.at(-1)?.url.searchParams.get("page_type")).toBe("eq.tennis");
  });

  it("leaves other warehouses unchanged", async () => {
    const count = requests.length;
    const result = await missingItems.updateMissingItemNotes("tackle", 7, "Note");
    expect(result.ok).toBe(false);
    expect(requests).toHaveLength(count);
  });

  it("loads notes through the existing paginated queue", async () => {
    responseBody = [{ id: 7, page_type: "running", notes: "Queue note" }];
    const result = await missingItems.getMissingItemsPage("running", 1, 50, "timestamp", "desc");
    expect(result.items[0]?.notes).toBe("Queue note");
    const request = requests.at(-1);
    expect(request?.method).toBe("GET");
    expect(request?.url.searchParams.get("page_type")).toBe("eq.running");
    expect(request?.url.searchParams.get("cleared_at")).toBe("is.null");
    expect(request?.url.searchParams.get("order")).toBe("timestamp.desc.nullslast,id.desc");
  });

  it("keeps existing checkbox updates separate from notes", async () => {
    responseBody = { id: 7, page_type: "tennis", looked_for: true, notes: "Keep this note" };
    const item = await missingItems.updateMissingItem("tennis", 7, "looked_for", true);
    expect(item.looked_for).toBe(true);
    expect(item.notes).toBe("Keep this note");
    expect(requests.at(-1)?.body).toEqual({ looked_for: true });
  });

  it("preserves notes when completed items are soft-cleared", async () => {
    responseBody = null;
    await missingItems.clearMissingItems("running", "test-clear-batch", [7]);
    const request = requests.at(-1);
    expect(request?.body).toEqual({
      cleared_at: expect.any(String),
      cleared_by: "unknown",
      clear_batch_id: "test-clear-batch",
    });
    expect(request?.url.searchParams.get("completed")).toBe("eq.true");
    expect(request?.url.searchParams.get("id")).toBe("in.(7)");
  });

  it("reports rejected saves without claiming success", async () => {
    responseStatus = 403;
    responseBody = { code: "42501", message: "Update permission denied" };
    expect(await missingItems.updateMissingItemNotes("running", 7, "Note")).toEqual({ ok: false, message: "Update permission denied" });
  });

  it("rejects malformed save responses", async () => {
    responseStatus = 200;
    responseBody = { notes: 123 };
    const result = await missingItems.updateMissingItemNotes("running", 7, "Note");
    expect(result.ok).toBe(false);
  });

  it("loads persisted notes and defaults older rows to empty text", () => {
    expect(missingItems.parseMissingItemRow({ id: 7, page_type: "running", notes: "Saved note" })?.notes).toBe("Saved note");
    expect(missingItems.parseMissingItemRow({ id: 7, page_type: "tennis" })?.notes).toBe("");
    expect(missingItems.missingItemProjection.split(",")).toContain("notes");
  });
});
