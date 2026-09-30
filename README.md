# Highlight-Helper (Next.js Edition)

## Overview

**Highlight-Helper (Next.js Edition)** is a web-based tool designed to streamline the reporting and management of missing items for in-house warehouse operations. Initially developed as a navigation aid, this iteration pivots to a specialized solution for Tackle, Tennis, and Running Warehouses, enhancing workflow efficiency and reducing operational strain.

Built as an internal tool that empowers operators to log missing items seamlessly and provides admins with a secure interface to review reports, integrating modern web technologies for a robust user experience.

## Features

- **Missing Item Reporting**: Operators can submit detailed reports including cart numbers, order numbers, and quantities via an intuitive form.
- **Warehouse-Specific Functionality**: Supports multiple warehouses (Tackle, Tennis, Running) with dynamic routing.
- **Admin Dashboard**: Secure access to view and manage reported items.
- **Efficient Workflow**: Reduces manual effort by integrating with existing warehouse processes.

## Missing item notes

Running and Tennis queues have a Notes field immediately after Looked For.
Changed text saves when the field loses focus. Failed saves retain the draft
in the current page, with a Retry save button. Drafts survive queue refreshes,
sorting, and pagination, but not browser reloads or leaving the page.
Saved notes are included as the last CSV column; existing columns retain their order.

Before deploying this feature, apply
`supabase/migrations/20260930000000_add_missing_item_notes.sql`
to the target Supabase database. The shared row projection requires this column
for all warehouse queues. Verify authenticated Running and Tennis users can
update `notes` under the project's existing row-level security policies.
The migration adds a column only; it does not change policies or existing data.

## Tools & Tech Stack

- **Next.js**: React framework for server-side rendering and static site generation, powering the frontend and routing.
- **TypeScript**: Adds type safety and improved developer experience to the JavaScript codebase.
- **Supabase**: Backend-as-a-Service for real-time database storage and authentication, handling missing item data.
- **React**: Core library for building interactive UI components.
- **Tailwind CSS**: Utility-first CSS framework for responsive, dark-mode-ready styling.
- **Vercel**: Deployment platform for hosting and scaling the application.

---

🔧 _Designed for warehouse efficiency._
