# AiX

Next.js 15 App Router + React 19 + Tailwind CSS 4, built for Cloudflare Workers using OpenNext. Local development uses `next dev` with Cloudflare helpers; production is bundled to a Worker via `@opennextjs/cloudflare`.

## Project Structure

- `src/app`: App Router entry (e.g., `page.tsx`, `layout.tsx`, `globals.css`).
- `public`: Static assets served at `/_next/static` and `/`.
- `next.config.ts`: Next.js config with OpenNext Cloudflare dev init.
- `open-next.config.ts`: OpenNext/Cloudflare overrides.
- `wrangler.jsonc`: Cloudflare Worker configuration and bindings.
- `.dev.vars`: Local environment variables (not committed). Secrets live in Wrangler.
- Generated: `.next/` (Next build), `.open-next/` (OpenNext worker bundle), `.wrangler/` (local dev state).

## Getting Started

- Prereqs: Node 20+ with Corepack. Activate pnpm: `corepack enable` (then `corepack prepare pnpm@10.15.1 --activate` if needed).
- Install deps: `pnpm install`
- Dev server: `pnpm dev` → http://localhost:3000
- Environment: put local values in `.dev.vars`. For prod, use `wrangler secret put KEY`.

## Scripts (pnpm)

- `pnpm dev`: Start Next.js dev with Turbopack and Cloudflare context.
- `pnpm build`: Build the Next.js app.
- `pnpm start`: Run the production build locally.
- `pnpm lint` / `pnpm lint:fix`: Lint (and fix) with ESLint; formatting errors reported via Prettier plugin.
- `pnpm format` / `pnpm format:check`: Prettier write/check with Tailwind class sorting.
- `pnpm preview`: Build and preview the OpenNext Worker locally.
- `pnpm deploy`: Build and deploy to Cloudflare Workers.
- `pnpm cf-typegen`: Generate Cloudflare env/bindings types after changing `wrangler.jsonc`.

## Cloudflare Deployment

1. Ensure `wrangler.jsonc` is correct and you’ve logged in: `npx wrangler login`.
2. Optional preview: `pnpm preview`.
3. Deploy: `pnpm deploy`.
   - Add bindings (KV, R2, Queues) in `wrangler.jsonc` and rerun `pnpm cf-typegen`.
   - Use `wrangler secret put NAME` for production secrets.

## Vercel AI SDK + Workers AI

- Packages: `ai` and `@ai-sdk/openai` are installed.
- Binding: `wrangler.jsonc` includes `{ "ai": { "binding": "AI" } }` (not required for HTTP compatibility, but available for future direct binding usage).
- Env config:
  - Set `CLOUDFLARE_ACCOUNT_ID` in `wrangler.jsonc` → `vars` or `.dev.vars`.
  - Set `CLOUDFLARE_API_TOKEN` via `wrangler secret put CLOUDFLARE_API_TOKEN` (or `.dev.vars` for local only).
- API route example: `src/app/api/ai/route.ts` uses Vercel AI SDK against Cloudflare’s OpenAI-compatible API.
  - Change the model as needed, e.g., `@cf/deepseek-r1-distill-qwen-32b` or `@cf/meta/llama-3.1-8b-instruct`.

### Hono route for useChat (AI binding)

- Route: `src/app/api/chat/route.ts` uses Hono and the `AI` binding directly.
- Client (React):

  ```ts
  import { useChat } from 'ai/react';

  export default function Chat() {
    const { messages, input, handleInputChange, handleSubmit } = useChat({ api: '/api/chat' });
    return (
      <form onSubmit={handleSubmit}>
        <ul>{messages.map(m => <li key={m.id}><b>{m.role}:</b> {m.content}</li>)}</ul>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>
    );
  }
  ```

  The endpoint currently returns a non-streaming JSON assistant message. Streaming can be added later.

## Formatting & Linting

- Prettier is configured in `prettier.config.mjs` and integrated with ESLint via `eslint-plugin-prettier` and `eslint-config-prettier`.
- Run `pnpm format` before committing. CI-friendly check: `pnpm format:check` and `pnpm lint`.

## Testing

Testing is not set up yet. Recommended: Vitest for unit tests and Playwright for e2e. See `AGENTS.md` for conventions if you add tests.

## Contributing

Please read `AGENTS.md` for structure, conventions, and PR requirements.
