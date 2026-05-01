import { createElement, useEffect, useRef } from 'react';
import {
  Button,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  FLOATING_PREVIEW_SIZE,
  FLOATING_PREVIEW_VISIBLE_EDGE,
  closeRuntimePreview,
  dockRuntimePreview,
  getRuntimePreviewHiddenSide,
  isRuntimePreviewAtHorizontalEdge,
  moveRuntimePreview,
  restoreRuntimePreview,
  toggleRuntimePreviewSize,
  type RuntimePreviewWindowPosition,
  type RuntimePreviewWindowState,
} from './runtimePreviewWindow';

type RuntimePreviewOverlayProps = {
  state: RuntimePreviewWindowState;
  onChange(state: RuntimePreviewWindowState): void;
};

export function RuntimePreviewOverlay({ state, onChange }: RuntimePreviewOverlayProps) {
  const viewport = useWindowDimensions();
  const stateRef = useRef(state);
  stateRef.current = state;
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const dragStartRef = useRef<RuntimePreviewWindowPosition | null>(null);
  const isDraggingRef = useRef(false);
  const dockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (dockTimerRef.current) clearTimeout(dockTimerRef.current);
    },
    [],
  );

  function scheduleEdgeDock() {
    if (dockTimerRef.current) clearTimeout(dockTimerRef.current);
    if (!isRuntimePreviewAtHorizontalEdge(stateRef.current, viewportRef.current)) return;
    dockTimerRef.current = setTimeout(() => {
      onChange(dockRuntimePreview(stateRef.current, viewportRef.current));
      dockTimerRef.current = null;
    }, 1000);
  }

  function openPreviewPage() {
    onChange(toggleRuntimePreviewSize(stateRef.current));
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
      onPanResponderGrant: () => {
        if (dockTimerRef.current) {
          clearTimeout(dockTimerRef.current);
          dockTimerRef.current = null;
        }
        dragStartRef.current = stateRef.current.position;
        isDraggingRef.current = false;
      },
      onPanResponderMove: (_event, gesture) => {
        if (!dragStartRef.current) return;
        if (Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3) {
          isDraggingRef.current = true;
        }
        const next = moveRuntimePreview(
          stateRef.current,
          {
            x: dragStartRef.current.x + gesture.dx,
            y: dragStartRef.current.y + gesture.dy,
          },
          viewportRef.current,
        );
        stateRef.current = next;
        onChange(next);
      },
      onPanResponderRelease: (event) => {
        const wasDragging = isDraggingRef.current;
        if (!wasDragging) {
          const { locationX, locationY } = event.nativeEvent;
          if (locationX >= FLOATING_PREVIEW_SIZE.width - 32 && locationY <= 32) {
            onChange(closeRuntimePreview());
          } else {
            openPreviewPage();
          }
        }
        dragStartRef.current = null;
        isDraggingRef.current = false;
        if (wasDragging) scheduleEdgeDock();
      },
      onPanResponderTerminate: () => {
        dragStartRef.current = null;
        isDraggingRef.current = false;
      },
    }),
  ).current;

  return (
    <>
      {state.mode === 'floating' && state.url && state.position ? (
        <View
          style={[
            styles.floatingPreview,
            {
              height: FLOATING_PREVIEW_SIZE.height,
              left: state.position.x,
              top: state.position.y,
              width: FLOATING_PREVIEW_SIZE.width,
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Preview</Text>
            <Text style={styles.previewClose}>x</Text>
          </View>
          <View pointerEvents="none" style={styles.floatingFrame}>
            <RuntimePreviewFrame url={state.url} interactive={false} />
          </View>
          <Text style={styles.previewHint}>Tap to expand - drag to edge</Text>
        </View>
      ) : null}

      {state.mode === 'hidden' && state.url && state.position ? (
        <Pressable
          onPress={() => onChange(restoreRuntimePreview(state, viewport))}
          style={[
            styles.hiddenPreviewButton,
            getRuntimePreviewHiddenSide(state) === 'left'
              ? styles.hiddenPreviewButtonLeft
              : styles.hiddenPreviewButtonRight,
            {
              height: FLOATING_PREVIEW_SIZE.height,
              left:
                state.position.x < 0
                  ? 0
                  : Math.max(0, viewport.width - FLOATING_PREVIEW_VISIBLE_EDGE),
              top: state.position.y,
              width: FLOATING_PREVIEW_VISIBLE_EDGE,
            },
          ]}
        >
          <Text style={styles.hiddenPreviewText}>Preview</Text>
        </Pressable>
      ) : null}

      <Modal
        animationType="fade"
        transparent
        visible={state.mode === 'expanded' && Boolean(state.url)}
        onRequestClose={() => onChange(closeRuntimePreview())}
      >
        <View style={styles.previewOverlay}>
          <View style={styles.expandedPreview}>
            <View style={styles.expandedHeader}>
              <View style={styles.expandedTitleGroup}>
                <Text style={styles.expandedTitle}>Runtime preview</Text>
                <Text style={styles.expandedUrl} numberOfLines={1}>{state.url}</Text>
              </View>
              <View style={styles.expandedActions}>
                <Button title="Float" onPress={() => onChange(toggleRuntimePreviewSize(state))} />
                <Button title="Close" onPress={() => onChange(closeRuntimePreview())} />
              </View>
            </View>
            {state.url ? (
              <View style={styles.expandedFrame}>
                <RuntimePreviewFrame url={state.url} interactive />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

function RuntimePreviewFrame({ url, interactive }: { url: string; interactive: boolean }) {
  if (Platform.OS === 'web') {
    return createElement('iframe', {
      src: url,
      title: 'Docker runtime preview',
      style: {
        border: 0,
        height: '100%',
        pointerEvents: interactive ? 'auto' : 'none',
        width: '100%',
      },
    });
  }

  return (
    <View style={styles.nativePreviewFallback}>
      <Text style={styles.detail}>Inline preview is available on web.</Text>
      <Text style={styles.url} onPress={() => void Linking.openURL(url)}>
        Open {url}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingPreview: {
    backgroundColor: '#ffffff',
    borderColor: '#c7d2fe',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 6,
    position: 'absolute',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    zIndex: 40,
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  previewTitle: { color: '#0f172a', fontSize: 12, fontWeight: '900' },
  previewClose: { color: '#64748b', fontSize: 16, fontWeight: '900', lineHeight: 18 },
  floatingFrame: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    flex: 1,
    overflow: 'hidden',
  },
  previewHint: { color: '#6366f1', fontSize: 9, fontWeight: '800', marginTop: 5 },
  hiddenPreviewButton: {
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    position: 'absolute',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    zIndex: 41,
  },
  hiddenPreviewButtonLeft: {
    borderBottomRightRadius: 12,
    borderTopRightRadius: 12,
  },
  hiddenPreviewButtonRight: {
    borderBottomLeftRadius: 12,
    borderTopLeftRadius: 12,
  },
  hiddenPreviewText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    transform: [{ rotate: '-90deg' }],
  },
  previewOverlay: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  expandedPreview: {
    backgroundColor: '#ffffff',
    flex: 1,
    overflow: 'hidden',
  },
  expandedHeader: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  expandedTitleGroup: { flex: 1 },
  expandedTitle: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  expandedUrl: { color: '#64748b', fontSize: 11, marginTop: 2 },
  expandedActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  expandedFrame: {
    backgroundColor: '#f8fafc',
    flex: 1,
    overflow: 'hidden',
  },
  nativePreviewFallback: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    padding: 16,
  },
  detail: { color: '#475569', fontSize: 12 },
  url: { color: '#4338ca', fontWeight: '700' },
});
