import type { FuulApiClient } from '../http/fuul-api-client.js';
import { withTimeout } from '../util/with-timeout.js';
import { enrichIncentivesListWithTriggerScope, enrichProjectWithMetadataScope, enrichSingleIncentiveWithTriggerScope } from './enrich-responses.js';

const PROJECT_SCOPE_CACHE_TTL_MS = 30_000;

type ProjectScopeCacheEntry = {
  expiresAt: number;
  value: Promise<Record<string, unknown>>;
};

const projectScopeCache = new Map<string, ProjectScopeCacheEntry>();

export function clearProjectScopeCacheForTests(): void {
  projectScopeCache.clear();
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

async function fetchCustomizations(api: FuulApiClient, projectId: string, toolTimeoutMs: number, label: string): Promise<unknown> {
  return withTimeout(api.getJson(`/api/v1/projects/${projectId}/customizations`), toolTimeoutMs, label);
}

export async function loadProjectWithMetadataScope(api: FuulApiClient, projectId: string, toolTimeoutMs: number): Promise<Record<string, unknown>> {
  const now = Date.now();
  const cached = projectScopeCache.get(projectId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const value = (async () => {
    const [draftProject, customizations] = await Promise.all([
      withTimeout(api.getJson(`/api/v1/projects/${projectId}`), toolTimeoutMs, 'get_project'),
      fetchCustomizations(api, projectId, toolTimeoutMs, 'get_project_customizations'),
    ]);
    return enrichProjectWithMetadataScope(asRecord(draftProject), customizations);
  })();

  projectScopeCache.set(projectId, { expiresAt: now + PROJECT_SCOPE_CACHE_TTL_MS, value });

  return value;
}

export async function loadIncentivesListWithMetadataScope(api: FuulApiClient, projectId: string, toolTimeoutMs: number): Promise<unknown> {
  const [incentives, customizations, draftProject] = await Promise.all([
    withTimeout(api.getJson(`/api/v1/projects/${projectId}/incentives`), toolTimeoutMs, 'list_incentives'),
    fetchCustomizations(api, projectId, toolTimeoutMs, 'list_incentives_customizations'),
    withTimeout(api.getJson(`/api/v1/projects/${projectId}`), toolTimeoutMs, 'list_incentives_project'),
  ]);

  const project = asRecord(draftProject);
  const projectTriggers = Array.isArray(project.triggers) ? project.triggers : [];
  const list = Array.isArray(incentives) ? incentives : [];

  return enrichIncentivesListWithTriggerScope(list, customizations, projectTriggers);
}

export async function loadIncentiveWithMetadataScope(
  api: FuulApiClient,
  projectId: string,
  conversionId: string,
  toolTimeoutMs: number,
): Promise<unknown> {
  const [incentive, customizations, draftProject] = await Promise.all([
    withTimeout(api.getJson(`/api/v1/projects/${projectId}/incentives/${conversionId}`), toolTimeoutMs, 'get_incentive'),
    fetchCustomizations(api, projectId, toolTimeoutMs, 'get_incentive_customizations'),
    withTimeout(api.getJson(`/api/v1/projects/${projectId}`), toolTimeoutMs, 'get_incentive_project'),
  ]);

  const project = asRecord(draftProject);
  const projectTriggers = Array.isArray(project.triggers) ? project.triggers : [];

  return enrichSingleIncentiveWithTriggerScope(asRecord(incentive), customizations, projectTriggers);
}
