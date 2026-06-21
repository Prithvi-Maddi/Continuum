import { getClient } from '../ai/client';
import { MODELS } from '../ai/models';
import { EmitFixesInput } from '../ai/schemas';
import { EMIT_FIXES_TOOL } from '../ai/toolSchema';
import { buildGenerateFixPrompt } from '../ai/prompts/generateFix';
import { checkScene } from '../engine/checkScene';
import type { ContinuityIssue, SceneContext, WorldState, RepairResponse, SuggestedFix } from '../types';
import type Anthropic from '@anthropic-ai/sdk';

export async function runRepairVerify(
  sceneText: string,
  context: SceneContext,
  issue: ContinuityIssue,
  fix: SuggestedFix | null,
  world: WorldState,
): Promise<RepairResponse> {
  let replacement = fix?.replacement ?? null;
  if (!replacement) replacement = await generateReplacement(issue, undefined, sceneText);

  const patchedText = applyPatch(sceneText, issue.span, replacement);
  const v1 = await verifyPatch(patchedText, context, issue, world);
  if (v1.ok) return { patchedText, verified: true };

  const alt = await generateReplacement(issue, 'Previous fix failed: ' + replacement, sceneText);
  const patchedText2 = applyPatch(sceneText, issue.span, alt);
  const v2 = await verifyPatch(patchedText2, context, issue, world);
  if (v2.ok) return { patchedText: patchedText2, verified: true };

  return { patchedText, verified: false, explanation: 'Automatic fix could not be verified — review manually.' };
}

function applyPatch(text: string, span: { start: number; end: number }, replacement: string): string {
  return text.slice(0, span.start) + replacement + text.slice(span.end);
}

function extractSpanContext(sceneText: string, highlightedText: string): string {
  const idx = sceneText.indexOf(highlightedText);
  if (idx === -1) return highlightedText;
  const start = Math.max(0, idx - 60);
  const end = Math.min(sceneText.length, idx + highlightedText.length + 60);
  return (start > 0 ? '…' : '') + sceneText.slice(start, end) + (end < sceneText.length ? '…' : '');
}

async function generateReplacement(issue: ContinuityIssue, extra?: string, sceneText?: string): Promise<string> {
  const client = getClient();
  const spanContext = sceneText
    ? extractSpanContext(sceneText, issue.highlightedText)
    : issue.highlightedText;

  const { system, user } = buildGenerateFixPrompt(
    spanContext,
    issue.highlightedText,
    issue.explanation + (extra ? ' ' + extra : ''),
    issue.evidenceQuotes[0] ?? '',
  );

  const response = await client.messages.create({
    model: MODELS.fast,
    max_tokens: 1024,
    temperature: 0.2,
    system,
    messages: [{ role: 'user', content: user }],
    tools: [EMIT_FIXES_TOOL],
    tool_choice: { type: 'any' },
  });

  const toolUse = (response as Anthropic.Message).content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
  if (!toolUse) return issue.suggestedFixes[0]?.replacement ?? '[corrected text]';

  const result = EmitFixesInput.safeParse(toolUse.input);
  if (!result.success) return issue.suggestedFixes[0]?.replacement ?? '[corrected text]';
  return result.data.fixes[0]?.replacement ?? '[corrected text]';
}

async function verifyPatch(
  patchedText: string,
  context: SceneContext,
  originalIssue: ContinuityIssue,
  world: WorldState,
): Promise<{ ok: boolean }> {
  try {
    const result = await checkScene(patchedText, context, world);
    const stillFlagged = result.issues.some(
      i => i.issueType === originalIssue.issueType && Math.abs(i.span.start - originalIssue.span.start) < 50,
    );
    const newHigh = result.issues.filter(
      i => i.severity === 'high' && i.span.start >= originalIssue.span.start - 10,
    );
    return { ok: !stillFlagged && newHigh.length === 0 };
  } catch {
    return { ok: false };
  }
}
