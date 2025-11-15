/**
 * Mock for lodash.debounce
 */

module.exports = function debounce(func, wait, options) {
  // Return a simple mock that just calls the function immediately
  return function(...args) {
    return func.apply(this, args);
  };
};