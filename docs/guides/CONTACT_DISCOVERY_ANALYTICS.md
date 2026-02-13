# Contact Discovery - Analytics & Viral Coefficient Tracking

## 📊 Overview

**Purpose**: Track invite acceptance rate to measure viral growth (K-factor)  
**Goal**: Understand which channels and users drive the most new signups  
**Privacy**: Analytics don't expose PII, only aggregated metrics

---

## 🎯 Key Metrics to Track

### 1. Viral Coefficient (K-Factor)

```
K = (Total Invites Sent × Conversion Rate)
```

**Example**:
- User sends 10 invites
- 2 contacts accept and sign up
- K = 0.2 for that user
- Average across all users = platform K-factor

**Platform Health**:
- K > 1.0 = Viral growth (exponential)
- K = 0.5 to 1.0 = Healthy engagement
- K < 0.5 = Low conversion, optimize messaging

---

### 2. Funnel Metrics

```
Contact Discovery Funnel:
1. Banner Viewed           → 100%
2. "Discover" Clicked      → X%    (CTR)
3. Permission Granted      → X%    (Permission Rate)
4. Contacts Synced         → X%    (Sync Success Rate)
5. Matches Viewed          → X%    (Match Discovery Rate)
6. Invites Sent            → X%    (Invite Engagement)
7. Invites Accepted        → X%    (Conversion Rate)
8. New User Signed Up      → X%    (True Conversion)
```

---

## 🗄️ Firestore Schema Updates

### Collection: `contactInvites`

**Updated schema** (add analytics fields):

```typescript
interface ContactInvite {
  // Existing fields
  id: string;                      // Auto-generated
  inviterUserId: string;           // Who sent the invite
  contactIdentifier: string;       // Hashed phone/email
  inviteMethod: 'sms' | 'email' | 'link' | 'share';
  invitedAt: Timestamp;            // When invite was sent
  
  // NEW: Tracking fields
  acceptedAt?: Timestamp;          // When they signed up
  acceptedByUserId?: string;       // New user ID (if they signed up)
  conversionTimeMinutes?: number;  // Time from invite to signup
  
  // Attribution
  inviteChannel: 'contact_discovery' | 'manual_share' | 'referral_link';
  
  // Status tracking
  status: 'sent' | 'opened' | 'accepted' | 'expired';
  openedAt?: Timestamp;            // If using trackable links
  expiredAt?: Timestamp;           // 30 days after invitedAt
}
```

### Collection: `userAnalytics`

**New collection** for per-user analytics:

```typescript
interface UserAnalytics {
  userId: string;
  
  // Contact Discovery Engagement
  contactDiscoveryEnabled: boolean;
  firstContactSyncAt?: Timestamp;
  lastContactSyncAt?: Timestamp;
  totalContactsSynced: number;
  totalMatchesFound: number;
  
  // Invite Activity
  totalInvitesSent: number;
  totalInvitesByChannel: {
    sms: number;
    email: number;
    link: number;
    share: number;
  };
  
  // Conversions
  totalInvitesAccepted: number;
  personalKFactor: number;            // Calculated: accepted / sent
  
  // Referrals (if they came from an invite)
  invitedBy?: string;                 // User ID who invited them
  inviteAcceptedAt?: Timestamp;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Collection: `platformAnalytics`

**Aggregated platform-wide metrics** (updated daily via Cloud Function):

```typescript
interface PlatformAnalytics {
  date: string;                      // YYYY-MM-DD
  
  // Contact Discovery
  totalUsersWithContactAccess: number;
  totalContactsSynced: number;
  totalMatchesFound: number;
  
  // Invites
  totalInvitesSent: number;
  totalInvitesAccepted: number;
  totalNewUsersFromInvites: number;
  
  // Viral Coefficient
  platformKFactor: number;           // Average K across all users
  dailyKFactor: number;              // K for just this day
  
  // Conversion Rates
  inviteConversionRate: number;      // accepted / sent (%)
  avgConversionTimeHours: number;    // Avg time from invite to signup
  
  // Channel Performance
  channelPerformance: {
    sms: { sent: number, accepted: number, rate: number },
    email: { sent: number, accepted: number, rate: number },
    link: { sent: number, accepted: number, rate: number },
  };
  
  // Timestamps
  calculatedAt: Timestamp;
}
```

---

## 📈 Analytics Events to Track

### Client-Side Analytics (Firebase Analytics)

```typescript
// 1. Contact Discovery Banner Viewed
analytics.logEvent('contact_discovery_banner_viewed', {
  screen: 'profile',
  userHasContactAccess: boolean,
});

// 2. Discover Button Clicked
analytics.logEvent('contact_discovery_clicked', {
  previousSyncAt: timestamp | null,
});

// 3. Permission Dialog Shown
analytics.logEvent('contact_permission_requested', {
  trigger: 'banner' | 'settings',
});

// 4. Permission Granted
analytics.logEvent('contact_permission_granted', {
  totalContacts: number,
});

// 5. Permission Denied
analytics.logEvent('contact_permission_denied', {
  denialReason: 'user_declined' | 'system_blocked',
});

// 6. Contacts Synced
analytics.logEvent('contacts_synced', {
  totalContacts: number,
  totalMatches: number,
  syncDurationMs: number,
});

// 7. Invite Sent
analytics.logEvent('invite_sent', {
  method: 'sms' | 'email' | 'link' | 'share',
  recipientCount: number,
});

// 8. Invite Accepted (tracked on new user signup)
analytics.logEvent('invite_accepted', {
  inviterUserId: string,
  conversionTimeMinutes: number,
  inviteMethod: string,
});
```

---

## 🔧 Implementation: Tracking Invite Acceptance

### Step 1: Add Referral Code to Invites

```typescript
// InviteService.ts
export class InviteService {
  async sendInvite(
    inviterUserId: string,
    contactIdentifier: string,
    method: InviteMethod
  ): Promise<void> {
    // Generate unique referral code
    const referralCode = generateReferralCode(inviterUserId);
    
    // Build invite link with referral code
    const inviteLink = `https://travalpass.com/invite?ref=${referralCode}`;
    
    // Store invite in Firestore
    await this.inviteRepo.createInvite({
      inviterUserId,
      contactIdentifier: hashContact(contactIdentifier),
      inviteMethod: method,
      referralCode,         // NEW: Store referral code
      invitedAt: new Date(),
      status: 'sent',
    });
    
    // Send via SMS/Email with dynamic link
    await this.sendInviteMessage(method, contactIdentifier, inviteLink);
  }
}

function generateReferralCode(userId: string): string {
  // Create unique 8-character code: userId + random
  const hash = sha256(userId + Date.now()).substring(0, 8);
  return hash.toUpperCase();
}
```

---

### Step 2: Track Referral on Signup

```typescript
// AuthService.ts
export class AuthService {
  async registerUser(
    email: string,
    password: string,
    referralCode?: string  // NEW: Optional referral code
  ): Promise<User> {
    // Create Firebase user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    
    const newUserId = userCredential.user.uid;
    
    // If referral code provided, track acceptance
    if (referralCode) {
      await this.trackInviteAcceptance(newUserId, referralCode);
    }
    
    // Create user profile
    await this.userRepo.createUser({
      uid: newUserId,
      email,
      invitedBy: referralCode ? await this.getInviterFromCode(referralCode) : null,
      createdAt: new Date(),
    });
    
    return userCredential.user;
  }
  
  private async trackInviteAcceptance(
    newUserId: string,
    referralCode: string
  ): Promise<void> {
    // Find invite by referral code
    const invite = await this.inviteRepo.findByReferralCode(referralCode);
    
    if (!invite) return;
    
    // Update invite with acceptance
    await this.inviteRepo.updateInvite(invite.id, {
      acceptedAt: new Date(),
      acceptedByUserId: newUserId,
      status: 'accepted',
      conversionTimeMinutes: Math.floor(
        (Date.now() - invite.invitedAt.getTime()) / 60000
      ),
    });
    
    // Update inviter's analytics
    await this.analyticsService.incrementInviteAcceptance(invite.inviterUserId);
    
    // Log analytics event
    analytics.logEvent('invite_accepted', {
      inviterUserId: invite.inviterUserId,
      inviteMethod: invite.inviteMethod,
      conversionTimeMinutes: Math.floor(
        (Date.now() - invite.invitedAt.getTime()) / 60000
      ),
    });
  }
}
```

---

### Step 3: Calculate K-Factor

```typescript
// AnalyticsService.ts
export class AnalyticsService {
  async calculateUserKFactor(userId: string): Promise<number> {
    // Get user's invite stats
    const invitesSent = await this.inviteRepo.countInvitesSent(userId);
    const invitesAccepted = await this.inviteRepo.countInvitesAccepted(userId);
    
    if (invitesSent === 0) return 0;
    
    const kFactor = invitesAccepted / invitesSent;
    
    // Update user analytics
    await this.analyticsRepo.updateUserAnalytics(userId, {
      totalInvitesSent: invitesSent,
      totalInvitesAccepted: invitesAccepted,
      personalKFactor: kFactor,
      updatedAt: new Date(),
    });
    
    return kFactor;
  }
  
  async calculatePlatformKFactor(): Promise<number> {
    // Aggregate across all users
    const allUsers = await this.analyticsRepo.getAllUserAnalytics();
    
    const totalInvitesSent = allUsers.reduce(
      (sum, u) => sum + u.totalInvitesSent,
      0
    );
    const totalInvitesAccepted = allUsers.reduce(
      (sum, u) => sum + u.totalInvitesAccepted,
      0
    );
    
    if (totalInvitesSent === 0) return 0;
    
    const platformKFactor = totalInvitesAccepted / totalInvitesSent;
    
    // Store in platform analytics
    await this.analyticsRepo.updatePlatformAnalytics({
      date: new Date().toISOString().split('T')[0],
      platformKFactor,
      totalInvitesSent,
      totalInvitesAccepted,
      calculatedAt: new Date(),
    });
    
    return platformKFactor;
  }
}
```

---

## 📊 Admin Dashboard Metrics

### Key Performance Indicators

```typescript
// DashboardService.ts
export class DashboardService {
  async getContactDiscoveryMetrics(): Promise<ContactDiscoveryMetrics> {
    return {
      // Adoption
      totalUsersWithContactAccess: 1250,
      adoptionRate: 0.45,                    // 45% of users enabled
      
      // Engagement
      avgContactsSynced: 187,
      avgMatchesFound: 12,
      matchRate: 0.064,                      // 6.4% of contacts are users
      
      // Invites
      totalInvitesSent: 8400,
      totalInvitesAccepted: 420,
      overallConversionRate: 0.05,           // 5% conversion
      
      // Viral Coefficient
      platformKFactor: 0.42,                 // 0.42 average
      topUserKFactor: 2.3,                   // Best performer
      
      // Channel Performance
      channels: [
        { name: 'SMS', sent: 5200, accepted: 280, rate: 0.054 },
        { name: 'Email', sent: 2100, accepted: 98, rate: 0.047 },
        { name: 'Link', sent: 1100, accepted: 42, rate: 0.038 },
      ],
      
      // Trends (7-day)
      weeklyTrend: {
        invitesSent: [100, 120, 145, 160, 180, 195, 210],
        invitesAccepted: [5, 6, 8, 9, 10, 11, 12],
        kFactor: [0.05, 0.05, 0.055, 0.056, 0.056, 0.056, 0.057],
      },
    };
  }
}
```

---

## 🎯 Optimization Strategies Based on Metrics

### If K-Factor < 0.3 (Low)
- **Action**: Improve invite messaging
- **Test**: A/B test different invite copy
- **Incentivize**: Offer rewards for accepted invites

### If K-Factor = 0.3 - 0.7 (Medium)
- **Action**: Optimize conversion funnel
- **Test**: Reduce friction in signup process
- **Remind**: Send follow-up reminders to invited contacts

### If K-Factor > 0.7 (High)
- **Action**: Scale up invite limits
- **Reward**: Gamify with leaderboards for top inviters
- **Expand**: Add more invite channels (WhatsApp, Messenger)

### Channel-Specific Optimization

```typescript
// If SMS converts better than email:
if (smsConversionRate > emailConversionRate * 1.5) {
  // Prioritize SMS in UI
  // Show "SMS works 50% better" messaging
  // Make SMS the default invite method
}
```

---

## 🔐 Privacy-Safe Analytics

### What We Track:
- ✅ Number of invites sent
- ✅ Number of invites accepted
- ✅ Time to conversion
- ✅ Invite method performance
- ✅ Aggregated platform metrics

### What We DON'T Track:
- ❌ Contact names
- ❌ Raw phone numbers or emails
- ❌ Invite content/messages
- ❌ Individual contact matching details
- ❌ PII of non-users

---

## 🧪 Testing Analytics Implementation

### Unit Tests

```typescript
describe('AnalyticsService', () => {
  it('calculates K-factor correctly', async () => {
    const userId = 'test-user-123';
    
    // Mock: User sent 10 invites, 2 accepted
    mockInviteRepo.countInvitesSent.mockResolvedValue(10);
    mockInviteRepo.countInvitesAccepted.mockResolvedValue(2);
    
    const kFactor = await analyticsService.calculateUserKFactor(userId);
    
    expect(kFactor).toBe(0.2);
  });
  
  it('handles zero invites gracefully', async () => {
    const userId = 'new-user-123';
    
    mockInviteRepo.countInvitesSent.mockResolvedValue(0);
    
    const kFactor = await analyticsService.calculateUserKFactor(userId);
    
    expect(kFactor).toBe(0);
  });
});
```

### Integration Tests

```typescript
describe('Invite Acceptance Flow', () => {
  it('tracks acceptance when new user signs up with referral code', async () => {
    // Send invite
    const referralCode = await inviteService.sendInvite(
      'inviter-123',
      '+1234567890',
      'sms'
    );
    
    // New user signs up with referral code
    await authService.registerUser(
      'newuser@example.com',
      'password123',
      referralCode
    );
    
    // Check invite was marked as accepted
    const invite = await inviteRepo.findByReferralCode(referralCode);
    expect(invite.status).toBe('accepted');
    expect(invite.acceptedByUserId).toBeDefined();
    
    // Check inviter's analytics updated
    const analytics = await analyticsRepo.getUserAnalytics('inviter-123');
    expect(analytics.totalInvitesAccepted).toBe(1);
  });
});
```

---

## 📅 Analytics Reporting Schedule

### Real-Time (Live Dashboard)
- Current K-factor
- Today's invite count
- Live conversion rate

### Daily (Automated Report)
- Total invites sent/accepted
- Channel performance breakdown
- Top 10 inviters by K-factor
- Funnel drop-off points

### Weekly (Email Report to Team)
- Week-over-week growth
- K-factor trends
- Cohort analysis (users who joined via invite vs organic)
- Feature adoption rate

### Monthly (Executive Summary)
- Monthly Active Users (MAU) from invites
- Cost per acquisition via invites
- Viral loop effectiveness
- Recommendations for optimization

---

## 🚀 Success Criteria

After 3 months of launch, target metrics:

- **Adoption**: 40%+ of users enable contact discovery
- **K-Factor**: 0.5+ (every user brings in 0.5 new users on average)
- **Conversion Rate**: 5%+ (1 in 20 invites result in signup)
- **Retention**: 60%+ of invited users active after 30 days

---

**Document Owner**: Analytics Team  
**Last Updated**: February 11, 2026  
**Status**: Ready for Implementation  
**Dependencies**: Contact Discovery Feature, Firebase Analytics
