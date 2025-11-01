/**
 * Mock for expo-linear-gradient
 */
import React from 'react';

export const LinearGradient = ({ children, ...props }) => {
  return React.createElement('View', props, children);
};

export default LinearGradient;
