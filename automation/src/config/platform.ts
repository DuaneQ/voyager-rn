export const Platform = {
  isAndroid: process.env.PLATFORM === 'android',
  isIOS: process.env.PLATFORM === 'ios',
  isWeb: process.env.PLATFORM === 'web'
};

export const choose = <T>(web: T, mobile: T) => (Platform.isWeb ? web : mobile);
