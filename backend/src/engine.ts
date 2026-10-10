export type HazardType = 'Flood' | 'Landslide' | 'Earthquake' | 'Drought';
export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type VerificationState = 'VERIFIED' | 'UNVERIFIED' | 'CONFLICTING' | 'DISPROVEN';

export interface EvidenceInput {
  hazard: HazardType;
  severity: SeverityLevel;
  source: string;
  evidenceCount: number;
  conflictingSources: number;
  isFresh: boolean;
  peopleAffected?: number;
  roadBlocked?: boolean;
  nearbyShelters?: number;
}

export function calculateEvidenceConfidence(input: EvidenceInput): number {
  const sourceWeight = input.source.includes('authority') ? 28 : input.source.includes('field') ? 22 : input.source.includes('citizen') ? 16 : 12;
  const severityWeight = { LOW: 8, MEDIUM: 12, HIGH: 18, CRITICAL: 22 }[input.severity] ?? 8;
  const freshnessWeight = input.isFresh ? 16 : 8;
  const evidenceWeight = Math.min(input.evidenceCount * 12, 24);
  const conflictPenalty = input.conflictingSources * 11;
  const score = sourceWeight + severityWeight + freshnessWeight + evidenceWeight - conflictPenalty;
  return Math.max(10, Math.min(100, Math.round(score)));
}

export function calculateRiskScore(input: EvidenceInput & { confidence: number }): number {
  const severityValue = { LOW: 20, MEDIUM: 35, HIGH: 55, CRITICAL: 75 }[input.severity] ?? 20;
  const confidenceFactor = input.confidence * 0.3;
  const affectedFactor = (input.peopleAffected ?? 0) * 0.12;
  const roadFactor = input.roadBlocked ? 12 : 0;
  const shelterFactor = (input.nearbyShelters ?? 3) > 0 ? -6 : 0;
  const risk = Math.round(severityValue + confidenceFactor + affectedFactor + roadFactor + shelterFactor);
  return Math.max(10, Math.min(100, risk));
}

export function classifyRisk(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
}

export function determineVerification(confidence: number, conflictingSources: number): VerificationState {
  if (conflictingSources >= 2) return 'CONFLICTING';
  if (confidence >= 75) return 'VERIFIED';
  if (confidence <= 40) return 'DISPROVEN';
  return 'UNVERIFIED';
}

export function explainEvidence(input: EvidenceInput & { confidence: number }) {
  const reasons = [
    `Severity ${input.severity} with a ${input.hazard} hazard classification.`,
    `Evidence confidence is ${input.confidence}/100 based on source reliability and freshness.`,
    input.roadBlocked ? 'Road blockage increases access risks for rescue coordination.' : 'Road conditions do not currently indicate blockage.',
    input.conflictingSources > 0 ? `Conflicting reports from ${input.conflictingSources} source(s) reduce certainty.` : 'Independent sources are mostly aligned.',
  ];

  return reasons;
}
