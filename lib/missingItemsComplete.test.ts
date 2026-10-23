import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PageType } from "./pageType";

interface RecordedRequest {
  method: string | undefined;
  url: URL;
  body: unknown;
}

let server: Server;
let missingItems: typeof import("./missingItems");
const requests: RecordedRequest[] = [];
let responseStatus = 204;
let responseBody: unknown = null;
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
    response.end(responseBody === null ? undefined : JSON.stringify(responseBody));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Test server did not bind a port");
  }
  process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${address.port}`;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-public-key";
  missingItems = await import("./missingItems");
});

beforeEach(() => {
  requests.length = 0;
  responseStatus = 204;
  responseBody = null;
});

afterAll(async () => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

describe("complete all missing items", () => {
  it.each(PageType.values)(
    "completes only active, not-already-completed items in %s across every page",
    async (pageType) => {
      expect(await missingItems.completeAllMissingItems(pageType)).toEqual({ ok: true });
      expect(requests).toHaveLength(1);
      const request = requests[0];
      expect(request?.method).toBe("PATCH");
      expect(request?.url.pathname).toBe("/rest/v1/missing_items");
      expect(request?.body).toEqual({ completed: true });
      expect(request?.url.searchParams.get("page_type")).toBe(`eq.${pageType}`);
      expect(request?.url.searchParams.get("completed")).toBe("not.is.true");
      expect(request?.url.searchParams.get("cleared_at")).toBe("is.null");
      expect([...request?.url.searchParams.keys() ?? []].sort()).toEqual([
        "cleared_at",
        "completed",
        "page_type",
      ]);
    },
  );

  it("returns a rejected update without claiming success", async () => {
    responseStatus = 403;
    responseBody = { code: "42501", message: "Update permission denied" };
    expect(await missingItems.completeAllMissingItems("running")).toEqual({
      ok: false,
      message: "Update permission denied",
    });
  });
});
