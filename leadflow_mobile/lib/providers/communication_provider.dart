import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/communication.dart';
import '../services/supabase_service.dart';
import 'lead_provider.dart';

final communicationsProvider =
    FutureProvider.family<List<Communication>, String>((ref, leadId) async {
  final supabaseService = ref.watch(supabaseServiceProvider);
  return supabaseService.getCommunications(leadId: leadId);
});

final recentCommunicationsProvider =
    FutureProvider.family<List<Communication>, String>((ref, leadId) async {
  final supabaseService = ref.watch(supabaseServiceProvider);
  final communications =
      await supabaseService.getCommunications(leadId: leadId, limit: 10);
  return communications;
});

final communicationStatsProvider =
    FutureProvider.family<Map<String, int>, String>((ref, leadId) async {
  final supabaseService = ref.watch(supabaseServiceProvider);
  final communications =
      await supabaseService.getCommunications(leadId: leadId);

  return {
    'total': communications.length,
    'whatsapp':
        communications.where((c) => c.type == CommunicationType.whatsapp).length,
    'email':
        communications.where((c) => c.type == CommunicationType.email).length,
    'sms': communications.where((c) => c.type == CommunicationType.sms).length,
    'calls': communications
        .where((c) =>
            c.type == CommunicationType.call ||
            c.type == CommunicationType.video_call)
        .length,
  };
});
