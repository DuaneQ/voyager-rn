// Higher-fidelity manual mock for react-native used by Jest.
// This mock intentionally avoids calling jest.requireActual('react-native')
// (which can attempt to access native TurboModules in the test env) and
// instead provides a safe React-based stub for host components and a
// mocked Share/Clipboard surface that tests can inspect.
const React = require('react');

const createHostComponent = (name) => {
  const Comp = (props) => React.createElement(name, props, props.children);
  Comp.displayName = name;
  return Comp;
};

const Stub = {
  Platform: { OS: 'ios', select: (o) => (o && o.ios) || o || undefined },
  NativeModules: {},
  processColor: (c) => c,
  StyleSheet: { 
    create: (s) => s,
    flatten: (style) => {
      if (!style) return {};
      if (!Array.isArray(style)) return style;
      return style.reduce((acc, s) => ({ ...acc, ...(s || {}) }), {});
    }
  },
  Dimensions: {
    get: (key) => {
      const base = { width: 360, height: 640, scale: 2, fontScale: 2 };
      return { ...base };
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  // Basic host components as React function components so RNTL recognizes them
  View: createHostComponent('View'),
  Text: createHostComponent('Text'),
  TextInput: createHostComponent('TextInput'),
  ScrollView: createHostComponent('ScrollView'),
  SafeAreaView: createHostComponent('SafeAreaView'),
  KeyboardAvoidingView: createHostComponent('KeyboardAvoidingView'),
  Image: createHostComponent('Image'),
  ImageBackground: createHostComponent('ImageBackground'),
  Modal: (props) => {
    const { visible, children, ...rest } = props || {};
    return React.createElement('Modal', rest, visible ? children : null);
  },
  ActivityIndicator: createHostComponent('ActivityIndicator'),
  TouchableOpacity: (props) => {
    const p = { ...props };
    if (typeof p.accessible === 'undefined') p.accessible = true;
    if (typeof p.disabled === 'boolean') {
      p.accessibilityState = { ...(p.accessibilityState || {}), disabled: p.disabled };
      // Wrap onPress to no-op when disabled (ensures fireEvent.press can't trigger handlers)
      const originalPress = p.onPress;
      p.onPress = function pressWrapper(...args) {
        if (p.disabled) return;
        if (typeof originalPress === 'function') return originalPress.apply(this, args);
      };
    }
    return React.createElement('TouchableOpacity', p, p.children);
  },
  TouchableWithoutFeedback: createHostComponent('TouchableWithoutFeedback'),
  Pressable: (props) => {
    const p = { ...props };
    if (typeof p.accessible === 'undefined') p.accessible = true;
    if (typeof p.disabled === 'boolean') {
      p.accessibilityState = { ...(p.accessibilityState || {}), disabled: p.disabled };
    }
    return React.createElement('Pressable', p, p.children);
  },
  Button: createHostComponent('Button'),
  FlatList: ((props) => {
    const React = require('react');
    const { data = [], renderItem, ListEmptyComponent, ...rest } = props || {};
    if (!data || data.length === 0) {
      const empty = typeof ListEmptyComponent === 'function'
        ? React.createElement(ListEmptyComponent)
        : (ListEmptyComponent || null);
      return React.createElement('FlatList', rest, empty);
    }
    const children = renderItem ? data.map((item, index) => renderItem({ item, index })) : null;
    return React.createElement('FlatList', rest, children);
  }),
  VirtualizedList: createHostComponent('VirtualizedList'),
  // minimal Animated wrapper
  Animated: {
    View: createHostComponent('AnimatedView'),
    Value: function Value(initial = 0) { return { _value: initial, setValue(v){ this._value = v; }, addListener(){}, removeListener(){} }; },
    add: (...args) => ({ __animated: 'add', args }),
    subtract: (...args) => ({ __animated: 'sub', args }),
  },
  PanResponder: {
    create: (config) => ({ panHandlers: { ...(config || {}) } }),
  },
  LayoutAnimation: {
    configureNext: jest.fn(),
    Presets: { easeInEaseOut: {} },
  },
  // small UIManager stub used by some RN internals
  UIManager: {
    getViewManagerConfig: () => ({}),
    RCTView: {},
  },
  // Share and Clipboard mocks used by tests
  Share: {
    share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
    dismissedAction: 'dismissedAction',
    sharedAction: 'sharedAction',
  },
  Clipboard: {
    setString: jest.fn(() => {}),
    getString: jest.fn(() => Promise.resolve('')),
  },
  Alert: {
    alert: jest.fn(() => {}),
  },
};

// Export the stub as both CommonJS and ES default/named exports
module.exports = Stub;
module.exports.default = Stub;
Object.keys(Stub).forEach((k) => { module.exports[k] = Stub[k]; });
// done
