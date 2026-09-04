import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/lead.dart';
import '../services/supabase_service.dart';

final supabaseServiceProvider = Provider((ref) {
  return SupabaseService();
});

final leadsProvider = FutureProvider.family<List<Lead>, String>((ref, tenantId) async {
  final supabaseService = ref.watch(supabaseServiceProvider);
  return supabaseService.getLeads(tenantId: tenantId);
});

final leadProvider = FutureProvider.family<Lead?, String>((ref, leadId) async {
  final supabaseService = ref.watch(supabaseServiceProvider);
  return supabaseService.getLead(leadId);
});

final leadsByStatusProvider =
    FutureProvider.family<List<Lead>, (String, String)>((ref, params) async {
  final supabaseService = ref.watch(supabaseServiceProvider);
  final (tenantId, status) = params;
  return supabaseService.getLeads(
    tenantId: tenantId,
    status: status,
  );
});

final leadSearchProvider =
    FutureProvider.family<List<Lead>, (String, String)>((ref, params) async {
  final supabaseService = ref.watch(supabaseServiceProvider);
  final (tenantId, query) = params;
  return supabaseService.searchLeads(
    tenantId: tenantId,
    query: query,
  );
});

final leadStatisticsProvider = FutureProvider.family<Map<String, int>, String>(
  (ref, tenantId) async {
    final supabaseService = ref.watch(supabaseServiceProvider);
    final leads = await supabaseService.getLeads(tenantId: tenantId);

    return {
      'total': leads.length,
      'hot': leads.where((l) => l.status == 'Hot').length,
      'warm': leads.where((l) => l.status == 'Warm').length,
      'cold': leads.where((l) => l.status == 'Cold').length,
      'converted': leads.where((l) => l.status == 'Converted').length,
    };
  },
);
