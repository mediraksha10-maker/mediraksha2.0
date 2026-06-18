import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'api_client.dart';

class AuthService {
  // Mock implementation. Replace with shared_preferences or secure_storage logic later.
  static bool isLoggedIn() => false;
}

class AuthPage extends StatefulWidget {
  const AuthPage({super.key});

  @override
  State<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends State<AuthPage> {
  bool _isSignUp = true;
  bool _loading = false;

  final _formKey = GlobalKey<FormState>();

  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _ageController = TextEditingController();
  final _genderController = TextEditingController();
  final _numberController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _ageController.dispose();
    _genderController.dispose();
    _numberController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _showToast(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.redAccent : const Color(0xFF4F46E5),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  Future<void> _handleAuthAction() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loading = true);

    try {
      if (_isSignUp) {
        final response = await ApiClient.instance.post('/auth/signup', data: {
          'name': _nameController.text.trim(),
          'email': _emailController.text.trim(),
          'age': int.tryParse(_ageController.text.trim()) ?? 0,
          'gender': _genderController.text.toLowerCase(),
          'number': _numberController.text.trim(),
          'password': _passwordController.text,
        });

        if (response.statusCode == 201) {
          _showToast("Registration successful! Please log in.");
          _nameController.clear();
          _ageController.clear();
          _genderController.clear();
          _numberController.clear();
          _passwordController.clear();
          setState(() => _isSignUp = false);
        } else {
          _showToast("Registration failed. Please try again.", isError: true);
        }
      } else {
        final response = await ApiClient.instance.post('/auth/login', data: {
          'email': _emailController.text.trim(),
          'password': _passwordController.text,
        });

        if (response.statusCode == 200) {
          _showToast("Login successful!");
          if (mounted) {
            Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
          }
        } else {
          _showToast("Login failed. Please try again.", isError: true);
        }
      }
    } on DioException catch (e) {
      final String errorMsg = e.response?.data?['message'] ?? 
          (_isSignUp ? "Registration failed." : "Login failed. Check credentials.");
      _showToast(errorMsg, isError: true);
    } finally { // Fixed: Changed 'final' to 'finally'
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  _isSignUp ? "Create Account" : "Welcome Back",
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: Color(0xFF1E293B)),
                ),
                const SizedBox(height: 4),
                // Fixed: Removed 'const' keyword here so it can change states dynamically
                Text(
                  _isSignUp ? "Join our healthcare community" : "Please enter your details",
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14, color: Colors.grey),
                ),
                const SizedBox(height: 32),

                if (_isSignUp) ...[
                  _buildInputField(controller: _nameController, hint: "Full Name", icon: Icons.person),
                  const SizedBox(height: 14),
                ],
                _buildInputField(controller: _emailController, hint: "Email", icon: Icons.email, type: TextInputType.emailAddress),
                const SizedBox(height: 14),
                if (_isSignUp) ...[
                  _buildInputField(controller: _ageController, hint: "Age", icon: Icons.cake, type: TextInputType.number),
                  const SizedBox(height: 14),
                  _buildGenderDropdown(),
                  const SizedBox(height: 14),
                  _buildInputField(controller: _numberController, hint: "Phone Number", icon: Icons.phone, type: TextInputType.phone),
                  const SizedBox(height: 14),
                ],
                _buildInputField(controller: _passwordController, hint: "Password", icon: Icons.lock, obscure: true),
                
                const SizedBox(height: 24),

                ElevatedButton(
                  onPressed: _loading ? null : _handleAuthAction,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4F46E5),
                    disabledBackgroundColor: const Color(0xFF4F46E5).withOpacity(0.6),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 2,
                  ),
                  child: _loading
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(_isSignUp ? "Sign Up" : "Sign In", style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(height: 24),

                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(_isSignUp ? "One of us? " : "New Here? "),
                    GestureDetector(
                      onTap: () => setState(() => _isSignUp = !_isSignUp),
                      child: Text(
                        _isSignUp ? "SIGN IN" : "SIGN UP",
                        style: const TextStyle(color: Color(0xFF4F46E5), fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                GestureDetector(
                  onTap: () {},
                  child: const Text(
                    "Are you a doctor?",
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.blueGrey, fontSize: 13, decoration: TextDecoration.underline),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    bool obscure = false,
    TextInputType type = TextInputType.text,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: obscure,
      keyboardType: type,
      validator: (val) => (val == null || val.isEmpty) ? "$hint is required" : null,
      decoration: InputDecoration(
        prefixIcon: Icon(icon, color: Colors.blueGrey, size: 20),
        hintText: hint,
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 1.5)),
      ),
    );
  }

  Widget _buildGenderDropdown() {
    return DropdownButtonFormField<String>(
      value: _genderController.text.isEmpty ? null : _genderController.text,
      validator: (val) => (val == null || val.isEmpty) ? "Gender is required" : null,
      onChanged: (newValue) => setState(() => _genderController.text = newValue ?? ""),
      decoration: InputDecoration(
        prefixIcon: const Icon(Icons.wc, color: Colors.blueGrey, size: 20),
        hintText: "Select Gender",
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
      ),
      items: const [
        DropdownMenuItem(value: "male", child: Text("Male")),
        DropdownMenuItem(value: "female", child: Text("Female")),
        DropdownMenuItem(value: "other", child: Text("Other")),
      ],
    );
  }
}