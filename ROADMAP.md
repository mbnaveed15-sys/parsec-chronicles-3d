# Parsec Chronicles 3D — Phased Build Plan

Single-file constraint holds: every phase ships as one self-contained `index.html`
(`external URLs: none`). Each phase ends with a numbered build, changelog entry and
push to `main` only after browser verification.

Legend: **S** ≈ 1 session, **M** ≈ 1–2 sessions, **L** ≈ 2–3 sessions.
A "build" = one verified, shippable slice (not one commit).

## Phase overview

| Phase | Builds | Theme | Effort | Outcome |
|---|---|---|---|---|
| 0 | 58 | Foundations & quick wins | M | Test harness, save slots/export, shop QoL |
| 1 | 59–60 | Station assault | M | Destructible modules, sub-targeting, boss phases |
| 2 | 61–62 | Enemy roster, damage types, abilities | M–L | Three new roles, resistances, ability bar |
| 3 | 63–64 | Meta & replay | M–L | Contracts, squadron growth, weapon mods, NG+ |
| 4 | 65–66 | World & mission variety | L | Hazards, escort damage states, stealth mission |
| 5 | 67 | UX, accessibility, performance | M | Remap, colourblind, stats, photo mode, adaptive quality |
| 6 | 68+ | Platform & optional | M | Localisation; PWA decision gate |

Dependency rule: Phase 1 needs Phase 0's harness; Phase 2 needs Phase 1's module
damage routing; Phase 3 needs Phase 2's modifier hooks; Phase 4 can run in parallel
with Phase 3 after Phase 2.

---

## Phase 0 — Foundations (build 58)

**Goal:** make every later phase cheap to verify and safe to ship.

- Headless QA harness (`qa/`): boots `index.html`, seeds a save, pumps `tick()` N times,
  asserts no console errors, runs all 7 modes × 2 renderers × 3 input paths.
- Seed control: `?seed=` and `M.seed` so a failing run is reproducible.
- Save v2: 3 pilot slots, export/import as JSON, migration from v1, never destructive.
- Quick wins: buy-max in shop, owned-first sorting, exact stat-scaling tooltips,
  "restart with same loadout" on results.
- Definition of done: `npm run qa` green; v1 save opens with progression intact.

**Risk:** harness drifts from real browser. Mitigate by running it plus one manual
screenshot pass per phase.

---

## Phase 1 — Station assault (builds 59–60)

**Goal:** stations become fights, not HP sponges.

Build 59 — modules
- Per-turret HP (≈8% station HP), shield generator, core.
- Damage routing: shots that hit a module damage it first; dead turret stops firing,
  generator death drops the aura and floor disc, exposed core takes ×1.5.
- 2D and 3D visuals for damaged/destroyed modules; sparks and debris on death.
- HUD: station segment bar; sub-target cycling (`E` cycles ship → turret → generator → core).
- Save nothing; module state is per mission.

Build 60 — boss phases + readability
- Captain state machine: approach → volley → charge → overheat (weak window).
- Telegraphs: ring pulse, audio sting, HUD warning; charge cancellable by ion hit.
- Damage-direction arrows and a compact kill feed (also useful later).
- Acceptance: destroying each turret measurably lowers incoming fire; charge phase
  is survivable when dodged and punishable when ignored.

---

## Phase 2 — Roster, damage types, abilities (builds 61–62)

Build 61 — three enemy roles
- **Shield projector:** bubble on allies within radius; bubble HP; pops with feedback.
- **Mine layer:** arms after 1.5 s, visible pips, shootable, punishes tailing.
- **Carrier:** launches drones (reuse fighter AI with reduced HP), prioritises squadron.
- Spawn tables by sector; each role has a clear counter (ion/focus/splash).

Build 62 — damage types + ability bar
- Types: laser (shield ×1.25), ion (systems/EMP, shield ×0.6), plasma (armour burn),
  missile (splash), singularity (ignores shields, slow), vulcan (hull shred).
- Resistance table on ships/stations; HUD shows shield vs armour state.
- Ability bar: two slots, unlocked by mission milestones; flare, overcharge, dash,
  shield bubble. Keys 7/8, gamepad L1/R1, touch buttons, shared cooldown UI.
- Acceptance: swapping one weapon changes TTK by ≥25% against a shielded target;
  every ability fires from keyboard, pad and touch.

---

## Phase 3 — Meta and replay (builds 63–64)

Build 63 — contracts + endgame
- Daily contract seed from date (deterministic), 3 contracts with modifiers
  (no shields, double rammers, ion storm), payout multiplier, per-contract best.
- Modifier engine: hooks into spawn tables, damage multipliers, environment flags.
- New Game+/Sector Climb: reset gear, keep cosmetics/squadron, stack modifiers,
  track deepest sector.

Build 64 — squadron + weapon mods
- Named wingmen, XP per mission, roles (escort/aggressive/support), permadeath,
  memorial wall; squadron list feeds the victory cinematic.
- Six weapon mods (piercing laser, cluster missile, overcharged plasma, etc.),
  one per weapon, gold cost, explicit trade-offs, shown in loadout.
- Acceptance: same seed → same contract; squadron loss persists and is visible;
  each mod changes a stat by a documented amount.

---

## Phase 4 — World and mission variety (builds 65–66)

Build 65 — hazards + escort depth
- Ion storm (shield drain, HUD jitter), asteroid drift lanes, radiation belt
  (DoT + sensor noise), derelict ambush.
- Escort: freighter hull %, leaking cargo, repair window, ambush waves at waypoints.

Build 66 — stealth/recon
- Scan three nodes without entering detection cones; detection meter with
  fail-forward (alarm spawns interceptors, mission continues).
- Silent-running modifier: weapons off or masked; ion/EMC interactions.
- Acceptance: stealth completable without firing; each hazard has a telegraph
  and a counterplay.

---

## Phase 5 — UX, accessibility, performance (build 67)

- Full remap + gamepad tuning (deadzone, sensitivity, invert, hold vs toggle).
- Colourblind palettes, high-contrast HUD, UI scale slider.
- Post-run stats (accuracy, damage taken, time, best streak), damage arrows.
- Photo mode: hide HUD, free camera, PNG capture (useful for store art).
- Practice range per weapon and per mode.
- Adaptive quality: resolution scale and particle budget from frame time;
  optional FPS cap. Target stable 60 on software WebGL at low.

Acceptance: every control remappable and persisted; palettes pass a contrast check;
frame time within budget on the Brave/WARP profile.

---

## Phase 6 — Platform and optional (build 68+)

- Localisation string table (EN + one RTL smoke test).
- PWA/offline install — **decision gate**: requires extra files, which breaks the
  single-file rule. Options: (a) stay single-file, skip PWA; (b) ship an optional
  wrapper alongside; (c) inline manifest via data URL (limited support).
- Achievements gallery (data already exists in `save.ach`).

---

## Release protocol (every build)

1. Build: `node build.mjs` → assert `external URLs: none`.
2. Automated QA + one manual pass: load, 200-tick mission, mode smoke, input paths.
3. Visual check in 2D and 3D; screenshot kept in `p3qa/screenshots/`.
4. Copy to `Numbered Builds/NN - Parsec_Chronicles_3D_<Theme>.html`.
5. Append `CHANGELOG.txt`, update `MOVE-LOG.csv` if files moved.
6. Commit + push to `main`; verify live string markers with `curl`.

## Regression matrix (each build)

- 7 modes: battle, escort, hunted, defend, totalwar, boss, hunt.
- 2 renderers: Classic 2D and 3D (plus software-WebGL fallback path).
- 3 inputs: keyboard, gamepad, touch.
- Save: fresh, migrated v1, corrupt-JSON fallback.
- Soak: 60 s unattended mission, no error growth, no entity leaks.

## Known risks

| Risk | Mitigation |
|---|---|
| Single-file size/load time | Phase 5 adaptive quality; keep assets procedural |
| 2D/3D parity cost | New entities budget both renderers in the same build |
| Save breakage | Version bump + migration + export every phase |
| Balance creep | Seeded TTK harness; document stat formulas in tooltips |
| Touch HUD crowding | One new control per phase max; re-run touch layout tests |
| Scope drift | One theme per build; optional items parked in Phase 6 |
