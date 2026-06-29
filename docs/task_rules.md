# Task Field Rules

Source of truth for all create/update operations on tracker_id=6 (Task).
Update this file whenever Redmine field IDs or business rules change.

---

## Top-Level Fields

| Field | Mandatory | Rule |
|---|---|---|
| `tracker_id` | fixed | Always `6` |
| `project_id` | fixed | From parent story context |
| `parent_issue_id` | fixed | Always = parent user story id |
| `assigned_to_id` | fixed | Inherited from parent story, not editable in form |
| `status_id` | yes | Restricted to task flow transitions |
| `subject` | yes | User input, validate non-empty |
| `description` | no | User input |
| `start_date` | yes | User input; must be ≤ due_date; mirrors → cf 43 |
| `due_date` | yes | User input; must be ≥ start_date; mirrors → cf 44 |
| `estimated_hours` | yes | User input, must be ≥ 0 |
| `remaining_hours` | computed | `max(0, estimated_hours - spent_hours)`. Never direct user input. |
| `done_ratio` | yes | 0–100; auto-set to 100 when status = Completed |

---

## Custom Fields — Always Send All

| id | name | Mandatory | Rule |
|---|---|---|---|
| `13` | Issue Work Category | yes | User selects: CODING, PLANNING, UNIT TESTING, TEAM MEETING, MISCELLANEOUS, TRAINING |
| `14` | Issue Work Type | computed | Derived from cf 13 via categoryMap — no user input |
| `15` | Remaining Effort (Person Hour) | yes | Always = `remaining_hours` (mirror) |
| `43` | Actual Start Date | yes | Always = `start_date` (mirror) |
| `44` | Actual End Date | yes | Always = `due_date` (mirror) |

---

## categoryMap (cf 13 → cf 14)

| cf 13 (Category) | cf 14 (Type) |
|---|---|
| CODING | WORK |
| PLANNING | WORK |
| UNIT TESTING | WORK |
| TEAM MEETING | NA |
| MISCELLANEOUS | NA |
| TRAINING | NA |

---

## Derived / Computed Rules

- `remaining_hours = max(0, estimated_hours - spent_hours)` — spent_hours = sum of time entries for this task
- `cf 14 = categoryMap[cf 13]` — always derived, never user input
- `cf 15 = remaining_hours` — always mirrors remaining_hours
- `cf 43 = start_date`, `cf 44 = due_date` — always mirror top-level dates
- `done_ratio = 100` when status transitions to "Completed"

---

## Validation Rules (before submit)

1. subject non-empty
2. cf 13 (category) selected
3. start_date present, valid date
4. due_date present, valid date, ≥ start_date
5. estimated_hours ≥ 0
6. remaining_hours ≥ 0
7. done_ratio 0–100

---

## Reset Rules

On form reset (edit modal):
- subject → task.subject
- description → task.description
- estimated_hours → task.estimated_hours
- start_date → task.start_date
- due_date → task.due_date
- category → task.custom_fields[id=13].value (NOT hardcoded "CODING")
- remaining_hours → max(0, task.estimated_hours - taskTime)
- done_ratio → task.done_ratio
- status → task.status.id

---

## Context-Specific Notes

### Task Create (addTaskModel)
- All validation rules apply
- remaining_hours initialized to 0 on open (no spent time yet)
- category defaults to "CODING"

### Task Edit (editTaskModal)
- remaining_hours initialized to `max(0, task.estimated_hours - taskTime)`
- category initialized from `task.custom_fields[id=13].value`
- Reset must restore to task's saved values, not hardcoded defaults
