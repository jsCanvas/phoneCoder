export type RuntimePreviewWindowMode = 'closed' | 'floating' | 'expanded' | 'hidden';

export type RuntimePreviewWindowPosition = {
  x: number;
  y: number;
};

export type RuntimePreviewWindowState = {
  mode: RuntimePreviewWindowMode;
  position: RuntimePreviewWindowPosition | null;
  url: string | null;
};

export const FLOATING_PREVIEW_SIZE = { width: 162, height: 288 } as const;
export const FLOATING_PREVIEW_VISIBLE_EDGE = 24;
export const DEFAULT_FLOATING_PREVIEW_POSITION = { x: 20, y: 180 } as const;

export function canOpenRuntimePreview(url: string | null | undefined): boolean {
  return Boolean(url?.trim());
}

export function openRuntimePreview(
  url: string | null | undefined,
  position: RuntimePreviewWindowPosition = DEFAULT_FLOATING_PREVIEW_POSITION,
): RuntimePreviewWindowState {
  if (!canOpenRuntimePreview(url)) return closeRuntimePreview();
  return { mode: 'floating', position, url: url!.trim() };
}

export function toggleRuntimePreviewSize(
  state: RuntimePreviewWindowState,
): RuntimePreviewWindowState {
  if (!state.url) return closeRuntimePreview();
  return {
    ...state,
    mode: state.mode === 'expanded' ? 'floating' : 'expanded',
  };
}

export function dockRuntimePreview(
  state: RuntimePreviewWindowState,
  viewport: { width: number; height: number },
): RuntimePreviewWindowState {
  if (state.mode !== 'floating' || !state.position || !state.url) return state;
  const rightEdgeX = viewport.width - FLOATING_PREVIEW_SIZE.width;
  const hiddenX =
    state.position.x <= rightEdgeX / 2
      ? FLOATING_PREVIEW_VISIBLE_EDGE - FLOATING_PREVIEW_SIZE.width
      : viewport.width - FLOATING_PREVIEW_VISIBLE_EDGE;

  return {
    ...state,
    mode: 'hidden',
    position: {
      x: hiddenX,
      y: clamp(state.position.y, 0, Math.max(0, viewport.height - FLOATING_PREVIEW_SIZE.height)),
    },
  };
}

export function restoreRuntimePreview(
  state: RuntimePreviewWindowState,
  viewport: { width: number; height: number },
): RuntimePreviewWindowState {
  if (state.mode !== 'hidden' || !state.position || !state.url) return state;
  return {
    ...state,
    mode: 'floating',
    position: {
      x: state.position.x < 0 ? 0 : Math.max(0, viewport.width - FLOATING_PREVIEW_SIZE.width),
      y: clamp(state.position.y, 0, Math.max(0, viewport.height - FLOATING_PREVIEW_SIZE.height)),
    },
  };
}

export function getRuntimePreviewHiddenSide(
  state: RuntimePreviewWindowState,
): 'left' | 'right' {
  return (state.position?.x ?? 0) < 0 ? 'left' : 'right';
}

export function keepRuntimePreviewOnDockerScreenMount(
  state: RuntimePreviewWindowState,
): RuntimePreviewWindowState {
  return state;
}

export function isRuntimePreviewAtHorizontalEdge(
  state: RuntimePreviewWindowState,
  viewport: { width: number; height: number },
): boolean {
  if (state.mode !== 'floating' || !state.position) return false;
  const rightEdgeX = Math.max(0, viewport.width - FLOATING_PREVIEW_SIZE.width);
  return state.position.x === 0 || state.position.x === rightEdgeX;
}

export function dragRuntimePreview(
  state: RuntimePreviewWindowState,
  delta: { dx: number; dy: number },
  viewport?: { width: number; height: number },
): RuntimePreviewWindowState {
  if (state.mode !== 'floating' || !state.position) return state;
  return moveRuntimePreview(
    state,
    { x: state.position.x + delta.dx, y: state.position.y + delta.dy },
    viewport,
  );
}

export function moveRuntimePreview(
  state: RuntimePreviewWindowState,
  position: RuntimePreviewWindowPosition,
  viewport?: { width: number; height: number },
): RuntimePreviewWindowState {
  if (state.mode !== 'floating') return state;
  const minX = 0;
  const maxX = viewport ? viewport.width - FLOATING_PREVIEW_SIZE.width : Number.POSITIVE_INFINITY;
  const minY = 0;
  const maxY = viewport ? viewport.height - FLOATING_PREVIEW_SIZE.height : Number.POSITIVE_INFINITY;

  return {
    ...state,
    position: {
      x: clamp(position.x, minX, maxX),
      y: clamp(position.y, minY, maxY),
    },
  };
}

export function closeRuntimePreview(): RuntimePreviewWindowState {
  return { mode: 'closed', position: null, url: null };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
