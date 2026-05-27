import { assertWriteConfirmedOrDryRun } from '../agent/write-confirmation.js';
import { ApiRequestError, type FuulApiClient } from '../http/fuul-api-client.js';
import type { CheckEventStatusInput, SendBatchEventsInput, SendEventInput, SendEventPayload } from '../tools/tool-schemas.js';

export function buildSendEventBody(fields: SendEventPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: fields.name,
    dedup_id: fields.dedup_id,
    user: {
      identifier: fields.user_identifier,
      identifier_type: fields.user_identifier_type,
    },
  };
  if (fields.args != null) {
    body.args = fields.args;
  }
  if (fields.timestamp != null) {
    body.timestamp = fields.timestamp;
  }
  return body;
}

export async function runSendEvent(api: FuulApiClient, bearer: string, input: SendEventInput): Promise<unknown> {
  assertWriteConfirmedOrDryRun(input);
  const body = buildSendEventBody(input);
  const path = '/api/v1/events';

  if (input.dry_run === true) {
    return { dry_run: true, would_post: path, body };
  }

  const data = await api.postJson(path, body, { bearerToken: bearer });
  return data ?? { status: 'created' };
}

export async function runSendBatchEvents(api: FuulApiClient, bearer: string, input: SendBatchEventsInput): Promise<unknown> {
  assertWriteConfirmedOrDryRun(input);
  const body = input.events.map((e) => buildSendEventBody(e));
  const path = '/api/v1/events/batch';

  if (input.dry_run === true) {
    return { dry_run: true, would_post: path, event_count: body.length, body };
  }

  return api.postJson(path, body, { bearerToken: bearer });
}

function buildEventPipelineQuery(input: CheckEventStatusInput): Record<string, string> {
  const query: Record<string, string> = {};
  if (input.event_id) {
    query.event_id = input.event_id;
  }
  if (input.dedup_id) {
    query.dedup_id = input.dedup_id;
  }
  if (input.event_name) {
    query.event_name = input.event_name;
  }
  return query;
}

export async function runCheckEventStatus(api: FuulApiClient, bearer: string, input: CheckEventStatusInput): Promise<unknown> {
  if (input.verbose === true) {
    try {
      return await api.getJson('/api/v1/events/pipeline', {
        bearerToken: bearer,
        query: buildEventPipelineQuery(input),
      });
    } catch (error: unknown) {
      if (error instanceof ApiRequestError && error.status === 404) {
        return { created: false };
      }
      throw error;
    }
  }

  return api.getJson('/api/v1/events/status', {
    bearerToken: bearer,
    query: {
      user_identifier: input.user_identifier!,
      user_identifier_type: input.user_identifier_type!,
      event_name: input.event_name!,
    },
  });
}
