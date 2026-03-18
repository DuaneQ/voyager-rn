type PreferenceOption = {
  label: string;
  value: string;
};

const normalize = (value: string): string => value.trim().toLowerCase();

export const STATUS_PREFERENCE_OPTIONS: ReadonlyArray<PreferenceOption> = [
  { label: 'Single', value: 'single' },
  { label: 'Couple', value: 'couple' },
  { label: 'Group', value: 'group' },
  { label: 'No Preference', value: 'No Preference' },
];

export const ORIENTATION_PREFERENCE_OPTIONS: ReadonlyArray<PreferenceOption> = [
  { label: 'Heterosexual', value: 'heterosexual' },
  { label: 'Homosexual', value: 'homosexual' },
  { label: 'Bisexual', value: 'bisexual' },
  { label: 'Asexual', value: 'asexual' },
  { label: 'Pansexual', value: 'pansexual' },
  { label: 'Queer', value: 'queer' },
  { label: 'Questioning', value: 'questioning' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer not to say' },
  { label: 'Transgender Woman', value: 'transgender woman' },
  { label: 'Transgender Man', value: 'transgender man' },
  { label: 'No Preference', value: 'No Preference' },
];

export const getPreferenceLabel = (
  value: string,
  options: ReadonlyArray<PreferenceOption>
): string => {
  const direct = options.find((option) => option.value === value);
  if (direct) return direct.label;

  const normalizedValue = normalize(value);
  const normalizedMatch = options.find(
    (option) => normalize(option.value) === normalizedValue || normalize(option.label) === normalizedValue
  );

  return normalizedMatch?.label ?? value;
};
