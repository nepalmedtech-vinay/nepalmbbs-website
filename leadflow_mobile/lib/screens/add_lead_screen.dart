import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../constants/app_constants.dart';
import '../utils/extensions.dart';

class AddLeadScreen extends StatefulWidget {
  const AddLeadScreen({Key? key}) : super(key: key);

  @override
  State<AddLeadScreen> createState() => _AddLeadScreenState();
}

class _AddLeadScreenState extends State<AddLeadScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameFocus = FocusNode();
  final _emailFocus = FocusNode();
  final _phoneFocus = FocusNode();
  final _neetFocus = FocusNode();

  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  late TextEditingController _collegeController;
  late TextEditingController _courseController;
  late TextEditingController _neetController;
  late TextEditingController _notesController;

  String _selectedSource = 'manual';
  bool _isLoading = false;

  final List<String> sources = ['Manual', 'WhatsApp', 'Email', 'Phone', 'Website'];
  final List<String> colleges = [
    'AIIMS Delhi',
    'CMC Vellore',
    'JIPMER Puducherry',
    'AFMC Pune',
    'Lady Hardinge Medical College',
  ];
  final List<String> courses = [
    'MBBS',
    'MD',
    'MS',
    'DNB',
    'Diploma',
  ];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _emailController = TextEditingController();
    _phoneController = TextEditingController();
    _collegeController = TextEditingController();
    _courseController = TextEditingController();
    _neetController = TextEditingController();
    _notesController = TextEditingController();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _collegeController.dispose();
    _courseController.dispose();
    _neetController.dispose();
    _notesController.dispose();
    _nameFocus.dispose();
    _emailFocus.dispose();
    _phoneFocus.dispose();
    _neetFocus.dispose();
    super.dispose();
  }

  void _submitForm() async {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _isLoading = true;
      });

      // Simulate API call
      await Future.delayed(const Duration(seconds: 2));

      if (mounted) {
        setState(() {
          _isLoading = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Lead created successfully!'),
            backgroundColor: AppTheme.successGreen,
            behavior: SnackBarBehavior.floating,
          ),
        );

        Navigator.pop(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        title: Text(
          'Add New Lead',
          style: GoogleFonts.sora(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: AppTheme.darkGray,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Contact Information Section
                _buildSectionHeader('Contact Information'),
                const SizedBox(height: 12),

                _buildTextField(
                  controller: _nameController,
                  label: AppStrings.fullName,
                  hint: 'e.g., Priya Sharma',
                  icon: Icons.person_outline,
                  focusNode: _nameFocus,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Name is required';
                    }
                    if (value.length < 3) {
                      return 'Name must be at least 3 characters';
                    }
                    return null;
                  },
                ),

                _buildTextField(
                  controller: _emailController,
                  label: AppStrings.email,
                  hint: 'e.g., priya@email.com',
                  icon: Icons.email_outline,
                  focusNode: _emailFocus,
                  keyboardType: TextInputType.emailAddress,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Email is required';
                    }
                    if (!value.isValidEmail()) {
                      return 'Enter a valid email address';
                    }
                    return null;
                  },
                ),

                _buildTextField(
                  controller: _phoneController,
                  label: AppStrings.phone,
                  hint: 'e.g., +91-9876543210',
                  icon: Icons.phone_outlined,
                  focusNode: _phoneFocus,
                  keyboardType: TextInputType.phone,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Phone number is required';
                    }
                    if (!value.isValidPhone()) {
                      return 'Enter a valid phone number';
                    }
                    return null;
                  },
                ),

                const SizedBox(height: 24),

                // Academic Information Section
                _buildSectionHeader('Academic Information'),
                const SizedBox(height: 12),

                _buildDropdownField(
                  label: AppStrings.college,
                  hint: 'Select college',
                  items: colleges,
                  onChanged: (value) {
                    _collegeController.text = value ?? '';
                  },
                ),

                _buildDropdownField(
                  label: AppStrings.course,
                  hint: 'Select course',
                  items: courses,
                  onChanged: (value) {
                    _courseController.text = value ?? '';
                  },
                ),

                _buildTextField(
                  controller: _neetController,
                  label: AppStrings.neetScore,
                  hint: 'e.g., 650 (out of 720)',
                  icon: Icons.assessment_outlined,
                  focusNode: _neetFocus,
                  keyboardType: TextInputType.number,
                  validator: (value) {
                    if (value != null && value.isNotEmpty) {
                      final score = int.tryParse(value);
                      if (score == null || score < 0 || score > 720) {
                        return 'Enter a valid NEET score (0-720)';
                      }
                    }
                    return null;
                  },
                ),

                const SizedBox(height: 24),

                // Source & Notes Section
                _buildSectionHeader('Additional Information'),
                const SizedBox(height: 12),

                _buildSourceSelector(),

                _buildTextField(
                  controller: _notesController,
                  label: AppStrings.notes,
                  hint: 'Add any notes about this lead...',
                  icon: Icons.note_outlined,
                  maxLines: 4,
                  validator: null,
                ),

                const SizedBox(height: 32),

                // Submit Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _submitForm,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: AppTheme.primaryBlue,
                      disabledBackgroundColor:
                          AppTheme.primaryBlue.withOpacity(0.5),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _isLoading
                        ? SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              valueColor:
                                  AlwaysStoppedAnimation<Color>(Colors.white),
                              strokeWidth: 2,
                            ),
                          )
                        : Text(
                            'Create Lead',
                            style: GoogleFonts.sora(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                  ),
                )
                    .animate()
                    .fadeIn(delay: 400.ms, duration: 300.ms)
                    .slideY(begin: 0.2, delay: 400.ms, duration: 400.ms),

                const SizedBox(height: 16),

                // Cancel Button
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: _isLoading ? null : () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      side: const BorderSide(color: AppTheme.lightGray, width: 2),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      'Cancel',
                      style: GoogleFonts.sora(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.primaryBlue,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: GoogleFonts.sora(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: AppTheme.darkGray,
      ),
    )
        .animate()
        .fadeIn(duration: 300.ms)
        .slideX(begin: -0.2, duration: 400.ms);
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    FocusNode? focusNode,
    TextInputType keyboardType = TextInputType.text,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: controller,
        focusNode: focusNode,
        keyboardType: keyboardType,
        maxLines: maxLines,
        validator: validator,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          prefixIcon: Icon(icon),
          filled: true,
          fillColor: AppTheme.lightGray,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(
              color: AppTheme.primaryBlue,
              width: 2,
            ),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(
              color: AppTheme.errorRed,
              width: 2,
            ),
          ),
          labelStyle: GoogleFonts.inter(
            color: AppTheme.neutralGray,
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(duration: 300.ms)
        .slideX(begin: 0.2, duration: 400.ms);
  }

  Widget _buildDropdownField({
    required String label,
    required String hint,
    required List<String> items,
    required Function(String?) onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: DropdownButtonFormField<String>(
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          prefixIcon: const Icon(Icons.school_outlined),
          filled: true,
          fillColor: AppTheme.lightGray,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
            focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(
              color: AppTheme.primaryBlue,
              width: 2,
            ),
          ),
        ),
        items: items.map((item) {
          return DropdownMenuItem(
            value: item,
            child: Text(item),
          );
        }).toList(),
        onChanged: onChanged,
      ),
    )
        .animate()
        .fadeIn(duration: 300.ms)
        .slideX(begin: 0.2, duration: 400.ms);
  }

  Widget _buildSourceSelector() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Source',
            style: GoogleFonts.inter(
              fontSize: 13,
              color: AppTheme.neutralGray,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: List.generate(
                sources.length,
                (index) => Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    selected: _selectedSource == sources[index].toLowerCase(),
                    label: Text(sources[index]),
                    onSelected: (value) {
                      setState(() {
                        _selectedSource = sources[index].toLowerCase();
                      });
                    },
                    backgroundColor: Colors.white,
                    selectedColor: AppTheme.primaryBlue,
                    labelStyle: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: _selectedSource == sources[index].toLowerCase()
                          ? Colors.white
                          : AppTheme.darkGray,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
