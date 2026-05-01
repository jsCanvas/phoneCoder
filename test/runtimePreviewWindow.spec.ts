import {
  FLOATING_PREVIEW_VISIBLE_EDGE,
  FLOATING_PREVIEW_SIZE,
  canOpenRuntimePreview,
  closeRuntimePreview,
  dockRuntimePreview,
  dragRuntimePreview,
  getRuntimePreviewHiddenSide,
  keepRuntimePreviewOnDockerScreenMount,
  moveRuntimePreview,
  openRuntimePreview,
  restoreRuntimePreview,
  toggleRuntimePreviewSize,
} from '../src/screens/runtimePreviewWindow';

describe('runtime preview window', () => {
  it('only opens when a preview URL is available', () => {
    expect(canOpenRuntimePreview(null)).toBe(false);
    expect(canOpenRuntimePreview('')).toBe(false);
    expect(canOpenRuntimePreview('http://task.localhost')).toBe(true);

    expect(openRuntimePreview(null)).toEqual({ mode: 'closed', position: null, url: null });
    expect(openRuntimePreview('http://task.localhost')).toEqual({
      mode: 'floating',
      position: { x: 20, y: 180 },
      url: 'http://task.localhost',
    });
  });

  it('uses a compact 9:16 floating window size', () => {
    expect(FLOATING_PREVIEW_SIZE).toEqual({ width: 162, height: 288 });
    expect(FLOATING_PREVIEW_SIZE.width / FLOATING_PREVIEW_SIZE.height).toBeCloseTo(9 / 16);
  });

  it('toggles between floating and expanded modes', () => {
    expect(
      toggleRuntimePreviewSize({
        mode: 'floating',
        position: { x: 40, y: 90 },
        url: 'http://task.localhost',
      }),
    ).toEqual({
      mode: 'expanded',
      position: { x: 40, y: 90 },
      url: 'http://task.localhost',
    });
    expect(
      toggleRuntimePreviewSize({
        mode: 'expanded',
        position: { x: 40, y: 90 },
        url: 'http://task.localhost',
      }),
    ).toEqual({
      mode: 'floating',
      position: { x: 40, y: 90 },
      url: 'http://task.localhost',
    });
  });

  it('moves the floating preview by drag delta', () => {
    expect(
      dragRuntimePreview(
        { mode: 'floating', position: { x: 40, y: 90 }, url: 'http://task.localhost' },
        { dx: 16, dy: -20 },
      ),
    ).toEqual({
      mode: 'floating',
      position: { x: 56, y: 70 },
      url: 'http://task.localhost',
    });
  });

  it('keeps the floating preview inside the screen while dragging', () => {
    const state = { mode: 'floating' as const, position: { x: 40, y: 90 }, url: 'http://task.localhost' };
    const viewport = { width: 390, height: 700 };

    expect(moveRuntimePreview(state, { x: -400, y: 40 }, viewport).position).toEqual({
      x: 0,
      y: 40,
    });
    expect(moveRuntimePreview(state, { x: 600, y: 900 }, viewport).position).toEqual({
      x: viewport.width - FLOATING_PREVIEW_SIZE.width,
      y: viewport.height - FLOATING_PREVIEW_SIZE.height,
    });
  });

  it('docks an edge-aligned preview offscreen and restores it from the edge button', () => {
    const viewport = { width: 390, height: 700 };
    const state = { mode: 'floating' as const, position: { x: 0, y: 90 }, url: 'http://task.localhost' };
    const hidden = dockRuntimePreview(state, viewport);

    expect(hidden).toEqual({
      mode: 'hidden',
      position: { x: FLOATING_PREVIEW_VISIBLE_EDGE - FLOATING_PREVIEW_SIZE.width, y: 90 },
      url: 'http://task.localhost',
    });
    expect(restoreRuntimePreview(hidden, viewport)).toEqual({
      mode: 'floating',
      position: { x: 0, y: 90 },
      url: 'http://task.localhost',
    });
  });

  it('detects which edge owns the hidden preview button', () => {
    expect(
      getRuntimePreviewHiddenSide({
        mode: 'hidden',
        position: { x: FLOATING_PREVIEW_VISIBLE_EDGE - FLOATING_PREVIEW_SIZE.width, y: 90 },
        url: 'http://task.localhost',
      }),
    ).toBe('left');
    expect(
      getRuntimePreviewHiddenSide({
        mode: 'hidden',
        position: { x: 390 - FLOATING_PREVIEW_VISIBLE_EDGE, y: 90 },
        url: 'http://task.localhost',
      }),
    ).toBe('right');
  });

  it('keeps an opened preview when returning to the Docker tab', () => {
    const opened = {
      mode: 'floating' as const,
      position: { x: 20, y: 180 },
      url: 'http://task.localhost',
    };

    expect(keepRuntimePreviewOnDockerScreenMount(opened)).toBe(opened);
  });

  it('closes the preview window', () => {
    expect(closeRuntimePreview()).toEqual({ mode: 'closed', position: null, url: null });
  });
});
