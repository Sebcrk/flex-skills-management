/**
 * get-workers.js
 *
 * Fetches all workers from a TaskRouter workspace and returns a simplified
 * list with SID, name, skills, and current activity.
 *
 * Uses twilio-flex-token-validator to validate the Flex token and extract
 * the caller's identity and roles from event.TokenResult.
 *
 * POC Note: Uses PageSize=1000 to fetch all workers in a single call.
 * Production: Implement proper pagination (nextPageUrl loop) to handle
 * workspaces with >1000 workers.
 *
 * Production-only functions (not implemented in this POC):
 * - get-single-worker: fetches one worker's full attributes for detailed view
 * - get-audit-log: retrieves audit entries from database, supports filtering
 */

const TokenValidator = require('twilio-flex-token-validator').functionValidator;

exports.handler = TokenValidator(async function (context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

    const client = context.getTwilioClient();
    const workspaceSid = context.WORKSPACE_SID;

    // POC: Single page fetch with PageSize=1000
    // Production: Loop through pages using nextPageUrl for workspaces with >1000 workers
    const workers = await client.taskrouter.v1
      .workspaces(workspaceSid)
      .workers.list({ pageSize: 1000 });

    const result = workers.map((worker) => {
      let skills = [];
      try {
        const attributes = JSON.parse(worker.attributes);
        skills = (attributes.routing && attributes.routing.skills) || [];
      } catch (e) {
        skills = [];
      }

      return {
        sid: worker.sid,
        friendlyName: worker.friendlyName,
        skills,
        activityName: worker.activityName,
      };
    });

    response.setStatusCode(200);
    response.setBody(result);
    return callback(null, response);
  } catch (error) {
    console.error('Error fetching workers:', error);
    response.setStatusCode(500);
    response.setBody({ error: error.message });
    return callback(null, response);
  }
});
