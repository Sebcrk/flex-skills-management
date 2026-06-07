# Flex Skills Management Plugin — SPEC

## Overview

A Twilio Flex 2.x plugin that provides supervisors a dedicated "Skills Management" panel in the side navigation. Supervisors can view all workers, edit their skills (add/remove) individually or in bulk, and see an audit trail of all changes made during the session.

## Architecture

```
┌─────────────────────────────────┐
│  Flex UI 2.x (Paste components) │
│  ┌───────────────────────────┐  │
│  │  Skills Management View   │  │
│  │  (Side Nav Panel)         │  │
│  └────────────┬──────────────┘  │
│               │ HTTP calls       │
└───────────────┼─────────────────┘
                │
┌───────────────┼─────────────────┐
│  Twilio Serverless Functions     │
│  ┌─────────────────────────────┐│
│  │ get-workers                 ││
│  │ update-skills               ││
│  └─────────────────────────────┘│
└───────────────┬─────────────────┘
                │
┌───────────────┼─────────────────┐
│  Twilio TaskRouter API           │
│  (Workers, Attributes)           │
└─────────────────────────────────┘
```

## User Flow

1. Supervisor clicks "Skills Management" in Flex side nav
2. Panel loads, fetches all workers via `get-workers` function
3. Supervisor searches/selects one or more workers (multi-select)
4. Right panel shows union of skills with `(n/total)` counts + tooltips showing which workers have each skill
5. Supervisor adds a skill (free-text input) or removes a skill (from displayed chips)
6. Removal triggers a confirmation dialog every time
7. On confirm, plugin calls `update-skills` function with token, worker SIDs, action, and skill
8. Function decodes token for supervisor identity, performs surgical attribute merge, returns results
9. UI shows toast for warnings (e.g., "2 of 3 workers already had 'english'") or errors
10. Audit log table updates in React state
11. Worker list re-fetches to reflect new state

## UI Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Skills Management                                                       │
├─────────────────────────────────┬───────────────────────────────────────┤
│  Workers                        │  Skills Editor                        │
│  [Search by name or skill...]   │                                       │
│                                 │  Selected: N worker(s)                │
│  ● Alice Johnson (Available)    │                                       │
│  ○ Bob Smith (Offline)          │  Skills:                              │
│  ● Carol Davis (Busy)           │  [english (2/3)] [billing (1/3)]     │
│                                 │   (hover for worker names)            │
│  Select All | Clear             │                                       │
│                                 │  Add: [___________] [+ Add]          │
│                                 │  Remove: click ✕ on any chip         │
│                                 │                                       │
├─────────────────────────────────┴───────────────────────────────────────┤
│  Audit Log                                                              │
│  Timestamp | Supervisor | Worker(s) | Action | Skill                    │
│  ─────────────────────────────────────────────────────────────────────  │
│  10:32 AM  | sbolivar   | Alice,Bob | Added  | retention               │
└─────────────────────────────────────────────────────────────────────────┘
```

## Serverless Functions

### get-workers
- **POC + Production**
- Calls TaskRouter Workers List API with `PageSize=1000`
- Returns: `[{ sid, friendlyName, skills, activityName }]`
- Comment: production needs proper pagination for >1000 workers

### update-skills
- **POC + Production**
- Accepts: `{ workerSids[], action (add|remove), skill, token }`
- Decodes JWT token to extract supervisor identity
- For each worker: fetches current attributes, performs surgical merge on `skills` array only, writes back full attributes object
- Returns: `{ results: [{ workerSid, status, skipped? }], summary: { updated, skipped, failed } }`
- Comment: production should batch in groups of 10 with 100ms delay between batches for rate limiting

### Referenced production-only functions (not implemented in POC):
- **get-audit-log** — retrieves audit entries from database, supports filtering by worker/supervisor/date
- **validate-token** — dedicated token validation endpoint with caching
- **get-single-worker** — fetches one worker's full attributes for detailed view

## Data Models

### Worker (from get-workers response)
```json
{
  "sid": "WKxxxxx",
  "friendlyName": "Alice Johnson",
  "skills": ["english", "billing"],
  "activityName": "Available"
}
```

### Audit Log Entry (React state)
```json
{
  "id": "uuid",
  "timestamp": "2026-05-29T10:32:00Z",
  "supervisor": "sbolivar@company.com",
  "workers": [{ "sid": "WKxxxxx", "name": "Alice Johnson" }],
  "action": "add | remove",
  "skill": "retention",
  "result": { "updated": 2, "skipped": 1, "failed": 0 }
}
```

## Technical Decisions

| Decision | Choice | Notes |
|----------|--------|-------|
| Flex version | 2.x | Paste design system, React 18 |
| Plugin type | Fresh via create-flex-plugin | Isolated POC |
| Skill format | Flat string array in `attributes.skills` | Per Flex/TaskRouter docs |
| Skill input | Free-text | No master list for POC |
| Audit storage | React state (ephemeral) | Resets on refresh; production uses external DB |
| Auth | Flex token decoded in function | Auto-renewed by Flex Manager |
| Multi-select display | Union with (n/total) counts | Tooltip on hover shows worker names |
| Removal confirmation | Always confirm | Dialog for every removal |
| Bulk rate limits | Parallel (POC) | Comment for production batching |
| Pagination | PageSize=1000 | Comment for production pagination |
| Search | Filter on name + skills | Client-side filtering |
| Loading states | Spinner + disabled buttons | During fetch and update operations |
| Worker visibility | All workers, activity indicator | Colored dot for status |
| Error handling | Toast notifications | Paste Toast component |
| Warn on redundant ops | Yes | "2 of 3 already had X, updated remaining 1" |

## POC Constraints

- Audit log is ephemeral (React state only)
- No skill validation against a master list
- No database — production references are commented in code
- No rate limit batching — parallel calls are fine for small worker pools
- Single page of workers (up to 1000)
