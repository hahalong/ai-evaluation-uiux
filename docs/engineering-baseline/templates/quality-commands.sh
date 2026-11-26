uv sync --locked
uv run --locked ruff check packages/backend/src apps tests
uv run --locked ruff format --check packages/backend/src apps tests
uv run --locked mypy
uv run --locked pytest tests/unit tests/contracts
pnpm install --frozen-lockfile
pnpm --dir web run lint
pnpm --dir web run format:check
pnpm --dir web run typecheck
pnpm --dir web run test:unit
pnpm --dir web run build
