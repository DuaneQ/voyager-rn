# Manual Testing Checklist - Web Landing Page

## Overview
This checklist covers manual testing for the web-only landing page feature in the React Native app.

## Prerequisites
- [ ] App is running on web: `npm run start:web`
- [ ] User is logged out (clear browser storage if needed)
- [ ] Test in multiple browsers: Chrome, Safari, Firefox

---

## ✅ Landing Page Display (Unauthenticated Web Users)

### Initial Load
- [ ] Landing page displays when accessing the web app while logged out
- [ ] Video background plays automatically (or shows with play button on mobile browsers)
- [ ] Page is responsive across different screen sizes (mobile, tablet, desktop)
- [ ] All text is readable with proper contrast against video background

### Hero Section
- [ ] Hero title displays: "Find Your Perfect Travel Companion"
- [ ] Hero subtitle is visible and readable
- [ ] "Get Started Free" button is visible and styled correctly
- [ ] "See How It Works" button is visible and styled correctly

### Navigation Actions
- [ ] Clicking "Get Started Free" navigates to Auth page
- [ ] Clicking "See How It Works" scrolls smoothly to the "how-it-works" section
- [ ] Clicking any "Sign Up" buttons navigates to Auth page
- [ ] Clicking "Already have an account? Sign In" navigates to Auth page

---

## ✅ Content Sections

### Problem → Solution Section
- [ ] Section has correct background color (light gray)
- [ ] Two-column layout displays correctly on desktop
- [ ] Stacked layout displays correctly on mobile
- [ ] Image loads from Unsplash
- [ ] "Create Your Free Travel Profile" button works

### Feature Highlights Section
- [ ] Four feature cards are visible
- [ ] Feature icons display correctly (✈️, 🧑‍🤝‍🧑, 🏨, 💬)
- [ ] Cards have proper spacing and shadows
- [ ] Layout adapts responsively (4 columns desktop, 2 tablet, 1 mobile)

### Demo Video Section
- [ ] YouTube iframe loads correctly
- [ ] Video player is centered and styled properly
- [ ] Video is playable (click play to test)
- [ ] Section has light gray background

### CTA Footer Section
- [ ] Section has blue background
- [ ] "Sign Up Now" button is visible and white
- [ ] "Already have an account? Sign In" link is visible
- [ ] Text is centered and readable

### Footer
- [ ] Copyright text is visible
- [ ] Footer has dark background
- [ ] Text is semi-transparent white

---

## ✅ Authenticated User Behavior

### Auto-Redirect
- [ ] Log in to the app
- [ ] Landing page should automatically redirect to MainApp (tabs)
- [ ] User should NOT see landing page when authenticated

### Logout Flow
- [ ] Log out from the app
- [ ] Should be redirected back to landing page (web only)
- [ ] Landing page should display correctly after logout

---

## ✅ Platform-Specific Behavior

### Web Platform
- [ ] Landing page displays for unauthenticated users
- [ ] Video background works properly
- [ ] YouTube iframe loads and plays
- [ ] All navigation works correctly
- [ ] Smooth scrolling works for "See How It Works" button

### iOS Platform (Should NOT display)
- [ ] Landing page does NOT render on iOS
- [ ] Unauthenticated users go directly to Auth page
- [ ] No console errors related to landing page

### Android Platform (Should NOT display)
- [ ] Landing page does NOT render on Android
- [ ] Unauthenticated users go directly to Auth page
- [ ] No console errors related to landing page

---

## ✅ Cross-Browser Testing (Web Only)

### Chrome/Chromium
- [ ] Landing page renders correctly
- [ ] Video autoplay works
- [ ] Smooth scrolling works
- [ ] All buttons and links work

### Safari
- [ ] Landing page renders correctly
- [ ] Video autoplay works (may require user interaction)
- [ ] Smooth scrolling works
- [ ] All buttons and links work

### Firefox
- [ ] Landing page renders correctly
- [ ] Video autoplay works
- [ ] Smooth scrolling works
- [ ] All buttons and links work

---

## ✅ Responsive Design Testing

### Desktop (1920x1080)
- [ ] Hero section takes full viewport height
- [ ] Two-column layouts display side-by-side
- [ ] Feature cards display in 4 columns
- [ ] Text sizes are appropriate
- [ ] Video background covers full screen

### Tablet (768x1024)
- [ ] Hero section adapts correctly
- [ ] Two-column sections stack or shrink appropriately
- [ ] Feature cards display in 2 columns
- [ ] Buttons are appropriately sized
- [ ] Text remains readable

### Mobile (375x667)
- [ ] Hero section displays vertically
- [ ] All sections stack vertically
- [ ] Feature cards display in 1 column
- [ ] Buttons are full-width or centered
- [ ] Video background still visible and doesn't cause horizontal scroll
- [ ] YouTube iframe fits within mobile viewport

---

## ✅ Performance & Accessibility

### Performance
- [ ] Page loads in under 3 seconds
- [ ] Video doesn't cause layout shifts
- [ ] No console errors
- [ ] No console warnings (except expected ones)
- [ ] Scrolling is smooth (no lag)

### Accessibility
- [ ] All buttons have proper labels
- [ ] Images have alt text
- [ ] YouTube iframe has proper title attribute
- [ ] Keyboard navigation works (tab through buttons)
- [ ] Focus states are visible on interactive elements
- [ ] Color contrast meets WCAG standards (text on background)

---

## ✅ Edge Cases

### Slow Network
- [ ] Page still usable while video is loading
- [ ] Text content displays immediately
- [ ] No layout breaks while assets load

### Video Load Failure
- [ ] Page still functional if video fails to load
- [ ] Fallback background color is visible
- [ ] No JavaScript errors

### Missing YouTube Video
- [ ] Page doesn't break if YouTube is blocked
- [ ] Other content remains accessible

### Very Small Screens (<375px)
- [ ] Content doesn't overflow horizontally
- [ ] All buttons remain clickable
- [ ] Text remains readable (may be small but not cut off)

---

## 🐛 Known Issues / Expected Behavior

1. **Video Autoplay**: Some browsers may block autoplay. This is expected browser behavior.
2. **iOS/Android**: Landing page intentionally does NOT render on mobile platforms.
3. **TypeScript Warnings**: Navigation type warnings are suppressed with `@ts-ignore` - this is intentional.

---

## 📝 Testing Notes

### Date Tested: _______________
### Tester: _______________
### Environment:
- Browser: _______________
- OS: _______________
- Screen Size: _______________

### Issues Found:
1. 
2. 
3. 

### Additional Comments:
