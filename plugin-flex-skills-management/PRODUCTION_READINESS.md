# Production Readiness Checklist

Items to address before deploying this plugin to a production Flex environment.

---

## Serverless Functions

### Rate Limiting / Batching
- `update-skills` currently updates all workers in parallel via `Promise.all`. Twilio TaskRouter has a rate limit of ~100 requests/sec.
- **Action:** Batch updates in groups of 10 with 100ms delay between batches to avoid 429 errors on large bulk operations.

### Race Condition on Concurrent Updates
- The read-modify-write pattern in `update-skills` (fetch attributes → modify skills → write back) has no locking. If two supervisors update the same worker simultaneously, the second write silently overwrites the first.
- **Action:** For production with multiple supervisors, consider using ETags/conditional updates, or implement optimistic locking with a retry loop on conflict.

### Error Message Exposure
- 500 errors currently return raw `error.message` from the Twilio SDK, which may leak internal details (account SIDs, internal URLs).
- **Action:** Return generic error messages to the client and log the full error server-side only.

### Skill Name Validation
- No max length or character restrictions on skill names. A supervisor could add skills with special characters, HTML, or extremely long strings.
- **Action:** Add validation: max 50 characters, alphanumeric + hyphens/underscores only, or validate against a master skill list if one exists.

### Pagination for Large Workspaces
- `get-workers` fetches up to 1000 workers in a single API call (`PageSize=1000`). Workspaces with >1000 workers will have missing data.
- **Action:** Implement a pagination loop using `nextPageUrl` from the TaskRouter API response.

### CORS Hardening
- Functions set `Access-Control-Allow-Origin: *`. In production, this should be restricted.
- **Action:** Set the origin to your specific Flex domain (e.g., `https://flex.twilio.com` or your custom domain).

---

## Plugin (Frontend)

### Audit Log Persistence
- The audit log is ephemeral — stored in React state only. It resets on page refresh.
- **Action:** Persist audit entries to a database (e.g., Twilio Sync, DynamoDB, or a custom backend) and retrieve them via a `get-audit-log` function. Support filtering by worker, supervisor, date range.

### Auto-Retry with Backoff
- Currently only a manual retry button is shown on error. Transient network failures require user intervention.
- **Action:** Implement automatic retry (2-3 attempts with exponential backoff) before showing the error state with the manual retry button.

### Token Expiry Handling
- If the Flex token expires mid-session and the auto-renew fails silently, API calls will start returning 403s.
- **Action:** Catch 401/403 from the service layer and prompt the user to refresh, or listen to Flex token refresh events.

### Accessibility
- Tooltips on skill badges may not be keyboard-accessible in all Paste versions.
- **Action:** Verify tooltip content is reachable via keyboard navigation and announced by screen readers.

---

## Security

### CORS Origin Restriction
- As mentioned above, restrict `Access-Control-Allow-Origin` to the specific Flex domain in production.

### Input Sanitization
- Skill names are normalized to lowercase/trimmed but not validated for content.
- **Action:** Sanitize or reject skill names with HTML, script tags, or control characters.

### Credential Management
- `.env` file contains Account SID and Auth Token. Production should use Twilio's built-in environment variable management for deployed functions (configured in the Twilio Console under Functions > Configure).
- **Action:** Never deploy with a `.env` file. Use the Twilio Console or CLI to set environment variables for deployed functions.

---

## Deployment

### Environment Configuration
- `window.appConfig.serviceBaseUrl` must be set to the deployed serverless domain.
- **Action:** After deploying serverless functions (`twilio serverless:deploy`), configure the resulting URL in your Flex configuration or `appConfig`.

### Plugin Deployment
- Use `twilio flex:plugins:deploy --changelog "description"` followed by `twilio flex:plugins:release` to deploy and activate the plugin.
- Multiple plugin versions can coexist. Use `twilio flex:plugins:release:rollback` to revert to a previous version if issues are found.
- **Action:** Test in a staging Flex instance before releasing to production. Document the release process for the team.

### Monitoring
- No observability currently. Errors only appear in browser console or serverless logs.
- **Action:** Add structured logging in serverless functions. Consider integrating with Datadog, Splunk, or Twilio's built-in function logs for alerting on error spikes.

---

## Data Model Gaps

### `disabled_skills` Not Handled
- Some workers have an `attributes.disabled_skills` object containing skills that were intentionally deactivated. The plugin ignores this entirely.
- **Action:** Display disabled skills differently in the UI (e.g., grayed out). Prevent re-adding a disabled skill without explicit confirmation, or add a "re-enable" flow separate from "add."

### `routing.levels` Not Exposed
- Skill levels (e.g., `skillLevel: 3`) are preserved when writing attributes but supervisors have no way to view or set them.
- **Action:** If skill levels are used for routing decisions, add a level selector (1-5 or similar) to the SkillsEditor. Otherwise, document that this tool only manages skill presence, not proficiency.

### Multi-Tab / Multi-Supervisor Behavior
- Audit logs are per-tab (React state). Two tabs open by the same supervisor will have diverging logs.
- Edits in one tab don't reflect in another until refetch (triggered by the next add/remove action).
- **Action:** For production, persisted audit logs solve the divergence. For real-time sync between tabs, consider Twilio Sync or WebSocket subscriptions.

---

## Nice-to-Haves (Not Blocking)

- **Skill master list** — Instead of free-text input, load available skills from a configuration source to prevent typos and inconsistency.
- **Undo support** — Allow supervisors to undo the last action within a short window (e.g., 10 seconds).
- **Bulk operations confirmation** — When selecting all workers (large count), show a warning before applying changes.
- **Worker activity filtering** — Option to hide offline workers or filter by activity status.
- **Export audit log** — Button to download the session audit log as CSV before it resets.
