# MediaAtlas development

- This is an independent repository. Do not read/write the AI-DMP business DB or modify its containers.
- Source plan: docs/superpowers/plans/2026-11-24-实施计划书.md; design: docs/superpowers/specs/2026-11-24-总体设计.md. Later user choices and verified progress in the ledger take precedence over initial defaults.
- Progress ledger: .superpowers/sdd/2026-11-24-实施计划书/progress.md. Read it before resuming; do not repeat successful cloud probes without a reason.
- Backend commands run in backend: uv run pytest -q; uv run ruff check app tests migrations.
- Frontend commands run in frontend: npm run test; npm run build. npm on this host needs a writable cache, e.g. repository .local/npm-cache.
- Tests must use an explicit PostgreSQL TEST_DATABASE_URL whose DB name ends in _test; use isolated schemas, never business tables.
- Credentials remain in ignored .env. Never print secret values or signed URLs; never commit real tokens, account passwords or private media.
- User prioritizes low spend and GitHub evidence. CLOUD_BULK_ENABLED stays false. UI refresh never triggers cloud inference. Only explicit, bounded probes use the cloud.
- IAM user retains AccessKeySelfManageAccess and TOSFullAccess per user's explicit choice. Do not force a custom-policy setup again. This broad permission does not authorize modifying/deleting old cloud objects: tests touch only their unique objects under the agreed project prefix.
- Current milestone is foundation, not the complete platform. Four-modality processing, visual embeddings, reviews and unified retrieval must be implemented and verified before claiming completion.
