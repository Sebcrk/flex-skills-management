# Flex Skills Management Plugin

A Twilio Flex 2.x plugin that lets supervisors and admins view, search, and bulk-edit worker routing skills — with a session audit log of every change.

## Overview

```
plugin-flex-skills-management/   ← Flex UI plugin (React + Twilio Paste)
serverless/                       ← Twilio Functions backend (2 endpoints)
```

The plugin adds a **Skills Management** side-nav view to Flex. It is restricted to users with a `supervisor` or `admin` role.

### Capabilities

- **List all workers** — name, current activity status, and assigned skills
- **Search workers** — client-side filter by name or skill keyword
- **Multi-select workers** — checkboxes to batch-edit multiple workers at once
- **Skill counts** — when multiple workers are selected, shows how many have each skill (e.g. `english (2/3)`)
- **Add skills** — free-text input; skips workers that already have the skill
- **Remove skills** — click ✕ on a skill chip; confirm dialog; removes from all selected workers
- **Tooltips** — hover a skill badge to see which selected workers have it
- **Audit log** — session-scoped table showing timestamp, supervisor, affected workers, action, skill, and result counts
- **Toast notifications** — success/warning/error feedback with auto-dismiss

## Architecture

```
Flex UI (browser)
  └── skillsService.js  ─── POST /get-workers   ──►  TaskRouter (list workers)
                        ─── POST /update-skills  ──►  TaskRouter (update attributes)
```

- The plugin calls two Twilio Serverless functions over HTTPS.
- Both functions validate the Flex JWT and enforce the `supervisor`/`admin` role check before touching the TaskRouter API.
- Worker skills live at `attributes.routing.skills` (Flex standard path). The update function performs surgical merges — only `routing.skills` is modified; all other attributes are preserved.

## Prerequisites

- Node.js ≥ 10.12 (even versions recommended)
- [Twilio CLI](https://www.twilio.com/docs/twilio-cli/quickstart)
- Flex Plugin CLI extension: `twilio plugins:install @twilio-labs/plugin-flex`
- A Twilio account with Flex and TaskRouter configured

## Local Development

Two processes must run simultaneously.

### 1. Serverless functions

```bash
cd serverless
cp .env.example .env       # fill in ACCOUNT_SID, AUTH_TOKEN, WORKSPACE_SID
npm install
npm start                  # runs at http://localhost:3001
```

### 2. Plugin

```bash
cd plugin-flex-skills-management
npm install
twilio flex:plugins:start  # opens Flex UI at http://localhost:3000
```

The plugin reads `public/appConfig.js` for `serviceBaseUrl`. In development it defaults to `http://localhost:3001`.

## Environment Variables

Required in `serverless/.env` (local) or Twilio Console → Functions → Configure (production):

| Variable | Description |
|---|---|
| `ACCOUNT_SID` | Twilio Account SID (`ACxxxxx`) |
| `AUTH_TOKEN` | Twilio Auth Token |
| `WORKSPACE_SID` | TaskRouter Workspace SID (`WSxxxxx`) |

Never commit `.env` to source control.

## Production Deployment

### 1. Deploy serverless functions

```bash
cd serverless
twilio serverless:deploy
# note the returned domain, e.g. https://flex-skills-mgmt-xxxx.twil.io
```

### 2. Point the plugin at the serverless domain

Set `serviceBaseUrl` to the deployed serverless domain via the Flex Configuration API (`ui_attributes`) or by editing `public/appConfig.js` before building.

### 3. Deploy and release the plugin

```bash
cd plugin-flex-skills-management
twilio flex:plugins:deploy --changelog "initial release"
twilio flex:plugins:release
```

To roll back: `twilio flex:plugins:release --plugin plugin-flex-skills-management@<previous-version>`.

## Project Structure

```
plugin-flex-skills-management/src/
  FlexSkillsManagementPlugin.js   # Plugin entry — registers side-nav view
  index.js
  components/
    SkillsManagementView/         # Top-level layout (left + right panels)
    WorkerList/                   # Search input, worker rows, multi-select checkboxes
    SkillsEditor/                 # Skill chips, add-skill input, remove confirmation dialog
    AuditLog/                     # Change history table
  context/
    AuditLogContext.jsx            # React context for audit log state
  hooks/
    useWorkers.js                  # Fetch + refresh workers from serverless
  services/
    skillsService.js               # HTTP client for /get-workers and /update-skills

serverless/functions/
  get-workers.js                  # List all workers (PageSize=1000)
  update-skills.js                # Add or remove a skill from one or more workers
```

## Known Limitations (POC)

These are documented and addressed in `PRODUCTION_READINESS.md`:

- **Audit log is ephemeral** — resets on page refresh; stored in React state only
- **Single page of workers** — hardcoded `PageSize=1000`; workspaces with >1000 workers will have missing data
- **No rate-limit batching** — all worker updates run in parallel via `Promise.all`; can exceed TaskRouter's ~100 req/s limit on large batches
- **No race-condition handling** — concurrent supervisors editing the same worker can silently overwrite each other
- **CORS open** — `Access-Control-Allow-Origin: *`; restrict to your Flex domain before going to production
- **No skill validation** — accepts any non-empty string; no length limit or character restrictions
- **Disabled skills ignored** — `attributes.disabled_skills` is not displayed or respected
- **Skill levels read-only** — `routing.levels` is preserved during updates but not exposed in the UI

## Running Tests

```bash
cd plugin-flex-skills-management
npm test
```

Test coverage is minimal in this POC. See `PRODUCTION_READINESS.md` for what to add before a production rollout.

## Further Reading

- `SPEC.md` — architecture, data models, and design decisions
- `SUMMARY.md` — component-by-component developer guide
- `PRODUCTION_READINESS.md` — pre-production checklist
- [Flex Plugin CLI docs](https://www.twilio.com/docs/flex/developer/plugins/cli)
- [Twilio Serverless docs](https://www.twilio.com/docs/serverless)
