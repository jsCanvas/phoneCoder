import type { ProjectDto } from '../types/api';

/**
 * Returns the id we should treat as "selected" given the current list of
 * projects. We prefer the previously remembered id when it still exists;
 * otherwise we fall back to the first available project.
 */
export function resolveSelectedProjectId(
  projects: ProjectDto[],
  selectedProjectId?: string,
): string | undefined {
  if (selectedProjectId && projects.some((p) => p.id === selectedProjectId)) {
    return selectedProjectId;
  }
  return projects[0]?.id;
}
