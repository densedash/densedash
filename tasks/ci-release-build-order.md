# Complete work before validation and scrolling

Size: one Filter release-readiness follow-up, the per-panel virtualizer and renderer peer, CI ordering, one browser assertion helper, a changeset, and this contract. Under 100 production lines. This follow-up unblocks the authorized Filter package release.

## Contract

1. Finish all existing Turbo builds before starting lint, typecheck, and tests; prove separate successful CI steps and their execution order.
2. Honor TanStack's synchronous measurement/scroll notifications outside React commits and preserve normal batching inside commits; prove the existing distant variable-height target flow and absence of new browser warnings.
3. Preserve the navigation model's fixed seed, 100 runs, assertions, and five-second test limit; prove the existing model test and full CI gate.
4. Preserve the browser job and its three independent passes; wait for full browser intersection after virtual-row scroll reconciliation. Prove the focused Chromium/WebKit flow and full e2e gate.
5. Declare the existing React DOM renderer as a peer and preserve frozen installation, package export/type checks, release-plan validation, and the type budget; prove a clean install and the final CI result.
6. Open a focused PR from fetched origin/main and merge only its reviewed successful head; prove the GitHub head and merge SHAs.
7. Trust boundaries: repository workflow commands are trusted; GitHub job state/logs are external evidence. No credentials, permissions, environments, or audiences change.
8. Invariant family: build artifacts exist before validation; unit tests do not compete with production bundlers for runner CPU; virtual size and scroll geometry commit together; browser assertions observe completed intersection updates.
9. Ownership/effect order: the checks job waits for successful builds before validation; each Filter panel owns the guard around its virtualizer's layout synchronization. Release observers as before, preserve failure propagation and cancellation, and use no new timers.
10. Non-goals: unrelated component changes, new packages, unit-test rewrites, retries, timeout increases, runner upgrades, access changes, or local playground changes. Keep evidence on the PR.
