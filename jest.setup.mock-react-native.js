// This file is executed *before* tests run (setupFiles). We call jest.mock here
// to ensure the project-level react-native manual mock is installed before any
// module has a chance to import 'react-native'. Using setupFiles avoids module
// name mapping races that can cause hooks/renderer mismatches.

// The mock file is at the project root: __mocks__/react-native.js
// Use an absolute path literal in the factory so Babel/Jest doesn't complain
// about out-of-scope variables in the mock factory.
// Inline a focused react-native mock for setupFiles so the factory doesn't
// reference out-of-scope variables or create resolver recursion. Keep this
// small and focused on host components and APIs used by the modal tests.
jest.mock(
	'react-native',
	() => {
		const React = require('react');
		const createHostComponent = (name) => {
			const Comp = (props) => React.createElement(name, props, props.children);
			Comp.displayName = name;
			return Comp;
		};

		return {
			Platform: { OS: 'ios', select: (o) => (o && o.ios) || o || undefined },
			NativeModules: {},
			processColor: (c) => c,
			Dimensions: {
				get: (key) => {
					const base = { width: 360, height: 640, scale: 2, fontScale: 2 }; // generic phone metrics
					return { ...base };
				},
				addEventListener: jest.fn(),
				removeEventListener: jest.fn(),
			},
			StyleSheet: { create: (s) => s, flatten: (s) => s },
			View: createHostComponent('View'),
			Text: createHostComponent('Text'),
			TextInput: createHostComponent('TextInput'),
			TouchableWithoutFeedback: createHostComponent('TouchableWithoutFeedback'),
			Modal: ((props) => {
				const React = require('react');
				// Hide children when not visible to mimic React Native Modal behavior for tests
				const { visible, children, ...rest } = props || {};
				return React.createElement('Modal', rest, visible ? children : null);
			}),
			KeyboardAvoidingView: createHostComponent('KeyboardAvoidingView'),
			SafeAreaView: createHostComponent('SafeAreaView'),
			ActivityIndicator: createHostComponent('ActivityIndicator'),
			ScrollView: createHostComponent('ScrollView'),
			ImageBackground: createHostComponent('ImageBackground'),
			TouchableOpacity: ((props) => {
				const React = require('react');
				const p = { ...props };
				if (typeof p.accessible === 'undefined') p.accessible = true;
				// Derive accessibilityState.disabled from disabled prop when present,
				// mirroring how tests commonly assert disabled state.
				if (typeof p.disabled === 'boolean') {
					p.accessibilityState = { ...(p.accessibilityState || {}), disabled: p.disabled };
					// Wrap onPress so that it respects the disabled prop at call time
					const originalPress = p.onPress;
					p.onPress = function pressWrapper(...args) {
						if (p.disabled) return;
						if (typeof originalPress === 'function') return originalPress.apply(this, args);
					};
				}
				return React.createElement('TouchableOpacity', p, p.children);
			}),
			LayoutAnimation: {
				configureNext: jest.fn(),
				Presets: { easeInEaseOut: {} },
			},
			Pressable: ((props) => {
				const React = require('react');
				const p = { ...props };
				if (typeof p.accessible === 'undefined') p.accessible = true;
				if (typeof p.disabled === 'boolean') {
					p.accessibilityState = { ...(p.accessibilityState || {}), disabled: p.disabled };
				}
				return React.createElement('Pressable', p, p.children);
			}),
			Button: createHostComponent('Button'),
			Switch: ((props) => {
				const React = require('react');
				const p = { ...props };
				if (typeof p.accessible === 'undefined') p.accessible = true;
				if (typeof p.disabled === 'boolean') {
					p.accessibilityState = { ...(p.accessibilityState || {}), disabled: p.disabled };
				}
				return React.createElement('Switch', p);
			}),
			Image: createHostComponent('Image'),
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
			}),		SectionList: ((props) => {
			const React = require('react');
			const { sections = [], renderItem, renderSectionHeader, ListEmptyComponent, ...rest } = props || {};
			if (!sections || sections.length === 0) {
				const empty = typeof ListEmptyComponent === 'function'
					? React.createElement(ListEmptyComponent)
					: (ListEmptyComponent || null);
				return React.createElement('SectionList', rest, empty);
			}
			const children = [];
			sections.forEach((section) => {
				if (renderSectionHeader) {
					children.push(renderSectionHeader({ section }));
				}
				if (renderItem && section.data) {
					section.data.forEach((item, index) => {
						children.push(renderItem({ item, index, section }));
					});
				}
			});
			return React.createElement('SectionList', rest, ...children);
		}),			Animated: {
				View: createHostComponent('AnimatedView'),
				Value: function Value(initial = 0) { return { _value: initial, setValue(v){ this._value = v; }, addListener(){}, removeListener(){} }; },
				add: (...args) => ({ __animated: 'add', args }),
				subtract: (...args) => ({ __animated: 'sub', args }),
			},
			PanResponder: {
				create: (config) => ({ panHandlers: { ...(config || {}) } }),
			},
			UIManager: { getViewManagerConfig: () => ({}) },
			Share: { share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })) },
			Clipboard: { setString: jest.fn(() => {}), getString: jest.fn(() => Promise.resolve('')) },		Linking: {
			canOpenURL: jest.fn(() => Promise.resolve(true)),
			openURL: jest.fn(() => Promise.resolve(true)),
			getInitialURL: jest.fn(() => Promise.resolve(null)),
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
		},			Alert: { alert: jest.fn(() => {}) },
		};
	},
	{ virtual: true }
);

// Export nil — setup file doesn't need to export the mock object itself.
module.exports = {};
