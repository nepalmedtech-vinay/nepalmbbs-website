import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ============================================
// AI SERVICE - Claude API Integration
// ============================================
export class AIService {
  static async analyzeLeadIntent(message, leadData = {}) {
    try {
      const prompt = `
        Analyze this message from a lead and provide:
        1. Intent (inquiry, negotiation, objection, etc.)
        2. Confidence (0-100)
        3. Suggested response action

        Lead context:
        - Name: ${leadData.full_name || 'Unknown'}
        - Current score: ${leadData.lead_score || 'N/A'}
        - College interest: ${leadData.college || 'N/A'}

        Message: "${message}"

        Respond in JSON format only.
      `;

      // Mock implementation - replace with actual Claude API call
      return {
        intent: 'inquiry',
        confidence: 92,
        suggestedAction: 'Send detailed college information and NEET prep guide',
        analysis: 'Lead is genuinely interested in admission process',
      };
    } catch (error) {
      console.error('AI analysis error:', error);
      throw error;
    }
  }

  static async generateLeadInsight(leadId) {
    try {
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      const { data: communications } = await supabase
        .from('communications')
        .select('*')
        .eq('lead_id', leadId)
        .limit(10);

      const prompt = `
        Generate personalized insights for this lead:
        Name: ${lead.full_name}
        Score: ${lead.lead_score}
        Last contact: ${lead.updated_at}
        Communication count: ${communications.length}

        Provide:
        1. Lead temperament assessment
        2. Engagement pattern
        3. Recommended next steps
        4. Potential barriers to admission
      `;

      return {
        temperament: 'Highly interested',
        engagementPattern: 'Responsive and proactive',
        nextSteps: ['Schedule consultation', 'Send form'],
        barriers: ['Budget concerns', 'Seat availability'],
      };
    } catch (error) {
      console.error('Lead insight error:', error);
      throw error;
    }
  }
}

// ============================================
// WHATSAPP SERVICE - Meta Business API
// ============================================
export class WhatsAppService {
  static async sendMessage(phoneNumber, message, leadId = null) {
    try {
      const url = `https://graph.instagram.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: {
          body: message,
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
        },
      });

      // Log communication
      if (leadId) {
        await supabase.from('communications').insert({
          id: crypto.randomUUID(),
          lead_id: leadId,
          type: 'whatsapp',
          direction: 'outbound',
          content: message,
          sender: process.env.WHATSAPP_PHONE_NUMBER_ID,
          recipient: phoneNumber,
          timestamp: new Date().toISOString(),
        });
      }

      return response.data;
    } catch (error) {
      console.error('WhatsApp send error:', error);
      throw error;
    }
  }

  static async sendTemplate(phoneNumber, templateName, parameters, leadId = null) {
    try {
      const url = `https://graph.instagram.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'en_US',
          },
          parameters: {
            body: {
              parameters: parameters,
            },
          },
        },
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
        },
      });

      if (leadId) {
        await supabase.from('communications').insert({
          id: crypto.randomUUID(),
          lead_id: leadId,
          type: 'whatsapp',
          direction: 'outbound',
          content: `Template: ${templateName}`,
          sender: process.env.WHATSAPP_PHONE_NUMBER_ID,
          recipient: phoneNumber,
          timestamp: new Date().toISOString(),
        });
      }

      return response.data;
    } catch (error) {
      console.error('WhatsApp template error:', error);
      throw error;
    }
  }
}

// ============================================
// DOCUMENT SERVICE - OCR & File Processing
// ============================================
export class DocumentService {
  static async processDocument(fileBuffer, leadId) {
    try {
      // Upload to Supabase Storage
      const filename = `${leadId}/doc_${Date.now()}.pdf`;
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filename, fileBuffer);

      if (error) throw error;

      // Extract text using OCR (mock implementation)
      const extractedText = await this.extractTextFromPDF(fileBuffer);

      // Store document metadata
      await supabase.from('documents').insert({
        id: crypto.randomUUID(),
        lead_id: leadId,
        filename: filename,
        extracted_text: extractedText,
        upload_date: new Date().toISOString(),
        verified: false,
      });

      return {
        filename,
        extractedText,
        status: 'uploaded',
      };
    } catch (error) {
      console.error('Document processing error:', error);
      throw error;
    }
  }

  static async extractTextFromPDF(buffer) {
    // Mock OCR extraction - integrate with Tesseract.js in production
    return 'Extracted text from document';
  }

  static async verifyDocument(documentId, verificationStatus) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update({
          verified: verificationStatus,
          verified_at: new Date().toISOString(),
        })
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Document verification error:', error);
      throw error;
    }
  }
}

// ============================================
// EMAIL SERVICE - Nodemailer Integration
// ============================================
export class EmailService {
  static async sendAdmissionOffer(leadEmail, leadName, collegeInfo) {
    try {
      const emailContent = `
        Dear ${leadName},

        Congratulations! You have been selected for admission at ${collegeInfo.name}.

        College Details:
        - Course: ${collegeInfo.course}
        - Duration: ${collegeInfo.duration}
        - Fees: ${collegeInfo.fees}

        Please log in to your portal to complete the admission process.

        Best regards,
        LeadFlow Admissions Team
      `;

      // Mock implementation - integrate with actual email service
      return {
        to: leadEmail,
        subject: `Admission Offer - ${collegeInfo.name}`,
        status: 'sent',
      };
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }

  static async sendFollowUpEmail(leadEmail, leadName, followUpData) {
    try {
      // Personalized follow-up based on lead behavior
      const template = this.selectFollowUpTemplate(followUpData.leadScore);

      return {
        to: leadEmail,
        subject: template.subject,
        body: template.body,
        status: 'sent',
      };
    } catch (error) {
      console.error('Follow-up email error:', error);
      throw error;
    }
  }

  static selectFollowUpTemplate(score) {
    if (score >= 80) {
      return {
        subject: 'Complete Your Admission - Time Sensitive',
        body: 'Your admission deadline is approaching...',
      };
    } else if (score >= 50) {
      return {
        subject: 'We would love to help with your admission journey',
        body: 'Learn more about our college...',
      };
    } else {
      return {
        subject: 'Explore Medical Admission Opportunities',
        body: 'Check out our programs and NEET guidance...',
      };
    }
  }
}

// ============================================
// SCORING SERVICE - Advanced Algorithm
// ============================================
export class ScoringService {
  static calculateDetailedScore(leadData, communications = []) {
    let score = 0;
    const breakdown = {};

    // NEET Score (40 points max)
    if (leadData.neet_score) {
      const neetScore = parseInt(leadData.neet_score);
      const neetPoints = Math.min(40, (neetScore / 720) * 40);
      breakdown.neetScore = neetPoints;
      score += neetPoints;
    }

    // Engagement (30 points max)
    const engagementScore = this.calculateEngagementScore(communications);
    breakdown.engagement = engagementScore;
    score += engagementScore;

    // Recency (15 points max)
    const recencyScore = this.calculateRecencyScore(leadData.updated_at);
    breakdown.recency = recencyScore;
    score += recencyScore;

    // Forms Completion (10 points max)
    if (leadData.form_filled) score += 10;
    breakdown.formCompletion = leadData.form_filled ? 10 : 0;

    // Document Submission (5 points max)
    if (leadData.document_submitted) score += 5;
    breakdown.documents = leadData.document_submitted ? 5 : 0;

    return {
      totalScore: Math.min(100, Math.round(score)),
      breakdown,
      confidence: 85,
      lastUpdated: new Date().toISOString(),
    };
  }

  static calculateEngagementScore(communications) {
    const maxPoints = 30;
    const weight = {
      whatsapp: 2,
      email: 1.5,
      call: 3,
      video_call: 4,
      meeting: 5,
    };

    let engagementPoints = 0;
    communications.forEach((comm) => {
      engagementPoints +=
        (weight[comm.type] || 1) * (comm.direction === 'inbound' ? 1.5 : 1);
    });

    return Math.min(maxPoints, engagementPoints);
  }

  static calculateRecencyScore(lastUpdated) {
    const now = new Date();
    const lastUpdate = new Date(lastUpdated);
    const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate <= 1) return 15;
    if (daysSinceUpdate <= 3) return 12;
    if (daysSinceUpdate <= 7) return 8;
    if (daysSinceUpdate <= 30) return 4;
    return 0;
  }
}

// ============================================
// NOTIFICATION SERVICE
// ============================================
export class NotificationService {
  static async notifyCounselor(counselorId, leadData, actionType) {
    try {
      const notifications = {
        hot_lead: `New hot lead: ${leadData.full_name} (Score: ${leadData.lead_score})`,
        follow_up_due: `Follow-up due for ${leadData.full_name}`,
        admission_ready: `${leadData.full_name} ready for admission!`,
      };

      const message = notifications[actionType] || 'New lead activity';

      // Store notification in DB
      await supabase.from('notifications').insert({
        id: crypto.randomUUID(),
        counselor_id: counselorId,
        lead_id: leadData.id,
        message,
        type: actionType,
        read: false,
        created_at: new Date().toISOString(),
      });

      return { status: 'notified', message };
    } catch (error) {
      console.error('Notification error:', error);
      throw error;
    }
  }

  static async sendPushNotification(deviceToken, title, body, leadId = null) {
    try {
      // Integration with Firebase Cloud Messaging would go here
      return {
        status: 'sent',
        title,
        body,
        deviceToken,
      };
    } catch (error) {
      console.error('Push notification error:', error);
      throw error;
    }
  }
}

// ============================================
// LEAD ENRICHMENT SERVICE
// ============================================
export class LeadEnrichmentService {
  static async enrichLeadData(leadId) {
    try {
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      // Fetch related data
      const { data: communications } = await supabase
        .from('communications')
        .select('*')
        .eq('lead_id', leadId);

      const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .eq('lead_id', leadId);

      // Calculate enriched data
      const enriched = {
        ...lead,
        communicationCount: communications.length,
        lastCommunicationType:
          communications.length > 0 ? communications[0].type : null,
        documentCount: documents.length,
        documentsVerified: documents.filter((d) => d.verified).length,
        engagementLevel:
          communications.length > 5
            ? 'High'
            : communications.length > 2
              ? 'Medium'
              : 'Low',
      };

      return enriched;
    } catch (error) {
      console.error('Lead enrichment error:', error);
      throw error;
    }
  }
}

// ============================================
// WORKFLOW SERVICE - Automated Sequences
// ============================================
export class WorkflowService {
  static async triggerAutoRespond(leadId, communicationType) {
    try {
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (communicationType === 'whatsapp') {
        const autoResponse =
          this.getAutoResponseTemplate(lead.lead_score, lead.status);
        await WhatsAppService.sendMessage(lead.phone, autoResponse, leadId);
      }

      return { status: 'auto_response_sent' };
    } catch (error) {
      console.error('Workflow error:', error);
      throw error;
    }
  }

  static getAutoResponseTemplate(score, status) {
    const templates = {
      hot: 'Thanks for your interest! We would love to schedule a consultation. Would today or tomorrow work better for you?',
      warm: 'Thank you for reaching out! Let us help you with your admission journey.',
      cold: 'Hi! Thanks for connecting. Here are some resources to get you started.',
    };

    return templates[status.toLowerCase()] || templates.cold;
  }

  static async scheduleFollowUp(leadId, delayMinutes, action) {
    try {
      const followUpTime = new Date(Date.now() + delayMinutes * 60 * 1000);

      await supabase.from('scheduled_followups').insert({
        id: crypto.randomUUID(),
        lead_id: leadId,
        action,
        scheduled_for: followUpTime.toISOString(),
        executed: false,
      });

      return { status: 'follow_up_scheduled', scheduledFor: followUpTime };
    } catch (error) {
      console.error('Follow-up scheduling error:', error);
      throw error;
    }
  }
}
