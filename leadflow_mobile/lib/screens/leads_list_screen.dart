import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

class LeadsListScreen extends StatefulWidget {
  const LeadsListScreen({Key? key}) : super(key: key);

  @override
  State<LeadsListScreen> createState() => _LeadsListScreenState();
}

class _LeadsListScreenState extends State<LeadsListScreen> {
  late TextEditingController _searchController;
  String _selectedFilter = 'All';

  final List<Map<String, dynamic>> leads = [
    {
      'id': '1',
      'name': 'Priya Sharma',
      'phone': '+91-9876543210',
      'email': 'priya.sharma@email.com',
      'score': 92,
      'status': 'Converted',
      'lastContact': '2 mins ago',
      'college': 'AIIMS Delhi',
      'communicationCount': 12,
      'color': AppTheme.successGreen,
    },
    {
      'id': '2',
      'name': 'Arjun Patel',
      'phone': '+91-9876543211',
      'email': 'arjun.patel@email.com',
      'score': 78,
      'status': 'Hot',
      'lastContact': '30 mins ago',
      'college': 'CMC Vellore',
      'communicationCount': 8,
      'color': AppTheme.warningAmber,
    },
    {
      'id': '3',
      'name': 'Neha Gupta',
      'phone': '+91-9876543212',
      'email': 'neha.gupta@email.com',
      'score': 65,
      'status': 'Warm',
      'lastContact': '2 hours ago',
      'college': 'JIPMER Puducherry',
      'communicationCount': 5,
      'color': AppTheme.accentPurple,
    },
    {
      'id': '4',
      'name': 'Rahul Kumar',
      'phone': '+91-9876543213',
      'email': 'rahul.kumar@email.com',
      'score': 35,
      'status': 'Cold',
      'lastContact': '1 day ago',
      'college': 'AFMC Pune',
      'communicationCount': 2,
      'color': AppTheme.neutralGray,
    },
  ];

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        title: Text(
          'All Leads',
          style: GoogleFonts.sora(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: AppTheme.darkGray,
          ),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search leads by name...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? GestureDetector(
                        onTap: () {
                          setState(() {
                            _searchController.clear();
                          });
                        },
                        child: const Icon(Icons.close),
                      )
                    : null,
              ),
              onChanged: (value) {
                setState(() {});
              },
            ),
          )
              .animate()
              .fadeIn(duration: 300.ms)
              .slideY(begin: -0.2, duration: 400.ms),

          // Filter Chips
          SizedBox(
            height: 45,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: ['All', 'Hot', 'Warm', 'Cold', 'Converted']
                  .asMap()
                  .entries
                  .map((entry) {
                final index = entry.key;
                final filter = entry.value;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    selected: _selectedFilter == filter,
                    label: Text(filter),
                    onSelected: (value) {
                      setState(() {
                        _selectedFilter = filter;
                      });
                    },
                    backgroundColor: Colors.white,
                    selectedColor: AppTheme.primaryBlue,
                    labelStyle: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: _selectedFilter == filter
                          ? Colors.white
                          : AppTheme.darkGray,
                    ),
                  )
                      .animate()
                      .fadeIn(
                        delay: Duration(milliseconds: index * 50),
                        duration: 300.ms,
                      )
                      .slideX(
                        begin: 0.2,
                        delay: Duration(milliseconds: index * 50),
                        duration: 400.ms,
                      ),
                );
              }).toList(),
            ),
          ),

          const SizedBox(height: 16),

          // Leads List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: leads.length,
              itemBuilder: (context, index) {
                final lead = leads[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _buildLeadListItem(lead, index),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLeadListItem(Map<String, dynamic> lead, int index) {
    return GestureDetector(
      onTap: () {
        // TODO: Navigate to lead detail
      },
      child: Container(
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
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Avatar
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        (lead['color'] as Color).withOpacity(0.3),
                        (lead['color'] as Color).withOpacity(0.1),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(14),
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
                // Lead Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              lead['name'],
                              style: GoogleFonts.sora(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.darkGray,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: (lead['color'] as Color).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              lead['status'],
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: lead['color'],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        lead['college'],
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w400,
                          color: AppTheme.neutralGray,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Icon(
                            Icons.phone_outlined,
                            size: 12,
                            color: AppTheme.neutralGray,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              lead['phone'],
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w400,
                                color: AppTheme.neutralGray,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // Score Badge
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      width: 44,
                      height: 44,
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
                          width: 1.5,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          '${lead['score']}',
                          style: GoogleFonts.sora(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: lead['color'],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Icon(
                      Icons.arrow_forward_ios,
                      size: 14,
                      color: AppTheme.neutralGray,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(delay: Duration(milliseconds: index * 80), duration: 400.ms)
        .slideX(
          begin: -0.3,
          delay: Duration(milliseconds: index * 80),
          duration: 500.ms,
          curve: Curves.easeOutCubic,
        );
  }
}
