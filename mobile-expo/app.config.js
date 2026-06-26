// Two APKs from one codebase. Build courier (default) or catering by setting the role:
//   courier : npx expo prebuild -p android --clean && (cd android && ./gradlew assembleRelease)
//   catering: EXPO_PUBLIC_APP_ROLE=catering npx expo prebuild -p android --clean && (cd android && ./gradlew assembleRelease)
const base = require('./app.json').expo;
const isCatering = (process.env.EXPO_PUBLIC_APP_ROLE ?? 'courier') === 'catering';

module.exports = {
  ...base,
  name: isCatering ? 'LogiEat Manager' : 'LogiEat Kurir',
  slug: isCatering ? 'logieat-manager' : base.slug,
  android: {
    ...base.android,
    package: isCatering ? 'com.logieat.manager' : base.android.package,
  },
};
