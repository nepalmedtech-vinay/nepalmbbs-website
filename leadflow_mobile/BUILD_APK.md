# 📱 LeadFlow APK - Download & Install

## 🎯 ONE COMMAND TO RUN:

```bash
npm install -g eas-cli && eas build --platform android --local
```

## 🔄 What happens:

1. **Install EAS CLI** (1 min)
   - `npm install -g eas-cli`

2. **Create Free EAS Account** (1 min)
   - `eas login`
   - Go to https://eas.io
   - Click "Sign up"
   - Create account (free)

3. **Start Build** (15 min)
   - `eas build --platform android --local`
   - Watch the build progress
   - It will compile your app

4. **Download APK** (1 min)
   - Copy the download link from terminal
   - Or open the link in browser
   - File size: ~60-80 MB

## 📲 Install on Phone:

**Method 1: Direct Download**
```
1. Go to link from terminal
2. Download APK to phone
3. Open Settings → Security → Unknown Sources → ON
4. Tap APK file → Install
```

**Method 2: USB Cable**
```bash
adb install app.apk
```

## ✅ Total Time:
- Setup: 2 min
- Build: 15 min  
- Download: 1 min
- Install: 2 min
- **TOTAL: 20 min** ✅

## 🆘 Issues?

**"eas-cli not found"**
```bash
npm install -g eas-cli
```

**"Android SDK not found"**
- Don't worry! EAS builds in cloud
- No SDK needed on your machine

**"Account already exists"**
- Just login: `eas login`

---

**That's it! 🎉 You'll have the APK in 20 minutes!**
