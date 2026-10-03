# Doce Sonho Agent Guide

## Project

Doce Sonho is an Expo 54 React Native app using TypeScript, Expo Router, React Native Paper, and Supabase. The app manages products, shipments, sales, customers, profiles, and reports.

## Commands

- `pnpm start`: start the Expo development server.
- `pnpm web`: start the web target.
- `pnpm android` / `pnpm ios`: run a native development build.
- `pnpm lint`: run the configured Expo ESLint checks.
- `pnpm exec tsc --noEmit`: run the strict TypeScript check.
- `eas build --platform android --local`: build the local Android artifact when a native APK is required.

There is currently no test script in `package.json`. Do not claim tests passed when only lint or type checking was run.

## Architecture

- `src/app/` is the Expo Router route tree. Route groups and layouts define navigation; keep route filenames aligned with their URLs.
- `src/app/_layout.tsx` owns the provider order and auth-gated root navigation. Preserve the `AuthProvider` and `AppProvider` boundaries when changing startup behavior.
- `src/contexts/` contains cross-screen state. Prefer local state for screen-only UI state; use a context only for state shared by multiple screens.
- `src/service/` is the Supabase data-access layer. Screens should call services rather than embedding database queries.
- `src/types/` defines the database/domain contracts. Keep types synchronized with schema changes.
- `src/components/` contains reusable UI such as `Header`, `ModernInput`, `ModernButton`, `ModernModal`, and metric/list cards.
- `src/hooks/` contains reusable screen behavior, including focus-based loading and network status.
- `src/constants/Colors.ts` is the shared color palette; use it instead of scattering replacement colors.

The normal data path is route screen -> context or service -> Supabase client -> database, with `src/types/` describing the data between layers. When changing a feature, trace one complete path through these layers and preserve the existing error/loading/refresh behavior.

## Supabase And Schema

- `src/lib/supabase.ts` configures Supabase session persistence for native and web. Use the authenticated user ID for user-owned queries.
- Keep service methods scoped by `user_id` and preserve the existing `{ data, error }` handling pattern.
- The base schema and database rules are documented in [SUPABASE_SETUP.md](SUPABASE_SETUP.md).
- Add later schema changes as one dated SQL file under `supabase/migrations/`, following [supabase/migrations/README.md](supabase/migrations/README.md). Write and review the migration before applying it in the Supabase SQL Editor.
- When a migration changes a table shape, update the matching file in `src/types/` in the same change.
- Respect database-maintained fields and triggers such as product stock totals and customer aggregates; do not duplicate their writes in the app without checking the schema behavior.
- Never commit `.env` values, Supabase secrets, service-role keys, or downloaded Google service-account files. Use `.env.example` as the template.

## UI And Code Conventions

- Use the existing Nunito font setup, React Native Paper primitives, shared components, `COLORS`, and `lucide-react-native` icons before introducing new UI patterns.
- Follow the established Portuguese user-facing copy and existing screen layout conventions.
- Keep dimensions and touch targets stable; preserve loading, empty, error, offline, and destructive-action states when modifying screens.
- Use the `@/*` path alias for imports from `src`.
- Keep TypeScript strict and preserve the public shapes of service methods and domain types unless the feature requires a coordinated change.
- Avoid broad refactors, new dependencies, and duplicated data-access logic for a local feature.

## Change Workflow

1. Start at the owning route, component, service, context, or type named by the task; inspect its nearest neighboring implementation and call sites.
2. Trace the relevant screen-to-service-to-schema path before editing.
3. Make the smallest coherent change, including a focused type or migration update when needed.
4. Run `pnpm lint` and `pnpm exec tsc --noEmit` after code changes. For navigation or native configuration changes, also run the narrowest available Expo or EAS check.
5. Report what was changed, which validation commands ran, and any checks that could not be run.

When explaining a change, briefly connect the code to the runtime flow so the behavior is understandable rather than presenting generated code as opaque machinery. Link to the relevant source or setup documentation instead of copying it into agent instructions.
