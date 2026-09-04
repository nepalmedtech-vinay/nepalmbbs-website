import 'package:freezed_annotation/freezed_annotation.dart';

part 'lead_score.freezed.dart';
part 'lead_score.g.dart';

@freezed
class LeadScore with _$LeadScore {
  const factory LeadScore({
    required String id,
    required String leadId,
    required int totalScore,
    required int engagementScore,
    required int qualificationScore,
    required int timelinessScore,
    required int budgetScore,
    required String recommendation,
    required DateTime calculatedAt,
    String? aiInsights,
  }) = _LeadScore;

  factory LeadScore.fromJson(Map<String, dynamic> json) =>
      _$LeadScoreFromJson(json);
}

@freezed
class Lead360 with _$Lead360 {
  const factory Lead360({
    required String leadId,
    required int overallScore,
    required Map<String, dynamic> behaviorAnalysis,
    required Map<String, dynamic> engagementMetrics,
    required Map<String, dynamic> riskIndicators,
    required List<String> recommendedActions,
    required String nextBestAction,
    required String urgencyLevel,
    required DateTime lastAnalyzed,
  }) = _Lead360;

  factory Lead360.fromJson(Map<String, dynamic> json) =>
      _$Lead360FromJson(json);
}
