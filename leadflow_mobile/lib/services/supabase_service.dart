import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/lead.dart';
import '../models/communication.dart';

class SupabaseService {
  static final SupabaseService _instance = SupabaseService._internal();

  late SupabaseClient _supabase;

  SupabaseService._internal();

  factory SupabaseService() {
    return _instance;
  }

  SupabaseClient get client => _supabase;

  Future<void> initialize() async {
    _supabase = Supabase.instance.client;
  }

  // LEAD OPERATIONS
  Future<List<Lead>> getLeads({
    String? tenantId,
    String? status,
    int? limit = 50,
    int? offset = 0,
  }) async {
    try {
      var query = _supabase.from('leads').select();

      if (tenantId != null) {
        query = query.eq('tenant_id', tenantId);
      }

      if (status != null) {
        query = query.eq('status', status);
      }

      query = query
          .order('updated_at', ascending: false)
          .range(offset ?? 0, (offset ?? 0) + (limit ?? 50) - 1);

      final data = await query;
      return (data as List).map((item) => Lead.fromJson(item)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<Lead?> getLead(String leadId) async {
    try {
      final data =
          await _supabase.from('leads').select().eq('id', leadId).single();
      return Lead.fromJson(data);
    } catch (e) {
      return null;
    }
  }

  Future<Lead> createLead(Map<String, dynamic> leadData) async {
    try {
      final data = await _supabase.from('leads').insert(leadData).select().single();
      return Lead.fromJson(data);
    } catch (e) {
      rethrow;
    }
  }

  Future<Lead> updateLead(String leadId, Map<String, dynamic> updates) async {
    try {
      final data = await _supabase
          .from('leads')
          .update(updates)
          .eq('id', leadId)
          .select()
          .single();
      return Lead.fromJson(data);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteLead(String leadId) async {
    try {
      await _supabase.from('leads').delete().eq('id', leadId);
    } catch (e) {
      rethrow;
    }
  }

  // COMMUNICATION OPERATIONS
  Future<List<Communication>> getCommunications({
    required String leadId,
    int? limit = 50,
  }) async {
    try {
      final data = await _supabase
          .from('communications')
          .select()
          .eq('lead_id', leadId)
          .order('timestamp', ascending: false)
          .limit(limit ?? 50);
      return (data as List).map((item) => Communication.fromJson(item)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<Communication> logCommunication(
    Map<String, dynamic> communicationData,
  ) async {
    try {
      final data = await _supabase
          .from('communications')
          .insert(communicationData)
          .select()
          .single();
      return Communication.fromJson(data);
    } catch (e) {
      rethrow;
    }
  }

  // REAL-TIME SUBSCRIPTIONS
  RealtimeChannel subscribeToLeads(String tenantId) {
    return _supabase.channel('leads:$tenantId').on(
      RealtimeListenTypes.postgresChanges,
      ChannelFilter(
        event: '*',
        schema: 'public',
        table: 'leads',
        filter: 'tenant_id=eq.$tenantId',
      ),
      (payload, [ref]) {
        // Handle changes
      },
    );
  }

  RealtimeChannel subscribeToLeadCommunications(String leadId) {
    return _supabase.channel('communications:$leadId').on(
      RealtimeListenTypes.postgresChanges,
      ChannelFilter(
        event: '*',
        schema: 'public',
        table: 'communications',
        filter: 'lead_id=eq.$leadId',
      ),
      (payload, [ref]) {
        // Handle changes
      },
    );
  }

  Future<void> unsubscribe(String channelName) async {
    try {
      await _supabase.removeChannel(
        _supabase.getChannel(channelName),
      );
    } catch (e) {
      // Channel might not exist
    }
  }

  // SEARCH OPERATIONS
  Future<List<Lead>> searchLeads({
    required String tenantId,
    required String query,
    int? limit = 20,
  }) async {
    try {
      final data = await _supabase.from('leads').select().eq('tenant_id', tenantId).ilike('full_name', '%$query%').limit(limit ?? 20);
      return (data as List).map((item) => Lead.fromJson(item)).toList();
    } catch (e) {
      rethrow;
    }
  }
}
