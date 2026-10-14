# Repository inventory

Baseline commit `3dc99a5`, 245 tracked files. See [per-file ledger](file-review-ledger.csv) for file purpose, imports, review status and disposition. Generated builds, node_modules, private local storage and test artifacts are excluded from manual first-party review. The ledger explicitly distinguishes pending reads from completed inspection; it is not a claim of exhaustive validation.

| Top-level group | Tracked files |
|---|---:|
| .dockerignore | 1 |
| .env.example | 1 |
| .github | 1 |
| .gitignore | 1 |
| Dockerfile | 1 |
| README.md | 1 |
| artifacts | 1 |
| compose.dev.yml | 1 |
| db | 8 |
| deployment | 1 |
| docs | 15 |
| e2e | 9 |
| eslint.config.mjs | 1 |
| next.config.mjs | 1 |
| package.json | 1 |
| playwright.config.ts | 1 |
| playwright.live.config.ts | 1 |
| pnpm-lock.yaml | 1 |
| postcss.config.mjs | 1 |
| public | 10 |
| scripts | 10 |
| src | 170 |
| tailwind.config.ts | 1 |
| tests | 3 |
| tsconfig.json | 1 |
| vitest.config.mts | 1 |
| vitest.integration.config.mts | 1 |

The active product is a single Next.js15/React19 application with PostgreSQL via pg and SQL migrations, plus a standalone Node worker. No ORM or NestJS runtime is used here. Browser demo routes remain isolated from real accounts. The alternate Downloads monorepo uses NestJS/Drizzle and is a reference pending scope confirmation. No automatic replacement is justified.

Live modules are used by the catch-all API, real account components and worker imports. Demo screens are reachable in demo mode and blocked/redirected by middleware in live mode; retain them for reference regressions. Import lists are static evidence, not proof of runtime execution. Binary assets need visual inspection, dependency lock needs supply-chain checks.
