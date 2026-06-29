# User Story Field Rules

Source of truth for all create/update operations on tracker_id=5 (User Story).
Update this file whenever Redmine field IDs or business rules change.

---

## Top-Level Fields

| Field | Mandatory | Rule |
|---|---|---|
| `tracker_id` | fixed | Always `5` |
| `project_id` | fixed | From context, never shown in form |
| `priority_id` | fixed | Always `2` (Normal), never shown in form |
| `status_id` | yes | Strict linear flow: New(1) → Assigned(7) → Ready(8) → In Progress(2) → Implemented(9) → Closed(5) |
| `subject` | yes | User input, validate non-empty |
| `description` | yes | User input, validate non-empty |
| `start_date` | yes | User input; must be ≤ due_date; mirrors → cf 43 |
| `due_date` | yes | User input; must be ≥ start_date; mirrors → cf 44 |
| `estimated_hours` | yes | Auto-derived: `rb_story_points × 4.5`, editable |
| `remaining_hours` | computed | `max(0, estimated_hours - spent_hours)`. Never user input. |
| `rb_story_points` | yes | Fibonacci selector (1,2,3,5,8,13); mirrors → cf 5 and cf 8 |
| `assigned_to_id` | yes | Member dropdown |
| `parent_issue_id` | conditional | Mandatory when in sprint context; optional in backlog |
| `fixed_version_id` | conditional | Required when in sprint context; absent on backlog create |

---

## Custom Fields — Always Send All

| id | name | Mandatory | Rule |
|---|---|---|---|
| `72` | Acceptance Criteria | yes | User input, validate non-empty |
| `5` | Estimated Size (SLOC/TC/Other) | yes | Always = `String(rb_story_points)`, no user input |
| `8` | Actual Size (SLOC/TC/Other) | yes | Always = `String(rb_story_points)`, no user input |
| `43` | Actual Start Date | yes (in sprint) | Always = `start_date`, no separate user input |
| `44` | Actual End Date | yes (in sprint) | Always = `due_date`, no separate user input |
| `45` | Approved By (CCB Chairperson) | yes | Member dropdown, default = current logged-in user id |
| `780` | Link to Output Work Products | fixed | Always hardcoded `"NA"` |
| `781` | Link to Input Work Products | fixed | Always hardcoded `"NA"` |

---

## Derived / Computed Rules

- `estimated_hours = rb_story_points × 4.5` (auto, user may override)
- `remaining_hours = max(0, estimated_hours - spent_hours)` — spent_hours comes from the story response field `spent_hours`
- `cf 5 = cf 8 = String(rb_story_points)` — set on every create and update
- `cf 43 = start_date`, `cf 44 = due_date` — always mirror the top-level dates
- `cf 780 = cf 781 = "NA"` — always hardcoded

---

## Validation Rules (before submit)

1. subject non-empty
2. description non-empty
3. rb_story_points selected
4. estimated_hours > 0
5. cf 72 (acceptance criteria) non-empty
6. start_date present, valid date
7. due_date present, valid date, ≥ start_date
8. assigned_to_id selected
9. parent_issue_id selected (epic mandatory)
10. cf 45 selected (defaults to current user, but must have a value)

---

## Context-Specific Notes

### Sprint Create (addStoryModal)
- `fixed_version_id` is provided from sprint context — always included
- All 10 validation rules apply

### Sprint Edit (editStoryModal)
- `fixed_version_id` not updated (sprint doesn't change on edit)
- All 10 validation rules apply
- `remaining_hours = max(0, estimated_hours - story.spent_hours)`

### Backlog Create (backlogCreateStoryModal)
- `fixed_version_id` omitted
- `parent_issue_id` optional (not required in backlog)
- cf 43, cf 44 omitted (no sprint, dates optional)
- start_date, due_date optional
- Validation rules 1–6, 8, 10 apply (no date validation, no parent validation)

### Backlog Edit (backlogEditStoryModal)
- Same as backlog create rules
- `parent_issue_id` optional
- `remaining_hours = max(0, estimated_hours - story.spent_hours)`

### Add to Sprint (backlogAddToSprintModal)
- Before allowing sprint assignment, validate all mandatory fields are filled on the story
- If any mandatory field is missing, block and show which fields need to be filled
- Fields checked: subject, description, rb_story_points, estimated_hours, cf 72, assigned_to_id, parent_issue_id (mandatory HERE), cf 45

### Bulk Import
- cf 43, cf 44 omitted (backlog context)
- cf 45 defaults to the importing user's id
- cf 780, cf 781 always "NA"
- cf 5, cf 8 always = story_points from CSV
