import { describe, expect, it } from 'vitest';
import { validateReportInput } from '../src/services/supabase/reportService';

describe('validateReportInput', () => {
  it('trims descriptions and removes control characters before saving', () => {
    expect(validateReportInput({
      category: 'lighting_issue',
      coordinates: [77.2, 28.6],
      description: '  Lamp is off\u0000 near the crossing.  ',
    })).toEqual({
      category: 'lighting_issue',
      coordinates: [77.2, 28.6],
      description: 'Lamp is off near the crossing.',
    });
  });

  it('rejects coordinates outside geographic bounds', () => {
    expect(() => validateReportInput({
      category: 'general_hazard',
      coordinates: [181, 28.6],
      description: 'Blocked walkway',
    })).toThrow('valid longitude and latitude');
  });

  it('rejects malformed coordinate tuples, categories, and descriptions', () => {
    expect(() => validateReportInput({
      category: 'lighting_issue',
      coordinates: [77.2],
      description: 'Broken streetlight',
    })).toThrow('valid longitude and latitude');

    expect(() => validateReportInput({
      category: 'unknown',
      coordinates: [77.2, 28.6],
      description: 'Broken streetlight',
    })).toThrow('valid report category');

    expect(() => validateReportInput({
      category: 'lighting_issue',
      coordinates: [77.2, 28.6],
      description: 42,
    })).toThrow('must be text');
  });

  it('rejects short or overlong descriptions', () => {
    expect(() => validateReportInput({
      category: 'safe_haven',
      coordinates: [77.2, 28.6],
      description: 'bad',
    })).toThrow('between 5 and 2000 characters');
    expect(() => validateReportInput({
      category: 'safe_haven',
      coordinates: [77.2, 28.6],
      description: 'x'.repeat(2001),
    })).toThrow('between 5 and 2000 characters');
  });
});
