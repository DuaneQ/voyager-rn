import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Modal, TextInput, TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function Composite() {
  const [open, setOpen] = React.useState(true);
  const [val, setVal] = React.useState('');
  return (
    <Modal visible={open} onRequestClose={() => setOpen(false)}>
      <View>
        <Ionicons name="share-outline" size={24} color="#000" />
        <Text>Composite Test</Text>
        <TextInput value={val} onChangeText={setVal} />
        <TouchableOpacity testID="close" onPress={() => setOpen(false)}>
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

test('composite modal smoke with RNTL', () => {
  const { getByText, getByTestId } = render(<Composite />);
  expect(getByText('Composite Test')).toBeTruthy();
  fireEvent.press(getByTestId('close'));
});
