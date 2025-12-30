# App Store Screenshot Capture Guide

## Quick Start - Capture Screenshots Now

### Step 1: Launch Correct Simulator

```bash
# List available simulators
xcrun simctl list devices available

# Launch iPhone 15 Pro Max (6.7" - 1290x2796)
open -a Simulator --args -CurrentDeviceUDID $(xcrun simctl list devices | grep "iPhone 15 Pro Max" | grep -v "unavailable" | head -1 | grep -oE '\(([A-Z0-9-]+)\)' | tr -d '()')

# OR launch iPhone 14 Pro Max (6.5" - 1242x2688)
open -a Simulator --args -CurrentDeviceUDID $(xcrun simctl list devices | grep "iPhone 14 Pro Max" | grep -v "unavailable" | head -1 | grep -oE '\(([A-Z0-9-]+)\)' | tr -d '()')
```

### Step 2: Start Your App

```bash
# If not already running
npx expo run:ios --configuration Release
```

### Step 3: Navigate and Capture

**Use `Cmd + S` to save screenshot in current directory**

Or use: **File → Save Screen** in Simulator menu

### Required Screenshots (3-10 total)

| # | Screen | What to Show | Navigation |
|---|--------|-------------|------------|
| 1 | **Welcome/Login** | Clean login screen | Launch app |
| 2 | **Search/Browse** | Travel itineraries list | Tap Search tab |
| 3 | **Itinerary Detail** | Single trip with details | Tap an itinerary |
| 4 | **Profile** | User profile view | Tap Profile tab |
| 5 | **Chat** | Conversation interface | Tap Matches → Chat |
| 6 | **Video Feed** | Video content | Tap Videos tab |
| 7 | **Match** | Match confirmation/list | Tap Matches tab |

### Step 4: Verify Screenshot Sizes

```bash
# Check screenshot dimensions
file Screenshot*.png
# OR
sips -g pixelWidth -g pixelHeight Screenshot*.png
```

**Required dimensions:**
- iPhone 15 Pro Max: **1290 × 2796** pixels
- iPhone 14 Pro Max: **1242 × 2688** pixels

### Step 5: Rename Screenshots

```bash
# Rename for clarity
mv "Screenshot 2024-..." "01-login.png"
mv "Screenshot 2024-..." "02-search.png"
mv "Screenshot 2024-..." "03-itinerary.png"
# etc.
```

## Screenshot Content Tips

### DO:
✅ Show actual app functionality
✅ Use light mode (better visibility)
✅ Show populated data (not empty states)
✅ Show compelling content
✅ Keep status bar clean (full battery, good signal)
✅ Use demo account with good data

### DON'T:
❌ Show error messages
❌ Show loading states
❌ Include personal/sensitive info
❌ Use placeholder "Lorem ipsum" text
❌ Show empty/incomplete screens

## Creating Polished Screenshots (Optional)

### Option 1: Use Screenshot Tools
- [App Store Screenshot Generator](https://www.appscreenshots.com/)
- [Previewed](https://previewed.app/)
- Add device frames, backgrounds, text overlays

### Option 2: Manual Editing (Photoshop/Figma)
- Add device frame mockup
- Add descriptive text above screenshots
- Create consistent branding
- Export at exact required sizes

## Upload to App Store Connect

1. Go to App Store Connect → Your App → 1.0 Prepare for Submission
2. Scroll to "Previews and Screenshots"
3. Select device type (iPhone 6.5" or 6.7")
4. Drag and drop screenshots (they'll appear in order)
5. Rearrange by dragging if needed
6. First 3 screenshots appear on installation page

## Quick Commands

```bash
# Open screenshots directory
open ~/Desktop

# Launch simulator and app in one command
npx expo run:ios --configuration Release

# Check if simulator is running
ps aux | grep Simulator

# Take screenshot from command line (saves to Desktop)
xcrun simctl io booted screenshot ~/Desktop/screenshot-$(date +%s).png
```

## Troubleshooting

**Wrong size screenshots:**
- Check simulator device (must be iPhone 14 Pro Max or 15 Pro Max)
- Don't use iPhone 14 or 15 (regular) - wrong dimensions
- Verify with `sips -g pixelWidth -g pixelHeight filename.png`

**Simulator not responding:**
- Restart simulator
- Clean build: `npx expo run:ios --configuration Release --no-build-cache`

**Status bar looks bad:**
- Set time to 9:41 (Apple's standard)
- Set battery to 100%
- In Simulator menu: Features → Toggle Status Bar items

---

## Current Required Sizes from App Store Connect

According to your upload page:
- **1242 × 2688px** (iPhone 14 Pro Max, 6.5")
- **2688 × 1242px** (Landscape - if supported)
- **1284 × 2778px** (iPhone 15 Pro Max, 6.7")
- **2778 × 1284px** (Landscape - if supported)

**Start with portrait mode (first dimensions) for all screenshots.**
