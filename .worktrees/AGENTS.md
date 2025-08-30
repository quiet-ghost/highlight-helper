# AGENTS.md - Coding Guidelines for AI Agents

## Build Commands
- **Dev server**: `npm run dev` (Next.js development server)
- **Build**: `npm run build` (production build)
- **Lint**: `npm run lint` (ESLint with Next.js rules)
- **Type check**: `npx tsc --noEmit` (TypeScript validation)
- **No test suite configured** - add tests to package.json scripts when needed

## Code Style
- **Framework**: Next.js 15 with App Router, React 19, TypeScript 5
- **Client components**: Mark with `"use client"` directive at file top
- **Imports**: Use absolute imports via `@/*` path alias, Next.js imports (Link, Image)
- **TypeScript**: Strict mode enabled, always type props/state/returns
- **Components**: PascalCase files/exports, interfaces for props (e.g., `ComponentNameProps`)
- **State**: Use hooks (useState, useEffect), proper TypeScript generics
- **Styling**: Tailwind CSS classes, dark mode support via `dark:` prefix
- **Error handling**: Validate environment variables, handle async operations
- **File structure**: `/app` for pages, `/components` for reusables, `/lib` for utilities
- **Formatting**: 2-space indentation, semicolons optional but consistent
- **ESLint**: Next.js Core Web Vitals and TypeScript configs enforced