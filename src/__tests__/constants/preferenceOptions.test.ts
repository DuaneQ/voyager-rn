import {
  STATUS_PREFERENCE_OPTIONS,
  ORIENTATION_PREFERENCE_OPTIONS,
  getPreferenceLabel,
} from '../../constants/preferenceOptions';

describe('preferenceOptions constants', () => {
  it('defines canonical lowercase status values with title-case labels', () => {
    expect(STATUS_PREFERENCE_OPTIONS).toEqual([
      { label: 'Single', value: 'single' },
      { label: 'Couple', value: 'couple' },
      { label: 'Group', value: 'group' },
      { label: 'No Preference', value: 'No Preference' },
    ]);
  });

  it('includes canonical lowercase orientation values and No Preference', () => {
    const values = ORIENTATION_PREFERENCE_OPTIONS.map((option) => option.value);
    expect(values).toContain('heterosexual');
    expect(values).toContain('homosexual');
    expect(values).toContain('bisexual');
    expect(values).toContain('No Preference');
  });
});

describe('getPreferenceLabel', () => {
  it('maps lowercase and title-case status values to the same label', () => {
    expect(getPreferenceLabel('single', STATUS_PREFERENCE_OPTIONS)).toBe('Single');
    expect(getPreferenceLabel('Single', STATUS_PREFERENCE_OPTIONS)).toBe('Single');
  });

  it('maps lowercase and title-case orientation values to the same label', () => {
    expect(getPreferenceLabel('heterosexual', ORIENTATION_PREFERENCE_OPTIONS)).toBe('Heterosexual');
    expect(getPreferenceLabel('Heterosexual', ORIENTATION_PREFERENCE_OPTIONS)).toBe('Heterosexual');
  });

  it('returns the raw value when no mapping exists', () => {
    expect(getPreferenceLabel('unexpected-value', STATUS_PREFERENCE_OPTIONS)).toBe('unexpected-value');
  });
});
