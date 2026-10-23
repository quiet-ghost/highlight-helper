// @vitest-environment jsdom

import { createServer, type Server } from "node:http";
import React, { type ComponentType } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { MissingItem } from "../lib/missingItems";
import { PageType } from "../lib/pageType";

type QueueRow = Pick<MissingItem, "id" | "page_type" | "completed" | "cleared_at">;

let server: Server;
let AuthProvider: typeof import("../lib/authContext")["AuthProvider"];
let DarkModeProvider: typeof import("../lib/useDarkMode")["DarkModeProvider"];
let supabase: typeof import("../lib/supabaseClient")["supabase"];
let pages: Record<PageType, ComponentType>;
let rows: QueueRow[] = [];
let patchCount = 0;
let rejectUpdate = false;
let pendingUpdate: Promise<void> | null = null;
const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

beforeAll(async () => {
  server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (url.pathname === "/auth/v1/token") {
      const payload = Buffer.from(JSON.stringify({
        sub: "test-user",
        exp: Math.floor(Date.now() / 1000) + 3600,
      })).toString("base64url");
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({
        access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.test-signature`,
        refresh_token: "test-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
        user: { id: "test-user", app_metadata: { roles: ["admin"] } },
      }));
      return;
    }
    if (url.pathname !== "/rest/v1/missing_items") {
      response.writeHead(404).end();
      return;
    }
    const matchesWarehouse = (row: QueueRow) =>
      url.searchParams.get("page_type") === `eq.${row.page_type}` &&
      row.cleared_at === null;
    if (request.method === "PATCH") {
      patchCount += 1;
      if (pendingUpdate) await pendingUpdate;
      if (rejectUpdate) {
        response.writeHead(403, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ message: "Update permission denied" }));
        return;
      }
      rows = rows.map((row) =>
        matchesWarehouse(row) && !row.completed ? { ...row, completed: true } : row,
      );
      response.writeHead(204).end();
      return;
    }
    const activeRows = rows.filter(matchesWarehouse);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Number(url.searchParams.get("limit") ?? 50);
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Range": `${offset}-${Math.min(offset + limit, activeRows.length) - 1}/${activeRows.length}`,
    });
    response.end(JSON.stringify(activeRows.slice(offset, offset + limit)));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Test server did not bind a port");
  }
  process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${address.port}`;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-public-key";
  ({ AuthProvider } = await import("../lib/authContext"));
  ({ DarkModeProvider } = await import("../lib/useDarkMode"));
  ({ supabase } = await import("../lib/supabaseClient"));
  const [tackle, tennis, running, inline] = await Promise.all([
    import("../app/tackle-missing/page"),
    import("../app/tennis-missing/page"),
    import("../app/running-missing/page"),
    import("../app/inline-missing/page"),
  ]);
  pages = { tackle: tackle.default, tennis: tennis.default, running: running.default, inline: inline.default };
  const { error } = await supabase.auth.signInWithPassword({
    email: "operator@example.test",
    password: "test-password",
  });
  if (error) throw error;
});

beforeEach(() => {
  patchCount = 0;
  rejectUpdate = false;
  pendingUpdate = null;
  rows = [];
});

afterEach(() => {
  cleanup();
  supabase.realtime.disconnect();
});

afterAll(async () => {
  await supabase.auth.stopAutoRefresh();
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

function renderQueue(pageType: PageType, count = 51) {
  rows = Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    page_type: pageType,
    completed: index === 0,
    cleared_at: null,
  }));
  const Page = pages[pageType];
  render(<AuthProvider><DarkModeProvider><Page /></DarkModeProvider></AuthProvider>);
}

function completedCheckboxes() {
  return screen.getAllByRole("row").slice(1).map((row) => {
    const checkbox = within(row).getAllByRole("checkbox")[0];
    if (!(checkbox instanceof HTMLInputElement)) throw new Error("Completion checkbox missing");
    return checkbox;
  });
}

describe("missing items Complete All button", () => {
  it.each(PageType.values)("checks completed boxes across all pages for %s", async (pageType) => {
    renderQueue(pageType);
    await screen.findByText("Showing 1-50 of 51 active items");
    expect(completedCheckboxes().filter((checkbox) => checkbox.checked)).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Complete All" }));
    await waitFor(() => expect(completedCheckboxes().every((checkbox) => checkbox.checked)).toBe(true));
    await waitFor(() => expect(screen.getByRole("button", { name: "Next" }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Showing 51-51 of 51 active items");
    expect(completedCheckboxes().map((checkbox) => checkbox.checked)).toEqual([true]);
    expect(patchCount).toBe(1);
  });

  it("blocks duplicate bulk updates and checkbox edits until saving finishes", async () => {
    let finishUpdate = () => {};
    pendingUpdate = new Promise((resolve) => { finishUpdate = resolve; });
    renderQueue("running", 2);
    await screen.findByText("Showing 1-2 of 2 active items");
    fireEvent.click(screen.getByRole("button", { name: "Complete All" }));
    const button = screen.getByRole("button", { name: "Completing..." });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(completedCheckboxes().every((checkbox) => checkbox.disabled)).toBe(true);
    expect(screen.getByRole("button", { name: "Clear Completed" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(button);
    try {
      await waitFor(() => expect(patchCount).toBe(1));
    } finally {
      finishUpdate();
    }
    await screen.findByRole("button", { name: "Complete All" });
    expect(completedCheckboxes().every((checkbox) => checkbox.checked)).toBe(true);
  });

  it("keeps saved checkboxes on failure and allows retrying", async () => {
    rejectUpdate = true;
    renderQueue("tennis", 2);
    await screen.findByText("Showing 1-2 of 2 active items");
    fireEvent.click(screen.getByRole("button", { name: "Complete All" }));
    await screen.findByText(/Could not complete all items: Update permission denied/);
    await screen.findByRole("button", { name: "Complete All" });
    expect(completedCheckboxes().map((checkbox) => checkbox.checked)).toEqual([true, false]);
    rejectUpdate = false;
    fireEvent.click(screen.getByRole("button", { name: "Complete All" }));
    await waitFor(() => expect(completedCheckboxes().every((checkbox) => checkbox.checked)).toBe(true));
  });

  it("disables Complete All for an empty queue", async () => {
    renderQueue("inline", 0);
    await screen.findByText("No missing items reported yet.");
    expect(screen.getByRole("button", { name: "Complete All" }).hasAttribute("disabled")).toBe(true);
    expect(patchCount).toBe(0);
  });
});
