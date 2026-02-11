# Teewinek Mobile App Guide

## 📱 Overview

Teewinek is now a complete multi-platform application with:
- ✅ Progressive Web App (PWA) support
- ✅ Android/iOS Hybrid app (via Capacitor)
- ✅ AMP pages for ultra-fast mobile experience
- ✅ Complete SEO/ASO optimization

## 🚀 Features Implemented

### 1. PWA (Progressive Web App)
- **Offline Support**: Service worker caches essential assets
- **Installable**: Can be installed on home screen (Android/iOS)
- **Push Notifications**: Ready for web push notifications
- **Fast Loading**: Optimized caching strategy
- **App-like Experience**: Fullscreen mode, splash screen

**Files:**
- `/public/manifest.json` - PWA manifest
- `/public/sw.js` - Service worker
- `/index.html` - Updated with PWA meta tags

### 2. Hybrid Mobile App (Capacitor)
- **Native Wrapper**: Android and iOS support
- **Deep Links**: Open specific pages from URLs
- **Native Plugins**:
  - App state management
  - Status bar customization
  - Splash screen
  - Push notifications
  - Back button handling

**Configuration:**
- `capacitor.config.ts` - Capacitor configuration
- `src/lib/capacitor.ts` - Native features wrapper

**Build Commands:**
```bash
# Build web app
npm run build

# Add Android platform
npx cap add android

# Add iOS platform
npx cap add ios

# Sync web files to native projects
npx cap sync

# Open in Android Studio
npx cap open android

# Open in Xcode
npx cap open ios
```

### 3. AMP Pages
Ultra-fast mobile pages optimized for Google AMP:
- **Location**: `/public/amp/index.html`
- **Features**:
  - Valid AMP HTML
  - LCP < 2.5s on mobile
  - Lazy-loaded images
  - Google Analytics tracking
  - WhatsApp CTA buttons

**Services Showcased:**
- T-Shirts & Textile
- Broderie (Embroidery)
- Impression UV
- Gravure Laser
- Cadeaux Entreprise
- Casquettes

### 4. SEO/ASO Optimization

#### Meta Tags (index.html)
- ✅ Complete Open Graph tags
- ✅ Twitter Card tags
- ✅ Schema.org structured data
- ✅ Canonical URLs
- ✅ Mobile-optimized viewport
- ✅ Apple mobile web app tags
- ✅ Theme color for Android

#### Keywords Targeted
- impression t-shirt tunisie
- broderie personnalisée
- DTF, impression UV, gravure laser
- cadeaux personnalisés
- textile personnalisé
- teewinek

### 5. New Mobile App Pages

#### Profile Page (`/profile`)
- User information management
- Company details
- Contact information
- Address management
- **Icon**: UserCircle

#### Order Tracking (`/order-tracking`)
- Real-time order status
- Search by order number or client
- Visual status indicators
- Order history
- **Icon**: MapPin

#### Contact Page (`/contact`)
- **WhatsApp Integration**: Click-to-chat with pre-filled message
- **Phone**: Click-to-call functionality
- **Email**: Click-to-email with subject
- **Social Media**: Facebook, Instagram, LinkedIn links
- **CTA**: "Demander un devis" button
- **Icon**: MessageSquare

### 6. File Upload Feature

**Component**: `src/components/ui/FileUpload.tsx`

**Features:**
- Upload images, PDF, AI, EPS, SVG files
- Image preview before upload
- Max file size: 10MB (configurable)
- Drag & drop support
- Progress indicator
- Error handling
- Stores files in Supabase Storage (`uploads` bucket)

**Usage Example:**
```tsx
import FileUpload from '../components/ui/FileUpload';

<FileUpload
  onUpload={(url, fileName) => {
    console.log('File uploaded:', url);
  }}
  accept="image/*,.pdf"
  maxSizeMB={10}
/>
```

### 7. Contact Integration

**Module**: `src/lib/contact.ts`

**Functions:**
- `openWhatsApp(message?)` - Open WhatsApp with message
- `makeCall()` - Initiate phone call
- `sendEmail(subject?, body?)` - Open email client
- `shareContent(title, text, url?)` - Native share API

**Contact Info (Update as needed):**
```typescript
export const CONTACT_INFO = {
  phone: '+216 12 345 678',
  whatsapp: '+216 12 345 678',
  email: 'contact@teewinek.com',
  address: 'Tunis, Tunisie',
  facebook: 'https://facebook.com/teewinek',
  instagram: 'https://instagram.com/teewinek',
  linkedin: 'https://linkedin.com/company/teewinek'
};
```

## 🎨 Branding

### Logo
- **URL**: `https://i0.wp.com/www.teewinek.com/wp-content/uploads/2024/05/LOGO-TEEWINEK.png`
- **Used in**:
  - Login page (desktop & mobile)
  - PWA manifest
  - AMP pages
  - SEO meta tags
  - Splash screen

### Colors
- **Primary**: #0ea5e9 (Blue)
- **Secondary**: #0284c7 (Darker Blue)
- **Success**: #25D366 (WhatsApp Green)
- **Background**: #f8fafc (Light Gray)

## 📊 Analytics & Tracking

### Events Tracked (GA4)
- Page views
- WhatsApp click (engagement)
- Phone call click
- Email click
- Devis form submission
- File upload success

**Setup GA4:**
Replace `G-XXXXXXXXXX` in `/public/amp/index.html` with your actual GA4 tracking ID.

## 🔒 Security & Storage

### Storage Bucket (`uploads`)
- **Public**: Yes (files accessible via URL)
- **Max Size**: 10MB per file
- **Allowed Types**:
  - Images: JPEG, PNG, GIF, WebP, SVG
  - Documents: PDF
  - Design Files: AI, EPS
- **RLS**: Users can only upload/manage their own files

### Database Table: `uploaded_files`
Tracks all uploads with metadata:
- user_id
- file_name, file_path
- file_size, mime_type
- entity_type, entity_id (link to invoices, quotes, etc.)
- description
- created_at

## 📱 Push Notifications

### Setup (Web)
1. Configure Firebase Cloud Messaging (FCM)
2. Add FCM config to service worker
3. Request permission in app
4. Store tokens in database

### Setup (Native)
1. **Android**: Configure Firebase
2. **iOS**: Configure APNs
3. Use `requestPushNotificationPermissions()` from `src/lib/capacitor.ts`

**Example:**
```typescript
import { requestPushNotificationPermissions } from './lib/capacitor';

const token = await requestPushNotificationPermissions();
// Save token to database for sending notifications
```

## 🌐 Deep Links

### URL Scheme
- **Android**: `https://teewinek.app`
- **iOS**: `https://teewinek.app`

### Examples
- Open quote: `teewinek://quotes/123`
- Open invoice: `teewinek://invoices/456`
- Open profile: `teewinek://profile`

## 🔧 Configuration

### Update Contact Information
Edit `src/lib/contact.ts`:
```typescript
export const CONTACT_INFO = {
  phone: 'YOUR_PHONE',
  whatsapp: 'YOUR_WHATSAPP',
  email: 'YOUR_EMAIL',
  // ... other fields
};
```

### Update Company Address
Edit AMP page and Contact page with actual address.

### Update Social Media Links
Edit `CONTACT_INFO` in `src/lib/contact.ts`.

## 🚢 Deployment

### Web (PWA)
```bash
npm run build
# Deploy 'dist' folder to your hosting
```

### Android
```bash
npm run build
npx cap sync
npx cap open android
# Build APK/AAB in Android Studio
```

### iOS
```bash
npm run build
npx cap sync
npx cap open ios
# Build IPA in Xcode
```

## 📈 Performance Targets

### PWA
- ✅ LCP < 2.5s
- ✅ FID < 100ms
- ✅ CLS < 0.1
- ✅ Lighthouse Score > 90

### AMP
- ✅ LCP < 2.5s on 3G
- ✅ Valid AMP HTML
- ✅ All images lazy-loaded
- ✅ Inline CSS < 75KB

## 🎯 Marketing Features

### CTA Buttons
- WhatsApp: "Devis WhatsApp" - Pre-filled message
- Phone: "Appelez-nous" - Direct call
- Email: "Envoyer un email" - Pre-configured
- Quote: "Demander un devis" - Redirects to quote form

### Landing Pages (AMP)
- Home: `/amp/index.html`
- Services: Create similar pages for each service
- Products: Create AMP product pages

### SEO Strategy
1. **Keywords**: Focus on local + service keywords
2. **Content**: Add blog posts about printing techniques
3. **Backlinks**: Get links from industry sites
4. **Local SEO**: Add Google My Business
5. **Reviews**: Encourage customer reviews

## 📞 Support

For technical issues or questions:
- Email: contact@teewinek.com
- WhatsApp: +216 12 345 678

---

**Version**: 1.0.0
**Last Updated**: 2024
**Platform**: Web + Android + iOS
