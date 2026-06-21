import type { CanonFact, TimelineEvent, Claim } from '../types';
import { orderOf } from './resolveContext';

export function isFactInForce(fact: CanonFact, p: number, events: TimelineEvent[]): boolean {
  const start = fact.validityStartEventId ? orderOf(fact.validityStartEventId, events) : -Infinity;
  const afterStart = p >= start;
  if (!afterStart) return false;
  if (!fact.validityEndEventId) return true; // open-ended: always in force once started
  const end = orderOf(fact.validityEndEventId, events);
  return p < end;
}

export function isFactInBranch(fact: CanonFact, branchId: string | null): boolean {
  if (fact.branchId === null) return true; // applies to all branches
  if (branchId === null) return fact.branchId === null;
  return fact.branchId === branchId;
}

export function filterFacts(
  facts: CanonFact[],
  position: number,
  branchId: string | null,
  events: TimelineEvent[],
): CanonFact[] {
  return facts.filter(f => isFactInForce(f, position, events) && isFactInBranch(f, branchId));
}

export function filterFactsForClaims(
  facts: CanonFact[],
  claims: Claim[],
  position: number,
  branchId: string | null,
  events: TimelineEvent[],
): { sceneFacts: CanonFact[]; perClaimFacts: Map<string, CanonFact[]> } {
  const sceneFacts = filterFacts(facts, position, branchId, events);

  const perClaimFacts = new Map<string, CanonFact[]>();
  for (const claim of claims) {
    if (claim.impliedBranchId && claim.impliedBranchId !== branchId) {
      perClaimFacts.set(claim.id, filterFacts(facts, position, claim.impliedBranchId, events));
    } else {
      perClaimFacts.set(claim.id, sceneFacts);
    }
  }

  return { sceneFacts, perClaimFacts };
}
