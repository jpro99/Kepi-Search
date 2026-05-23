# Kepi-Search Permanent Engineering Rules

Apply these rules in every session before touching code.

## 1) Understand before editing
- Read relevant files fully and trace behavior first.
- No guessing requirements or behavior.

## 2) No blind patching
- Do not patch code without understanding dependencies and side effects.
- Prefer minimal, targeted changes.

## 3) File creation discipline
- Do not create random files.
- Add new files only when necessary and intentionally wired.

## 4) Safe ID generation (required)
- Do not use direct `randomUUID` APIs.
- Always use: `@/lib/utils/generateId`.

## 5) Redis/KV safety (required)
- No module-level Redis initialization.
- Keep Redis initialization lazy and safe.
- Storage failures must degrade gracefully, never crash UI/app.

## 6) Next.js caution
- Treat framework behavior as version-specific.
- Read relevant docs in `node_modules/next/dist/docs/` before framework-level changes.

## 7) Validation before finish
- Run:
  - `npm run lint`
  - `npm run build`

## 8) Clean delivery
- Use clear commit messages.
- Keep commits scoped to a single logical change.
