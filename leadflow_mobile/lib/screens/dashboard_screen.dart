import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  int selectedFilter = 0;
  final List<String> filters = ['All', 'Hot', 'Warm', 'Cold', 'Converted'];
  final List<Map<String, dynamic>> mockLeads = [
    {
      'id': '1',
      'name': 'Priya Sharma',
      'phone': '+91-9876543210',
      'score': 92,
      'status': 'Converted',
      'lastContact': '2 mins ago',
      'college': 'AIIMS Delhi',
      'color': AppTheme.successGreen,
    },
    {
      'id': '2',
      'name': 'Arjun Patel',
      'phone': '+91-9876543211',
      'score': 78,
      'status': 'Hot',
      'lastContact': '30 mins ago',
      'college': 'CMC Vellore',
      'color': AppTheme.warningAmber,
    },
    {
      'id': '3',
      'name': 'Neha Gupta',
      'phone': '+91-9876543212',
      'score': 65,
      'status': 'Warm',
      'lastContact': '2 hours ago',
      'college': 'JIPMER Puducherry',
      'color': AppTheme.accentPurple,
    },
    {
      'id': '4',
      'name': 'Rahul Kumar',
      'phone': '+91-9876543213',
      'score': 35,
      'status': 'Cold',
      'lastContact': '1 day ago',
      'college': 'AFMC Pune',
      'color': AppTheme.neutralGray,
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        title: Column(
          children: [
            Text(
              'LeadFlow',
              style: GoogleFonts.sora(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: AppTheme.primaryBlue,
              ),
            ),
            Text(
              'Premium Lead Management',
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w400,
                color: AppTheme.neutralGray,
              ),
            ),
          ],
        ),
        centerTitle: true,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.lightGray,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.notifications_outlined,
                  color: AppTheme.primaryBlue,
                  size: 20,
                ),
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Stats - Animated Cards
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Stats Row 1
                  Row(
                    children: [
                      Expanded(
                        child: _buildStatCard(
                          title: 'Total Leads',
                          value: '${mockLeads.length}',
                          icon: Icons.people_outline,
                          color: AppTheme.primaryBlue,
                          delay: 0,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildStatCard(
                          title: 'Conversion',
                          value: '45%',
                          icon: Icons.trending_up,
                          color: AppTheme.successGreen,
                          delay: 100,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Stats Row 2
                  Row(
                    children: [
                      Expanded(
                        child: _buildStatCard(
                          title: 'This Week',
                          value: '12',
                          icon: Icons.calendar_today_outlined,
                          color: AppTheme.accentPurple,
                          delay: 200,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildStatCard(
                          title: 'Follow-up',
                          value: '5',
                          icon: Icons.phone_in_talk_outlined,
                          color: AppTheme.warningAmber,
                          delay: 300,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Filter Chips - Horizontal Scroll with Animation
            SizedBox(
              height: 50,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: filters.length,
                itemBuilder: (context, index) {
                  final isSelected = selectedFilter == index;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      selected: isSelected,
                      label: Text(filters[index]),
                      onSelected: (value) {
                        setState(() {
                          selectedFilter = index;
                        });
                      },
                      backgroundColor: Colors.white,
                      selectedColor: AppTheme.primaryBlue,
                      labelStyle: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: isSelected ? Colors.white : AppTheme.darkGray,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                        side: BorderSide(
                          color: isSelected
                              ? AppTheme.primaryBlue
                              : AppTheme.lightGray,
                        ),
                      ),
                    )
                        .animate()
                        .fadeIn(duration: 300.ms)
                        .slideX(begin: 0.2, duration: 400.ms),
                  );
                },
              ),
            ),

            const SizedBox(height: 20),

            // Leads List - Animated Cards
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Active Leads',
                    style: GoogleFonts.sora(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.darkGray,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: mockLeads.length,
                    itemBuilder: (context, index) {
                      final lead = mockLeads[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _buildLeadCard(lead, index),
                      );
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 30),
          ],
        ),
      ),

      // Floating Action Button with Animation
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          // TODO: Add new lead
        },
        backgroundColor: AppTheme.primaryBlue,
        icon: const Icon(Icons.add_rounded),
        label: Text(
          'New Lead',
          style: GoogleFonts.sora(
            fontWeight: FontWeight.w600,
          ),
        ),
      )
          .animate()
          .scale(
            begin: const Offset(0.8, 0.8),
            duration: 600.ms,
            curve: Curves.easeOutBack,
          )
          .fadeIn(duration: 400.ms),
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required int delay,
  }) {
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: AppTheme.lightGray,
          width: 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                icon,
                color: color,
                size: 20,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: GoogleFonts.sora(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: AppTheme.darkGray,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w400,
                color: AppTheme.neutralGray,
              ),
            ),
          ],
        ),
      ),
    )
        .animate()
        .fadeIn(delay: Duration(milliseconds: delay), duration: 400.ms)
        .slideY(
          begin: 0.3,
          delay: Duration(milliseconds: delay),
          duration: 500.ms,
          curve: Curves.easeOutCubic,
        );
  }

  Widget _buildLeadCard(Map<String, dynamic> lead, int index) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppTheme.shadowSmall,
      ),
      child: Card(
        elevation: 0,
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: AppTheme.lightGray,
            width: 1,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Row
              Row(
                children: [
                  // Avatar with Status Color
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: (lead['color'] as Color).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: (lead['color'] as Color).withOpacity(0.3),
                        width: 2,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        lead['name'].toString().split(' ')[0][0],
                        style: GoogleFonts.sora(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: lead['color'],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Name & Contact
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          lead['name'],
                          style: GoogleFonts.sora(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.darkGray,
                          ),
                        ),
                        Text(
                          lead['phone'],
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w400,
                            color: AppTheme.neutralGray,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Lead Score Circular Badge
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [
                          (lead['color'] as Color).withOpacity(0.2),
                          (lead['color'] as Color).withOpacity(0.05),
                        ],
                      ),
                      border: Border.all(
                        color: (lead['color'] as Color).withOpacity(0.5),
                        width: 2,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        '${lead['score']}',
                        style: GoogleFonts.sora(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: lead['color'],
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),
              const Divider(height: 1, color: AppTheme.lightGray),
              const SizedBox(height: 12),

              // College & Status Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'College',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w400,
                            color: AppTheme.neutralGray,
                          ),
                        ),
                        Text(
                          lead['college'],
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: AppTheme.darkGray,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'Status',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w400,
                            color: AppTheme.neutralGray,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: (lead['color'] as Color).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            lead['status'],
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: lead['color'],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Last Contact
              Row(
                children: [
                  Icon(
                    Icons.access_time,
                    size: 14,
                    color: AppTheme.neutralGray,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Last contact: ${lead['lastContact']}',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                      color: AppTheme.neutralGray,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    )
        .animate(onPlay: (controller) => controller.repeat())
        .shimmer(
          duration: 2000.ms,
          color: Colors.white10,
          angle: 0.5,
        )
        .animate()
        .fadeIn(delay: Duration(milliseconds: index * 100), duration: 400.ms)
        .slideX(
          begin: -0.2,
          delay: Duration(milliseconds: index * 100),
          duration: 500.ms,
          curve: Curves.easeOutCubic,
        );
  }
}
