# Contact Discovery - UI Design Guide

## 🎨 Design Inspiration

**Reference Platforms**: LinkedIn "Find People You Know" + TikTok "Find Contacts"  
**Design Philosophy**: Minimal, intuitive, non-intrusive

---

## 📍 Placement: Profile Page Header

### Why Profile Page?
- **Discoverability**: Users already on Profile page to manage their presence
- **Contextual**: Natural place for network-building features
- **Non-intrusive**: Doesn't disrupt main travel discovery flow

---

## 🔨 Component Placement

### Profile Page Header Structure

```
┌─────────────────────────────────────┐
│  Profile Page                       │
├─────────────────────────────────────┤
│  [Profile Photo]  John Smith        │
│                   @johnsmith         │
│                                      │
│  ┌──────────────────────────────┐  │ ← NEW: Contact Discovery CTA
│  │ 👥 Find Friends on TravalPass │  │
│  │ Discover contacts using app   │  │
│  │                [Find Friends] │  │
│  └──────────────────────────────┘  │
│                                      │
│  📍 Location  🎂 Age  ✈️ Trips      │
│  ─────────────────────────────────  │
│  Bio...                             │
└─────────────────────────────────────┘
```

**Position**: Between profile info and stats/bio section

---

## 📐 Design Specifications

### Contact Discovery Banner (Collapsed State)

```typescript
// Visual mockup
┌─────────────────────────────────────────────┐
│ 👥  Find friends already using TravalPass   │
│                                  [Discover] │
└─────────────────────────────────────────────┘
```

**Specs**:
- Height: 60px
- Padding: 12px horizontal, 16px vertical
- Background: Linear gradient (#E3F2FD → #BBDEFB) - Soft blue
- Border radius: 12px
- Shadow: 0px 2px 4px rgba(0,0,0,0.1)
- Icon: 👥 (People emoji) or custom icon 24x24px
- Text: 15px, medium weight, #1976D2 (primary blue)
- Button: "Discover" - 14px, semibold, white text on #1976D2 background

### Contact Discovery Banner (With Count)

```typescript
// When contacts are found
┌─────────────────────────────────────────────┐
│ 👥  5 of your contacts are on TravalPass    │
│                                [View Them] │
└─────────────────────────────────────────────┘
```

**Dynamic States**:
- Before sync: "Find friends already using TravalPass"
- After sync (0 matches): "Invite friends to TravalPass"
- After sync (1-5 matches): "X of your contacts are on TravalPass"
- After sync (5+ matches): "X+ friends found on TravalPass!"

---

## 🎭 User Flow & Screens

### Flow: Profile → Permission → Discovery

```
Profile Page (Banner)
     ↓ [TAP "Discover"]
Permission Modal
     ↓ [TAP "Allow Access"]
OS Permission Dialog
     ↓ [GRANT]
Loading Screen (Syncing...)
     ↓
Discovery Results Screen
```

---

## 1️⃣ Permission Modal Design

**Inspired by**: LinkedIn permission prompt (simple, trustworthy)

```
╔═══════════════════════════════════════╗
║                                       ║
║         👥                            ║
║                                       ║
║   Find Friends on TravalPass          ║
║                                       ║
║   Discover which of your contacts     ║
║   are already using TravalPass and    ║
║   invite friends to join you.         ║
║                                       ║
║   ✓ Your contacts stay private        ║
║   ✓ We never share your contacts      ║
║   ✓ You control who you invite        ║
║                                       ║
║   ┌─────────────────────────────┐    ║
║   │     Allow Contact Access     │    ║
║   └─────────────────────────────┘    ║
║                                       ║
║          [Not Now]                    ║
║                                       ║
╚═══════════════════════════════════════╝
```

**Specs**:
- Modal size: 90% width on mobile, 480px on web
- Padding: 24px
- Icon: 80x80px, centered
- Title: 24px, bold, #1a1a1a
- Description: 16px, regular, #666, line-height 24px
- Checkmarks: Green (#4CAF50), 14px
- Primary button: Full width, 48px height, #1976D2
- Secondary button: Text only, gray (#666)

---

## 2️⃣ Loading Screen Design

**Inspired by**: TikTok loading (animated, friendly)

```
╔═══════════════════════════════════════╗
║                                       ║
║         [Animated spinner]            ║
║              👥 → 👥                  ║
║                                       ║
║      Finding your friends...          ║
║                                       ║
║   Checking 127 contacts               ║
║                                       ║
╚═══════════════════════════════════════╝
```

**Specs**:
- Center screen
- Spinner: 48x48px, primary color
- Animated people icons (pulse effect)
- Progress text: 16px, #666
- Contact count: Real-time updates

---

## 3️⃣ Discovery Results Screen

**Layout**: Split into two sections (Matched / Invite)

```
╔═══════════════════════════════════════╗
║ ← Back          Friends Found         ║
╠═══════════════════════════════════════╣
║                                       ║
║  👥 On TravalPass (12)                ║
║  ─────────────────────────────────   ║
║  ┌─────────────────────────────────┐ ║
║  │ 👤  Sarah Johnson  [Connect]    │ ║
║  │     @sarahjay                    │ ║
║  └─────────────────────────────────┘ ║
║  ┌─────────────────────────────────┐ ║
║  │ 👤  Mike Chen      [Connect]    │ ║
║  │     @mikechen                    │ ║
║  └─────────────────────────────────┘ ║
║                                       ║
║  📨 Invite Friends (42)               ║
║  ─────────────────────────────────   ║
║  ┌─────────────────────────────────┐ ║
║  │ Alex Smith                       │ ║
║  │ alex.smith@email.com      [📧]  │ ║
║  └─────────────────────────────────┘ ║
║  ┌─────────────────────────────────┐ ║
║  │ Jamie Lee                        │ ║
║  │ +1 (555) 123-4567         [💬]  │ ║
║  └─────────────────────────────────┘ ║
║                                       ║
║  [ Invite All Friends ]               ║
║                                       ║
╚═══════════════════════════════════════╝
```

### Matched Contacts Card

```typescript
// Component structure
┌─────────────────────────────────────┐
│ [Photo 40x40]  Name           [Btn] │
│                @username             │
│                2 mutual friends      │
└─────────────────────────────────────┘
```

**Specs**:
- Card padding: 12px
- Photo: 40x40px, circular, border 2px #E0E0E0
- Name: 16px, semibold, #1a1a1a
- Username: 14px, regular, #666
- Mutual friends: 12px, regular, #999
- Button: "Connect" - 32px height, #1976D2, white text

### Invite Contact Card

```typescript
// Component structure
┌─────────────────────────────────────┐
│ 📧  Name                      [Btn] │
│     email@example.com               │
└─────────────────────────────────────┘
```

**Specs**:
- Icon: 📧 for email, 💬 for phone, 🔗 for generic
- Name: 15px, medium, #1a1a1a
- Contact info: 13px, regular, #666
- Button: Icon only (Send), 32x32px, tap highlight

---

## 🎨 Color Palette

```typescript
const colors = {
  primary: '#1976D2',           // Primary blue (matches LinkedIn)
  primaryLight: '#E3F2FD',      // Light blue background
  success: '#4CAF50',           // Green (checkmarks)
  text: {
    primary: '#1a1a1a',         // Dark text
    secondary: '#666666',       // Gray text
    tertiary: '#999999',        // Light gray text
  },
  border: '#E0E0E0',            // Light gray borders
  background: '#F5F5F5',        // Off-white background
  white: '#FFFFFF',
};
```

---

## 🎭 Interaction States

### Banner States

1. **Default** (Not synced yet)
   ```
   Background: #E3F2FD
   Button: "Discover"
   ```

2. **Synced - No Matches**
   ```
   Background: #FFF3E0 (orange tint)
   Text: "Invite friends to TravalPass"
   Button: "Invite"
   ```

3. **Synced - Matches Found**
   ```
   Background: #E8F5E9 (green tint)
   Text: "X friends found on TravalPass!"
   Button: "View Them"
   Badge: Number in circle (e.g., "5")
   ```

4. **Pressed/Hover**
   ```
   Background: Darken 5%
   Button: Scale 0.98x
   Cursor: pointer
   ```

### Button States

```typescript
// Connect Button
Default:   background: #1976D2, text: white
Hover:     background: #1565C0 (darker)
Pressed:   background: #0D47A1 (darkest)
Disabled:  background: #E0E0E0, text: #999
Loading:   Show spinner, text: "Connecting..."

// Invite Button (Icon)
Default:   color: #1976D2, background: transparent
Hover:     background: #E3F2FD (light blue)
Pressed:   background: #BBDEFB
Invited:   color: #4CAF50, icon: ✓, disabled: true
```

---

## 📱 Responsive Design

### Mobile (< 768px)

- Banner: Full width, 12px margin
- Cards: Full width list, 8px spacing
- Buttons: Full width on cards
- Modal: 90% width, bottom sheet style

### Tablet (768px - 1024px)

- Banner: Full width with 16px margin
- Cards: 2-column grid
- Buttons: Inline on cards
- Modal: 600px width, centered

### Desktop (> 1024px)

- Banner: Max width 800px, centered
- Cards: 3-column grid
- Hover effects enabled
- Modal: 480px width, centered

---

## ♿ Accessibility

### Requirements

- **Tap targets**: Minimum 44x44px (following iOS/Android guidelines)
- **Color contrast**: WCAG AA compliant (4.5:1 for text)
- **Screen readers**: 
  - Banner: "Find friends button, double tap to discover contacts"
  - Cards: "Connect with [Name], username [username], double tap to send connection request"
- **Focus indicators**: 2px blue outline on keyboard navigation
- **Reduced motion**: Respect `prefers-reduced-motion` for animations

---

## 🎬 Animations

### Banner Entry (On Profile Load)

```typescript
// Fade in + slide up
{
  from: { opacity: 0, translateY: 20 },
  to: { opacity: 1, translateY: 0 },
  duration: 400,
  easing: 'ease-out'
}
```

### Badge Pulse (When Matches Found)

```typescript
// Scale pulse animation
{
  0%: { scale: 1 },
  50%: { scale: 1.1 },
  100%: { scale: 1 },
  duration: 600,
  repeat: 3
}
```

### Card List Stagger (Discovery Results)

```typescript
// Cards fade in one by one
cards.forEach((card, index) => {
  delay: index * 100,
  from: { opacity: 0, translateX: -20 },
  to: { opacity: 1, translateX: 0 },
  duration: 300
});
```

---

## 💬 Empty States

### No Permission

```
╔═══════════════════════════════════════╗
║           🔒                          ║
║                                       ║
║   Contact Access Not Allowed          ║
║                                       ║
║   You can still search for friends    ║
║   manually or invite via link.        ║
║                                       ║
║   [Search by Username]                ║
║   [Generate Invite Link]              ║
║                                       ║
╚═══════════════════════════════════════╝
```

### No Contacts on Platform

```
╔═══════════════════════════════════════╗
║           😔                          ║
║                                       ║
║   None of Your Contacts Are Here Yet  ║
║                                       ║
║   Be the first! Invite friends to     ║
║   join TravalPass and discover        ║
║   amazing travel opportunities.       ║
║                                       ║
║   [Invite 42 Friends]                 ║
║   [Share Invite Link]                 ║
║                                       ║
╚═══════════════════════════════════════╝
```

### No Contacts in Device

```
╔═══════════════════════════════════════╗
║           📱                          ║
║                                       ║
║   No Contacts Found                   ║
║                                       ║
║   Add contacts to your device to      ║
║   discover friends on TravalPass.     ║
║                                       ║
║   [Add Contacts to Device]            ║
║                                       ║
╚═══════════════════════════════════════╝
```

---

## 🔄 Loading States

### Skeleton Screens

**Discovery Results (While Loading)**

```
┌─────────────────────────────────────┐
│ ▮▮▮▮  ▮▮▮▮▮▮▮▮▮▮▮    [▮▮▮▮▮▮]    │ ← Shimmer effect
│       ▮▮▮▮▮▮▮                       │
├─────────────────────────────────────┤
│ ▮▮▮▮  ▮▮▮▮▮▮▮▮▮▮▮    [▮▮▮▮▮▮]    │
│       ▮▮▮▮▮▮▮                       │
└─────────────────────────────────────┘
```

**Implementation**:
- Use `react-native-shimmer-placeholder` or similar
- Gray background (#E0E0E0) with white shimmer
- Match card dimensions exactly

---

## 📏 Component Hierarchy

```
ProfilePage
└── ContactDiscoveryBanner (if not synced < 24h)
    ├── Icon (👥)
    ├── Text (dynamic message)
    └── Button (CTA)
    
ContactDiscoveryScreen
├── Header (with back button)
├── SectionList
│   ├── Section: "On TravalPass"
│   │   └── MatchedContactCard[]
│   └── Section: "Invite Friends"
│       └── InviteContactCard[]
└── Footer
    └── InviteAllButton (if >5 unmatched)
    
PermissionModal
├── Icon
├── Title
├── Description
├── PrivacyPoints[]
├── PrimaryButton ("Allow")
└── SecondaryButton ("Not Now")
```

---

## 🧪 Design Testing Checklist

- [ ] Banner fits in Profile page without disrupting layout
- [ ] Permission modal is clear and trustworthy
- [ ] Loading state shows progress
- [ ] Results screen handles 0, 1, 10, 100+ contacts
- [ ] Empty states are encouraging, not discouraging
- [ ] Buttons have clear labels and appropriate size
- [ ] Colors have sufficient contrast (WCAG AA)
- [ ] Animations don't cause motion sickness
- [ ] Works on smallest supported device (iPhone SE)
- [ ] Works on largest device (iPad Pro)
- [ ] Looks good in both light and dark mode (if applicable)

---

## 🎯 Key Design Principles

1. **Non-Intrusive**: Doesn't disrupt main travel discovery flow
2. **Trustworthy**: Clear privacy messaging, no dark patterns
3. **Rewarding**: Celebrate matches with positive feedback
4. **Simple**: Minimal steps from banner to results
5. **Cross-Platform**: Consistent experience on iOS, Android, Web

---

**Design Owner**: UX Team  
**Last Updated**: February 11, 2026  
**Status**: Ready for Implementation
