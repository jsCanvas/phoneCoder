import { getMobileTabs } from '../src/navigation/mobileTabs';

describe('mobile tabs', () => {
  it('exposes settings → project → chat → files → preview → git in display order', () => {
    expect(getMobileTabs().map((tab) => tab.key)).toEqual([
      'settings',
      'project',
      'chat',
      'files',
      'preview',
      'git',
    ]);
    expect(getMobileTabs()[0]).toEqual(
      expect.objectContaining({ label: 'Model', title: 'Connection & Models' }),
    );
  });
});
