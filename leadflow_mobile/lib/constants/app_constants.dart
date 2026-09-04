import 'package:flutter/material.dart';

class AppConstants {
  // App Info
  static const String appName = 'LeadFlow';
  static const String appVersion = '1.0.0';
  static const String appTagline = 'Premium Lead Lifecycle Management';

  // Lead Status
  static const String statusConverted = 'Converted';
  static const String statusHot = 'Hot';
  static const String statusWarm = 'Warm';
  static const String statusCold = 'Cold';

  // Lead Score Ranges
  static const int hotScoreMin = 75;
  static const int warmScoreMin = 50;
  static const int coldScoreMax = 49;

  // Communication Types
  static const String commWhatsApp = 'whatsapp';
  static const String commEmail = 'email';
  static const String commSMS = 'sms';
  static const String commCall = 'call';
  static const String commVideoCall = 'video_call';
  static const String commMeeting = 'meeting';
  static const String commNote = 'note';

  // Communication Directions
  static const String dirInbound = 'inbound';
  static const String dirOutbound = 'outbound';

  // API Timeouts
  static const Duration apiTimeout = Duration(seconds: 30);
  static const Duration realtimeTimeout = Duration(seconds: 60);

  // Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;

  // Delays for Animations
  static const Duration animationDuration = Duration(milliseconds: 400);
  static const Duration longAnimationDuration = Duration(milliseconds: 800);
  static const Duration shortAnimationDuration = Duration(milliseconds: 200);

  // UI Dimensions
  static const double cornerRadius = 16.0;
  static const double smallCornerRadius = 8.0;
  static const double defaultPadding = 16.0;
  static const double defaultMargin = 16.0;

  // NEET Score
  static const int maxNeetScore = 720;

  // Tenant ID (default for MVP)
  static const String defaultTenantId = 'default';

  // Date Formats
  static const String dateFormat = 'dd MMM yyyy';
  static const String timeFormat = 'hh:mm a';
  static const String dateTimeFormat = 'dd MMM yyyy, hh:mm a';

  // Score Recommendations
  static const Map<String, String> scoreRecommendations = {
    'hot': 'Schedule immediate consultation call',
    'warm': 'Send personalized counseling offer',
    'cold': 'Send intro message and college brochure',
    'converted': 'Onboard to admission process',
  };
}

class AppStrings {
  // Navigation
  static const String dashboard = 'Dashboard';
  static const String leads = 'Leads';
  static const String profile = 'Profile';
  static const String settings = 'Settings';

  // Lead Screen
  static const String totalLeads = 'Total Leads';
  static const String conversionRate = 'Conversion Rate';
  static const String thisWeek = 'This Week';
  static const String followUp = 'Follow-up';
  static const String activeLead = 'Active Leads';
  static const String addNewLead = 'Add New Lead';

  // Forms
  static const String fullName = 'Full Name';
  static const String email = 'Email';
  static const String phone = 'Phone Number';
  static const String college = 'College';
  static const String course = 'Course';
  static const String neetScore = 'NEET Score';
  static const String notes = 'Notes';
  static const String source = 'Source';
  static const String submit = 'Submit';
  static const String cancel = 'Cancel';
  static const String save = 'Save';
  static const String update = 'Update';
  static const String delete = 'Delete';
  static const String edit = 'Edit';

  // Messages
  static const String loadingLeads = 'Loading leads...';
  static const String noLeads = 'No leads found';
  static const String errorLoadingLeads = 'Error loading leads';
  static const String leadCreatedSuccess = 'Lead created successfully';
  static const String leadUpdatedSuccess = 'Lead updated successfully';
  static const String leadDeletedSuccess = 'Lead deleted successfully';
  static const String errorCreatingLead = 'Error creating lead';
  static const String confirmDelete = 'Are you sure?';

  // Communication
  static const String communications = 'Communications';
  static const String sendMessage = 'Send Message';
  static const String callNow = 'Call Now';
  static const String videoCall = 'Video Call';
  static const String lastContact = 'Last Contact';
  static const String messageHistory = 'Message History';

  // Lead 360
  static const String lead360 = 'Lead 360';
  static const String engagementScore = 'Engagement Score';
  static const String riskIndicators = 'Risk Indicators';
  static const String nextBestAction = 'Next Best Action';
  static const String recommendedActions = 'Recommended Actions';

  // Status & Urgency
  static const String urgent = 'Urgent';
  static const String high = 'High';
  static const String medium = 'Medium';
  static const String low = 'Low';

  // Empty States
  static const String noCommunications = 'No communications yet';
  static const String noDocuments = 'No documents uploaded';
}

// Lead Status Color Map
class LeadStatusColors {
  static const Map<String, Color> statusColorMap = {
    AppConstants.statusConverted: Color(0xFF10B981),
    AppConstants.statusHot: Color(0xFFF59E0B),
    AppConstants.statusWarm: Color(0xFF8B5CF6),
    AppConstants.statusCold: Color(0xFF6B7280),
  };

  static Color getStatusColor(String status) {
    return statusColorMap[status] ?? const Color(0xFF6B7280);
  }

  static Color getScoreColor(int score) {
    if (score >= AppConstants.hotScoreMin) return const Color(0xFF10B981);
    if (score >= AppConstants.warmScoreMin) return const Color(0xFF8B5CF6);
    return const Color(0xFF6B7280);
  }
}

// Communication Type Icons & Colors
class CommunicationConfig {
  static const Map<String, IconData> typeIcons = {
    AppConstants.commWhatsApp: Icons.whatsapp,
    AppConstants.commEmail: Icons.email_outlined,
    AppConstants.commSMS: Icons.sms_outlined,
    AppConstants.commCall: Icons.phone_outlined,
    AppConstants.commVideoCall: Icons.videocam_outlined,
    AppConstants.commMeeting: Icons.meeting_room_outlined,
    AppConstants.commNote: Icons.note_outlined,
  };

  static const Map<String, String> typeLabels = {
    AppConstants.commWhatsApp: 'WhatsApp',
    AppConstants.commEmail: 'Email',
    AppConstants.commSMS: 'SMS',
    AppConstants.commCall: 'Call',
    AppConstants.commVideoCall: 'Video Call',
    AppConstants.commMeeting: 'Meeting',
    AppConstants.commNote: 'Note',
  };

  static IconData getIcon(String type) => typeIcons[type] ?? Icons.chat_outlined;
  static String getLabel(String type) => typeLabels[type] ?? 'Communication';
}
