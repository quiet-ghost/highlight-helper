# Project Improvement Audit

Date: July 9, 2026

## Scope

This was a read-only source audit covering:

- correctness and data integrity
- authentication and authorization
- Supabase schema, RLS, and realtime behavior
- frontend and database performance
- UI, UX, responsiveness, and accessibility
- build, testing, documentation, and operational maturity

No runtime build, browser automation, Lighthouse run, dependency audit, or live SQL plan was available during the audit because dependencies were not installed and the live Supabase project was not inspected. Findings described as confirmed are supported directly by repository code. Live database policy and index state remains unverified.

## Executive Summary

The project has several good foundations:

- A shared missing-items component centralizes the warehouse queue screens.
- The admin table uses server-side pagination and rejects stale response commits.
- Multi-item reports are inserted as one batch.
- Clear operations retain history rather than immediately deleting records.
- The shared modal implements focus trapping, Escape handling, focus restoration, and accessible dialog labeling.

The best improvement order is:

1. Secure the data boundary and align authorization behavior.
2. Fix concrete data-integrity and concurrency bugs.
3. Collapse the admin query fan-out and make queue synchronization reliable.
4. Redesign the scanner, reporting, and queue workflows around responsive and accessible primitives.
5. Add automated tests, CI, and performance measurement.

## Critical and High-Priority Findings

### 1. Authorization and database security are not reproducible

All tracked Supabase migrations start with `ALTER TABLE public.missing_items`. There is no baseline `CREATE TABLE`, so a fresh database or local reset cannot be constructed solely from the repository.

The executable migrations also do not:

- enable Row Level Security
- create policies or grants
- add the table to the realtime publication
- define the original table columns and defaults
- define constraints for workflow or quantity data

All reads and mutations run through the public browser Supabase client. That is a valid architecture only when the database itself consistently enforces authorization. Production might have out-of-band policies, but the repository cannot verify or reproduce them.

There are also direct authorization inconsistencies:

- [`canAccessWarehouse`](../lib/roles.ts#L59) grants every warehouse to an authenticated user whose role array is empty.
- `canReport` is calculated but never consumed.
- The [report form](../app/report-missing/page.tsx#L216) writes directly to Supabase without gating the page on authentication or `canReport`.
- The previously documented starter insert policy allowed only authenticated users, which would make the public report form fail only after the user completed it.
- A broad warehouse UPDATE policy would allow users to modify audit and export columns through direct REST calls even when the UI hides those actions.

This creates two possible deployment failures:

- **Fail-open:** insufficient RLS permits unauthorized reads or mutations.
- **Fail-broken:** strict RLS rejects workflows the frontend presents as available.

#### Recommendation

Create a complete baseline migration with schema, constraints, indexes, realtime setup, grants, and tested RLS policies. Move clear, export, restore, and delete into narrow server-owned RPCs or application endpoints. Deny empty-role warehouse access and gate the report page with the same role rules enforced by the database.

### 2. Export and restore operations can silently produce incorrect results

The admin table shows Restore for every cleared row in [`app/admin/missing-items/page.tsx`](../app/admin/missing-items/page.tsx#L727). However, [`restoreMissingItems`](../lib/missingItems.ts#L208) only updates rows whose `exported_at` is null. Clicking Restore on a downloaded row therefore produces a silent no-op.

Every mutation checks only Supabase's `error` value. A query affecting zero rows is treated as success, so stale selections, permission mismatches, and concurrent changes can go unnoticed.

Export is also a non-atomic sequence:

1. Fetch rows whose `exported_at` is null.
2. Generate a browser download.
3. Ask the user to confirm the download.
4. Update those rows with export metadata.

[`markMissingItemsExported`](../lib/missingItems.ts#L229) does not require `exported_at IS NULL` during the update. Two admins can export the same rows with different batch IDs, and the last confirmation can overwrite the earlier audit metadata. Repeated button activation creates the same risk.

The generated CSV overrides export time and batch ID, but not the exporting actor, so a newly generated file can contain blank `exported_by` values.

#### Recommendation

Implement an atomic claim/export operation using database time and authenticated user identity. Return and validate the exact affected IDs. Hide Restore for downloaded rows unless an explicit “unexport and restore” workflow is defined.

### 3. Immediate correctness defects

#### Duplicate Tackle cart ID

Cart numbers 256 and 299 both use `id: "B54"` in [`lib/tacCarts.ts`](../lib/tacCarts.ts#L57). Clicking either row increments both because updates match by ID. React also receives duplicate keys.

Give every cart a unique stable ID and add a fixture test that rejects duplicate IDs and numbers within each warehouse dataset.

#### Invalid quantity handling

The report form checks quantities only for non-empty strings and converts them with `parseInt` in [`app/report-missing/page.tsx`](../app/report-missing/page.tsx#L180). Inputs have no integer, range, or positivity validation, and the migration contains no database checks.

Examples of current behavior:

- `1e3` persists as `1`
- decimals are truncated
- negative quantities are accepted
- zero missing quantity is accepted
- queued items can bypass native form-submit validation

Use explicit finite-integer validation, appropriate `min` and `step` attributes, domain limits, and database `CHECK` constraints. Treat order numbers as identifiers using text inputs with `inputMode="numeric"` if leading zeros or long values matter.

#### Duplicate report submission

Report submission has no pending state, disabled state, or idempotency key. Two clicks before the first insert resolves can create duplicate batches.

Add a client pending guard and a database-enforced request or batch idempotency key.

#### Common report fields become permanently locked

After the first item is queued, warehouse, initials, and cart are hidden. Removing the final queued item does not reset `hasSetCommonData`, so the user cannot correct those values without reloading.

Always show a common-details summary with an Edit action, and derive the lock from queue state rather than maintaining a separate boolean.

#### Comparator contract violation

[`compareValues`](../components/MissingItemsPage.tsx#L70) returns `1` when both values are null. A comparator must return `0` for equal values. Descending sorting also moves nulls to the front even though ascending places them last.

Define stable null ordering and test comparator antisymmetry and transitivity.

#### Incomplete CSV formula protection

[`formatCsvCell`](../lib/missingItemsExport.ts#L28) protects cells only when the first character is `=`, `+`, `-`, or `@`. Leading tabs, carriage returns, and whitespace can bypass that check.

Normalize or reject leading control characters and test common spreadsheet-formula payloads.

## Performance Findings

### 4. Admin interactions fan out to 21 Supabase requests

[`loadDashboard`](../app/admin/missing-items/page.tsx#L169) requests the current page and warehouse summaries in parallel. [`getAdminWarehouseSummaries`](../lib/adminMissingItems.ts#L326) runs five queries for each of four warehouses.

That produces:

- 20 summary requests
- 1 page request
- 21 total requests per load

Search updates state on every keystroke, rebuilds the callback, and retriggers the effect without debounce or cancellation. The load-ID guard prevents stale responses from overwriting current UI, but it does not prevent the obsolete network and database work.

#### Recommendation

- Replace the 20 summary queries with one grouped aggregate RPC or database view.
- Load or cache global summaries independently from table filters.
- Debounce search.
- Abort superseded page requests.
- Preserve existing rows during refresh and show table-level loading feedback.

### 5. Warehouse queues fetch and render every active row

[`getMissingItems`](../lib/missingItems.ts#L141) and `getCompletedMissingItems` use `select("*")` with no range or limit. The component stores all returned rows, clones and sorts the array during render, and creates every table cell.

As the backlog grows, this increases:

- network payload
- parsing and validation work
- React state size
- sort cost
- DOM size
- realtime reconciliation cost

If the deployed PostgREST API has a maximum-row cap, older rows may instead disappear silently because results are ordered newest-first.

#### Recommendation

Use explicit column projections, keyset pagination, visible counts, and memoized sorting. Consider virtualization only after measuring realistic queue sizes.

### 6. Tracked indexes do not cover important ordering and search paths

The repository tracks indexes for:

- `(page_type, completed, cleared_at)`
- `(page_type, cleared_at, exported_at)`

These support several exact filters, but neither supports active queue timestamp ordering or the oldest-open lookup. Admin search uses leading-wildcard `ILIKE` across eight fields plus an exact count, with no tracked trigram or search-vector index.

#### Recommendation

Inspect the live database first, then run `EXPLAIN (ANALYZE, BUFFERS)` on representative queries. Likely candidates include partial timestamp indexes for active/history rows and trigram indexes for frequently searched text fields.

### 7. Batch mutations can trigger quadratic client work

The queue subscribes to all page-level UPDATE and DELETE events. Each event maps or filters the entire active array. A large clear operation can therefore deliver many row events, each doing an O(active rows) scan, followed by an explicit full refetch.

Admin operations can also serialize thousands of IDs into `.in("id", itemIds)` URL filters, eventually risking request-size limits.

#### Recommendation

Use server RPCs that accept arrays in request bodies, return changed IDs or a batch result, and reconcile the client once per batch. Interim browser implementations should chunk large operations.

### 8. Supabase and auth are in the shared client graph

The root layout always renders `ClientBody`, which mounts `AuthProvider` and `GlobalNav`. The auth provider imports Supabase and initializes session handling on every route, including public cart and home pages.

There is also avoidable module coupling:

`GlobalNav` → `warehouses` → `missingItems` → `supabaseClient`

This makes pure warehouse configuration pull in data-access code.

#### Recommendation

Move `PageType` and warehouse configuration into a pure domain module. Scope auth/data providers to route groups that require them, or supply minimal server-derived session information to the shared shell.

### 9. First paint is delayed or incorrect

Dark mode begins unmounted and reads local storage in an effect. All warehouse cart pages return `null` until that effect finishes, guaranteeing blank main content before hydration.

Auth similarly begins as signed out. Existing authenticated users initially see the login screen, then wait for queue data. Missing queues initialize as an empty array and can display “No missing items” before a successful response—or after a failed response.

#### Recommendation

- Apply theme before paint and respect system preference.
- Use an auth state such as `loading | authenticated | unauthenticated`.
- Use data states such as `loading | success | empty | error`.
- Render stable skeletons rather than blank or misleading screens.

## Realtime and Reliability Findings

### 10. Initial fetch and realtime events can lose or duplicate rows

The queue starts its fetch before the subscription is confirmed and later replaces state wholesale. Inserts between the query snapshot and subscription can be missed. Delayed events for rows included in the snapshot can be appended twice.

The UPDATE handler only maps existing rows. A restored history row is absent from the active array, so it never reappears live. Checkbox controls also depend entirely on realtime to reflect a successful update.

Fetch and subscription failures are not surfaced; users instead see the empty state.

#### Recommendation

- Track subscription status.
- Establish a deterministic snapshot/subscription sequence.
- Merge and upsert by ID rather than append or replace blindly.
- Update checkboxes optimistically with rollback.
- Perform a full resync after reconnect, tab wake, or channel degradation.
- Distinguish loading, empty, error, and degraded-realtime states.

Supabase requires the table to be included in a realtime publication. Its current documentation recommends Broadcast over Postgres Changes for stronger scalability and security when volume warrants the added setup: [Supabase realtime documentation](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes).

## UI, UX, and Accessibility Findings

### 11. The core cart workflow is pointer-dependent and undiscoverable

Cart entries are non-focusable `<li>` elements with click handlers. Resetting one cart requires an undocumented context-menu/right-click action. There is no decrement-by-one operation or equivalent keyboard/touch workflow.

The cart input has no visible label or submit button. An unmatched scan is silently cleared, which can make an operator believe it succeeded. A count of one is represented only by color because `x1` is omitted.

#### Recommendation

- Render cart entries as real buttons with state and count text.
- Provide increment, decrement, and reset actions.
- Add a labeled scanner input and explicit submit action.
- Normalize expected identifier casing.
- Preserve scanner focus after submission.
- Announce success and “cart not found” results through a visible status and `aria-live` region.
- Consider a sticky scanner toolbar and recent-scan history.

### 12. Mobile layouts overflow

Home action rows, scanner controls, warehouse navigation buttons, and queue actions use fixed non-wrapping flex rows. Warehouse tables have 10–12 columns without a horizontal-scroll wrapper.

#### Recommendation

Use responsive grids or wrapping controls, stack primary actions on small screens, and provide either mobile queue cards or an intentional scroll container with sticky identifying columns.

Validate at 320px, 375px, tablet widths, landscape, and 200% browser zoom on the actual warehouse devices.

### 13. Queue tables are not keyboard- or screen-reader-friendly

- Sorting is attached directly to non-focusable `<th>` elements.
- Headers do not expose `aria-sort`.
- Row checkboxes have no item-specific accessible names.
- Checkbox touch targets are small.
- Completed rows use `opacity-10`, making their contents nearly invisible.
- Workflow state is conveyed mainly through row color.

Use buttons inside sortable headers, named controls, at least 44px touch targets, explicit status badges, and a subdued but readable completed style.

### 14. Navigation semantics and account UX are inconsistent

The hamburger lacks an accessible name, expanded state, menu relationship, Escape/outside-click behavior, and a visible focus treatment. Its white transparent styling can disappear against light pages.

Links frequently wrap buttons, producing invalid nested interactive elements. The app also has no consistent account area showing identity, role/warehouse access, theme, and logout; admin lacks a direct logout action.

Build a semantic `<nav>`, style links directly as buttons, add correct disclosure behavior, and introduce a shared account menu.

### 15. The visual system lacks stable semantics

Warehouse color choices are repeated across pages, while status colors change meaning between light and dark mode. Destructive, primary, navigation, and reporting actions frequently reuse the same red styling. Several common button/heading colors do not meet normal-text contrast requirements.

Report and modal surfaces are always dark even when the rest of the application is light. Four nearly identical warehouse theme blocks create unnecessary CSS duplication.

#### Recommendation

Introduce semantic design tokens and shared primitives for:

- primary and secondary actions
- destructive actions
- success, warning, and error states
- warehouse identity accents
- surfaces, borders, and text
- focus rings
- status badges

Keep warehouse identity as an accent rather than changing the meaning of action colors.

### 16. Reporting workflow needs a review-oriented redesign

Queued items display only a truncated order/description summary and can be removed but not edited. Common data becomes hidden after the first item. Errors appear only at the top rather than beside fields, and raw backend messages can be exposed to users.

Recommended reporting flow:

1. Enter or confirm warehouse/cart/operator details.
2. Add items through a compact scanner-friendly form.
3. Review an editable queue with quantities and locations visible.
4. Submit once with a clear pending state.
5. Show the submitted count and links to add more or view the appropriate queue.

For operational resilience, consider local draft recovery so an accidental refresh does not discard a long queued report.

### 17. Admin workflow clarity can improve

- Summary values for Cleared and Downloaded overlap, which can look like separate totals.
- View and status filters permit contradictory combinations such as Active + Cleared.
- Bulk actions are disabled for All and Site filters without explaining that one warehouse must be selected.
- Full descriptions are truncated with no detail view.
- Automatic filter loads change only the Refresh button label while stale table contents remain visible.
- Action errors can appear behind an open modal.

Use disjoint status definitions or clearer labels, constrain incompatible filters, explain action scope, add row details, and provide table/action-local loading and error feedback.

## Framework and Build Hygiene

### 18. App Router metadata and CSS should be normalized

Warehouse client pages use `next/head`. Current Next.js App Router guidance replaces `next/head` with the Metadata API. Because metadata exports must come from Server Components, use route layouts or server page wrappers for route titles and descriptions.

Global/Tailwind CSS is imported from `ClientBody` rather than the root layout. Next.js recommends importing global styles from the root layout for predictable ordering.

References:

- [Next.js App Router migration guidance](https://nextjs.org/docs/app/guides/migrating/app-router-migration)
- [Next.js CSS guidance](https://nextjs.org/docs/app/getting-started/css)

### 19. Package and Tailwind ownership is contradictory

`package.json` declares Yarn as the package manager, but `package-lock.json` is the tracked lockfile and there is no Yarn lockfile. Tailwind 3 is the active PostCSS plugin while `@tailwindcss/postcss` 4 is also installed but unused.

Choose one package manager and one Tailwind generation. If retaining Tailwind 3, remove the unused v4 plugin. If migrating to Tailwind 4, update the PostCSS and global CSS setup together and verify the visual output.

The Tailwind content configuration also scans only `app` and `components`, while dynamic class strings exist in `lib`. Current styles happen to overlap with classes elsewhere, but this is fragile. Include the relevant source directories or keep presentation tokens inside scanned UI files.

### 20. Global CSS is overly broad

Global `.container`, `.container ul`, and `.container ul li` selectors affect every matching element rather than only cart grids. Several theme selectors expect `.container` to be a descendant even though theme and container classes are applied to the same element, making parts of the stylesheet ineffective.

Replace broad global selectors with component-scoped classes, CSS Modules, or shared Tailwind primitives.

## Testing, CI, and Documentation

There are currently:

- no unit, integration, or end-to-end tests
- no `test` script
- no CI configuration
- no automated accessibility checks
- no reproducible local Supabase reset
- no bundle or Web Vitals measurement

The README describes features and technologies but does not document installation, environment setup, role provisioning, database initialization, validation commands, or deployment.

### Recommended minimum test suite

#### Unit tests

- role parsing and the complete authorization matrix
- cart fixture uniqueness
- missing-item row parsing
- comparator null ordering
- quantity validation
- CSV escaping and formula hardening
- workflow status derivation

#### Integration tests

- fresh database migration/reset
- RLS role/action matrix
- exact-ID clear and affected-row validation
- concurrent export claims
- clear → remove → restore → realtime reappearance
- idempotent report submission
- pagination across configured API row limits

#### Browser tests

- scanner success and unmatched-scan feedback
- add/edit/remove/submit report flow
- keyboard-only cart and queue operation
- login/session loading behavior
- admin search, pagination, filters, and action dialogs
- mobile/zoom overflow
- dark-mode first paint
- accessibility checks with axe plus manual screen-reader verification

#### CI baseline

1. deterministic dependency install
2. lint
3. typecheck
4. unit tests
5. integration tests against a fresh local Supabase instance
6. production build
7. targeted Playwright tests

## Recommended Delivery Plan

### Phase 1: Security and correctness

1. Add a complete Supabase baseline migration and verified RLS policies.
2. Align frontend and database authorization rules.
3. Gate the report workflow with auth and roles.
4. Fix the duplicate cart ID.
5. Add strict quantity validation and database constraints.
6. Add pending/idempotency guards.
7. Make mutations return and validate affected IDs.
8. Replace export/restore/delete with atomic server-owned operations.

### Phase 2: Performance and reliability

1. Replace the 20-query summary fan-out with one aggregate query.
2. Debounce and cancel admin search requests.
3. Add explicit queue loading/error states.
4. Make realtime reconciliation ID-based and reconnect-safe.
5. Add queue pagination and explicit column projections.
6. Inspect live query plans and add measured indexes.
7. Decouple pure domain configuration from Supabase imports.
8. Remove blank pre-hydration rendering.

### Phase 3: UX and visual system

1. Build a semantic responsive application shell.
2. Redesign the cart scanner workflow.
3. Redesign report entry as an editable review queue.
4. Make warehouse tables responsive and keyboard-accessible.
5. Add explicit status badges, counts, and action feedback.
6. Add a shared account/theme/logout menu.
7. Introduce tested semantic design tokens and shared UI primitives.
8. Normalize App Router metadata and global CSS ownership.

### Phase 4: Quality and measurement

1. Add unit, integration, accessibility, and browser tests.
2. Add CI against a fresh database.
3. Standardize package management and runtime requirements.
4. Document setup, roles, migrations, and deployment.
5. Capture bundle size, Web Vitals, Lighthouse, and live SQL baselines.
6. Re-measure after each performance-focused change.

## Acceptance Criteria for the Improvement Program

- A fresh checkout can install, migrate, test, build, and run from documented commands.
- A fresh database has the same schema, policies, indexes, and realtime behavior as production.
- Every role has an automated allowed/denied action matrix.
- Mutations are atomic, idempotent where appropriate, and validate affected rows.
- Queue state cannot confuse loading, empty, error, or disconnected conditions.
- Admin search does not issue requests for every raw keystroke, and dashboard summaries use one aggregate request.
- Large queues remain complete and usable through explicit pagination.
- Scanner and queue workflows work with mouse, keyboard, touch, and warehouse scanner hardware.
- Mobile layouts and 200% zoom do not lose content or controls.
- Visual status is never communicated through color alone.
- CI runs lint, typecheck, tests, and a production build before deployment.

