# Repository Guidelines

## Project Structure & Module Organization

- `src/app`: Next.js App Router entry (e.g., `page.tsx`, `layout.tsx`). Keep route segment folders lowercase.
- `public`: Static assets served at the web root.
- `next.config.ts`, `open-next.config.ts`, `wrangler.jsonc`: Build/deploy configs for Cloudflare.
- `.dev.vars`: Local env vars; do not commit secrets. Use `wrangler` secrets in prod.
- Generated/outputs: `.next/` (local builds), `.open-next/` (OpenNext bundle), `.wrangler/` (local dev state).

## Build, Test, and Development Commands

- `npm run dev`: Start Next.js dev server with OpenNext Cloudflare dev helpers.
- `npm run build`: Build the Next.js app.
- `npm start`: Run the production build locally.
- `npm run lint`: Lint with `eslint-config-next` + TypeScript rules.
- `npm run preview`: Build and preview the OpenNext Cloudflare worker locally.
- `npm run deploy`: Build and deploy to Cloudflare Workers via OpenNext.
- `npm run cf-typegen`: Generate Cloudflare bindings types. Run after changing `wrangler.jsonc` or bindings.

## Coding Style & Naming Conventions

- TypeScript, 2‑space indentation, semicolons, single quotes or Prettier defaults if configured.
- React functional components in PascalCase (e.g., `NavBar.tsx`). Route folders/files in `src/app` are lowercase (e.g., `settings/page.tsx`).
- Use Tailwind CSS utility classes in JSX; avoid inline styles when possible.
- Keep modules small and colocate component-specific styles/assets with the component.

## Testing Guidelines

- No test framework is configured yet. If adding tests:
  - Use `vitest` for unit tests and `@playwright/test` for e2e.
  - Place unit tests next to sources as `*.test.ts(x)` or under `src/__tests__/`.
  - Aim for critical-path coverage (routing, data fetching, components with logic).

## Commit & Pull Request Guidelines

- Prefer Conventional Commits (e.g., `feat: add auth button`, `fix: handle 404 in app router`, `chore: bump deps`).
- PRs must include:
  - Clear description, linked issues (e.g., `Closes #123`).
  - Screenshots/GIFs for UI changes.
  - Notes on env/config changes (`.dev.vars`, `wrangler.jsonc`) and any migration steps.
  - Passing `npm run lint` and a successful local run (`npm run dev` or `npm run preview`).

## Cloudflare & Security Tips

- Use `wrangler secret put KEY` for production secrets; never commit them. Keep local values in `.dev.vars`.
- When adding bindings (KV, R2, Queues), update `wrangler.jsonc` and rerun `npm run cf-typegen`.
- Validate deployments with `npm run preview` before `npm run deploy`.
