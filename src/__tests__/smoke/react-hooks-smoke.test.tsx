import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

function Simple() {
  const [s] = React.useState(1);
  return <Text>{`state:${s}`}</Text>;
}

test('smoke: react hooks work with testing library', () => {
  const { getByText } = render(<Simple />);
  expect(getByText('state:1')).toBeTruthy();
});
