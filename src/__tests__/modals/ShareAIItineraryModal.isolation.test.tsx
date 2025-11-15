/**
 * Isolation tester: try requiring ShareAIItineraryModal with various top-level
 * imports mocked to locate which import triggers hooks/react initialization
 * failures.
 */
describe('ShareAIItineraryModal import isolation', () => {
  const target = '../../components/modals/ShareAIItineraryModal';

  const mockVectorIcons = () => {
    jest.mock('@expo/vector-icons', () => {
      const React = require('react');
      const IconStub = ({ children }) => React.createElement('span', null, children);
      return { Ionicons: IconStub, default: { Ionicons: IconStub } };
    }, { virtual: true });
  };

  const mockAIGenerated = () => {
    jest.mock('../../hooks/useAIGeneratedItineraries', () => ({
      __esModule: true,
      AIGeneratedItinerary: {},
      useAIGeneratedItineraries: () => ({ itineraries: [] }),
    }), { virtual: true });
  };

  const requireTarget = () => {
    jest.resetModules();
    return jest.isolateModules(() => {
      // require the component; if it throws, the test will catch it below
      // eslint-disable-next-line global-require
      const mod = require(target);
      return mod;
    });
  };

  test('baseline: require without extra mocks', () => {
    expect(() => requireTarget()).not.toThrow();
  });

  test('mock vector-icons', () => {
    mockVectorIcons();
    expect(() => requireTarget()).not.toThrow();
  });

  test('mock ai hook import', () => {
    mockAIGenerated();
    expect(() => requireTarget()).not.toThrow();
  });

  test('mock both', () => {
    mockVectorIcons();
    mockAIGenerated();
    expect(() => requireTarget()).not.toThrow();
  });
});
