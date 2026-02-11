# Privacy Policy Amendment - Contact Discovery Feature

## 📋 Overview

This document contains the required privacy policy updates for the Contact Discovery feature. This section must be added to the existing Privacy Policy modal before launching contact discovery.

**Target File**: `src/components/modals/legal/PrivacyPolicyModal.tsx`

---

## ✅ Required Addition

### Section to Add: "1.4 Contact Information (Optional)"

**Position**: Insert after section "1.3 Third-Party Authentication" (around line 80)

```tsx
<Text style={styles.subSectionTitle}>1.4 Contact Information (Optional)</Text>
<Text style={styles.paragraph}>
  If you choose to enable contact discovery, we collect and process:{'\n'}
  • <Text style={styles.bold}>Contact Names:</Text> Names from your device's contact list{'\n'}
  • <Text style={styles.bold}>Phone Numbers:</Text> Phone numbers associated with contacts{'\n'}
  • <Text style={styles.bold}>Email Addresses:</Text> Email addresses associated with contacts{'\n\n'}
  
  <Text style={styles.bold}>How We Handle Your Contacts:</Text>{'\n'}
  • We hash (encrypt) your contacts' phone numbers and email addresses before comparing them to our user database{'\n'}
  • We do NOT store your contacts' names, phone numbers, or email addresses on our servers{'\n'}
  • We only store hashed values temporarily for matching purposes{'\n'}
  • We automatically delete hashed contact data after 24 hours{'\n'}
  • You can revoke contact access at any time in your device settings{'\n'}
  • You can delete all stored contact hashes from Settings → Privacy → Delete Contact Data
</Text>
```

---

## ✅ Update to Section 2: "How We Use Your Information"

**Position**: Update existing section 2 (around line 105)

**Add this bullet point**:
```tsx
• Match your contacts with existing TravalPass users (only with your permission){'\n'}
```

**Updated full section**:
```tsx
<Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
<Text style={styles.paragraph}>
  • Provide and maintain the Platform{'\n'}
  • Create and manage your account{'\n'}
  • Connect you with compatible travel companions{'\n'}
  • Match your contacts with existing TravalPass users (only with your permission){'\n'}
  • Process subscription payments{'\n'}
  • Generate AI-powered travel itineraries{'\n'}
  • Send notifications about matches and messages{'\n'}
  • Improve and personalize your experience{'\n'}
  • Analyze usage patterns and trends{'\n'}
  • Prevent fraud and enforce our Terms of Service{'\n'}
  • Comply with legal obligations{'\n'}
  • Send service-related communications
</Text>
```

---

## ✅ Update to Section 6.1: "Device Permissions"

**Position**: Update existing section 6.1 (around line 180)

**Add this bullet point**:
```tsx
• <Text style={styles.bold}>Contacts:</Text> To discover friends already using TravalPass and invite new users (optional){'\n'}
```

**Updated full section**:
```tsx
<Text style={styles.subSectionTitle}>6.1 Device Permissions</Text>
<Text style={styles.paragraph}>
  Our app may request:{'\n'}
  • <Text style={styles.bold}>Camera/Photos:</Text> For profile pictures and video uploads{'\n'}
  • <Text style={styles.bold}>Contacts:</Text> To discover friends already using TravalPass and invite new users (optional){'\n'}
  • <Text style={styles.bold}>Location:</Text> For travel matching (optional){'\n'}
  • <Text style={styles.bold}>Notifications:</Text> For matches and messages (optional){'\n'}
  • <Text style={styles.bold}>Storage:</Text> For caching and offline functionality
</Text>
<Text style={styles.paragraph}>
  You can revoke these permissions in your device settings at any time.
</Text>
```

---

## ✅ New Section: "Contact Discovery Privacy"

**Position**: Add as new section after "6. Mobile-Specific Privacy" (around line 200)

```tsx
<Text style={styles.sectionTitle}>6.3 Contact Discovery Privacy</Text>
<Text style={styles.paragraph}>
  When you enable contact discovery:{'\n\n'}
  
  <Text style={styles.bold}>What We Do:</Text>{'\n'}
  • We read your contacts (only with your explicit permission){'\n'}
  • We hash (one-way encrypt) phone numbers and emails using SHA-256{'\n'}
  • We compare hashed values against our user database to find matches{'\n'}
  • We show you which of your contacts are TravalPass users{'\n'}
  • We allow you to invite contacts who aren't yet on the platform{'\n\n'}
  
  <Text style={styles.bold}>What We DON'T Do:</Text>{'\n'}
  • We do NOT upload your raw contact data to our servers{'\n'}
  • We do NOT share your contacts with other users{'\n'}
  • We do NOT sell your contact data to third parties{'\n'}
  • We do NOT use your contacts for marketing purposes{'\n'}
  • We do NOT store your contacts permanently{'\n\n'}
  
  <Text style={styles.bold}>Your Rights:</Text>{'\n'}
  • You can disable contact discovery at any time{'\n'}
  • You can delete all stored contact hashes from app settings{'\n'}
  • You can revoke contact permission in device settings{'\n'}
  • Contact discovery is entirely optional - you can use TravalPass without it{'\n\n'}
  
  <Text style={styles.bold}>Data Retention:</Text>{'\n'}
  • Hashed contact data is automatically deleted after 24 hours{'\n'}
  • Sync history (when you synced, how many contacts) is kept for 90 days{'\n'}
  • Invitation records are kept for analytics purposes but don't include contact details
</Text>
```

---

## ✅ Update to Section 5.3: "All Users" Rights

**Position**: Update existing section 5.3 (around line 165)

**Add these bullet points**:
```tsx
• Delete contact discovery data (Settings → Privacy → Delete Contact Data){'\n'}
• Disable contact discovery (Settings → Privacy → Contact Discovery){'\n'}
```

**Updated full section**:
```tsx
<Text style={styles.subSectionTitle}>5.3 All Users</Text>
<Text style={styles.paragraph}>
  You can:{'\n'}
  • Update your profile information anytime{'\n'}
  • Control notification settings{'\n'}
  • Delete your account (Settings → Delete Account){'\n'}
  • Request a copy of your data{'\n'}
  • Opt-out of marketing communications{'\n'}
  • Delete contact discovery data (Settings → Privacy → Delete Contact Data){'\n'}
  • Disable contact discovery (Settings → Privacy → Contact Discovery)
</Text>
```

---

## 📋 Implementation Checklist

### Before Launching Contact Discovery:

- [ ] **Add section 1.4** "Contact Information (Optional)" after Third-Party Authentication
- [ ] **Update section 2** to include contact matching in "How We Use Your Information"
- [ ] **Update section 6.1** to include Contacts permission in Device Permissions
- [ ] **Add section 6.3** "Contact Discovery Privacy" with full explanation
- [ ] **Update section 5.3** to include contact data deletion rights
- [ ] **Update Effective Date** to launch date
- [ ] **Update Last Updated** to launch date
- [ ] **Legal review** of all contact-related language
- [ ] **User testing** of privacy explanation clarity
- [ ] **App Store review** submission with updated privacy policy

---

## 🔍 Key Privacy Principles

1. **Opt-In Only**: Contact access is never required, always optional
2. **Transparency**: Clear explanation of what we do with contacts
3. **Minimal Data**: Only hashed values are transmitted and temporarily stored
4. **User Control**: Easy to disable, easy to delete
5. **GDPR Compliant**: Right to access, delete, and opt-out
6. **CCPA Compliant**: Disclosure of data collection and usage

---

## 📱 Platform-Specific Privacy Requirements

### iOS App Store Requirements

**NSContactsUsageDescription** (already added):
```
"TravalPass needs access to your contacts to help you connect with friends already using the app and invite new ones. Your contacts are never shared with others and are only used to find matches."
```

### Google Play Store Requirements

**Permission Declaration**:
```xml
<uses-permission android:name="android.permission.READ_CONTACTS" />
```

**Data Safety Form** (Google Play Console):
- Data Type: Contacts
- Purpose: App functionality (finding friends)
- Collection: Optional
- Sharing: No
- Encryption: Yes (SHA-256 hashing)
- Deletion: User can request deletion

### Web (GDPR Compliance)

- Privacy policy must be linked on all pages where contact access is requested
- Cookie consent banner must mention contact processing if applicable
- Users must be able to withdraw consent easily

---

## ⚖️ Legal Considerations

### COPPA Compliance (Children's Privacy)

- Contact discovery is only available to users 18+
- Age verification happens at signup
- No contact data collected from minors

### State Privacy Laws (CCPA, CPRA, Virginia, Colorado, etc.)

- Users can request copies of matched contact hashes
- Users can request deletion of all contact data
- Opt-out mechanism provided (disable contact discovery)
- No sale of contact data to third parties

---

## 📞 User Support FAQ (Add to Help Center)

**Q: What contacts information do you collect?**  
A: Only with your permission, we temporarily access contact names, phone numbers, and emails to find matches. We hash (encrypt) this data before any comparison.

**Q: Do you store my contacts?**  
A: No. We hash your contacts, compare them to find matches, then automatically delete the hashed data after 24 hours.

**Q: Can I delete my contact data?**  
A: Yes. Go to Settings → Privacy → Delete Contact Data to immediately remove all stored contact hashes.

**Q: Will my contacts know I have the app?**  
A: Only if they're already using TravalPass and you both choose to connect. We don't notify non-users about you.

**Q: Can I use TravalPass without enabling contacts?**  
A: Absolutely! Contact discovery is entirely optional. You can still search for users manually and use all other features.

---

**Document Owner**: Legal/Compliance Team  
**Last Updated**: February 11, 2026  
**Status**: Ready for Legal Review  
**Required Before**: Contact Discovery Launch
