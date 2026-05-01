import { resolveSelectedProjectId } from '../src/chat/projectSelection';
import type { ProjectDto } from '../src/types/api';

const project = (id: string): ProjectDto =>
  ({ id, name: id, slug: id }) as unknown as ProjectDto;

describe('resolveSelectedProjectId', () => {
  it('keeps a valid selected project id', () => {
    expect(
      resolveSelectedProjectId([project('p-1'), project('p-2')], 'p-2'),
    ).toBe('p-2');
  });

  it('falls back to the first project when no valid selection exists', () => {
    expect(
      resolveSelectedProjectId([project('p-1'), project('p-2')], 'nope'),
    ).toBe('p-1');
    expect(resolveSelectedProjectId([], 'nope')).toBeUndefined();
  });
});
