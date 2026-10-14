# kap_assist — Feature Plan

Status: **planning only — no code changed.** Facts marked **[verified]** were read live from KAP (Kineto_Labs, project 1150) on 2026-10-14. Everything else is design intent.

## Product principle

kap_assist is **not a Redmine client**. It is a *helper* that removes the repetitive, rule-bound clicking from daily KAP work.

> The user states the **outcome** ("this story is Closed", "I worked 3h on this task"). The app works out the **steps**, fills what it can infer, asks only for what it can't, and does it in one action.

Rules every feature follows:

1. **One action, many steps.** If the process is fixed, the app walks it.
2. **Infer, don't interrogate.** Obvious value (today's date, story points, 0 remaining)? Fill it. Ask only for real decisions.
3. **Preview before bulk.** Anything touching more than one item shows what will happen first.
4. **Honest results.** Per-step success/failure, stop at the first failure, show Redmine's actual message. Never report success on a failed call.
5. **Rules live in one place.** Flows, required fields and mirror rules are data in one module, not copied across modals.
6. **Functional first.** UI polish (including how warnings are presented) is decided later.

---

## 0. Locked decisions

These override anything later in this file that disagrees.

### L1 — Status dropdown is forward-only, up to Closed

- The dropdown shows the **current status and every status ahead of it, up to and including Closed**. Statuses *behind* the current one are **not shown at all** (so a mis-click can never send an In Progress item back to New).
- Selecting a target walks forward through each intermediate step automatically (Status Jump).
- Main chains:
  - **User Story / Feature:** New → Assigned → Ready → In Progress → Implemented → Closed
  - **Task:** New → Assigned → In Progress → Completed → Closed

### L2 — Reopen is an explicit button, not a dropdown entry

- On a **Closed story**, the dropdown has nothing ahead of Closed, so the card shows an explicit **Reopen** button instead.
- Reopen performs **Closed → Reopened** (asking for *Reason For Going Back*, cf 2038, and setting *Reopened Date*, cf 1942).
- From **Reopened**, the forward chain is **Assigned → Ready → In Progress → Implemented → Closed**. **New is never offered** after a reopen (earlier assumption of Reopened → New is withdrawn).
- Assumption (shout if wrong): the button **lands on Reopened**, and the dropdown then offers Assigned and onward; it does not auto-continue to Assigned.
- Reopen applies to **stories**. Tasks and features: no reopen control for now (not decided).

### L3 — On Hold, Need Info, Rejected are not handled

- No return path is built from **On Hold, Need Info or Rejected**; they are out of scope.
- Assumption (shout if wrong): they are **not offered as Status Jump targets**, and an item already in one of them shows its status read-only with no jump controls (change it in KAP directly).

### L4 — Bug page is removed completely

- The Bugs page is **deleted outright**, not hidden. Bugs will come back as part of a full rebuild later (including the tracker 1 "Bug" vs 15 "Issue" decision, N1).
- Everything bug-specific goes with it. Removal checklist (done during implementation, listed here so nothing is missed):
  - `app/app/bugs/page.tsx`
  - the "Bugs" entry in the user dropdown in `components/nav-user.tsx` (and the unused `IconBug` import)
  - `getBugStories` in `lib/api/story.ts`
  - `BUG_STATUS_MAP`, `BUG_TRANSITIONS`, `getBugStatusOptions` in `lib/utils.ts`
  - the `isBug` branches in `components/backlogEditStoryModal.tsx` (it will only handle User Stories)
  - `bugStories` SWR key usage
  - `tracker_id_filter` stays in `app/redmine/stories/route.ts` (the backlog still uses it)
  - `documentation.md` references
- Bug Status Jump is **dropped** from the plan; Phase 4 no longer mentions bugs.

### L6 — Sprints are two weeks

- A sprint named `YY_CWnn` starts Monday of ISO week `nn` and ends on its due date (or Friday of week `nn+1` if none).
- Sprint header shows the date range, "Day X of 10" and days left; the sidebar "This sprint" widget shows the sprint's 10 working days.
- "New sprint" pre-fills the next name (`CWnn+2`) and due date (Friday of the second week).

### L7 — Every user story has a feature parent

- `parent_issue_id` is required on every story create/edit (sprint and backlog), and must be a **Feature (tracker 2)**.
- The story form has a searchable feature picker (remembers the last feature used); story rows show a feature chip that admins can change in place; a story without one shows an amber "Set feature" chip and a health error.
- Status Jump refuses to move a story forward until it has a feature.

### L8 — Missing end date = start + 7 days

- Applies to story and task forms (end date is optional; auto-filled on save) and to Status Jump auto-fill (In Progress / Closed).

### L9 — Time log presets

- Hour presets: **0.5, 1, 3, 4.5, 6, 9** (quick log and time log dialog).

### L5 — Implementation order

Decisions are locked first. **No code changes until the owner says go**; this file is the source of truth until then.

---

## A. Known problems and decisions

Found while reading the code. Decisions are the owner's.

### Problems

| # | Problem | Decision | Plan |
|---|---|---|---|
| P1 | "Close all" actions report success when a step fails. `updateStory/updateTask` swallow errors and return `false`; the loops' `try/catch` never fires, a failed step is skipped and the item is still counted as closed. | **Fix** | `lib/api` calls return `{ ok, status, error }` (or throw) with Redmine's message. All multi-step actions (close all, Status Jump) stop on first failure and report where. |
| P2 | Backend routes return HTTP 200 with an empty fallback body on any Redmine failure, so a bad API key / outage looks like an empty project, and `sprints/[id]` spins forever. | **Fix** | Routes pass through the real status and Redmine's error body. Client shows the error; 401/403 sends the user to login. |
| P3 | Proxy trusts the client-supplied `x-base-url` header (arbitrary server-side fetch). | **No issue** — accepted, no change. | — |
| P4 | Lists silently truncate at Redmine's default page size (25; time entries 100): sprint stories, tasks, features, epics, members, time entries. Wrong hours/remaining when time entries exceed 100. | **Fix (our call)** | Add one `fetchAll(path, params)` helper that loops `limit=100&offset=…` until `total_count`. Use it for sprint stories, tasks per story, features, epics, members and time entries. Backlog keeps server-side paging (already paged with `total_count`). |
| P5 | `editStoryModal` effect recomputes `estimated_hours = 4.5 × points` on open, overwriting a manual estimate. | **Fix, per rule below** | Estimate stays editable. It is recomputed to `points × 4.5` **only when the user changes story points**, never on open/reset-to-saved. Implement in the points `onValueChange` handler, not an effect (same in create modals). |
| P6 | "Today" uses UTC (`toISOString().split("T")[0]`) → wrong date for IST before 05:30 (time-log default date, overdue checks, auto-filled dates). | **Needed** | Single `todayLocal()` helper (local `YYYY-MM-DD`), used everywhere. |
| P7 | Docker/run config broken: Dockerfile copies `.next/standalone` but `next.config.mjs` lacks `output: "standalone"`; app runs on 4242 while Dockerfile exposes 3000 and `runner.sh` opens `localhost:3000`. | **Fix** | Set `output: "standalone"`; use one port (4242) across `package.json`, Dockerfile (`ENV PORT`, `EXPOSE`) and `runner.sh`. |

### Smaller issues

| # | Issue | Decision |
|---|---|---|
| S1 | API key input is plain text and stored in `localStorage`. | **Owner decision — leave as is.** |
| S2 | CSV parser breaks on escaped quotes (`""`), multi-line quoted fields, BOM. | **Fix** — replace with a proper RFC-4180 parser (quotes, escaped quotes, embedded newlines, BOM). |
| S3 | Bulk import failures show "API returned failure", dropping Redmine's reason. | **Fix** — surface Redmine's validation message per failed row (comes free with P1/P2). |
| S4 | Country/City hardcoded to India/Pune on time entries. | **Owner decision — leave as is.** (Note: the user's KAP profile already has Country/City, fields 50/51, if this is ever revisited.) |
| S5 | Admin = role id 6 hardcoded in ~6 places, mixed `==`/`===`, `admins.js` unused. | **Fix** — one `isProjectAdmin(user, projectId)` helper + one `ADMIN_ROLE_ID` constant; remove or use `admins.js`. |
| S6 | Several warning toasts per story/task. | **OK as is.** Requirement: **one warning at a time**. Presentation decided later; for now the checks stay but are not allowed to stack. Long-term they become data in a health panel (see §6). |

### New findings from KAP data

| # | Finding | Impact |
|---|---|---|
| N1 | Tracker **15 is "Issue"**; **"Bug" is tracker 1** **[verified]**. The Bugs page queried tracker 15 and `lib/utils` called it the "Bug tracker". | Page is being removed (L4). Revisit tracker 1 vs 15 in the rebuild. |
| N2 | Tasks have **extra statuses** the code ignores: **On Hold** and **Rejected** (from In Progress), and **Completed → In Progress** is allowed **[verified]**. | Task flow is a graph, not a line. |
| N3 | Stories/Features have side states **Need Info** (from Assigned) and **On Hold** (from In Progress) **[verified]**. | Same — graph with a main line plus side branches. |
| N4 | Stories carry fields **"Reopened Date" (cf 1942)** and **"Reason For Going Back" (cf 2038)** **[verified]**. | Reopen/backward moves very likely need these filled → Status Jump must ask for a reason and set the date. |
| N5 | Real stories have `estimated_hours: null`; `total_estimated_hours` is rolled up from child tasks **[verified]**. App-created stories send `estimated_hours = points × 4.5`. | Be careful which number the UI shows as the story estimate (Q9). |
| N6 | Real tasks leave "Remaining Effort" (cf 15) empty **[verified]**; when completing, Redmine journals show `done_ratio 0→100` and `remaining_hours → 0`. | cf 15 mirroring is not enforced by KAP; `remaining_hours` + `done_ratio` are what matter. |

---

## B. Verified workflow (live `allowed_statuses`)

Redmine decides legal transitions per issue and per role, so these are what the **current user** sees. **The engine must treat live `allowed_statuses` as truth** (re-read after each step) and use the table below only to plan the route.

| Tracker | Observed transitions |
|---|---|
| **User Story (5)** | New → Assigned · Assigned → Ready, Need Info · Ready → In Progress *(from history)* · In Progress → Implemented, On Hold · Implemented → Closed *(from history)* · **Closed → Reopened** · Reopened → ? **(not yet seen)** |
| **Feature (2)** | In Progress → Implemented, On Hold (same shape as story) |
| **Task (6)** | New → Assigned · Assigned → In Progress *(from history)* · In Progress → Completed, Rejected, On Hold · **Completed → In Progress, Closed** |
| **Bug (1)** | New → In Progress, Resolved, Feedback, Rejected, Closed (wide open) |
| **Issue (15)** | not checked |

Consequences:

- **No free backward moves for stories.** From Closed the only options are Reopened/Closed — you cannot jump Closed → Implemented. "Go back" = via **Reopened**. From In Progress you cannot go back to Assigned/Ready.
- **Tasks can step back** Completed → In Progress, but not further.
- Dropdown must show **only reachable targets**, and mark others disabled with a reason ("not allowed from In Progress").

---

## 1. Status Jump (flagship)

Replace "next status only" with a dropdown of **every status reachable from here**. Selecting one makes the app walk the chain automatically.

### Behaviour

- **Per L1–L3:** dropdown lists the current status and statuses **ahead** of it up to Closed only. Nothing behind, no side states. Closed stories get a **Reopen** button (L2) instead. (Wherever the rest of this section mentions side states, going back, or disabled unreachable entries, L1–L3 win.)
- Dropdown lists reachable targets (main chain + side states + Reopen path), current one marked, unreachable ones disabled with the reason.
- Selecting a target computes the path ("Assigned → Ready → In Progress → Implemented"), shows it, and runs on confirm.
- Each step = one `PUT` carrying the status **plus** the fields that step needs.
- After each step re-read the issue; confirm the status actually changed and the next step is still in live `allowed_statuses` before continuing.

### Route planning

Route planner = small graph per tracker (table in §B), shortest path, verified live at each step. Unknown edge (e.g. out of Reopened) → stop and tell the user, never guess.

### Per-step rules (to auto-apply)

| Entering | Needs | Auto-fill | Ask user only if |
|---|---|---|---|
| Assigned | assignee | keep current | none assigned |
| Ready (story/feature) | acceptance criteria (cf 72) | — | empty |
| In Progress | start date (+ cf 43) | `todayLocal()` | — |
| Completed (task) | start date | `done_ratio = 100`, `remaining_hours = 0` | — |
| Implemented (story) | — | — | — |
| Closed (task) | end date (+ cf 44) | `todayLocal()` if empty | — |
| Closed (story) | end date (+ cf 44), final size (cf 8), all child tasks Closed | end date = today, final size = story points | open tasks → "close them too?" |
| Reopened / going back | **Reason For Going Back (cf 2038)**, Reopened Date (cf 1942) | date = today | always ask for the reason *(to verify, Q1)* |
| On Hold / Need Info / Rejected | likely a reason (cf 11 "Rejected Reason" for Rejected) | — | ask for the reason *(to verify)* |

All prerequisites are checked **before the first call** (dry run), so the user is asked once up front instead of failing halfway.

### Failure handling

- Stop at the first failed step; show "Reached *In Progress*, failed at *Implemented*: <Redmine's message>".
- Refresh the item after every run so the card always shows true state.
- Close-all actions run on this same engine.

### Replaces

"Transition to Close", "Close All Tasks", "Close All Stories", and the next-status-only selects in the edit modals.

---

## 2. Quick actions (one click, no modal)

Start (→ In Progress) · Done (→ Completed/Implemented) · Close · Quick log ("2h" inline on a task, today, last-used category) · Repeat last log · Copy ID / copy standup line.

## 3. Time logging helpers

- **Fill my day:** today's hours vs 9h target; pick tasks, split the remainder, or "log remaining to <task>".
- **Remember category per task** (last used) instead of always CODING.
- **Weekly grid:** tasks × days, edit cells, save all.
- **Local dates** via `todayLocal()` (P6).
- Remaining hours recomputed after each log (`max(0, estimated − spent)`).

## 4. Creation helpers

- Task templates ("add standard tasks" to a story, estimates split from story hours).
- Clone story/task to next sprint (dates shifted).
- Smart defaults: dates from sprint window, approver = me, assignee = me, estimate = points × 4.5 **recomputed only when points change** (P5).
- Bulk import v2: tasks under existing stories, real Redmine error per failed row, downloadable template, retry only failed rows.
- Paste-to-stories: paste raw text, get draft stories to review.

## 5. Sprint helpers

- **Sprint close wizard:** per unfinished story choose close / move to next sprint / back to backlog; one batch with preview. (Open sprint right now: 26_CW41; sprints are named `26_CWxx`, current = first open by name — matches the sidebar.)
- **Carry-over:** move selected stories (with open tasks) to another sprint.
- **Sprint health panel:** the current warnings (overdue, no tasks, no acceptance criteria, hours logged while still New/Assigned, task over estimate, under-logged today) as one list with fix buttons; shown **one at a time** until UI is decided (S6).
- **Standup summary** from status changes and time entries.
- Feature breakdown (exists) extended with hours/progress.

## 6. Bulk operations

Multi-select → set assignee, move sprint, Status Jump, shift dates. Always preview → run → per-item results → retry failed.

## 7. Speed

Command palette (Ctrl+K) · search/filter by status/assignee/feature · undo last Status Jump where the workflow allows · remember last project/filters.

---

## C. Prerequisites (before features)

1. **P1 + P2:** honest API layer — real errors end to end, `{ok, error}` from `lib/api`, real HTTP statuses from routes.
2. **Rules module:** one source of truth for trackers, statuses, transition graph, per-step requirements, field mirrors (replace copies in `utils.ts`, add/edit task, timelog, docs).
3. **P4:** `fetchAll` helper and use it for the lists above.
4. **P6:** `todayLocal()`.
5. **S5:** `isProjectAdmin` helper + constant.
6. **P7 / S2:** build config and CSV parser (independent, can go any time).

## D. Phasing

| Phase | Scope |
|---|---|
| **0** | Remove Bug page (L4), prerequisites C1–C5, P5, P7, S2, S3 |
| **1** | Status Jump for stories + tasks (forward-only, L1), Reopen button for stories (L2), quick Start/Done/Close, replace the close-all buttons |
| **2** | Quick log, Fill my day, defaults |
| **3** | Sprint close wizard, carry-over, health panel (one warning at a time) |
| **4** | Features in Status Jump, bulk ops, templates, cloning |
| **5** | Command palette, standup summary, paste-to-stories, undo |

---

## E. Open questions

Still needed from you:

*Answered and locked in §0: Reopened → Assigned (not New); no return from On Hold / Need Info / Rejected; Bugs page removed.*

1. **Reopen details (L2 assumption):** button lands on Reopened (not straight to Assigned) — correct? Is cf 1942/2038 really mandatory on Closed → Reopened? (needs the verification walk below)
2. **Side states (L3 assumption):** not offered as jump targets, and items already in them show no jump controls — correct?
3. **Closing a story with open tasks:** auto-close the tasks (walking each through its own chain) or block like today?
4. **Auto-fill dates:** is "today" always right for start/end, or prefer the story/sprint dates when present?
5. **Final size (cf 8) on close:** always = story points, or can it differ?
6. **Who can use Status Jump:** admins only (role 6), or also the assignee on their own items?
7. ~~Bugs page~~ — removed (L4); tracker 1 vs 15 revisited in the rebuild.
8. **Story estimate display (N5):** show story `estimated_hours` or the rolled-up `total_estimated_hours`?
9. **Audit:** want an in-app log of what the helper changed (item, steps, time)?

### Verification I'd like to do (needs your approval — it writes to KAP)

To answer Q1/Q2 and learn which fields Redmine actually enforces per transition, I'd create **one throwaway story + one task** in Kineto Labs backlog and walk them through every status (including Closed → Reopened → …), recording `allowed_statuses` and any 422 error text at each step. I will not create, update or delete anything in KAP without your explicit go-ahead.
