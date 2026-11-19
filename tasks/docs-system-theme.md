# DOCS-SYSTEM-THEME contract

Size: one docs appearance preference, about five files and fewer than 200 production lines.

1. Default to the machine's light/dark preference on first paint, including without JavaScript; prove with the production docs browser test and a script-disabled context.
2. Follow live machine color-scheme changes in System mode; prove with browser media emulation and computed colors.
3. Keep explicit Light/Dark choices and allow returning to System through a labelled native theme select; prove manual overrides and reset in the same browser flow.
4. Apply one mode consistently to docs chrome, source highlighting, docs-only helpers, native controls, and reusable component previews; compare representative public theme values between system and explicit modes.
5. Preserve density, existing palettes, routing, and current-page-session preference lifetime; prove types, production build, and existing browser flows.
6. Threat model: browser color-scheme is a preference, repository CSS is trusted, and select values are validated to the three supported modes. No network, storage, cookie, credential, or persistence boundary is added.
7. CSS owns automatic theme selection and live updates. RootDocument owns only the explicit choice; no media-query listeners, bootstrap scripts, timers, or shared mutable theme store.
8. Keep SSR/client initial state identical and omit an explicit data-theme override in System mode; prove absence of browser/hydration errors.
9. Use the existing draft PR, CI, merge, and Vercel site-deployment flow; verify the exact final head and live page.
10. Non-goals: package versions/public token changes, npm publication, theme persistence, density changes, or unrelated local playground/lockfile edits.
