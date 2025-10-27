Step 1 – Purpose of the Profile Tab

The Profile tab serves as a quick, trust-building snapshot of the traveler:

Summarize social credibility (Connections + Trips + Ratings)

Let users review core personal / lifestyle / preference info without editing elsewhere

Keep the layout lightweight, readable, and expandable for small screens

🧱 Step 2 – Recommended Information Hierarchy
1️⃣ Stats Row (Always Visible)
Metric	Description	Example
Connections	Count of confirmed travel matches / friends	“24 Connections”
Trips	Combined total of AI + manual itineraries	“8 Trips”
Rating	Average user rating (⭐ avg / count)	“4.7 ⭐ (58 reviews)”

Use equal-width columns; tapping each cell could later navigate to details.

2️⃣ Accordion Sections

Each accordion is collapsed by default and expands on tap.

▸ Personal Info

Age

Gender

Status (single / couple / group)

Orientation (optional — show only if user opts in)

▸ Lifestyle

Education

Drinking Habit

Smoking Habit

▸ Travel Preferences

Top 3 preference tags (e.g., “Adventure • Culture • Beach”)

Small “Edit Preferences” button

3️⃣ Sign-Out Action

Full-width red “Sign Out” button anchored at the bottom.

4️⃣ Optional Future Additions

Notification Toggle (once implemented) → fits naturally above Sign Out

Verification Status (“Email Verified ✅”) → inside Personal Info accordion

---------------------------------------------------------
| Connections |   Trips   |   Rating  |
|     24      |     8     |  ⭐4.7(58) |
---------------------------------------------------------
▾  Personal Info
   Age........................43
   Gender.....................Male
   Status.....................Couple
   Orientation................Heterosexual
---------------------------------------------------------
▾  Lifestyle
   Education..................Bachelor's Degree
   Drinking...................Occasionally
   Smoking....................Never
---------------------------------------------------------
▾  Travel Preferences
   Adventure  •  Beach  •  Culture
   [ Edit Travel Preferences ]
---------------------------------------------------------
[ Sign Out ]
---------------------------------------------------------

Step 4 – Design Rationale (Industry Standards)
App	Insight	Applied Here
Airbnb	Uses compact summary stats (Trips, Reviews, Rating)	Stats Row
Couchsurfing	Profile details hidden in collapsible cards	Accordions
LinkedIn Mobile	Prioritizes trust metrics over full bio	Top Stats
Tripadvisor Profiles	Star rating + review count visible first	Rating metric

This pattern fits small screens and gives a professional, credible impression without information overload.

⚙️ Step 5 – Prompt to Implement (Profile Tab Only)

Role:
You are a senior React Native + TypeScript engineer implementing only the Profile Tab section for the TravalPass mobile app.

Requirements:

White background, scrollable layout.

Stats Row component at the top with 3 metrics:

Connections, Trips, Rating (⭐ avg + count)

Evenly spaced; touchable areas ≥ 44 pt height.

Below stats, render three accordion components:

PersonalInfoAccordion → age, gender, status, orientation.

LifestyleAccordion → education, drinking, smoking.

TravelPreferencesAccordion → top 3 preferences + “Edit Preferences” button.

Accordions collapse/expand with smooth animation (react-native-collapsible or Reanimated Layout).

End with a Sign Out button in red at bottom.

All values read from UserProfileContext.

Provide placeholder values if null.

Shared styles in /styles/{colors,spacing,typography}.ts.

Components:

/components/profile/ProfileStats.tsx

/components/profile/ProfileAccordion.tsx (generic accordion wrapper)

/components/profile/ProfileTab.tsx (main tab layout)

Accessibility:

Each accordion labeled with accessibilityRole="button".

Text contrast ≥ 4.5:1.

Tests:

Render ProfileTab with mock data → verify collapsed/expanded states.

Validate Sign Out button triggers auth.signOut().

Design Guidelines:

Flat card layout; soft divider lines (#e0e0e0).

Heading text 16 pt semibold; value 14 pt regular.

Primary accent color (brand blue) for active accordion indicator.

Keep overall height within safe viewport for scrolling.
