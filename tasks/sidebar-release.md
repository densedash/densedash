# Sidebar component, live docs, and release

Split before implementation: SIDEBAR-PACKAGE owns the reusable component and CSS, approximately 1,100 production lines across 16 files including three generated artifacts. SIDEBAR-DOCS owns the docs consumer and browser flow, fewer than 15 files and 1,000 production lines. SIDEBAR-DOCS is blocked by SIDEBAR-PACKAGE. Publish one fixed-group release after both PRs merge.

## SIDEBAR-PACKAGE contract

1. Export Sidebar.Root, Toolbar, Trigger, Viewport, Nav, Content, Section, Item, and Group from @densedash/react; prove public API tests, types, package builds, publint, and packed ESM checks.
2. Ship token-based sidebar.css with covering/fading transitions, fixed navigation height, text-only headings with stable metrics/translation, and bounded compact button surfaces; prove the existing real-browser sandbox flow and CSS policy.
3. Support recursive inline directories and native rail popups with arrows, Home/End, Enter/Space, Escape, and focus return; prove the Sidebar unit suite and Chromium/WebKit critical flow.
4. Preserve controlled/uncontrolled state, cancellable callbacks, mounted directory identity, logical direction, reduced motion, and stationary toggles; prove the same tests and manual review.
5. Trust typed consumer content/tokens and treat browser events/layout as input; no new network, persistence, routing, or dependency boundary.
6. Resource ownership: Root owns nav/focus state, each Group owns its popover lifecycle, and CSS owns motion. Preserve listener cleanup and effect ordering.
7. Include a minor changeset for the fixed core/css/react group; validate the release plan before creating a draft PR.
8. Merge the successful exact reviewed SHA, without bypassing checks; authorization includes marking the requested merge ready after validation.
9. Keep local playgrounds, their lockfile importers, scratch plans, and historical worklogs out of this PR.
10. Non-goals: registry expansion, new keyboard kernels, unrelated component changes, or publishing before the dependent docs PR lands.

## SIDEBAR-DOCS contract

Blocked by SIDEBAR-PACKAGE.

1. Add /sidebar to docs navigation, using the existing dynamic component route, installation/API/parts/token/keyboard references, and a live example; prove production build and Chromium/WebKit docs flow.
2. Import the published Sidebar namespace and CSS; show the exact running example in Code, without duplicating navigation mechanics; prove source assertions and browser interactions.
3. Demonstrate the approved stationary toggle, constant nav height, equal sheet insets, covering transition, text-only compact headings with balanced gutters, bounded highlights, and recursive directory groups.
4. Verify collapse/expand, keyboard traversal, nested popup selection, Escape/focus return, and source/preview switching in one critical browser flow.
5. Reuse package-only docs conventions without claiming a shadcn registry item; preserve the Filter install text and existing nine registry items; prove existing docs/registry tests.
6. Trusted repository fixtures/source are rendered through React and existing compile-time highlighting. GitHub, Vercel, and npm are the authenticated release boundaries; expose no credentials or change access.
7. The example owns selection only. Sidebar owns interaction. Existing route loaders own preview loading and the build owns highlighted source; no new effects or global shortcuts.
8. Create a draft PR from latest origin/main and merge only its successful exact head; preserve unrelated local files and record verification on the PR.
9. Merge the automated version PR after its gates pass, verify all fixed-group packages on npm, and verify the production /sidebar URL with the live reusable example.
10. Non-goals: a new docs framework, registry expansion, changes to approved toggle/height behavior, bypassed CI, or manual release-token handling.
