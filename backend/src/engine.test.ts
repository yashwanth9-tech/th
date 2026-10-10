import { describe, expect, it } from 'vitest';
import { calculateEvidenceConfidence, calculateRiskScore, classifyRisk, determineVerification } from './engine.js';

describe('disaster scoring engine', () => {
  it('returns a strong confidence score for a high-quality flood report', () => {
    const confidence = calculateEvidenceConfidence({
      hazard: 'Flood',
      severity: 'HIGH',
      source: 'authority-feed',
      evidenceCount: 4,
      conflictingSources: 0,
      isFresh: true,
      peopleAffected: 200,
      roadBlocked: true,
      nearbyShelters: 2,
    });

    expect(confidence).toBeGreaterThan(70);
  });

  it('classifies risk correctly', () => {
    expect(classifyRisk(88)).toBe('CRITICAL');
    expect(classifyRisk(64)).toBe('HIGH');
    expect(classifyRisk(42)).toBe('MEDIUM');
  });

  it('keeps evidence and risk separate', () => {
    const confidence = calculateEvidenceConfidence({
      hazard: 'Earthquake',
      severity: 'CRITICAL',
      source: 'field-report',
      evidenceCount: 3,
      conflictingSources: 1,
      isFresh: true,
      peopleAffected: 80,
      roadBlocked: false,
      nearbyShelters: 3,
    });

    const risk = calculateRiskScore({
      hazard: 'Earthquake',
      severity: 'CRITICAL',
      source: 'field-report',
      evidenceCount: 3,
      conflictingSources: 1,
      isFresh: true,
      peopleAffected: 80,
      roadBlocked: false,
      nearbyShelters: 3,
      confidence,
    });

    expect(confidence).toBeGreaterThan(0);
    expect(risk).toBeGreaterThan(confidence / 2);
    expect(determineVerification(confidence, 1)).toBe('UNVERIFIED');
  });
});
