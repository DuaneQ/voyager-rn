const React = require('react');

// Minimal mock of react-native-svg components used in tests. Render as simple
// React elements so tests can import and snapshot without requiring native bindings.
const Svg = ({ children, ...props }) => React.createElement('svg', props, children);
const Path = ({ children, ...props }) => React.createElement('path', props, children);
const G = ({ children, ...props }) => React.createElement('g', props, children);
const Circle = ({ children, ...props }) => React.createElement('circle', props, children);
const Rect = ({ children, ...props }) => React.createElement('rect', props, children);

module.exports = {
  __esModule: true,
  default: Svg,
  Svg,
  Path,
  G,
  Circle,
  Rect,
};
