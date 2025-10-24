/**
 * GoogleIcon.tsx
 * 
 * Official Google logo SVG component for React Native.
 * Replicates the PWA's GoogleIcon with the same official Google brand colors.
 * 
 * Colors match Google's official brand guidelines:
 * - Blue: #4285F4 (top section)
 * - Green: #34A853 (bottom-left)
 * - Yellow: #FBBC05 (bottom-middle)
 * - Red: #EA4335 (bottom-right)
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface GoogleIconProps {
  size?: number;
}

const GoogleIcon: React.FC<GoogleIconProps> = ({ size = 18 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      {/* Blue top section */}
      <Path
        d="M15.68 8.18182C15.68 7.61455 15.6291 7.06909 15.5345 6.54545H8V9.64364H12.3055C12.1164 10.64 11.5491 11.4836 10.6982 12.0509V14.0655H13.2945C14.8073 12.6691 15.68 10.6182 15.68 8.18182Z"
        fill="#4285F4"
      />
      {/* Green bottom-left section */}
      <Path
        d="M8 16C10.16 16 11.9709 15.2873 13.2945 14.0655L10.6982 12.0509C9.98545 12.5309 9.07636 12.8218 8 12.8218C5.92 12.8218 4.15273 11.4182 3.52 9.52727H0.858182V11.5927C2.17091 14.2073 4.87273 16 8 16Z"
        fill="#34A853"
      />
      {/* Yellow bottom-middle section */}
      <Path
        d="M3.52 9.52727C3.36 9.04727 3.27273 8.53091 3.27273 8C3.27273 7.46909 3.36 6.95273 3.52 6.47273V4.40727H0.858182C0.312727 5.49091 0 6.70545 0 8C0 9.29455 0.312727 10.5091 0.858182 11.5927L2.93091 9.97091L3.52 9.52727Z"
        fill="#FBBC05"
      />
      {/* Red bottom-right section */}
      <Path
        d="M8 3.18182C9.17818 3.18182 10.2255 3.58545 11.0618 4.37818L13.3527 2.08727C11.9673 0.792727 10.1564 0 8 0C4.87273 0 2.17091 1.79273 0.858182 4.40727L3.52 6.47273C4.15273 4.58182 5.92 3.18182 8 3.18182Z"
        fill="#EA4335"
      />
    </Svg>
  );
};

export default GoogleIcon;
