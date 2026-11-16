# Wait for CI work before assertions

Size: one CI readiness change, one workflow, one browser assertion helper, and this contract, under 40 lines. This follow-up unblocks the authorized Filter package release.

## Contract

1. Finish all existing Turbo builds before starting lint, typecheck, and tests; prove separate successful CI steps and their execution order.
2. Preserve all build targets and checks; compare the commands with the previous combined invocation.
3. Preserve the navigation model's fixed seed, 100 runs, assertions, and five-second test limit; prove the existing model test and full CI gate.
4. Preserve the browser job and its three independent passes; wait for full browser intersection after virtual-row scroll reconciliation. Prove the focused Chromium/WebKit flow and full e2e gate.
5. Preserve frozen installation, package export/type checks, release-plan validation, and the type budget; prove the final CI result.
6. Open a focused PR from fetched origin/main and merge only its reviewed successful head; prove the GitHub head and merge SHAs.
7. Trust boundaries: repository workflow commands are trusted; GitHub job state/logs are external evidence. No credentials, permissions, environments, or audiences change.
8. Invariant family: build artifacts exist before validation; unit tests do not compete with production bundlers for runner CPU; browser assertions observe completed intersection updates.
9. Ownership/effect order: the checks job owns both phases and waits for the build command to exit successfully before validation. Preserve failure propagation and existing cancellation.
10. Non-goals: application changes, new packages, unit-test rewrites, retries, timeout increases, runner upgrades, access changes, or local playground changes. Keep evidence on the PR.
