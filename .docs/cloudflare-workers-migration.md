# Cloudflare Workers Migration Plan

Planning only. No application code changes should be made from this document.

## Goal

Move `highlight-helper` from Cloudflare Pages plus GitHub-connected deployment toward Cloudflare Workers using the OpenNext Cloudflare adapter.

The first migration should preserve current behavior. Later phases should use Workers to enable server-owned auth, clear/export flows, admin reads, and optional R2-backed CSV artifacts.

| Outcome | Why It Matters |
| --- | --- |
| Worker-based Next 15 deploy | Better fit for future full-stack/edge app work. |
| Repo-owned infra config | Deployment behavior becomes visible in source control. |
| Server-owned privileged routes | Clear/export/admin auth can be enforced outside browser UI. |
| Optional R2 artifacts | Native Cloudflare place for retained CSV files. |

## Current State Assumptions

| Area | Observed State |
| --- | --- |
| Next.js | `next@15.5.9` |
| React | `react@19.1.2`, `react-dom@19.1.2` |
| Supabase client | `@supabase/supabase-js@2.49.1` |
| Next config | `next.config.ts` is effectively empty |
| Cloudflare config | no `wrangler.*` or OpenNext config exists |
| Auth | boolean-only client auth context |
| Queue pages | direct browser Supabase reads, updates, realtime subscriptions |
| CSV export | browser-generated CSV download |
| Admin routes | planned, not implemented |

The live Pages deployment likely has build and env settings in Cloudflare dashboard. Inventory those before adding Workers.

## Recommended Path

Use two stages:

```text
1. Deploy existing Next app to Workers with minimal behavior changes.
2. Move privileged app behavior behind Worker route handlers.
```

Preferred stack:

```text
Next.js 15
@opennextjs/cloudflare
wrangler
@supabase/ssr
Supabase Postgres/Auth
optional R2 for retained CSV artifacts
```

## Pages Vs Workers

| Topic | Cloudflare Pages | Cloudflare Workers + OpenNext |
| --- | --- | --- |
| Setup simplicity | simpler | more config |
| GitHub previews | strong | possible via Workers Builds or CI |
| Repo-owned config | weaker if dashboard-managed | stronger with `wrangler.jsonc` |
| Server-owned APIs | possible with Pages Functions | first-class Worker fit |
| R2 bindings | possible | native and direct |
| Future admin/export/clear work | less ideal | better fit |
| Migration risk | lower | medium |

Decision rule:

```text
mostly frontend app -> Pages OK
role-protected admin/export app -> Workers better long-term
```

## Target Architecture

```text
browser
  -> Cloudflare Worker running Next/OpenNext
     -> static assets from OpenNext output
     -> route handlers for auth-aware APIs
        -> Supabase Auth + Postgres
        -> optional R2 export bucket
  -> Supabase Realtime directly from browser
```

### Responsibility Split

| Layer | Responsibility |
| --- | --- |
| Client pages | form UX, queue UX, realtime subscription |
| Worker route handlers | auth checks, role checks, admin queries, clear/export orchestration |
| Supabase Postgres | missing-item source of truth and audit rows |
| Supabase Auth | identity and `app_metadata.roles` |
| R2 | optional CSV artifact retention |

## Runtime Constraints

Workers run on V8 isolates, not a normal long-lived Node server.

| Constraint | Impact |
| --- | --- |
| no persistent writable filesystem | do not write CSVs to local disk |
| Node compatibility is not full Node | avoid native/binary Node packages |
| request runtime is short-lived | no process-local state assumptions |
| private routes need cache control | use `Cache-Control: private, no-store` |
| `next dev` is not production-faithful | validate with OpenNext preview/workerd |

Current repo risk is moderate because most code uses browser APIs and Supabase fetch APIs.

## Supabase Implications

Supabase remains the system of record. Workers change where privileged orchestration runs.

| Topic | Current | Target |
| --- | --- | --- |
| auth state | browser-only boolean | server-readable session/claims |
| role source | not enforced | `app_metadata.roles` |
| clear/export | browser-owned | Worker-owned |
| admin reads | not present | Worker-owned |
| CSV retention | browser download only | optional R2 artifact |

Use `@supabase/ssr` or equivalent cookie-backed auth before building server-owned admin/export/clear flows.

Do not expose service role key to browser code.

| Secret | Allowed Location |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + Worker |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` or publishable key | browser + Worker |
| `SUPABASE_SERVICE_ROLE_KEY` | Worker secret only, if truly needed |

## Config And Package Changes

Add dependencies:

```text
@opennextjs/cloudflare
wrangler
@supabase/ssr
```

Script shape:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy -- --keep-vars",
    "cf-typegen": "wrangler types --env-interface CloudflareEnv"
  }
}
```

`wrangler.jsonc` shape:

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "highlight-helper",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-05-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "vars": {
    "NEXT_PUBLIC_SUPABASE_URL": "https://example.supabase.co",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "set-real-value-in-cloudflare"
  },
  "r2_buckets": [
    {
      "binding": "EXPORT_ARTIFACTS",
      "bucket_name": "highlight-helper-exports"
    }
  ]
}
```

OpenNext config shape:

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
```

Worker env type shape:

```ts
export interface CloudflareEnv {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  EXPORT_ARTIFACTS?: R2Bucket;
}
```

## Recommended Route Surface

Use warehouse-scoped routes so warehouse pages and admin dashboard share server logic.

```text
GET  /api/admin/missing-items
GET  /api/admin/missing-summary
POST /api/warehouses/:warehouse/completed/export
POST /api/warehouses/:warehouse/completed/clear
POST /api/warehouses/:warehouse/completed/export-and-clear
GET  /api/warehouses/:warehouse/exports/:batchId   optional later
```

Response headers for CSV export:

```text
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="missing-items-tackle-2026-05-01T10-00-00Z.csv"
Cache-Control: private, no-store
```

## Function And DTO Shapes

```ts
export type Warehouse = "tackle" | "tennis" | "running" | "inline";

export type AppRole =
  | "admin"
  | "exporter"
  | "operator"
  | `warehouse:${Warehouse}`;

export interface RoleClaims {
  userId: string;
  email: string | null;
  roles: AppRole[];
}

export interface ExportCompletedCommand {
  warehouse: Warehouse;
  actor: RoleClaims;
  persistArtifact?: boolean;
}

export interface ClearCompletedCommand {
  warehouse: Warehouse;
  actor: RoleClaims;
  itemIds: number[];
}

export interface QueueActionResult {
  warehouse: Warehouse;
  rowCount: number;
  clearBatchId: string | null;
}

export type ExportArtifact =
  | { kind: "inline"; filename: string; contentType: "text/csv" }
  | {
      kind: "r2";
      filename: string;
      objectKey: string;
      signedUrl: string;
      expiresAt: string;
    };
```

## R2 Artifact Strategy

R2 is optional. Do not make it required for the first Worker cutover.

Use phases:

```text
inline CSV response only -> default
inline CSV + audit row -> next
inline CSV + R2 copy + signed URL -> optional later
```

Audit table shape:

```sql
create table public.missing_item_clear_batches (
  id uuid primary key,
  warehouse text not null,
  cleared_by_user_id uuid not null,
  cleared_by_email text,
  row_count integer not null,
  storage_path text,
  cleared_at timestamptz not null default now()
);
```

## Staged Migration Plan

### Phase 0: Baseline

- Inventory current Pages build settings.
- Inventory Pages env vars and secrets.
- Confirm custom domain and rollback route.
- Confirm current login/report/queue behavior.

### Phase 1: Worker Deploy Parity

- Add OpenNext Cloudflare adapter and Wrangler.
- Add `wrangler.jsonc` and OpenNext config.
- Build and preview locally using OpenNext.
- Deploy staging Worker on preview domain.
- Verify login, report submit, queue reads, realtime updates.

### Phase 2: Supabase Server Auth Foundation

- Add `@supabase/ssr`.
- Add server-readable auth session/claims.
- Parse `app_metadata.roles` centrally.
- Add env validation.
- Avoid unsupported middleware assumptions.

### Phase 3: Server-Owned Clear/Export Pilot

- Start with `inline` because it has simplest workflow.
- Add export route that streams CSV.
- Add clear route using exact ID set.
- Add batch audit row.
- Keep other warehouses unchanged until pilot stable.

### Phase 4: Admin Read Routes

- Add `/api/admin/missing-items`.
- Add `/api/admin/missing-summary`.
- Enforce admin role server-side.
- Keep dashboard queries private/no-store.

### Phase 5: Port Remaining Warehouses

- Port tackle, tennis, running to server-owned clear/export.
- Remove browser-owned privileged clear/export logic.
- Align UI with role-based buttons and shared dialogs.

### Phase 6: Optional R2 Retention

- Add `EXPORT_ARTIFACTS` binding.
- Store CSV artifact only when retention is needed.
- Add protected signed URL or proxy download route.
- Define retention window.

## Rollback Plan

Keep Pages alive until Worker production path is stable.

```text
1. Deploy Worker in parallel on preview/workers.dev.
2. Validate internal users on Worker.
3. Switch custom domain only after parity.
4. If login/queue/export fails, point domain back to Pages.
5. Keep schema changes additive so old Pages app can still run.
```

Rollback triggers:

| Trigger | Action |
| --- | --- |
| login fails | route back to Pages |
| queue reads/writes fail | route back to Pages |
| export/clear row mismatch | disable server-owned action, route back if needed |
| Worker runtime incompatibility | keep Pages live while dependency issue is fixed |

## Risks And Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| current auth not server-readable | privileged routes cannot be safe | add `@supabase/ssr` first |
| Worker runtime mismatch | works in `next dev`, fails on Worker | require OpenNext preview validation |
| env var drift | broken auth/build | inventory Pages vars, set Worker build/runtime vars |
| private data cached | stale/leaked admin rows | force dynamic, no-store responses |
| clear/export mismatch | audit/data integrity issue | server-owned exact-ID clear |
| scope creep with R2 | delayed migration | make R2 optional phase |

## Acceptance Checklist

### Infra

- [ ] App builds with OpenNext Cloudflare.
- [ ] App previews locally on workerd/OpenNext preview.
- [ ] Worker config is source-controlled.
- [ ] Build-time and runtime env vars are documented.
- [ ] Pages rollback route remains available during cutover.

### Functional

- [ ] Login works on Worker deployment.
- [ ] Report submission works.
- [ ] Warehouse queue reads and updates work.
- [ ] Supabase realtime still updates queue pages.
- [ ] No route depends on unsupported Node runtime behavior.

### Privileged Workflow

- [ ] Pilot warehouse has server-owned export route.
- [ ] Exported CSV row count matches fetched completed row count.
- [ ] Clear only affects exact intended IDs.
- [ ] Clear/export writes stable audit record.
- [ ] Unauthorized users cannot trigger admin/export/clear routes.

### Optional R2

- [ ] Base Worker cutover does not require R2.
- [ ] If enabled, artifacts are private.
- [ ] Downloads use signed URL or protected proxy route.
- [ ] Retention window exists.

## Final Recommendation

Use Workers, but not as a framework rewrite.

Best path:

```text
Pages -> Workers parity
Workers -> server-readable auth
auth -> inline export/clear pilot
pilot -> admin reads
admin -> remaining warehouses
optional -> R2 retention
```
