import React from 'react';
import { render } from '@testing-library/react-native';
import { PersonalInfoAccordion } from '../../../components/profile/PersonalInfoAccordion';

// Mock ProfileAccordion
jest.mock('../../../components/profile/ProfileAccordion', () => ({
  ProfileAccordion: ({ children, title }: any) => (
    <>{children}</>
  )
}));

describe('PersonalInfoAccordion', () => {
  it('should render with all values provided', () => {
    const { getByText } = render(
      <PersonalInfoAccordion
        age={25}
        gender="Male"
        status="Single"
        orientation="Straight"
      />
    );

    expect(getByText('25')).toBeTruthy();
    expect(getByText('Male')).toBeTruthy();
    expect(getByText('Single')).toBeTruthy();
    expect(getByText('Straight')).toBeTruthy();
  });

  it('should display "Not specified" for missing age', () => {
    const { getByText } = render(
      <PersonalInfoAccordion
        gender="Female"
        status="Single"
        orientation="Straight"
      />
    );

    const notSpecifiedTexts = getByText('Not specified');
    expect(notSpecifiedTexts).toBeTruthy();
  });

  it('should display "Not specified" for all missing values', () => {
    const { getAllByText } = render(
      <PersonalInfoAccordion />
    );

    const notSpecifiedTexts = getAllByText('Not specified');
    expect(notSpecifiedTexts).toHaveLength(4);
  });

  it('should format age as number', () => {
    const { getByText } = render(
      <PersonalInfoAccordion age={30} />
    );

    expect(getByText('30')).toBeTruthy();
  });

  it('should render all labels', () => {
    const { getByText } = render(
      <PersonalInfoAccordion />
    );

    expect(getByText('Age')).toBeTruthy();
    expect(getByText('Gender')).toBeTruthy();
    expect(getByText('Status')).toBeTruthy();
    expect(getByText('Orientation')).toBeTruthy();
  });
});
