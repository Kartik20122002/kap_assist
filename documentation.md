# kap_assist — Architecture Reference

## Overview
A **Next.js 14 App Router** frontend that wraps the internal **Redmine API** (`https://kap01.kpit.com/kap/`) and provides a project-management UI for tracking epics, sprints, user stories, and tasks.

Auth is **API-key based**: the user enters a Redmine API key once (stored in `localStorage` as `"apiKey"`), and every request passes it via the `x-api-key` header.

---

## Directory Layout

```
app/
  (auth)/            ← login / key-entry pages
  api/
    redmine/         ← Next.js route handlers (server-side proxy to Redmine)
      projects/      GET /projects, GET /projects/[id]
      epics/         GET /epics?project_id=
      sprints/       GET|POST /sprints?project_id=, GET|PUT /sprints/[id]
      issue/         POST /issue, GET|PUT /issue/[id]
      stories/       GET /stories?project_id=&fixed_version_id=&assigned_to=
      tasks/         GET /tasks?parent_id=
      time_entries/  GET|POST /time_entries
      users/         GET /users  (current user + memberships)
  app/               ← UI pages (all client components)
    page.tsx         default empty state
    layout.tsx       SidebarProvider + AppSidebar wrapper
    projects/[id]/   project detail page
    epics/[id]/      epic detail + stories list
    sprints/[id]/    sprint detail + stories list
components/
  app-sidebar.tsx    master sidebar (project switcher + sprint list + nav)
  sprint-list.tsx    sidebar sprint navigation
  story-card.tsx     story row + inline task rows
  addStoryModal.tsx  create user story dialog
  addTaskModel.tsx   create task dialog
  editTaskModal.tsx  edit task dialog
  timelogModal.tsx   log time entry dialog
  tasknoteModal.tsx  add journal note dialog
  versionSprintModal.tsx  create/edit sprint (version) dialog
lib/
  api/
    client.ts        axios instance (baseURL=/redmine, injects x-api-key)
    project.ts       getProjects, getProjectById, getProjetEpics
    epic.ts          getEpics, getEpicById, getStoriesByEpicId
    sprint.ts        getSprints, getSprintById, createVersion, updateVersion
    story.ts         getStoriesBySprint, createStory, updateStory
    task.ts          getTasks, createTask, updateTask
    time.ts          getTimeEntries, createTimeEntry
    user.ts          getCurrentUser
  utils.ts           cn, statusStyles, ApiConfig, TASK_FLOW, US_FLOW, getNextTaskStatuses, getNextUSStatuses
store/
  authStore.ts       Zustand store (api key state — mostly superseded by localStorage)
```

---

## Request Flow

```
Browser Component
  └─ useSWR(key, lib/api/xxx.ts fn)
       └─ axios (lib/api/client.ts)  →  /redmine/...  (Next.js route handler)
            └─ fetch()  →  https://kap01.kpit.com/kap/...  (Redmine REST API)
```

The Next.js API routes act as a **server-side proxy**, forwarding the `x-api-key` header as `X-Redmine-API-Key` to Redmine, which avoids CORS issues.

---

## API Route ↔ Redmine Endpoint Mapping

| Next.js Route | HTTP | Redmine Endpoint | Notes |
|---|---|---|---|
| `/redmine/projects` | GET | `GET /projects.json` | List all projects |
| `/redmine/projects/[id]` | GET | `GET /projects/:id.json?include=trackers,issue_categories,time_entry_activities` | |
| `/redmine/epics` | GET | `GET /issues.json?tracker_id=4&project_id=` | tracker_id=4 = Epic |
| `/redmine/sprints` | GET | `GET /projects/:id/versions.json` | Redmine versions = sprints |
| `/redmine/sprints` | POST | `POST /projects/:id/versions.json` | body: `{version:{name,status,due_date,...}}` |
| `/redmine/sprints/[id]` | GET | `GET /versions/:id.json` | |
| `/redmine/sprints/[id]` | PUT | `PUT /versions/:id.json` | body: `{version:{...}}` |
| `/redmine/issue` | POST | `POST /issues.json` | Create story or task |
| `/redmine/issue/[id]` | GET | `GET /issues/:id.json?include=children,journals,relations,allowed_statuses` | |
| `/redmine/issue/[id]` | PUT | `PUT /issues/:id.json` | body: `{issue:{...}}` |
| `/redmine/stories` | GET | `GET /issues.json?tracker_id=5&include=relations&status_id=*` | tracker_id=5 = User Story |
| `/redmine/tasks` | GET | `GET /issues.json?tracker_id=6&status_id=*&parent_id=&include=journals` | tracker_id=6 = Task |
| `/redmine/time_entries` | GET | `GET /time_entries.json?user_id=&project_id=` | |
| `/redmine/time_entries` | POST | `POST /time_entries.json` | body: `{time_entry:{...}}` |
| `/redmine/users` | GET | `GET /users/current.json?include=memberships,groups` | |

---

## Tracker IDs (Redmine)

| ID | Tracker |
|---|---|
| 4 | Epic |
| 5 | User Story |
| 6 | Task |

---

## Key Custom Field IDs

| CF ID | Name | Used In |
|---|---|---|
| 8 | Story Points | User Story |
| 13 | Work Category (CODING/PLANNING/…) | Task |
| 14 | Work Type (WORK/NA — derived from category) | Task |
| 15 | Remaining Hours | Task |
| 43 | Actual Start Date | Task, Story |
| 44 | Actual End Date | Task, Story |
| 46 | Work Category (time entry) | Time Entry |
| 47 | Work Type (time entry) | Time Entry |
| 48 | Country | Time Entry (hardcoded "India") |
| 49 | City | Time Entry (hardcoded "Pune") |
| 72 | Acceptance Criteria | User Story |

---

## Status & Role Logic

### Task Status Flow (`TASK_FLOW` in `lib/utils.ts`)
`New(1) → Assigned(7) → In Progress(2) → Completed(16) → Closed(5)`

Rules applied on status change:
- `In Progress` / `Completed` → `start_date` required
- `Closed` → `end_date` required

### User Story Status Flow (`US_FLOW`)
`New(1) → Assigned(7) → Ready(8) → In Progress(2) → Implemented(9) → Closed(5)`

Rules:
- `Ready` → acceptance criteria required
- `In Progress` → start_date required
- `Closed` → end_date + final_size required

### Admin Role
- Role ID **6** = Admin/PM role
- Determined per-project from `user.memberships[].roles`
- Admins see **all** stories/tasks; non-admins see only `assigned_to_id=me`
- Admins can create/edit sprints (`VersionSprintModal`) and edit sprint status

---

## SWR Cache Keys Convention

| Key Pattern | Purpose |
|---|---|
| `["user"]` | Current user |
| `["projects"]` | Projects list |
| `["sprints", projectId]` | Versions for a project |
| `["sprint", id]` | Single sprint |
| `["time_entries", projectId, userId]` | Time entries |
| `["epics", projectId]` | Epics list |
| `["epic", id]` | Single epic |
| `["epicStories", epicId, isAdmin]` | Stories under an epic |
| `["sprintStories", sprintId, isAdmin]` | Stories under a sprint |
| `["tasks", storyId]` | Tasks under a story |
| `["project-details", projectId]` | Project + trackers/categories/activities |
| `["project_epics", projectId, "me"]` | Epics for project overview page |

`ApiConfig` (shared SWR options): `refreshInterval: 120s`, no revalidate on focus.

---

## Work Category → Work Type Mapping (Task)

| Category | Type |
|---|---|
| CODING | WORK |
| PLANNING | WORK |
| UNIT TESTING | WORK |
| TEAM MEETING | NA |
| MISCELLANEOUS | NA |
| TRAINING | NA |

---

## Key Observations / Gaps to Note for New Features

1. **`/redmine/issue` POST** is shared for both stories and tasks — distinguished by `tracker_id` in the payload.
2. **`createStory` / `createTask`** both call `POST /redmine/issue` — no separate endpoints.
3. **`updateStory` / `updateTask`** both call `PUT /redmine/issue/[id]`.
4. The **"Update" button** on `StoryCard` is currently a non-functional stub (no `onClick`).
5. **Sprint status update** UI exists on `SprintPage` but no `onChange` handler is wired — it's display-only.
6. **Epic status select** on `EpicPage` is similarly unconnected.
7. Time entries are fetched **per project + user** and mapped locally; there is no endpoint to filter by specific issue.
8. `admins.js` exports `adminIds = [6]` but role check is done inline via membership role id — consistent.
9. `storyPoints → estimatedHours` auto-calc: `estimatedHours = storyPoints × 4.5` (in `addStoryModal`).
