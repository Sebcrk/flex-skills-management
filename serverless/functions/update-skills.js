/**
 * update-skills.js
 *
 * Performs surgical skill updates on one or more workers. Only modifies the
 * `skills` array within worker attributes — all other attributes are preserved.
 *
 * Uses twilio-flex-token-validator to validate the Flex token. After validation,
 * event.TokenResult provides the supervisor's identity and roles.
 *
 * Accepts POST body: { workerSids, action, skill, Token }
 * - workerSids: array of worker SIDs to update
 * - action: "add" or "remove"
 * - skill: the skill string to add/remove
 * - Token: Flex JWT token (passed automatically by the plugin, validated by TokenValidator)
 *
 * Returns: { results, summary: { updated, skipped, failed }, supervisor }
 *
 * POC Note: All workers are updated in parallel. Production should batch
 * updates in groups of 10 with 100ms delay between batches to respect
 * Twilio API rate limits (100 requests/sec for TaskRouter).
 *
 * Production-only functions (not implemented in this POC):
 * - get-audit-log: retrieves audit entries from database, supports filtering
 *   by worker/supervisor/date range
 * - validate-token: dedicated token validation with caching and role checking
 * - get-single-worker: fetches one worker's full attributes for detailed view
 */

const TokenValidator = require('twilio-flex-token-validator').functionValidator;

exports.handler = TokenValidator(async function (context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.appendHeader('Content-Type', 'application/json');

  try {
    if (!context.WORKSPACE_SID) {
      response.setStatusCode(500);
      response.setBody({ error: 'Server misconfiguration: WORKSPACE_SID is not set' });
      return callback(null, response);
    }

    if (
      !event.TokenResult.roles.includes('supervisor') &&
      !event.TokenResult.roles.includes('admin')
    ) {
      response.setStatusCode(403);
      response.setBody({
        success: false,
        error: 'User does not have the permissions to perform this action.',
      });
      return callback(null, response);
    }

    // Supervisor identity comes directly from the validated token
    const supervisor = event.TokenResult.identity || 'unknown';

    const { workerSids, action, skill } = event;

    // Validate input
    let parsedWorkerSids = workerSids;
    if (typeof workerSids === 'string') {
      try {
        parsedWorkerSids = JSON.parse(workerSids);
      } catch (e) {
        // might be a single SID
        parsedWorkerSids = [workerSids];
      }
    }

    if (!parsedWorkerSids || !Array.isArray(parsedWorkerSids) || parsedWorkerSids.length === 0) {
      response.setStatusCode(400);
      response.setBody({ error: 'workerSids must be a non-empty array' });
      return callback(null, response);
    }

    if (!action || !['add', 'remove'].includes(action)) {
      response.setStatusCode(400);
      response.setBody({ error: 'action must be "add" or "remove"' });
      return callback(null, response);
    }

    if (!skill || typeof skill !== 'string' || skill.trim().length === 0) {
      response.setStatusCode(400);
      response.setBody({ error: 'skill must be a non-empty string' });
      return callback(null, response);
    }

    const client = context.getTwilioClient();
    const workspaceSid = context.WORKSPACE_SID;
    const normalizedSkill = skill.trim().toLowerCase();

    // POC: Process all workers in parallel
    // Production: Batch in groups of 10 with 100ms delay between batches
    // to respect Twilio TaskRouter rate limits (100 req/sec)
    const results = await Promise.all(
      parsedWorkerSids.map(async (workerSid) => {
        try {
          // Fetch current worker attributes
          const worker = await client.taskrouter.v1
            .workspaces(workspaceSid)
            .workers(workerSid)
            .fetch();

          // Parse existing attributes — SURGICAL MERGE: only modify routing.skills
          const attributes = JSON.parse(worker.attributes || '{}');
          if (!attributes.routing) {
            attributes.routing = { skills: [], levels: {} };
          }
          const currentSkills = attributes.routing.skills || [];

          if (action === 'add') {
            if (currentSkills.includes(normalizedSkill)) {
              return { workerSid, status: 'skipped', reason: 'already_has_skill' };
            }
            attributes.routing.skills = [...currentSkills, normalizedSkill];
          } else {
            if (!currentSkills.includes(normalizedSkill)) {
              return { workerSid, status: 'skipped', reason: 'does_not_have_skill' };
            }
            attributes.routing.skills = currentSkills.filter((s) => s !== normalizedSkill);
          }

          // Write back full attributes object — only skills was modified
          await client.taskrouter.v1
            .workspaces(workspaceSid)
            .workers(workerSid)
            .update({ attributes: JSON.stringify(attributes) });

          return { workerSid, status: 'updated' };
        } catch (error) {
          console.error(`Error updating worker ${workerSid}:`, error.message);
          return { workerSid, status: 'failed', error: error.message };
        }
      })
    );

    // Build summary
    const summary = {
      updated: results.filter((r) => r.status === 'updated').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      failed: results.filter((r) => r.status === 'failed').length,
    };

    response.setStatusCode(200);
    response.setBody({ results, summary, supervisor });
    return callback(null, response);
  } catch (error) {
    console.error('Error in update-skills:', error);
    response.setStatusCode(500);
    response.setBody({ error: error.message });
    return callback(null, response);
  }
});
