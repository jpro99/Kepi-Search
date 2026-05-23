# Kepi-Search Permanent Engineering Rules

These rules are mandatory for every coding session.

## 1) Understand before editing
- Read the relevant files end-to-end before changing code.
- Do not guess requirements or behavior.
- If behavior is unclear, trace the data flow first.

## 2) No blind patching
- Do not patch code without understanding call sites and side effects.
- Prefer targeted, minimal edits over broad speculative rewrites.
- Verify imports, types, runtime environment, and execution context before modifying logic.

## 3) File creation discipline
- Do not create random/new files unless strictly necessary.
- Prefer updating existing modules.
- When a new file is required, wire it into the codebase intentionally and remove dead code.

## 4) Safe ID generation (required)
- Never use `crypto.randomUUID()`, `window.crypto.randomUUID()`, `self.crypto.randomUUID()`, or direct `randomUUID()` calls in app code.
- Always use the shared utility: `@/lib/utils/generateId`.

## 5) Redis/KV safety (required)
- Never initialize Redis clients at module top level.
- Never call `Redis.fromEnv()` outside a lazy function path.
- All Redis/KV operations must fail safely (no app crash on missing env/config/provider errors).

## 6) Next.js version caution
- This repo may use breaking Next.js behavior.
- Before framework-level changes, read relevant docs in `node_modules/next/dist/docs/`.

## 7) Validation before finishing
- Required checks before finalizing:
  - `npm run lint`
  - `npm run build`
- If changes affect covered behavior, run related tests.

## 8) Git quality
- Use clear, descriptive commit messages.
- Keep commits focused on one logical change.
- Do not leave partial or unexplained edits.
