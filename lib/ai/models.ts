export const MODELS = {
  // Fast: claim extraction, context inference, fix proposal, verify re-check
  fast: 'claude-haiku-4-5-20251001',
  // Strongest + extended thinking: contradiction detection
  detection: 'claude-sonnet-4-6',
  // Fast + one-shot: canon-builder (single emit_canon call)
  canonBuilder: 'claude-haiku-4-5-20251001',
} as const;

export const DETECTION_THINKING_BUDGET = 5000; // tokens for extended thinking
