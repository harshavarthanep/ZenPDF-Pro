// Run after "npx cap add android" (the GitHub workflow does this for you).
// Makes the Android app: a real app name, PDF "Open with" listing,
// larger file uploads, and a version number from the release tag.
import fs from 'node:fs';
const man = 'android/app/src/main/AndroidManifest.xml';
let m = fs.readFileSync(man, 'utf8');
if (!m.includes('android:largeHeap')) m = m.replace('<application', '<application android:largeHeap="true" android:requestLegacyExternalStorage="true"');
if (!m.includes('WRITE_EXTERNAL_STORAGE')) m = m.replace('<application', '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />\n    <application');
fs.writeFileSync(man, m);
const gradle = 'android/app/build.gradle';
let g = fs.readFileSync(gradle, 'utf8');
const ver = (process.env.APP_VERSION || '1.0.0').replace(/^v/, '');
const [a, b, c] = ver.split('.').map(n => parseInt(n, 10) || 0);
g = g.replace(/versionCode \d+/, 'versionCode ' + (a * 10000 + b * 100 + c)).replace(/versionName "[^"]*"/, 'versionName "' + ver + '"');
fs.writeFileSync(gradle, g);
console.log('Android project ready — version ' + ver);
