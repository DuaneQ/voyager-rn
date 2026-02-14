import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface DateTimePickerProps {
  value: Date;
  mode?: 'date' | 'time' | 'datetime';
  onChange?: (event: any, date?: Date) => void;
  testID?: string;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({ 
  value, 
  mode = 'date', 
  onChange,
  testID 
}) => {
  const handleChange = () => {
    if (onChange) {
      const newDate = new Date(value);
      newDate.setDate(newDate.getDate() + 1);
      onChange({ type: 'set' }, newDate);
    }
  };

  return (
    <View testID={testID || 'date-time-picker'}>
      <Text>Mock DateTimePicker - {mode}</Text>
      <Text>Selected: {value.toISOString()}</Text>
      <TouchableOpacity onPress={handleChange} testID={`${testID || 'date-time-picker'}-button`}>
        <Text>Select Date</Text>
      </TouchableOpacity>
    </View>
  );
};

export default DateTimePicker;
