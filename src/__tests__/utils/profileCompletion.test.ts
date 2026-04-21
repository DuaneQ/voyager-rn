import { getProfileCompletion } from '../../utils/profileCompletion';
import { UserProfile } from '../../types/UserProfile';

describe('getProfileCompletion', () => {
  it('returns 0 completion and all fields missing for null profile', () => {
    const result = getProfileCompletion(null);
    expect(result.completion).toBe(0);
    expect(result.missingFields).toEqual([
      'date of birth',
      'gender',
      'username',
      'orientation',
      'relationship status',
      'bio',
      'profile photo',
    ]);
  });

  it('returns 0 completion for an empty profile', () => {
    const result = getProfileCompletion({} as UserProfile);
    expect(result.completion).toBe(0);
    expect(result.missingFields).toHaveLength(7);
  });

  it('treats empty-string values as missing', () => {
    const profile = { dob: '', gender: '', bio: '' } as UserProfile;
    const result = getProfileCompletion(profile);
    expect(result.completion).toBe(0);
    expect(result.missingFields).toContain('date of birth');
    expect(result.missingFields).toContain('gender');
    expect(result.missingFields).toContain('bio');
  });

  it('returns partial completion for partially filled profile', () => {
    const profile = {
      dob: '1998-05-15',
      gender: 'female',
      bio: '',
      username: 'traveler42',
    } as UserProfile;

    const result = getProfileCompletion(profile);
    // Weighted completion: dob (15) + gender (15) + username (15) = 45/100
    expect(result.completion).toBeCloseTo(0.45);
    expect(result.missingFields).toEqual(['orientation', 'relationship status', 'bio', 'profile photo']);
  });

  it('returns 1 completion for a fully filled profile', () => {
    const profile = {
      dob: '1995-01-01',
      gender: 'male',
      bio: 'Love to travel',
      username: 'globetrotter',
      sexualOrientation: 'straight',
      status: 'single',
      photoURL: 'https://example.com/profile.jpg',
    } as UserProfile;

    const result = getProfileCompletion(profile);
    expect(result.completion).toBe(1);
    expect(result.missingFields).toEqual([]);
  });

  it('treats undefined values as missing', () => {
    const profile = {
      dob: '2000-03-10',
      gender: undefined,
    } as unknown as UserProfile;

    const result = getProfileCompletion(profile);
    expect(result.missingFields).toContain('gender');
    expect(result.missingFields).not.toContain('date of birth');
  });
});
