# Module Import Error - "Cannot read property 'S' of undefined"

## Date
November 10, 2025

## Error
```
[runtime not ready]: TypeError: Cannot read property 'S' of undefined
[runtime not ready]: TypeError: Cannot read property 'default' of undefined
```

## Root Cause

**Metro bundler module resolution issue** with default exports in React Native.

The code was using:
```typescript
const curated: Airport[] = require('../data/openflightsFallback').default;
```

But React Native's Metro bundler sometimes doesn't expose `.default` property directly on required modules, causing runtime errors.

## The Fix

Changed to defensive import pattern:
```typescript
const curatedModule = require('../data/openflightsFallback');
const curated: Airport[] = curatedModule.default || curatedModule;
```

This handles both:
- ES6 default exports: `curatedModule.default`
- CommonJS exports: `curatedModule` directly

## Files Modified

`src/services/ReactNativeAirportService.ts`:
- Line ~255: Fixed curated airport loading
- Line ~280: Fixed fallback airport loading

## Related Issues

This is a DIFFERENT error from the previous JSI boolean type error. The sequence was:

1. ✅ JSI boolean type error → Fixed with Pod reinstall
2. ❌ NEW ERROR: Module import error → Fixed with defensive imports

## Testing

After fix, run:
```bash
npx expo start --clear
```

App should now start without "Cannot read property" errors.
