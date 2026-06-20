---
owner: dingran.nju@gmail.com
created: 2026-06-20 13:53:36 -0700
updated: 2026-06-20 14:01:41 -0700
---

# Initiative: PortWatch Polish And Local Install

## Why This Matters

PortWatch should feel like a trustworthy, compact macOS utility for inspecting and managing local development ports. The work is successful when the menu bar app is visibly more polished, the core workflows still work, and the finished app is installed on this laptop.

## Invariants

- The renderer must keep using the existing `window.portwatchAPI` IPC surface.
- Process-kill actions must remain explicit and confirm before sending SIGTERM or SIGKILL.
- The app must remain a compact menu bar utility, not a marketing surface or oversized dashboard.
- Validation must include both automated checks and rendered UI inspection.
- Installation must use a locally built artifact from this repo.

## Scope

### In Scope

- Improve the Electron renderer UI polish for filters, presets, port rows, empty states, confirmations, and status feedback.
- Update tests that depend on changed control labels or selectors.
- Run typecheck/build/test validation for affected workspaces.
- Package the macOS app and install it to `/Applications` or the user Applications folder.

### Out Of Scope

- Publishing releases, notarization, Homebrew updates, or remote distribution.
- Changing the core port scanning model unless UI validation reveals a blocker.
- Adding new third-party UI libraries unless required by tests or build.

## Assumptions

- The repo can use npm workspaces as configured in `package.json`.
- The local machine is macOS and can run Electron packaging.
- Existing Playwright Electron tests are the primary automated UI regression suite.

## Risks

- Risk: Electron packaging may need dependencies that are not installed yet.
  Mitigation: Run `npm install`, then use existing build and dist scripts.
- Risk: Visual polish may break tests that target old emoji controls.
  Mitigation: Update tests to target stable accessible labels or visible text.
- Risk: Installing an unsigned app can trigger macOS first-launch security friction.
  Mitigation: Install locally and report exact path plus any launch caveat.
- Risk: `electron-builder` can prune workspace dev dependencies during dependency rebuild.
  Mitigation: Set `npmRebuild` to false for this app, which has no native production modules requiring rebuild.
- Risk: `npm install` reports dependency advisories.
  Mitigation: Record as follow-up; do not force audit upgrades in this UI/package pass.

## Validation Checkpoints

- TypeScript typecheck for `@portwatch/app`.
- App build succeeds.
- Electron Playwright tests pass after selector updates.
- Rendered screenshot evidence exists for the polished menu bar surface.
- Packaged macOS app artifact exists and is installed locally.

## Plan

### Phase 1: UI Upgrade

#### Task 1.1: Replace the renderer shell
- Outcome: PortWatch has a compact polished layout with stronger controls, status, list rows, and dialogs.
- Artifact: `packages/app/src/renderer/App.tsx` and `packages/app/src/renderer/index.css`.
- Status: Completed.

#### Task 1.2: Update UI tests for the new controls
- Outcome: Tests assert the same workflows through stable labels/selectors.
- Artifact: `packages/app/test/ui.spec.ts`.
- Status: Completed.

### Phase 2: Verification

#### Task 2.1: Run automated validation
- Outcome: Typecheck, build, and Electron UI tests pass or failures are documented with fixes.
- Artifact: Command results in the session log.
- Status: Completed.
- Evidence: `npm run typecheck -w @portwatch/app` passed; `npm run test -w @portwatch/app` passed with 20/20 Electron Playwright tests.

#### Task 2.2: Capture rendered UI evidence
- Outcome: Screenshot evidence verifies the app is not blank, has no visible framework overlay, and core controls render cleanly.
- Artifact: Screenshot saved outside the repo.
- Status: Completed.
- Evidence: `/tmp/portwatch-polished.png`; console check reported title `PortWatch`, no framework overlay, and no console warnings/errors.

### Phase 3: Local Install

#### Task 3.1: Package the macOS app
- Outcome: A distributable `.app`, DMG, or zip is produced from the repo.
- Artifact: `packages/app/release` output.
- Status: Completed.
- Evidence: `npm run dist:mac -w @portwatch/app` passed after setting `npmRebuild: false`; produced arm64 and x64 DMG/zip artifacts.

#### Task 3.2: Install and verify locally
- Outcome: PortWatch is installed on this laptop and can be launched.
- Artifact: Installed app path and launch verification.
- Status: Completed.
- Evidence: `/Applications/PortWatch.app` was refreshed from `packages/app/release/mac-arm64/PortWatch.app`; `codesign --verify --deep --strict` passed; launched process from `/Applications/PortWatch.app/Contents/MacOS/PortWatch`.

## Decisions

- 2026-06-20 13:53:36 -0700: Track the work as an initiative because the request spans UI implementation, regression testing, packaging, and local installation.
- 2026-06-20 14:01:41 -0700: Keep packaging as electron-builder based, but disable npm rebuild because the app has no native production modules and the rebuild step pruned the workspace dev dependency tree before 7zip execution.

## Progress Log

- 2026-06-20 13:53:36 -0700: Created initiative after inspecting the Electron app structure and renderer surface.
- 2026-06-20 14:01:41 -0700: Completed UI polish, renderer CSP, Electron test updates, app type fix, packaging config fix, visual QA screenshot, macOS packaging, and local `/Applications` install.

## Open Questions

- None for the requested UI polish and local install. Follow-up candidate: run a dependency audit/upgrade pass for npm advisories.
