import type { SceneContext, TimelineEvent, PresentationType } from '../types';

export function orderOf(eventId: string, events: TimelineEvent[]): number {
  const evt = events.find(e => e.id === eventId);
  return evt ? evt.order : 0;
}

export function resolvePosition(
  presentation: PresentationType,
  anchorEventId: string | null | undefined,
  events: TimelineEvent[],
): number {
  if (presentation === 'main' || presentation === 'unknown') return Infinity;
  if (!anchorEventId) return Infinity;
  const order = orderOf(anchorEventId, events);
  if (presentation === 'flashback') return order - 0.5;
  if (presentation === 'flashforward') return order + 0.5;
  return Infinity;
}

export function resolveContext(ctx: SceneContext, events: TimelineEvent[]): SceneContext {
  const pos = resolvePosition(ctx.presentation, ctx.anchorEventId, events);
  return { ...ctx, resolvedPosition: pos };
}
