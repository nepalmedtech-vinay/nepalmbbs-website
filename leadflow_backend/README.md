# LeadFlow Backend - Node.js/Express API Server

Production-grade backend for LeadFlow lead management system. Complete REST API with real-time WebSocket support, Supabase integration, and WhatsApp Business API webhook handling.

## ✨ Features

### Core API
- **Lead CRUD Operations** - Create, read, update leads
- **Real-time Communication Logging** - WhatsApp, Email, SMS, Calls
- **Lead Scoring** - Intelligent algorithm with automatic status updates
- **Lead 360 Intelligence** - Comprehensive lead analytics
- **Statistics & Analytics** - Tenant-level dashboard metrics

### Real-time Features
- **Socket.io WebSocket** - Live lead updates and notifications
- **Supabase Real-time** - PostgreSQL change subscriptions
- **Live Scoring Updates** - Instant score recalculation
- **WhatsApp Webhook** - Incoming message processing

### Integration
- **WhatsApp Business API** - Webhook receiver + message logging
- **Supabase PostgreSQL** - Multi-tenant database with RLS
- **Redis Caching** (optional) - Performance optimization
- **Bull Job Queue** (optional) - Async processing

## 🏗️ Architecture

```
src/
├── index.js                 # Main Express server with all endpoints

Routes:
├── GET  /api/health        # Health check
├── GET  /api/leads          # List leads (paginated)
├── GET  /api/leads/:id      # Get single lead
├── POST /api/leads          # Create lead
├── PUT  /api/leads/:id      # Update lead
├── GET  /api/leads/:id/communications    # Get communications
├── POST /api/leads/:id/communications    # Log communication
├── POST /api/leads/:id/score             # Calculate score
├── GET  /api/leads/:id/360               # Lead 360 intelligence
├── GET  /api/statistics/:tenant_id       # Analytics
├── GET  /api/webhook/whatsapp            # WhatsApp verification
└── POST /api/webhook/whatsapp            # WhatsApp messages
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free)
- WhatsApp Business account (optional)

### Setup

1. **Clone and install**
```bash
cd leadflow_backend
npm install
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Start development server**
```bash
npm run dev
# Server runs on http://localhost:3000
```

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-key

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=phone-id
WHATSAPP_API_TOKEN=token
WHATSAPP_VERIFY_TOKEN=token

# Security
JWT_SECRET=your-secret
ALLOWED_ORIGINS=http://localhost:3000
```

## 📊 API Endpoints

### Lead Management

**List Leads**
```bash
GET /api/leads?tenant_id=default&status=Hot&limit=50&offset=0

Response:
{
  "data": [{ lead object }],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

**Create Lead**
```bash
POST /api/leads
Content-Type: application/json

{
  "tenant_id": "default",
  "full_name": "Priya Sharma",
  "email": "priya@email.com",
  "phone": "+91-9876543210",
  "source": "email",
  "college": "AIIMS Delhi",
  "neet_score": "650"
}

Response: { lead object with calculated score }
```

**Update Lead**
```bash
PUT /api/leads/{id}

{
  "status": "Hot",
  "lead_score": 85,
  "neet_score": "700"
}
```

### Communication

**Get Communications**
```bash
GET /api/leads/{lead_id}/communications?limit=50
```

**Log Communication**
```bash
POST /api/leads/{lead_id}/communications

{
  "type": "whatsapp",
  "direction": "outbound",
  "content": "Hi Priya, about your admission...",
  "sender": "+91-9876543210",
  "recipient": "+91-7777777777"
}
```

### Scoring & Intelligence

**Calculate Score**
```bash
POST /api/leads/{id}/score

Response:
{
  "lead_id": "uuid",
  "score": 85,
  "status": "Hot"
}
```

**Lead 360**
```bash
GET /api/leads/{id}/360

Response:
{
  "overall_score": 85,
  "engagement_metrics": { ... },
  "behavior_analysis": { ... },
  "risk_indicators": { ... },
  "recommended_actions": [],
  "next_best_action": "Schedule call"
}
```

### Analytics

**Statistics**
```bash
GET /api/statistics/{tenant_id}

Response:
{
  "total_leads": 150,
  "by_status": {
    "converted": 20,
    "hot": 35,
    "warm": 60,
    "cold": 35
  },
  "by_source": { ... },
  "average_score": 62
}
```

## 🔌 WebSocket Events

### Socket.io Real-time

**Join Lead Room**
```javascript
socket.emit('join_lead', 'lead-uuid');
```

**Listen to Updates**
```javascript
socket.on('lead:created', (lead) => { ... });
socket.on('lead:updated', (lead) => { ... });
socket.on('score:updated', (data) => { ... });
socket.on('communication:logged', (comm) => { ... });
socket.on('whatsapp:message', (msg) => { ... });
```

## 📱 WhatsApp Webhook

### Setup WhatsApp

1. Create app at developers.facebook.com
2. Add WhatsApp Business API
3. Get Phone Number ID and API Token
4. Set webhook URL: `https://your-domain.com/api/webhook/whatsapp`
5. Verify token

### Webhook Flow

```
WhatsApp Message → Webhook → Find/Create Lead
                           → Log Communication
                           → Emit Socket event
                           → Return 200 OK
```

## 🗄️ Database Schema

### Leads Table
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY,
  tenant_id VARCHAR(255),
  full_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(255),
  source VARCHAR(50),
  lead_score INTEGER,
  status VARCHAR(50),
  college VARCHAR(255),
  course VARCHAR(255),
  neet_score VARCHAR(10),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Communications Table
```sql
CREATE TABLE communications (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  tenant_id VARCHAR(255),
  type VARCHAR(50),
  direction VARCHAR(20),
  content TEXT,
  sender VARCHAR(255),
  recipient VARCHAR(255),
  timestamp TIMESTAMP
);
```

## 🧪 Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```

## 📦 Dependencies

### Core
- **express** - Web framework
- **cors** - Cross-origin requests
- **helmet** - Security headers

### Database
- **@supabase/supabase-js** - Supabase client

### Real-time
- **socket.io** - WebSocket server
- **redis** - Caching (optional)
- **bull** - Job queue (optional)

### Utils
- **dotenv** - Environment variables
- **winston** - Logging
- **uuid** - ID generation
- **axios** - HTTP client
- **joi** - Validation

## 🚀 Deployment

### Render (Recommended - Free)

1. Push code to GitHub
2. Connect GitHub to Render
3. Create Web Service
4. Set environment variables
5. Deploy

### Railway

```bash
railway login
railway init
railway up
```

### Vercel (Serverless)

```bash
vercel deploy
```

## 🔒 Security

- Row-Level Security (RLS) policies in Supabase
- JWT authentication (ready to implement)
- Helmet security headers
- CORS whitelist
- Environment variables for secrets
- Input validation with Joi

## 📈 Scaling

### Phase 1 (MVP)
- Single instance on Render
- Supabase free tier
- ₹0/month

### Phase 2 (Growth)
- Load balancer + multiple instances
- Redis caching layer
- Supabase pro plan
- ₹5,000-10,000/month

### Phase 3 (Scale)
- Kubernetes cluster
- Database replication
- CDN for assets
- ₹20,000+/month

## 🆘 Troubleshooting

### Can't connect to Supabase
- Verify SUPABASE_URL and keys in .env
- Check Supabase project settings
- Ensure RLS policies allow your role

### WhatsApp webhook not receiving
- Verify webhook URL is public
- Check WHATSAPP_VERIFY_TOKEN
- Test with curl:
```bash
curl -X GET "http://localhost:3000/api/webhook/whatsapp?hub.verify_token=TOKEN&hub.challenge=CHALLENGE"
```

### Socket.io not connecting
- Check CORS configuration
- Verify client and server ports
- Check browser console for errors

## 📝 License

Proprietary - MBBS Admissions Platform

## 🤝 Support

For issues or questions:
- Check logs: `npm run dev` output
- Review `.env` configuration
- See deployment documentation

---

**Built with ❤️ using Node.js and Express**
