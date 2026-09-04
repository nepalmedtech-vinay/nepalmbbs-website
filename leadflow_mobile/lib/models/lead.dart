import 'package:freezed_annotation/freezed_annotation.dart';

part 'lead.freezed.dart';
part 'lead.g.dart';

@freezed
class Lead with _$Lead {
  const factory Lead({
    required String id,
    required String tenantId,
    required String fullName,
    required String email,
    required String phone,
    required String source,
    required int leadScore,
    required String status,
    required DateTime createdAt,
    required DateTime updatedAt,
    String? college,
    String? course,
    String? city,
    String? state,
    String? neetScore,
    String? notes,
  }) = _Lead;

  factory Lead.fromJson(Map<String, dynamic> json) => _$LeadFromJson(json);
}

@freezed
class LeadFilter with _$LeadFilter {
  const factory LeadFilter({
    String? status,
    String? source,
    int? minScore,
    int? maxScore,
    DateTime? dateFrom,
    DateTime? dateTo,
    String? searchQuery,
  }) = _LeadFilter;

  factory LeadFilter.fromJson(Map<String, dynamic> json) =>
      _$LeadFilterFromJson(json);
}
