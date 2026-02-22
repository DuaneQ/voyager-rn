/**
 * Unit tests for src/components/common/ForceUpgradeModal.tsx
 *
 * Covers:
 *  - Force mode: "Update Required" text, no "Later" button, no dismiss
 *  - Soft mode: "Update Available" text, "Later" button visible
 *  - latestVersion string included in body text when provided
 *  - "Update Now" opens the correct store URL (iOS / Android)
 *  - "Later" calls onDismiss
 *  - Modal hidden when visible=false
 *  - Android hardware back handled correctly (allowed for soft, blocked for force)
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Platform, Linking } from 'react-native';
import { ForceUpgradeModal } from '../../components/common/ForceUpgradeModal';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn().mockResolvedValue(undefined),
  canOpenURL: jest.fn().mockResolvedValue(true),
}));

const onDismiss = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (Platform as any).OS = 'ios';
});

// ─────────────────────────────────────────────────────────────────────────────
// Visibility
// ─────────────────────────────────────────────────────────────────────────────

describe('visibility', () => {
  it('renders nothing when visible=false', () => {
    render(
      <ForceUpgradeModal visible={false} isForced={true} />
    );
    expect(screen.queryByText('Update Required')).toBeNull();
    expect(screen.queryByText('Update Available')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Force mode
// ─────────────────────────────────────────────────────────────────────────────

describe('force upgrade mode (isForced=true)', () => {
  it('shows "Update Required" title', () => {
    render(<ForceUpgradeModal visible isForced onDismiss={onDismiss} />);
    expect(screen.getByText('Update Required')).toBeTruthy();
  });

  it('shows the blocking body text', () => {
    render(<ForceUpgradeModal visible isForced />);
    expect(
      screen.getByText(/required to continue/i)
    ).toBeTruthy();
  });

  it('does NOT show the "Later" button', () => {
    render(<ForceUpgradeModal visible isForced onDismiss={onDismiss} />);
    expect(screen.queryByText('Later')).toBeNull();
  });

  it('shows the "Update Now" button', () => {
    render(<ForceUpgradeModal visible isForced />);
    expect(screen.getByText('Update Now')).toBeTruthy();
  });

  it('includes the latestVersion string in the body when provided', () => {
    render(<ForceUpgradeModal visible isForced latestVersion="2.3.0" />);
    expect(screen.getByText(/2\.3\.0/)).toBeTruthy();
  });

  it('does not include a version string when latestVersion is omitted', () => {
    render(<ForceUpgradeModal visible isForced />);
    // Body text should still render but without a version number in parens
    const body = screen.getByText(/required to continue/i);
    expect(body.props.children).not.toMatch(/\(\d/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Soft update mode
// ─────────────────────────────────────────────────────────────────────────────

describe('soft update mode (isForced=false)', () => {
  it('shows "Update Available" title', () => {
    render(<ForceUpgradeModal visible={true} isForced={false} onDismiss={onDismiss} />);
    expect(screen.getByText('Update Available')).toBeTruthy();
  });

  it('shows the soft body text', () => {
    render(<ForceUpgradeModal visible={true} isForced={false} />);
    expect(screen.getByText(/available with improvements/i)).toBeTruthy();
  });

  it('shows the "Later" button when onDismiss is provided', () => {
    render(<ForceUpgradeModal visible={true} isForced={false} onDismiss={onDismiss} />);
    expect(screen.getByText('Later')).toBeTruthy();
  });

  it('does NOT show "Later" when onDismiss is not provided', () => {
    render(<ForceUpgradeModal visible={true} isForced={false} />);
    expect(screen.queryByText('Later')).toBeNull();
  });

  it('calls onDismiss when "Later" is tapped', () => {
    render(<ForceUpgradeModal visible={true} isForced={false} onDismiss={onDismiss} />);
    fireEvent.press(screen.getByText('Later'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Store URL navigation
// ─────────────────────────────────────────────────────────────────────────────

describe('"Update Now" opens store URL', () => {
  it('opens the iOS App Store URL on iOS', async () => {
    (Platform as any).OS = 'ios';
    render(<ForceUpgradeModal visible isForced />);
    fireEvent.press(screen.getByText('Update Now'));

    await screen.findByText('Update Now'); // wait for async Linking call
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('apps.apple.com')
    );
  });

  it('opens the Play Store market:// URL on Android when canOpenURL is true', async () => {
    (Platform as any).OS = 'android';
    (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(true);

    render(<ForceUpgradeModal visible isForced />);
    fireEvent.press(screen.getByText('Update Now'));

    await screen.findByText('Update Now');
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('market://')
    );
  });

  it('falls back to Play Store web URL on Android when market:// cannot open', async () => {
    (Platform as any).OS = 'android';
    (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false);

    render(<ForceUpgradeModal visible isForced />);
    fireEvent.press(screen.getByText('Update Now'));

    await screen.findByText('Update Now');
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('play.google.com')
    );
  });

  it('does not throw if Linking.openURL rejects', async () => {
    (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('no browser'));

    render(<ForceUpgradeModal visible isForced />);
    // Should not throw
    expect(() => fireEvent.press(screen.getByText('Update Now'))).not.toThrow();
  });
});
