import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../constants/app_constants.dart';
import '../utils/extensions.dart';

class CallCockpitScreen extends StatefulWidget {
  const CallCockpitScreen({Key? key}) : super(key: key);

  @override
  State<CallCockpitScreen> createState() => _CallCockpitScreenState();
}

class _CallCockpitScreenState extends State<CallCockpitScreen> {
  final List<Map<String, dynamic>> nextLeads = [
    {
      'id': '1',
      'name': 'Priya Sharma',
      'college': 'AIIMS Delhi',
      'score': 92,
      'status': 'Hot',
      'lastContact': '2 days ago',
      'color': const Color(0xFF10B981),
      'priority': 'High',
      'suggestedTime': '2 mins',
      'bestAction': 'Discuss admission timeline',
    },
    {
      'id': '2',
      'name': 'Arjun Patel',
      'college': 'CMC Vellore',
      'score': 78,
      'status': 'Hot',
      'lastContact': '5 hours ago',
      'color': const Color(0xFFF59E0B),
      'priority': 'High',
      'suggestedTime': '15 mins',
      'bestAction': 'Send application form',
    },
    {
      'id': '3',
      'name': 'Neha Gupta',
      'college': 'JIPMER Puducherry',
      'score': 65,
      'status': 'Warm',
      'lastContact': '2 days ago',
      'color': const Color(0xFF8B5CF6),
      'priority': 'Medium',
      'suggestedTime': '30 mins',
      'bestAction': 'Share counseling offer',
    },
  ];

  int _currentCallIndex = 0;
  bool _isOnCall = false;
  Duration _callDuration = Duration.zero;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        title: Text(
          'Call Cockpit',
          style: GoogleFonts.sora(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: AppTheme.darkGray,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Next Best Action Card (Large)
            Padding(
              padding: const EdgeInsets.all(16),
              child: _buildNextBestActionCard(nextLeads[_currentCallIndex]),
            ),

            // Call Controls
            if (!_isOnCall)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _buildCallControls(),
              )
            else
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _buildCallInProgress(),
              ),

            const SizedBox(height: 24),

            // Queue of Upcoming Leads
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Upcoming Leads',
                    style: GoogleFonts.sora(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.darkGray,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Column(
                    children: List.generate(
                      nextLeads.length,
                      (index) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _buildLeadQueueCard(
                          nextLeads[index],
                          index,
                          index == _currentCallIndex,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Tips & Guidelines
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _buildTipsSection(),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildNextBestActionCard(Map<String, dynamic> lead) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            (lead['color'] as Color).withOpacity(0.2),
            (lead['color'] as Color).withOpacity(0.05),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: (lead['color'] as Color).withOpacity(0.3),
          width: 2,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        (lead['color'] as Color).withOpacity(0.3),
                        (lead['color'] as Color).withOpacity(0.1),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: (lead['color'] as Color).withOpacity(0.5),
                      width: 2,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      lead['name'].toString().split(' ')[0][0].toUpperCase(),
                      style: GoogleFonts.sora(
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        color: lead['color'],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        lead['name'],
                        style: GoogleFonts.sora(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.darkGray,
                        ),
                      ),
                      Text(
                        lead['college'],
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          color: AppTheme.neutralGray,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: (lead['color'] as Color).withOpacity(0.2),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: (lead['color'] as Color).withOpacity(0.4),
                                width: 1,
                              ),
                            ),
                            child: Text(
                              '${lead['score']}/100',
                              style: GoogleFonts.sora(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: lead['color'],
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.red.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.error_outline,
                                  size: 11,
                                  color: Colors.red,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  lead['priority'],
                                  style: GoogleFonts.sora(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.red,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Best Action
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.7),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.lightbulb_outline,
                    size: 18,
                    color: AppTheme.warningAmber,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Next Best Action',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: AppTheme.neutralGray,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          lead['bestAction'],
                          style: GoogleFonts.sora(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.darkGray,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Last Contact & Suggested Time
            Row(
              children: [
                Expanded(
                  child: _buildInfoBox(
                    icon: Icons.schedule_outlined,
                    label: 'Last Contact',
                    value: lead['lastContact'],
                    color: AppTheme.accentPurple,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildInfoBox(
                    icon: Icons.timer_outlined,
                    label: 'Est. Call Time',
                    value: lead['suggestedTime'],
                    color: AppTheme.primaryBlue,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    )
        .animate()
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.2, duration: 500.ms);
  }

  Widget _buildInfoBox({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.7),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label,
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    color: AppTheme.neutralGray,
                    fontWeight: FontWeight.w400,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: GoogleFonts.sora(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppTheme.darkGray,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCallControls() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () {
                  setState(() {
                    _isOnCall = true;
                  });
                },
                icon: const Icon(Icons.phone_outlined),
                label: const Text('Start Call'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  backgroundColor: AppTheme.successGreen,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.videocam_outlined),
                label: const Text('Video Call'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  backgroundColor: AppTheme.primaryBlue,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () {
                  if (_currentCallIndex < nextLeads.length - 1) {
                    setState(() {
                      _currentCallIndex++;
                    });
                  }
                },
                icon: const Icon(Icons.skip_next_outlined),
                label: const Text('Skip Lead'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: const BorderSide(color: AppTheme.lightGray, width: 2),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.note_add_outlined),
                label: const Text('Add Note'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: const BorderSide(color: AppTheme.lightGray, width: 2),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildCallInProgress() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.successGreen.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: AppTheme.successGreen.withOpacity(0.3),
              width: 2,
            ),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.phone_in_talk,
                    size: 20,
                    color: AppTheme.successGreen,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Call in Progress',
                    style: GoogleFonts.sora(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.successGreen,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                _formatDuration(_callDuration),
                style: GoogleFonts.sora(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.successGreen,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () {
                  setState(() {
                    _isOnCall = false;
                    _callDuration = Duration.zero;
                  });
                },
                icon: const Icon(Icons.call_end_outlined),
                label: const Text('End Call'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  backgroundColor: AppTheme.errorRed,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.mic_off_outlined),
                label: const Text('Mute'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: const BorderSide(color: AppTheme.lightGray, width: 2),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildLeadQueueCard(
    Map<String, dynamic> lead,
    int index,
    bool isActive,
  ) {
    return Container(
      decoration: BoxDecoration(
        border: isActive
            ? Border.all(color: (lead['color'] as Color), width: 2)
            : Border.all(color: AppTheme.lightGray, width: 1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Card(
        elevation: 0,
        color: isActive ? (lead['color'] as Color).withOpacity(0.05) : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: (lead['color'] as Color).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: (lead['color'] as Color).withOpacity(0.3),
                    width: 1,
                  ),
                ),
                child: Center(
                  child: Text(
                    '${index + 1}',
                    style: GoogleFonts.sora(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: lead['color'],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      lead['name'],
                      style: GoogleFonts.sora(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.darkGray,
                      ),
                    ),
                    Text(
                      lead['college'],
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        color: AppTheme.neutralGray,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${lead['score']}',
                    style: GoogleFonts.sora(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: lead['color'],
                    ),
                  ),
                  Text(
                    lead['status'],
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      color: AppTheme.neutralGray,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTipsSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.lightGray,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.lightbulb_outline,
                color: AppTheme.warningAmber,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Pro Tips',
                style: GoogleFonts.sora(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.darkGray,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildTipItem('Start with personalization - mention their college choice'),
          _buildTipItem('Ask about NEET preparation and guidance needs'),
          _buildTipItem('Share success stories of recent admissions'),
          _buildTipItem('Discuss scholarship and hostel options'),
        ],
      ),
    );
  }

  Widget _buildTipItem(String tip) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.check_circle_outline,
            size: 16,
            color: AppTheme.successGreen,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              tip,
              style: GoogleFonts.inter(
                fontSize: 12,
                color: AppTheme.darkGray,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final hours = twoDigits(duration.inHours);
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    return '$hours:$minutes:$seconds';
  }
}
