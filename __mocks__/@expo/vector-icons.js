/**
 * Mock for @expo/vector-icons
 * Provides simple Text component mock for icons in tests
 */

import React from 'react';
import { Text } from 'react-native';

const createIconSetMock = (name) => {
  return (props) => React.createElement(Text, { ...props, testID: props.name || 'icon' }, name);
};

export const Ionicons = createIconSetMock('Ionicons');
export const MaterialIcons = createIconSetMock('MaterialIcons');
export const MaterialCommunityIcons = createIconSetMock('MaterialCommunityIcons');
export const FontAwesome = createIconSetMock('FontAwesome');
export const FontAwesome5 = createIconSetMock('FontAwesome5');
export const AntDesign = createIconSetMock('AntDesign');
export const Entypo = createIconSetMock('Entypo');
export const EvilIcons = createIconSetMock('EvilIcons');
export const Feather = createIconSetMock('Feather');
export const Fontisto = createIconSetMock('Fontisto');
export const Foundation = createIconSetMock('Foundation');
export const Octicons = createIconSetMock('Octicons');
export const SimpleLineIcons = createIconSetMock('SimpleLineIcons');
export const Zocial = createIconSetMock('Zocial');

export default {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome,
  FontAwesome5,
  AntDesign,
  Entypo,
  EvilIcons,
  Feather,
  Fontisto,
  Foundation,
  Octicons,
  SimpleLineIcons,
  Zocial,
};
