import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.enterprise.debtflow',
  appName: 'คล่องตัว',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0B0F19',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#FAF8F5',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_debtflow',
      iconColor: '#B45309',
      sound: 'beep.wav',
    },
  },
};

export default config;
