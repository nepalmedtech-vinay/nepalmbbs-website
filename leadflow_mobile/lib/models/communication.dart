import 'package:freezed_annotation/freezed_annotation.dart';

part 'communication.freezed.dart';
part 'communication.g.dart';

enum CommunicationType {
  whatsapp,
  email,
  sms,
  call,
  video_call,
  meeting,
  note,
}

enum CommunicationDirection { inbound, outbound }

@freezed
class Communication with _$Communication {
  const factory Communication({
    required String id,
    required String leadId,
    required String tenantId,
    required CommunicationType type,
    required CommunicationDirection direction,
    required String content,
    required String sender,
    required String recipient,
    required DateTime timestamp,
    String? duration,
    String? recordingUrl,
    String? transcription,
    String? aiAnalysis,
    Map<String, dynamic>? metadata,
  }) = _Communication;

  factory Communication.fromJson(Map<String, dynamic> json) =>
      _$CommunicationFromJson(json);
}

@freezed
class CommunicationTimeline with _$CommunicationTimeline {
  const factory CommunicationTimeline({
    required String leadId,
    required List<Communication> communications,
    required DateTime lastUpdated,
  }) = _CommunicationTimeline;

  factory CommunicationTimeline.fromJson(Map<String, dynamic> json) =>
      _$CommunicationTimelineFromJson(json);
}
