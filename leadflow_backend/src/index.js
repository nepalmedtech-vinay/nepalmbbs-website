import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

dotenv.config();

// Logger Setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Express App Setup
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ============================================
// HELPER FUNCTIONS
// ============================================

async function calculateLeadScore(leadData) {
  let score = 0;

  if (leadData.neet_score) {
    const neetScore = parseInt(leadData.neet_score);
    score += Math.min(40, (neetScore / 720) * 40);
  }

  if (leadData.engagement_count) {
    score += Math.min(20, leadData.engagement_count * 2);
  }

  if (leadData.last_contacted_days) {
    if (leadData.last_contacted_days <= 1) score += 15;
    else if (leadData.last_contacted_days <= 7) score += 10;
    else if (leadData.last_contacted_days <= 30) score += 5;
  }

  if (leadData.form_filled) score += 15;
  if (leadData.document_submitted) score += 10;

  return Math.min(100, Math.round(score));
}

function getLeadStatus(score) {
  if (score >= 80) return 'Converted';
  if (score >= 65) return 'Hot';
  if (score >= 45) return 'Warm';
  return 'Cold';
}

// ============================================
// API ENDPOINTS
// ============================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ============================================
// LEAD ENDPOINTS
// ============================================

// Get all leads with pagination
app.get('/api/leads', async (req, res) => {
  try {
    const { tenant_id, status, limit = 50, offset = 0 } = req.query;

    let query = supabase.from('leads').select('*');

    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('updated_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      data,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error('Get leads error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single lead
app.get('/api/leads/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    logger.error('Get lead error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new lead
app.post('/api/leads', async (req, res) => {
  try {
    const {
      tenant_id = 'default',
      full_name,
      email,
      phone,
      source,
      college,
      course,
      neet_score,
    } = req.body;

    if (!full_name || !email || !phone) {
      return res.status(400).json({
        error: 'Missing required fields: full_name, email, phone',
      });
    }

    const leadScore = await calculateLeadScore({ neet_score });
    const status = getLeadStatus(leadScore);

    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          id: uuidv4(),
          tenant_id,
          full_name,
          email,
          phone,
          source,
          lead_score: leadScore,
          status,
          college,
          course,
          neet_score,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Notify via Socket.io
    io.emit('lead:created', data);

    res.status(201).json(data);
  } catch (error) {
    logger.error('Create lead error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update lead
app.put('/api/leads/:id', async (req, res) => {
  try {
    const updates = {
      ...req.body,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    io.emit('lead:updated', data);
    res.json(data);
  } catch (error) {
    logger.error('Update lead error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// COMMUNICATION ENDPOINTS
// ============================================

// Get communications for a lead
app.get('/api/leads/:lead_id/communications', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const { data, error } = await supabase
      .from('communications')
      .select('*')
      .eq('lead_id', req.params.lead_id)
      .order('timestamp', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({ data });
  } catch (error) {
    logger.error('Get communications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Log communication
app.post('/api/leads/:lead_id/communications', async (req, res) => {
  try {
    const {
      type,
      direction,
      content,
      sender,
      recipient,
      duration,
      recording_url,
    } = req.body;

    const { data, error } = await supabase
      .from('communications')
      .insert([
        {
          id: uuidv4(),
          lead_id: req.params.lead_id,
          tenant_id: req.body.tenant_id || 'default',
          type,
          direction,
          content,
          sender,
          recipient,
          duration,
          recording_url,
          timestamp: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    io.emit('communication:logged', data);
    res.status(201).json(data);
  } catch (error) {
    logger.error('Log communication error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SCORING ENDPOINTS
// ============================================

// Calculate and update lead score
app.post('/api/leads/:id/score', async (req, res) => {
  try {
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (leadError) throw leadError;

    const score = await calculateLeadScore(lead);
    const status = getLeadStatus(score);

    const { data, error } = await supabase
      .from('leads')
      .update({
        lead_score: score,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    io.emit('score:updated', {
      lead_id: req.params.id,
      score,
      status,
    });

    res.json({ lead_id: req.params.id, score, status });
  } catch (error) {
    logger.error('Calculate score error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get lead 360 intelligence
app.get('/api/leads/:id/360', async (req, res) => {
  try {
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (leadError) throw leadError;

    const { data: communications, error: commError } = await supabase
      .from('communications')
      .select('*')
      .eq('lead_id', req.params.id);

    if (commError) throw commError;

    const lead360 = {
      lead_id: req.params.id,
      overall_score: lead.lead_score,
      engagement_metrics: {
        total_communications: communications.length,
        whatsapp_count: communications.filter(
          (c) => c.type === 'whatsapp',
        ).length,
        call_count: communications.filter((c) => c.type === 'call').length,
        email_count: communications.filter((c) => c.type === 'email').length,
      },
      behavior_analysis: {
        response_time: 'Quick (< 2 hours)',
        engagement_level: lead.lead_score > 70 ? 'High' : 'Medium',
        priority_indicator: lead.status,
      },
      risk_indicators: {
        no_response_days:
          lead.last_contacted_days > 7 ? 'High Risk' : 'Low Risk',
        engagement_drop: communications.length < 3 ? 'Warning' : 'Healthy',
      },
      recommended_actions: [
        'Send personalized counseling offer',
        'Schedule video consultation',
        'Share college brochure and NEET prep guide',
      ],
      next_best_action: 'Schedule consultation call',
      urgency_level: lead.status === 'Hot' ? 'High' : 'Medium',
      last_analyzed: new Date().toISOString(),
    };

    res.json(lead360);
  } catch (error) {
    logger.error('Get lead 360 error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// WHATSAPP WEBHOOK
// ============================================

// WhatsApp webhook verification
app.get('/api/webhook/whatsapp', (req, res) => {
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.send(challenge);
  } else {
    res.status(403).send('Invalid token');
  }
});

// WhatsApp incoming messages
app.post('/api/webhook/whatsapp', async (req, res) => {
  try {
    const body = req.body;

    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0].value.messages
      ) {
        const message = body.entry[0].changes[0].value.messages[0];
        const from = message.from;
        const text = message.text.body;

        // Find or create lead
        const { data: existingLead, error: searchError } = await supabase
          .from('leads')
          .select('*')
          .eq('phone', `+${from}`)
          .single();

        let leadId;

        if (!existingLead && !searchError) {
          const { data: newLead, error: createError } = await supabase
            .from('leads')
            .insert([
              {
                id: uuidv4(),
                tenant_id: 'default',
                full_name: 'Unknown',
                phone: `+${from}`,
                email: `phone_${from}@temp.leadflow`,
                source: 'whatsapp',
                lead_score: 20,
                status: 'Cold',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ])
            .select()
            .single();

          if (createError) throw createError;
          leadId = newLead.id;
        } else {
          leadId = existingLead.id;
        }

        // Log communication
        const { error: commError } = await supabase
          .from('communications')
          .insert([
            {
              id: uuidv4(),
              lead_id: leadId,
              tenant_id: 'default',
              type: 'whatsapp',
              direction: 'inbound',
              content: text,
              sender: `+${from}`,
              recipient: process.env.WHATSAPP_PHONE_NUMBER_ID,
              timestamp: new Date().toISOString(),
            },
          ]);

        if (commError) throw commError;

        io.emit('whatsapp:message', {
          lead_id: leadId,
          from: `+${from}`,
          message: text,
        });

        res.json({ success: true });
      }
    }
  } catch (error) {
    logger.error('WhatsApp webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STATISTICS ENDPOINTS
// ============================================

// Get lead statistics
app.get('/api/statistics/:tenant_id', async (req, res) => {
  try {
    const { tenant_id } = req.params;

    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('tenant_id', tenant_id);

    if (error) throw error;

    const stats = {
      total_leads: leads.length,
      by_status: {
        converted: leads.filter((l) => l.status === 'Converted').length,
        hot: leads.filter((l) => l.status === 'Hot').length,
        warm: leads.filter((l) => l.status === 'Warm').length,
        cold: leads.filter((l) => l.status === 'Cold').length,
      },
      by_source: {
        whatsapp: leads.filter((l) => l.source === 'whatsapp').length,
        email: leads.filter((l) => l.source === 'email').length,
        manual: leads.filter((l) => l.source === 'manual').length,
      },
      average_score: Math.round(
        leads.reduce((sum, l) => sum + l.lead_score, 0) / leads.length,
      ),
    };

    res.json(stats);
  } catch (error) {
    logger.error('Get statistics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SOCKET.IO EVENTS
// ============================================

io.on('connection', (socket) => {
  logger.info('Client connected:', socket.id);

  socket.on('disconnect', () => {
    logger.info('Client disconnected:', socket.id);
  });

  socket.on('join_lead', (leadId) => {
    socket.join(`lead_${leadId}`);
    logger.info(`User joined lead room: ${leadId}`);
  });

  socket.on('leave_lead', (leadId) => {
    socket.leave(`lead_${leadId}`);
    logger.info(`User left lead room: ${leadId}`);
  });
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ============================================
// SERVER START
// ============================================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`LeadFlow Backend running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

export default app;
