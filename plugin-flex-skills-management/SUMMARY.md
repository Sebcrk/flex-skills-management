# Flex Skills Management Plugin — Summary

## Purpose

A Twilio Flex 2.x plugin that gives supervisors a dedicated "Skills Management" panel in the Flex side navigation. Supervisors can view all workers, edit their routing skills (add/remove) individually or in bulk, and see an audit trail of changes made during the session.

## Local Development

**Plugin:**
```bash
cd plugin-flex-skills-management
npm install
twilio flex:plugins:start
```
This starts the Flex UI at `http://localhost:3000` with the plugin loaded.

**Serverless functions (required for the plugin to fetch data):**
```bash
cd serverless
npm install
npm start   # twilio-run --port 3001 --cors --load-local-env
```

Both must be running simultaneously for the plugin to function.

---

## Entry Point

**`src/index.js`** — Calls `FlexPlugin.loadPlugin(FlexSkillsManagementPlugin)` to bootstrap the plugin.

**`src/FlexSkillsManagementPlugin.js`** — The plugin class. On `init(flex, manager)`:
1. Checks `manager.user.roles` — exits early if user is not `supervisor` or `admin`
2. Destructures `View` and `SideLink` from the `flex` runtime parameter (not imported — Flex provides these as externals)
3. Registers a `<View name="skills-management">` wrapped in `AuditLogProvider`
4. Adds a `<SideLink>` (icon: "People", sortOrder: 10) that navigates to the view

## Architecture

```
FlexSkillsManagementPlugin.js
├── context/AuditLogContext.jsx      (React Context — ephemeral audit log state)
├── hooks/useWorkers.js              (data fetching + loading/error/refetch)
├── services/skillsService.js        (HTTP calls to serverless functions)
└── components/
    ├── SkillsManagementView/        (full-screen flexbox layout)
    ├── WorkerList/                  (left panel — search, multi-select)
    ├── SkillsEditor/                (right panel — skill chips, add/remove)
    └── AuditLog/                    (bottom panel — session change history)
```

## Components

### SkillsManagementView (`components/SkillsManagementView/SkillsManagementView.jsx`)

Full-screen layout using flexbox with absolute positioning to fill the Flex view container. Wrapped in `<Theme.Provider theme="default">` — this is required because Flex views don't inherit the Paste theme context; without it, all Paste components crash with "Cannot read properties of undefined (reading 'borderWidth40')".

Layout:
- **Header** — fixed height, "Skills Management" heading
- **Middle row** — flex: left panel (flex: 2) + right panel (flex: 3), both scrollable independently
- **Bottom** — audit log, flexShrink: 0, minHeight: 120px, maxHeight: 200px, scrollable

Props: `manager` (Flex.Manager — provides auth token)

State & behavior:
- `selectedWorkers` — array of selected worker objects
- `selectedSidsRef` — ref tracking selected SIDs for reconciliation
- On `workers` refetch: reconciles `selectedWorkers` against fresh data by SID so skill chips update immediately after add/remove operations

---

### WorkerList (`components/WorkerList/WorkerList.jsx`)

Props:
- `workers` — full worker array from API
- `loading` — boolean
- `error` — string or null
- `selectedWorkers` — currently selected workers
- `onSelectionChange` — callback receiving new selection array
- `onRetry` — callback to retry fetching (shown on error)

Features:
- **Search** — client-side filter on `friendlyName` or skills array
- **Activity dots** — green (#14b053) Available, yellow (#e8a400) Busy/Reserved, gray (#aeb2c1) Offline/Break
- **Select All / Clear** — `<Button variant="link">` (accessible, not anchor tags)
- **Multi-select** — checkboxes per worker, keyed by SID
- **Loading state** — centered Spinner
- **Error state** — error message + "Retry" button calling `onRetry`

---

### SkillsEditor (`components/SkillsEditor/SkillsEditor.jsx`)

Props:
- `selectedWorkers` — array of selected workers (drives skills computation)
- `getToken` — function returning current Flex JWT
- `onUpdate` — callback to trigger worker list refetch

Features:
- **Skills union** — `useMemo` computes union of `routing.skills` across selected workers. Each skill rendered as `Badge` with `(count/total)` format
- **Tooltips** — hover shows which worker names have each skill
- **Remove** — ✕ button opens `AlertDialog` (destructive confirmation). On confirm: POST to `update-skills` with action `"remove"`
- **Add** — free-text `Input`, submits on Enter (`onKeyDown`) or "Add" button click. Normalizes to lowercase/trimmed. POST with action `"add"`
- **Toasts** — `useToaster()` for success/warning/error feedback with 5s auto-dismiss
- **Audit logging** — calls `addEntry()` after each successful operation
- **Loading** — `isUpdating` state disables all controls, shows spinner in button
- **Empty state** — "Select one or more workers to manage their skills."

---

### AuditLog (`components/AuditLog/AuditLog.jsx`)

Renders a Paste `Table` of session changes from `useAuditLog()`.

Columns: Timestamp | Supervisor | Worker(s) | Action | Skill | Result

- Timestamp: locale time (HH:MM:SS)
- Workers: up to 3 names, then "+N more"
- Action: green "Added" / yellow "Removed" badges
- Result: "N updated, N skipped, N failed"
- Empty state when no entries

---

## Context

### AuditLogContext (`context/AuditLogContext.jsx`)

Provides `{ entries, addEntry }` via React Context.

- `entries` — array ordered newest-first
- `addEntry(entry)` — auto-generates `id` (crypto.randomUUID with Date.now fallback) and `timestamp` (ISO string)

Entry shape:
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "supervisor": "identity-from-token",
  "workers": [{ "sid": "WKxxxxx", "name": "Alice" }],
  "action": "add | remove",
  "skill": "skill-name",
  "result": { "updated": 2, "skipped": 1, "failed": 0 }
}
```

---

## Hook

### useWorkers (`hooks/useWorkers.js`)

Parameters: `getToken` — function returning current Flex JWT

Returns: `{ workers, loading, error, refetch }`

- Fetches on mount via `useEffect`
- `refetch()` — re-calls `fetchWorkers`, used after skill updates
- Error: sets `error` state string, logs to console

---

## Service Layer (`services/skillsService.js`)

**Base URL:** `window.appConfig.serviceBaseUrl` → fallback `http://localhost:3001`

In production, `serviceBaseUrl` is configured via the Flex Configuration resource in the Twilio Console (under `ui_attributes`) or via the Configuration API. It points to the deployed serverless domain (e.g., `https://flex-skills-mgmt-xxxx.twil.io`).

**`fetchWorkers(token)`**
- `POST /get-workers` with `{ Token }`
- Returns `[{ sid, friendlyName, skills, activityName }]`

**`updateSkills(workerSids, action, skill, token)`**
- `POST /update-skills` with `{ workerSids, action, skill, Token }`
- Returns `{ results, summary: { updated, skipped, failed }, supervisor }`

---

## Serverless Functions (`../serverless/`)

Both functions use `twilio-flex-token-validator` (functionValidator wrapper) for JWT validation. Both validate `WORKSPACE_SID` is configured before processing.

### get-workers (`functions/get-workers.js`)

1. Validates token (automatic via wrapper) + checks supervisor/admin role
2. Validates `WORKSPACE_SID` env var is present
3. Fetches workers via `client.taskrouter.v1.workspaces(sid).workers.list({ pageSize: 1000 })`
4. Maps each worker: parses `attributes.routing.skills` (Flex standard path)
5. Returns `[{ sid, friendlyName, skills, activityName }]`

### update-skills (`functions/update-skills.js`)

1. Validates token + role check
2. Validates `WORKSPACE_SID` env var
3. Validates input: `workerSids` (non-empty array), `action` (add|remove), `skill` (non-empty string)
4. Extracts supervisor identity from `event.TokenResult.identity`
5. For each worker SID (parallel `Promise.all`):
   - Fetches current attributes
   - Initializes `routing: { skills: [], levels: {} }` if missing
   - Add: skips if skill already present, otherwise appends
   - Remove: skips if skill not present, otherwise filters out
   - Writes back full attributes (surgical merge — only `routing.skills` modified)
6. Returns `{ results, summary, supervisor }`

### Environment Variables (`.env`)

```
ACCOUNT_SID=ACxxxxx
AUTH_TOKEN=xxxxx
WORKSPACE_SID=WSxxxxx
```

Note: `ACCOUNT_SID` and `AUTH_TOKEN` (without `TWILIO_` prefix) — required by `twilio-flex-token-validator` which reads `context.ACCOUNT_SID` and `context.AUTH_TOKEN`.

### Running Locally

```bash
cd serverless
npm install
npm start   # runs: twilio-run --port 3001 --cors --load-local-env
```

---

## Dependencies

**Plugin (`package.json`):**
- `@twilio/flex-plugin` 7.1.2
- `@twilio-paste/core` ^15.3.1
- `@twilio-paste/icons` ^9.2.0
- `react` 17.0.2 / `react-dom` 17.0.2
- Dev: `@twilio/flex-plugin-scripts` 7.1.2, `@twilio/flex-ui` 2.17.1

**Serverless (`serverless/package.json`):**
- `twilio` ^4.23.0
- `twilio-flex-token-validator` ^1.6.0
- Dev: `@twilio-labs/serverless-api` ^5.0.0, `twilio-run` ^4.0.0

---

## Unused Boilerplate Files

The following files were part of the original Twilio CLI boilerplate and are no longer referenced:
- `src/components/CustomTaskList/CustomTaskList.jsx` — demo component (was replaced by SkillsManagementView)
- `src/components/__tests__/CustomTaskList.spec.jsx` — test for the demo component
- `webpack.config.js` / `webpack.dev.js` — pass-through configs (return unmodified config), no custom webpack needed

These can be safely deleted.

---

## Known Behaviors

- **Multi-tab** — If a supervisor has multiple tabs open, audit logs are independent per tab and skill edits in one tab won't reflect in the other until the next refetch (triggered by any add/remove action or page reload).
- **Workers without `routing` object** — Workers that have skills stored in the flat `attributes.skills` path (non-standard) will show 0 skills. Adding a skill to them creates `attributes.routing.skills` — their pre-existing flat skills are not migrated and remain orphaned.
- **`disabled_skills`** — Some workers have an `attributes.disabled_skills` object. This plugin does not display or interact with disabled skills. Supervisors could re-add a skill that was intentionally disabled.
- **`routing.levels`** — Skill levels (e.g., `skillLevel: 3`) are preserved on write but not exposed in the UI. Supervisors cannot view or modify skill levels through this tool.

---

## POC Constraints

- Audit log is ephemeral (React state — resets on refresh)
- No skill name validation (accepts any non-empty string)
- No rate limit batching (parallel updates fine for small pools)
- Single page of workers (up to 1000, no pagination)
- CORS set to `*` (must restrict for production)
- Error messages may expose internal details from Twilio SDK
