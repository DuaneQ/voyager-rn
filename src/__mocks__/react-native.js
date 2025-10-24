// Proxy mock: use the real 'react-native' package during tests when available.
// This file exists only to avoid accidental broad mocking; it forwards
// to the real module so React Native Testing Library can detect host
// components correctly.
try {
  module.exports = require('react-native');
} catch (e) {
  // If react-native is not resolvable in the test environment, export
  // a minimal shape to avoid crashes (very unlikely in this project).
  module.exports = {
    Platform: { OS: 'web', select: (o) => (o && o.web) || o || undefined },
    NativeModules: {},
    StyleSheet: { create: (s) => s },
    View: (props) => props.children || null,
    Text: (props) => props.children || null,
  };
}
