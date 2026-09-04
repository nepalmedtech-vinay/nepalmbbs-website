import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../constants/app_constants.dart';
import '../utils/extensions.dart';

class LeadDetailScreen extends StatefulWidget {
  final Map<String, dynamic> lead;

  const LeadDetailScreen({
    Key? key,
    required this.lead,
  }) : super(key: key);

  @override
  State<LeadDetailScreen> createState() => _LeadDetailScreenState();
}

class _LeadDetailScreenState extends State<LeadDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool isEditing = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = LeadStatusColors.getStatusColor(widget.lead['status']);
    final score = widget.lead['score'] ?? 0;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: CustomScrollView(
        slivers: [
          // Header with Lead Info
          SliverAppBar(
            expandedHeight: 280,
            floating: false,
            pinned: true,
            elevation: 0,
            backgroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              background: _buildHeaderSection(statusColor),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.call_outlined),
                onPressed: () {
                  // TODO: Initiate call
                },
              ),
              IconButton(
                icon: const Icon(Icons.edit_outlined),
                onPressed: () {
                  setState(() {
                    isEditing = !isEditing;
                  });
                },
              ),
              IconButton(
                icon: const Icon(Icons.more_vert),
                onPressed: () {
                  // TODO: More options
                },
              ),
            ],
          ),

          // Tab Bar
          SliverPersistentHeader(
            delegate: _TabBarDelegate(
              tabBar: TabBar(
                controller: _tabController,
                indicatorColor: AppTheme.primaryBlue,
                labelColor: AppTheme.primaryBlue,
                unselectedLabelColor: AppTheme.neutralGray,
                tabs: const [
                  Tab(text: 'Overview'),
                  Tab(text: 'Timeline'),
                  Tab(text: 'Documents'),
                  Tab(text: 'Lead 360'),
                ],
              ),
            ),
            pinned: true,
          ),

          // Tab Content
          SliverFillRemaining(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildOverviewTab(),
                _buildTimelineTab(),
                _buildDocumentsTab(),
                _buildLead360Tab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderSection(Color statusColor) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [statusColor.withOpacity(0.2), statusColor.withOpacity(0.05)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.only(top: 60, left: 16, right: 16, bottom: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Avatar & Score
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Large Avatar
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        statusColor.withOpacity(0.3),
                        statusColor.withOpacity(0.1),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: statusColor.withOpacity(0.5), width: 2),
                  ),
                  child: Center(
                    child: Text(
                      widget.lead['name'].toString().split(' ')[0][0].toUpperCase(),
                      style: GoogleFonts.sora(
                        fontSize: 40,
                        fontWeight: FontWeight.w700,
                        color: statusColor,
                      ),
                    ),
                  ),
                )
                    .animate()
                    .scale(begin: const Offset(0.8, 0.8), duration: 400.ms)
                    .fadeIn(),
                const SizedBox(width: 16),

                // Name & Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.lead['name'],
                        style: GoogleFonts.sora(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.darkGray,
                        ),
                      ),
                      Text(
                        widget.lead['college'] ?? 'No college selected',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          color: AppTheme.neutralGray,
                        ),
                      ),
                      const SizedBox(height: 8),
                      // Score Badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              statusColor.withOpacity(0.2),
                              statusColor.withOpacity(0.05),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: statusColor.withOpacity(0.5),
                            width: 1.5,
                          ),
                        ),
                        child: Text(
                          '${widget.lead['score']}/100 • ${widget.lead['status']}',
                          style: GoogleFonts.sora(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: statusColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Quick Info Grid
            Row(
              children: [
                Expanded(
                  child: _buildQuickInfoCard(
                    icon: Icons.phone_outlined,
                    label: 'Phone',
                    value: widget.lead['phone'] ?? 'N/A',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildQuickInfoCard(
                    icon: Icons.email_outlined,
                    label: 'Email',
                    value: widget.lead['email'] ?? 'N/A',
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

  Widget _buildQuickInfoCard({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppTheme.lightGray, width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 18, color: AppTheme.primaryBlue),
            const SizedBox(height: 6),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 11,
                color: AppTheme.neutralGray,
                fontWeight: FontWeight.w400,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: GoogleFonts.inter(
                fontSize: 12,
                color: AppTheme.darkGray,
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionTitle('Lead Information'),
          _buildInfoRow('Full Name', widget.lead['name']),
          _buildInfoRow('Email', widget.lead['email']),
          _buildInfoRow('Phone', widget.lead['phone']),
          _buildInfoRow('College', widget.lead['college'] ?? 'Not specified'),
          _buildInfoRow('Course', widget.lead['course'] ?? 'Not specified'),
          _buildInfoRow('NEET Score', widget.lead['neet_score'] ?? 'Not provided'),

          const SizedBox(height: 24),

          _buildSectionTitle('Lead Score Breakdown'),
          _buildScoreBreakdown(),

          const SizedBox(height: 24),

          _buildSectionTitle('Quick Actions'),
          _buildQuickActions(),
        ],
      ),
    );
  }

  Widget _buildTimelineTab() {
    final mockCommunications = [
      {
        'type': 'whatsapp',
        'direction': 'inbound',
        'content': 'Hi, interested in AIIMS admission',
        'time': DateTime.now().subtract(const Duration(hours: 2)),
      },
      {
        'type': 'call',
        'direction': 'outbound',
        'content': 'Call duration: 15 minutes',
        'time': DateTime.now().subtract(const Duration(days: 1)),
      },
      {
        'type': 'email',
        'direction': 'outbound',
        'content': 'Sent admission brochure and NEET prep guide',
        'time': DateTime.now().subtract(const Duration(days: 2)),
      },
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: List.generate(
          mockCommunications.length,
          (index) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _buildCommunicationCard(mockCommunications[index]),
          ),
        ),
      ),
    );
  }

  Widget _buildDocumentsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionTitle('Uploaded Documents'),
          Card(
            elevation: 0,
            color: AppTheme.lightGray,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: AppTheme.lightGray, width: 1),
            ),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.document_scanner_outlined,
                      size: 48,
                      color: AppTheme.neutralGray,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'No documents uploaded',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: AppTheme.neutralGray,
                      ),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () {
                        // TODO: Upload document
                      },
                      icon: const Icon(Icons.cloud_upload_outlined),
                      label: const Text('Upload Document'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLead360Tab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionTitle('Lead Intelligence'),
          _buildLead360Card(
            'Engagement Level',
            'High',
            Icons.trending_up_outlined,
            AppTheme.successGreen,
          ),
          const SizedBox(height: 12),
          _buildLead360Card(
            'Response Time',
            'Quick (< 2 hours)',
            Icons.schedule_outlined,
            AppTheme.accentPurple,
          ),
          const SizedBox(height: 12),
          _buildLead360Card(
            'Risk Indicator',
            'Low Risk',
            Icons.shield_outlined,
            AppTheme.successGreen,
          ),

          const SizedBox(height: 24),

          _buildSectionTitle('Recommended Actions'),
          _buildRecommendationsList(),

          const SizedBox(height: 24),

          _buildSectionTitle('Next Best Action'),
          _buildNextBestActionCard(),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        title,
        style: GoogleFonts.sora(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: AppTheme.darkGray,
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 13,
              color: AppTheme.neutralGray,
            ),
          ),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppTheme.darkGray,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScoreBreakdown() {
    return Column(
      children: [
        _buildScoreBar('Engagement', 75, AppTheme.successGreen),
        const SizedBox(height: 12),
        _buildScoreBar('Qualification', 65, AppTheme.accentPurple),
        const SizedBox(height: 12),
        _buildScoreBar('Timeliness', 85, AppTheme.primaryBlue),
      ],
    );
  }

  Widget _buildScoreBar(String label, int score, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: GoogleFonts.inter(fontSize: 12)),
            Text('$score%', style: GoogleFonts.sora(fontWeight: FontWeight.w600)),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: score / 100,
            minHeight: 8,
            backgroundColor: color.withOpacity(0.1),
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActions() {
    return Row(
      children: [
        Expanded(
          child: ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.phone_outlined),
            label: const Text('Call'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.message_outlined),
            label: const Text('Message'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.videocam_outlined),
            label: const Text('Video'),
          ),
        ),
      ],
    );
  }

  Widget _buildCommunicationCard(Map<String, dynamic> comm) {
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppTheme.lightGray, width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppTheme.lightGray,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                CommunicationConfig.getIcon(comm['type']),
                color: AppTheme.primaryBlue,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        CommunicationConfig.getLabel(comm['type']),
                        style: GoogleFonts.sora(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        (comm['time'] as DateTime).toRelativeTime(),
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: AppTheme.neutralGray,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    comm['content'],
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: AppTheme.neutralGray,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLead360Card(
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppTheme.lightGray, width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: AppTheme.neutralGray,
                    ),
                  ),
                  Text(
                    value,
                    style: GoogleFonts.sora(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: color,
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.neutralGray),
          ],
        ),
      ),
    );
  }

  Widget _buildRecommendationsList() {
    final recommendations = [
      'Schedule consultation call',
      'Send college brochure',
      'Share NEET prep resources',
    ];

    return Column(
      children: List.generate(
        recommendations.length,
        (index) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: AppTheme.primaryBlue,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Center(
                  child: Text(
                    '${index + 1}',
                    style: GoogleFonts.sora(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  recommendations[index],
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: AppTheme.darkGray,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNextBestActionCard() {
    return Card(
      elevation: 0,
      color: AppTheme.primaryBlue,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Schedule Consultation Call',
              style: GoogleFonts.sora(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Best time: Next 2 hours | Estimated duration: 15 mins',
              style: GoogleFonts.inter(
                fontSize: 13,
                color: Colors.white70,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                ),
                child: Text(
                  'Schedule Call',
                  style: GoogleFonts.sora(
                    fontWeight: FontWeight.w600,
                    color: AppTheme.primaryBlue,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;

  _TabBarDelegate({required this.tabBar});

  @override
  double get minExtent => tabBar.preferredSize.height;
  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Container(
      color: Colors.white,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(_TabBarDelegate oldDelegate) {
    return false;
  }
}
