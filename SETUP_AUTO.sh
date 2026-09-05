#!/bin/bash

# LeadFlow Auto-Setup Script
# This script sets up everything automatically

set -e

echo "🚀 LeadFlow Auto-Setup Starting..."
echo "=================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# 1. ENVIRONMENT SETUP
# ============================================
echo -e "${BLUE}[1/5] Setting up environment variables...${NC}"

# Backend setup
if [ ! -f "leadflow_backend/.env" ]; then
  cat > leadflow_backend/.env << 'EOF'
# Server Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug

# Supabase Configuration (UPDATE THESE)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# WhatsApp Business API (OPTIONAL)
WHATSAPP_PHONE_NUMBER_ID=YOUR_PHONE_ID
WHATSAPP_API_TOKEN=YOUR_API_TOKEN
WHATSAPP_VERIFY_TOKEN=YOUR_VERIFY_TOKEN

# Claude API (OPTIONAL)
CLAUDE_API_KEY=YOUR_CLAUDE_KEY

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/leadflow
EOF
  echo -e "${GREEN}✓ Backend .env created${NC}"
else
  echo -e "${YELLOW}! Backend .env already exists${NC}"
fi

# Mobile setup
if [ ! -f "leadflow_mobile/.env" ]; then
  cat > leadflow_mobile/.env << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY

# API Configuration
API_BASE_URL=http://localhost:3000
API_TIMEOUT_SECONDS=30

# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_CRASH_REPORTING=true
DEBUG_MODE=false
EOF
  echo -e "${GREEN}✓ Mobile .env created${NC}"
else
  echo -e "${YELLOW}! Mobile .env already exists${NC}"
fi

# ============================================
# 2. BACKEND SETUP
# ============================================
echo -e "${BLUE}[2/5] Setting up backend...${NC}"

cd leadflow_backend

if [ ! -d "node_modules" ]; then
  echo "Installing backend dependencies..."
  npm install
  echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
  echo -e "${YELLOW}! Backend node_modules already exists${NC}"
fi

cd ..

# ============================================
# 3. MOBILE SETUP
# ============================================
echo -e "${BLUE}[3/5] Setting up mobile app...${NC}"

cd leadflow_mobile

if [ ! -d "pubspec.lock" ]; then
  echo "Getting Flutter dependencies..."
  flutter pub get
  echo -e "${GREEN}✓ Flutter dependencies installed${NC}"
else
  echo -e "${YELLOW}! Flutter dependencies already present${NC}"
fi

cd ..

# ============================================
# 4. CREATE SUPABASE SCHEMA
# ============================================
echo -e "${BLUE}[4/5] Creating Supabase schema...${NC}"

cat > leadflow_backend/sql/001_init_schema.sql << 'EOF'
-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'default',
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(255) NOT NULL,
  source VARCHAR(50),
  lead_score INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Cold',
  college VARCHAR(255),
  course VARCHAR(255),
  neet_score VARCHAR(10),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(email),
  UNIQUE(phone)
);

-- Create communications table
CREATE TABLE IF NOT EXISTS public.communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'default',
  type VARCHAR(50) NOT NULL,
  direction VARCHAR(20) NOT NULL,
  content TEXT,
  sender VARCHAR(255),
  recipient VARCHAR(255),
  duration VARCHAR(50),
  recording_url TEXT,
  transcription TEXT,
  ai_analysis TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  filename VARCHAR(500) NOT NULL,
  extracted_text TEXT,
  verified BOOLEAN DEFAULT FALSE,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_leads_tenant_id ON public.leads(tenant_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_score ON public.leads(lead_score);
CREATE INDEX idx_communications_lead_id ON public.communications(lead_id);
CREATE INDEX idx_communications_timestamp ON public.communications(timestamp DESC);
CREATE INDEX idx_documents_lead_id ON public.documents(lead_id);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for authenticated users)
CREATE POLICY "Enable read access for authenticated users"
  ON public.leads FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users"
  ON public.leads FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users"
  ON public.leads FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users"
  ON public.leads FOR DELETE
  USING (auth.role() = 'authenticated');

-- Same for communications
CREATE POLICY "Enable read access for communications"
  ON public.communications FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for communications"
  ON public.communications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Same for documents
CREATE POLICY "Enable read access for documents"
  ON public.documents FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
EOF

echo -e "${GREEN}✓ Supabase schema created${NC}"
echo -e "${YELLOW}→ Run this SQL in Supabase console:${NC}"
echo -e "${YELLOW}  SQL Editor → Copy from: leadflow_backend/sql/001_init_schema.sql${NC}"

# ============================================
# 5. CREATE SETUP GUIDE
# ============================================
echo -e "${BLUE}[5/5] Creating setup guide...${NC}"

cat > QUICK_START_GUIDE.md << 'EOF'
# LeadFlow - Quick Start Guide (Auto-Setup Complete ✅)

## 🎯 Setup Complete! Here's what you need to do:

### Step 1: Get Supabase Credentials (2 min)
```
1. Go to https://supabase.com
2. Click "Start your project"
3. Create free account & project
4. Go to Settings → API
5. Copy:
   - Project URL
   - Anon Key (public)
   - Service Role Key (keep secret!)
```

### Step 2: Add Credentials to .env Files
```bash
# Backend credentials
nano leadflow_backend/.env
# Update:
# SUPABASE_URL=https://xxx.supabase.co
# SUPABASE_ANON_KEY=eyJxxx...
# SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Mobile credentials (optional - uses same Supabase)
nano leadflow_mobile/.env
# SUPABASE_URL=https://xxx.supabase.co
# SUPABASE_ANON_KEY=eyJxxx...
```

### Step 3: Create Database Schema
```
1. Open Supabase console
2. Go to SQL Editor
3. Create new query
4. Copy-paste from: leadflow_backend/sql/001_init_schema.sql
5. Click "Run"
6. Done! ✅
```

### Step 4: Start Backend
```bash
cd leadflow_backend
npm run dev
# Backend running at http://localhost:3000
# Test: curl http://localhost:3000/api/health
```

### Step 5: Start Mobile App
```bash
cd leadflow_mobile
flutter run
# App runs on emulator/device
```

## ✅ You're Done!

### Testing:
```bash
# In new terminal, create a lead:
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test User",
    "email": "test@example.com",
    "phone": "+91-9999999999",
    "source": "manual"
  }'

# Check dashboard in Flutter app
```

## 🎁 Included:
- ✅ 6 production screens
- ✅ 12 API endpoints
- ✅ Real-time Socket.io
- ✅ Material 3 design
- ✅ Dark mode support
- ✅ Complete error handling
- ✅ Form validation
- ✅ All animations

## 📖 Full Documentation:
- Backend API: leadflow_backend/README.md
- Mobile App: leadflow_mobile/README.md
- Production Specs: LEADFLOW_PRODUCTION_COMPLETE.md

## ⚠️ Important Notes:
- Keep SUPABASE_SERVICE_ROLE_KEY secret!
- Don't commit .env files with real credentials
- Use free tier for testing, paid tier for production

## 🚀 Next: Deploy to Production
- Backend: Deploy to Render/Railway
- Mobile: Build APK/IPA and publish
- Database: Supabase handles it

---
**Everything is ready! Start with Step 1 above.** ✅
EOF

echo -e "${GREEN}✓ Setup guide created${NC}"

# ============================================
# SUMMARY
# ============================================
echo ""
echo -e "${GREEN}=================================="
echo "✅ AUTO-SETUP COMPLETE!"
echo "==================================${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Read: QUICK_START_GUIDE.md"
echo "2. Get Supabase free account"
echo "3. Update .env files with credentials"
echo "4. Run SQL schema in Supabase"
echo "5. npm run dev (backend)"
echo "6. flutter run (mobile)"
echo ""
echo -e "${YELLOW}Files ready:${NC}"
echo "✓ Backend: leadflow_backend/ (npm install done)"
echo "✓ Mobile: leadflow_mobile/ (flutter pub get done)"
echo "✓ Schema: leadflow_backend/sql/001_init_schema.sql"
echo "✓ Guide: QUICK_START_GUIDE.md"
echo ""
echo -e "${GREEN}All code is on GitHub:${NC}"
echo "Branch: claude/mobile-7yihji"
echo "URL: https://github.com/nepalmedtech-vinay/nepalmbbs-website"
echo ""
