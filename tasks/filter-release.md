# Reusable Filter and docs deployment

Size: one Filter component family with a documentation consumer, about 1,500 production lines. The standalone playground and its lockfile entry remain local. The pnpm registry command correction unblocks the required deployment gate. The requested performance pass stays within this component family.

## Contract

1. Export reusable Filter parts and token-based CSS; prove with public API tests, package builds, publint, and ATTW.
2. Preserve nested selection, search, Space/Enter/arrows, cancellation, and opener/parent/outside focus; prove with component tests and Chromium/WebKit docs checks.
3. Ship `/filter` with the same source for live preview and Code, keyboard references, and unreleased labeling; prove with the docs production build and browser checks.
4. Ignore the Filter shortcut while its docs preview is hidden; prove with the Code → F → Preview → F regression.
5. Preserve the nine published registry items and verify fresh npm/pnpm installs; correct only pnpm's unsupported leading `--yes` flag and prove through the existing registry test.
6. Create a draft PR from current `origin/main`; record verification on the PR, keeping scratch plans and worklogs out of commits.
7. Deploy through the existing Vercel Git integration after CI/preview pass; prove the deployed `/filter` route and live behavior.
8. Threat model: typed configuration and repository fixtures are trusted; DOM input is escaped by React. GitHub/Vercel are authenticated deployment boundaries. Never expose credentials or alter audiences.
9. Invariants/resources: Filter owns selection/menu/focus; Frame owns its kernel; source and preview share one file; GitHub owns CI, Vercel owns deployment. Verify the exact PR head before deployment.
10. Non-goals: npm publication, registry expansion, standalone playground publication, unrelated refactors, access-setting changes, or bypassing failed checks. Preserve the user's draft/ready policy.

## Performance acceptance

- Measure open, cursor navigation, search, and selection against stable fixtures at ordinary and stress sizes. Keep the benchmark/profile in temporary storage and report workload, production/development mode, timings, and limits on the PR.
- Remove measured redundant scans, allocations, or layout work while preserving selection, disabled items, search, custom rendering, and focus behavior. Validate with public API tests and the existing real-browser flow.
- Keep configuration/value updates observable when consumer props change. No new dependencies, global caches, timers, or delayed keyboard interaction. Do not adopt virtualization or a new state/ownership model without measurement and a separate scope decision.
- Synchronize sidebar navigation with the existing client-only Frame count, which proves browser initialization; verify the failing WebKit flow without sleeps, retries, or timeout increases.
