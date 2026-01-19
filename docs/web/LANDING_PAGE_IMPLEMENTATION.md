# Landing Page Implementation - React Native Web

## Overview
Web-only landing page for TravalPass RN app, matching the PWA landing page functionality.

**Status**: ✅ Implemented (video background issue pending)

## Implementation Details

### File Location
- **Component**: `src/pages/LandingPage.web.tsx`
- **Platform**: Web only (not rendered on iOS/Android)

### Key Features Implemented

#### ✅ Platform-Specific Rendering
```typescript
if (Platform.OS !== 'web') {
  return null;
}
```
- Component only renders on web platform
- Mobile users skip directly to Auth page

#### ✅ Authentication Redirect
```typescript
useEffect(() => {
  if (user) {
    navigation.navigate('MainApp');
  }
}, [user, navigation]);
```
- Authenticated users automatically redirected to main app
- Unauthenticated users see landing page

#### ✅ URL Routing
- **Configuration**: `src/navigation/AppNavigator.tsx`
- **Routes**:
  - `/` → Landing Page (web only, unauthenticated)
  - `/auth` → Auth Page
  - `/app/*` → Main App screens

#### ✅ Page Sections
1. **Hero Section** - Main headline, subtitle, CTA buttons
2. **How It Works** - Feature explanation
3. **Features Grid** - 6 key features with icons
4. **Video Demo Section** - YouTube embed
5. **Benefits Section** - Value propositions
6. **FAQ Section** - 8 common questions
7. **Final CTA** - Sign up prompt
8. **Footer** - Copyright info

#### ✅ Interactive Elements
- **Get Started Button** → Navigates to `/auth`
- **Sign In Link** → Navigates to `/auth`
- **See How It Works Button** → Smooth scroll to section
- **FAQ Accordions** → Expand/collapse functionality

#### ✅ Responsive Design
- **Breakpoints**: 768px (tablet), 1024px (desktop)
- **Layout**: Flexbox-based, adapts to screen width
- **Typography**: Dynamic font sizes based on viewport
- **Spacing**: Responsive padding and margins

#### ✅ Web-Specific Scrolling
```typescript
<div style={{ height: '100vh', overflow: 'auto', position: 'relative' }}>
  <ScrollView>{/* content */}</ScrollView>
</div>
```
- Wrapper div enables proper web scrolling
- ScrollView works correctly on web
- Smooth scroll for section navigation

## Known Issues

### ❌ Video Background Not Displaying
**Problem**: Video element renders as black screen despite successful playback logs

**Attempted Solutions**:
1. ❌ Native `<video>` JSX element - Black screen (RN Web doesn't render native HTML properly)
2. ❌ `dangerouslySetInnerHTML` - Still processed by RN Web, black screen
3. ❌ Direct DOM manipulation via `document.createElement()` - Video plays but not visible
4. ❌ Video ref with manual `play()` calls - Playback works, not visible

**Current Behavior**:
- Console logs show video loading and playing successfully
- Video element exists in DOM
- Visual rendering is black screen

**Root Cause**: React Native Web's rendering pipeline interferes with native HTML video element visibility

**Next Steps to Try**:
1. Use `react-native-web-webview` to embed video as iframe
2. Use CSS background with video as data URL
3. Create separate pure HTML landing page outside RN
4. Use animated GIF or image sequence as fallback
5. Check if video codec/format is issue

## File Structure

```
src/pages/
  LandingPage.web.tsx          # Main component (web-only)

src/navigation/
  AppNavigator.tsx             # Updated with linking config

public/
  TravalPass.mp4               # Video asset (3.3MB)
  README.md                    # Public assets docs
```

## Dependencies

### Existing
- `react-native` - Core components (View, Text, ScrollView, etc.)
- `@react-navigation/native` - Navigation hooks
- `react-dom` - Portal/DOM manipulation (imported but not solving issue)

### No Additional Dependencies Required
- Pure React Native Web components
- Native web APIs for video (attempted)

## Testing Status

### ✅ Verified
- TypeScript compilation: No errors
- Navigation tests: 20/20 passing
- Platform detection works correctly
- Authentication redirect works
- Button navigation works
- URL routing updates correctly
- Scrolling works on web
- All text content renders
- Images load correctly
- YouTube embed works

### ⏳ Pending Verification
- Video background display (waiting for solution)
- Browser compatibility (Chrome tested only)
- Mobile web responsive behavior
- SEO meta tags (need expo-head integration)
- Performance on slow connections

## Usage

### For Developers

**Viewing the Landing Page**:
1. Start dev server: `npm start`
2. Press `w` to open web
3. Go to `http://localhost:8081` (unauthenticated)

**Skipping Landing Page** (for development):
- Sign in → Landing page won't show
- Change `showLandingPage` logic in `AppNavigator.tsx`

### For Users

**Web Users**:
- Visit root URL `/`
- See landing page if not logged in
- Click "Get Started" or "Sign In" to authenticate
- Auto-redirect to app after login

**Mobile Users** (iOS/Android):
- Landing page never renders
- Direct to Auth page if not logged in
- Native app experience only

## Code Patterns

### Web-Only Component Pattern
```typescript
export const LandingPage: React.FC = () => {
  // Early return for non-web platforms
  if (Platform.OS !== 'web') {
    return null;
  }
  
  // Web-specific implementation
  return <View>...</View>;
};
```

### Web Wrapper Pattern
```typescript
// On web, wrap in div for proper scrolling
if (Platform.OS === 'web') {
  return (
    <div style={{ height: '100vh', overflow: 'auto' }}>
      {scrollViewContent}
    </div>
  );
}

return scrollViewContent;
```

### Smooth Scroll Pattern
```typescript
const scrollToSection = (sectionId: string) => {
  if (typeof document !== 'undefined') {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  }
};
```

## Performance Considerations

- **Bundle Size**: ~600 lines, no heavy dependencies
- **Video Asset**: 3.3MB (separate HTTP request)
- **Images**: Loaded on demand
- **YouTube Embed**: Lazy-loaded iframe
- **Scroll Performance**: Native web scrolling, smooth

## Accessibility

### Implemented
- ✅ Semantic heading hierarchy (h1, h2)
- ✅ `accessibilityLabel` on buttons
- ✅ Keyboard navigation support
- ✅ Touch target sizes (48x48+ for buttons)

### TODO
- ⏳ ARIA labels for FAQ accordions
- ⏳ Focus management for modals
- ⏳ Screen reader testing
- ⏳ Keyboard shortcuts documentation

## Browser Compatibility

**Tested**:
- ✅ Chrome (latest)

**Should Work** (not tested):
- Safari (latest)
- Firefox (latest)
- Edge (latest)

**Known Issues**:
- Video autoplay may be blocked by browser policies
- Some browsers require user interaction for autoplay

## Next Steps

### High Priority
1. **Fix video background display**
   - Research React Native Web video rendering solutions
   - Consider alternative approaches (iframe, WebView, fallback image)
   - Test cross-browser compatibility

2. **Add SEO meta tags**
   - Install `expo-head` or equivalent
   - Add title, description, og tags
   - Add structured data for search engines

3. **Test on real devices**
   - Mobile web browsers (Safari iOS, Chrome Android)
   - Tablet browsers
   - Desktop browsers (Safari, Firefox, Edge)

### Medium Priority
4. **Performance optimization**
   - Lazy load images below fold
   - Optimize video file size/format
   - Add loading states
   - Implement code splitting

5. **Analytics integration**
   - Track button clicks
   - Measure scroll depth
   - Monitor conversion rates

### Low Priority
6. **A/B testing setup**
   - Test different headlines
   - Test CTA button placement
   - Test color schemes

7. **Animations**
   - Fade-in on scroll
   - Parallax effects
   - Button hover states

## Related Files

- `src/navigation/AppNavigator.tsx` - Navigation config with landing page routing
- `app.json` - Web bundler configuration
- `.github/copilot-instructions.md` - Updated with testing requirements
- `public/TravalPass.mp4` - Video asset

## Git History

- Initial implementation: Landing page component created
- Navigation integration: URL routing added
- Video attempts: Multiple approaches to fix black screen (ongoing)
- Documentation: This file created

---

**Last Updated**: January 18, 2026  
**Status**: Partially complete (video issue pending)  
**Assignee**: Development team
