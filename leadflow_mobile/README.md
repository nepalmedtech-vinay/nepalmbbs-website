# LeadFlow Mobile - Premium Lead Lifecycle Management

A production-grade Flutter mobile application for managing MBBS admissions lead lifecycle with AI-powered insights, real-time collaboration, and multilingual support for the Indian market.

## ✨ Features

### Core Features
- **Real-time Lead Management** - Track leads across their entire journey from first contact to admission
- **Lead Scoring** - Intelligent scoring algorithm with AI-powered insights
- **Communication Timeline** - Unified view of all interactions (WhatsApp, Email, SMS, Calls, Meetings)
- **Lead 360 Intelligence** - Comprehensive lead analytics with behavioral analysis and risk indicators
- **Multi-language Support** - Hindi, English, and regional languages with auto-translation
- **Document Verification** - OCR-powered document upload and verification

### UI/UX Excellence
- **Cinematic Animations** - Premium animations using flutter_animate, motion, rive, and lottie
- **Material 3 Design** - Latest Material Design 3 with glassmorphism effects
- **Dark Mode Support** - Full light and dark theme support
- **Real-time Sync** - Live updates with Supabase using riverpod state management
- **Smooth Transitions** - Fluid navigation and state changes

### Premium Libraries
- **flutter_animate** - Cinematic animations
- **motion** - Smooth motion effects
- **rive** - Premium graphics and animations
- **lottie** - Smooth animation support
- **glassmorphism** - Frosted glass UI effects
- **riverpod** - Reactive state management
- **google_fonts** - Premium typography

## 🏗️ Project Structure

```
lib/
├── main.dart                 # App entry point
├── theme/
│   └── app_theme.dart       # Material 3 theme system
├── screens/
│   ├── dashboard_screen.dart     # Main dashboard
│   └── leads_list_screen.dart    # Detailed leads list
├── models/
│   ├── lead.dart            # Lead data model
│   ├── communication.dart   # Communication model
│   └── lead_score.dart      # Lead scoring model
├── services/
│   └── supabase_service.dart # Supabase integration
└── providers/
    ├── lead_provider.dart       # Lead state management
    └── communication_provider.dart # Communication state
```

## 🚀 Getting Started

### Prerequisites
- Flutter SDK 3.0+
- Dart 3.0+
- Supabase account (free tier)

### Setup

1. **Clone the repository**
```bash
git clone <repo> && cd nepalmbbs-website
git checkout claude/mobile-7yihji
cd leadflow_mobile
```

2. **Install dependencies**
```bash
flutter pub get
```

3. **Configure Supabase credentials**
Edit `lib/main.dart` and add your credentials:
```dart
await Supabase.initialize(
  url: 'YOUR_SUPABASE_URL',
  anonKey: 'YOUR_SUPABASE_ANON_KEY',
);
```

4. **Run the app**
```bash
flutter run
```

## 📚 Architecture

### State Management
- **Riverpod** - For reactive state management
- **Providers** - lead_provider.dart for lead state
- **FutureProvider** - For async data fetching

### Real-time Sync
- **Supabase Real-time** - PostgreSQL change subscriptions
- **Socket.io** - For live updates when scale requires

### Database
- **Supabase PostgreSQL** - Primary database
- **Row-Level Security** - Multi-tenant isolation via RLS
- **Hive** - Local offline-first cache

## 🎨 Design System

### Colors
- **Primary Blue** - `#2563EB`
- **Accent Purple** - `#8B5CF6`
- **Success Green** - `#10B981`
- **Warning Amber** - `#F59E0B`
- **Error Red** - `#EF4444`

### Typography
- **Sora** - Headlines and titles
- **Inter** - Body text and captions

### Components
- Material 3 components with custom theming
- Glassmorphism effects for premium feel
- Consistent spacing and elevation shadows

## 📡 API Integration

### Supabase Tables
- `leads` - Lead information with scoring
- `communications` - Communication history
- `lead_360` - Comprehensive lead analysis
- `documents` - Document storage and verification

### Real-time Features
- Subscribe to lead changes
- Live communication updates
- Real-time scoring updates

## 🧪 Testing

```bash
# Run tests
flutter test

# Generate coverage
flutter test --coverage

# Build for release
flutter build apk --release
flutter build ios --release
```

## 📦 Dependencies

### State Management
- `flutter_riverpod: ^2.4.0`
- `hooks_riverpod: ^2.4.0`

### Database & API
- `supabase_flutter: ^1.10.0`
- `socket_io_client: ^2.0.0`
- `hive_flutter: ^1.1.0`

### UI & Animation
- `flutter_animate: ^4.2.0`
- `motion: ^1.0.0`
- `rive: ^0.11.0`
- `lottie: ^2.4.0`
- `google_fonts: ^6.1.0`
- `glassmorphism: ^3.0.0`

### AI/ML & Features
- `google_mlkit_text_recognition: ^0.8.1` (OCR)
- `speech_to_text: ^6.4.0`
- `record: ^4.4.4`

## 💰 Cost (Free Tier)

- ✅ Supabase: Free tier (500MB storage)
- ✅ Hosting: Local development
- ✅ APIs: Free tiers of all services
- **Total: ₹0/month**

## 🚀 Deployment

### Mobile App
```bash
flutter build apk --release          # Android
flutter build ios --release          # iOS
```

### Backend
Deploy to Render/Railway (free tier)

### Database
Use Supabase free tier (no action needed)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a PR

## 📝 License

Proprietary - MBBS Admissions Platform

## 🆘 Support

For issues or questions:
- Check `docs/` folder
- Review `LEADFLOW_*.md` documents
- See deployment guide

---

**Built with ❤️ using Flutter and premium open-source libraries**
