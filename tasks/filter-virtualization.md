# Virtualized Filter options and default styling

Size: one Filter component family, approximately 12–15 source files and 700 production lines. Three boundaries: trusted consumer definitions, DOM input/layout, and the existing TanStack Virtual dependency. No backend, persistence, or new package.

## Contract

1. Virtualize long option lists by default and allow `virtual={false}` or existing VirtualOptions tuning; prove bounded mounted rows with 5,000 search results in Chromium/WebKit and a production profiling comparison.
2. Preserve root → group → field popups and live parent anchors, including virtualized parent rows; prove the large docs example's nested keyboard flow and parent scrolling in both browsers.
3. Keep Up/Down wrapping, Home/End, Space multiselect, Enter apply, literal search spaces, Tab cycling, Escape and outside dismissal; prove existing component/browser checks plus the large-list happy path.
4. Keep active descendants mounted, expose full list positions, and reveal distant targets before moving focus; prove wraparound/End/Tab checks against actual viewport geometry.
5. Reflect changed definitions, controlled selections, custom rendering, disabled entries, and variable row heights; prove public API tests and real-browser row measurements.
6. Bring default CSS closer to Linear's compact type/spacing, softer squircle corners, and actual native checkbox inputs; prove visual browser review, checked-state/click checks, CSS policy, and token generation.
7. Preserve theme/density, native top-layer clipping escape, small-list behavior, consumer render/ref conventions, and cancellation; prove existing gates and manual mobile/theme/density checks.
8. Owners/effect order: each mounted Panel owns one virtualizer and its observers; mount the scroll element, synchronize measurements, render the bounded range plus active anchor, then reveal/focus. Release observers on close/unmount. No global caches, timers, retries, or new clocks.
9. Threat model: typed definitions, keys, labels and style props are trusted configuration; browser events/search/layout are untrusted input; React escapes text. Preserve existing command isolation and no external writes.
10. Non-goals: query engines, async search, backend changes, redesigning other components, publishing npm packages, changing the existing tree virtualization contract, or unrelated lockfile/playground changes. Keep performance evidence in the PR or a local report, not commits.

## Release contract

The user authorized PR creation, merge, deployment, and publication on November 16, 2026. This extends the implementation contract's publication scope.

1. Include only the reviewed Filter implementation, docs, tests, tokens, changeset, and this contract; verify the staged diff excludes the local playground and its lockfile.
2. Describe the final implementation and its measurements on the PR; verify the GitHub body and exact head SHA before merging.
3. Preserve the nine registry items and describe Filter as a React package component; prove the docs checks and generated registry count.
4. Merge the feature PR after CI passes, then merge the generated version PR after its own checks pass; verify both merge SHAs.
5. Publish the Changesets release plan using the existing CI workflow; verify npm dist-tags, package versions, provenance, and package contents.
6. Prove the published React/CSS packages work together from a clean temporary consumer; verify Filter exports, virtual options types, and CSS assets.
7. Deploy through the existing Vercel Git integration; prove the production 5,000-option example, checkboxes, nested keyboard flow, and focus.
8. Trust boundaries: GitHub, npm, and Vercel are authenticated release services; inspect responses and preserve existing credentials and access settings.
9. Ownership/effect order: Git owns source, CI owns checks and publication, Vercel owns deployment. Verify reviewed heads before merges and registry contents after publication. Never publish locally.
10. Non-goals: unrelated package features, local playground publication, registry expansion, workflow/access changes, or bypassing failed checks. Keep runtime evidence on the PR.
