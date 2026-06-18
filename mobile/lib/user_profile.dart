import 'package:flutter/material.dart';
import 'package:dio/dio.dart';

import 'api_client.dart';

class UserProfilePage extends StatefulWidget {
  const UserProfilePage({super.key});

  @override
  State<UserProfilePage> createState() => _UserProfilePageState();
}

class _UserProfilePageState extends State<UserProfilePage> {
  bool _loading = true;
  bool _editing = false;
  bool _saving = false;

  final _formKey = GlobalKey<FormState>();

  String _name = '';
  String _email = '';
  String _gender = '';
  String _number = '';
  String _age = '';

  // form controllers (only used in edit mode)
  final _nameController = TextEditingController();
  final _numberController = TextEditingController();
  final _ageController = TextEditingController();
  final _genderController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _numberController.dispose();
    _ageController.dispose();
    _genderController.dispose();
    super.dispose();
  }

  void _setControllersFromCurrent() {
    _nameController.text = _name;
    _numberController.text = _number;
    _ageController.text = _age;
    _genderController.text = _gender;
  }

  Future<void> _fetchProfile() async {
    setState(() => _loading = true);
    try {
      final response = await ApiClient.instance.get('/user/info/detail');

      if (response.statusCode == 401) {
        if (mounted) Navigator.of(context).pushNamedAndRemoveUntil('/auth', (r) => false);
        return;
      }

      final data = response.data;
      if (data is Map && data['success'] == true && data['data'] != null) {
        final d = data['data'];

        setState(() {
          _name = (d['name'] ?? '').toString();
          _email = (d['email'] ?? '').toString();
          _age = d['age'] != null ? d['age'].toString() : '';
          _gender = (d['gender'] ?? '').toString();
          _number = (d['number'] ?? '').toString();

          _setControllersFromCurrent();
        });
      }
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 401) {
        if (mounted) Navigator.of(context).pushNamedAndRemoveUntil('/auth', (r) => false);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(e.response?.data?['message']?.toString() ?? 'Failed to load profile')),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _saving = true);
    try {
      final ageParsed = _ageController.text.trim().isEmpty
          ? null
          : int.tryParse(_ageController.text.trim());

      final response = await ApiClient.instance.patch('/user/info/update', data: {
        'name': _nameController.text.trim(),
        'number': _numberController.text.trim(),
        'age': ageParsed,
        'gender': _genderController.text.trim(),
      });

      final data = response.data;
      if (data is Map && data['success'] == true && data['data'] != null) {
        final d = data['data'];
        setState(() {
          _name = (d['name'] ?? '').toString();
          _email = (d['email'] ?? '').toString();
          _age = d['age'] != null ? d['age'].toString() : '';
          _gender = (d['gender'] ?? '').toString();
          _number = (d['number'] ?? '').toString();
          _editing = false;
          _saving = false;
          _setControllersFromCurrent();
        });
      }
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 401) {
        if (mounted) Navigator.of(context).pushNamedAndRemoveUntil('/auth', (r) => false);
      } else {
        final msg = e.response?.data?['message']?.toString() ?? 'Something went wrong while saving.';
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
        }
      }
      setState(() => _saving = false);
    }

    if (mounted) setState(() => _saving = false);
  }

  void _handleCancel() {
    _setControllersFromCurrent();
    setState(() => _editing = false);
  }

  Future<void> _handleLogout() async {
    try {
      await ApiClient.instance.post('/auth/logout');
    } catch (_) {
      // ignore and redirect
    } finally {
      if (mounted) Navigator.of(context).pushNamedAndRemoveUntil('/auth', (r) => false);
    }
  }

  String get _initials {
    if (_name.trim().isEmpty) return '??';
    final parts = _name.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '??';
    final chars = parts.map((p) => p[0]).take(2).join();
    return chars.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('My Profile')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('My Profile', style: TextStyle(color: Color(0xFF0F172A))),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF64748B)),
          onPressed: () => Navigator.of(context).pushNamedAndRemoveUntil('/', (r) => false),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Color(0xFF64748B)),
            onPressed: _handleLogout,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 22),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Color(0xFF4F46E5),
                        Color(0xFF7C3AED),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    children: [
                      Text(
                        'My Profile',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.85),
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _name.isEmpty ? '—' : _name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: const [
                      BoxShadow(color: Color(0x22000000), blurRadius: 12, offset: Offset(0, 4))
                    ],
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    _initials,
                    style: const TextStyle(
                      color: Color(0xFF4F46E5),
                      fontWeight: FontWeight.w900,
                      fontSize: 22,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  elevation: 0,
                  color: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
                    child: _editing ? _buildEditForm() : _buildView(),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _InfoRow(label: 'Full Name', value: _name),
        _InfoRow(label: 'Email', value: _email),
        _InfoRow(label: 'Phone', value: _number),
        _InfoRow(label: 'Age', value: _age.isEmpty ? '—' : _age),
        _InfoRow(label: 'Gender', value: _gender),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF4F46E5),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            onPressed: () => setState(() => _editing = true),
            child: const Text('Edit Profile', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
        ),
      ],
    );
  }

  Widget _buildEditForm() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 6),
          TextFormField(
            controller: _nameController,
            decoration: const InputDecoration(labelText: 'Full Name'),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Full name is required' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _numberController,
            decoration: const InputDecoration(labelText: 'Phone Number'),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Phone number is required' : null,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _ageController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Age'),
                  validator: (v) {
                    final t = v?.trim() ?? '';
                    if (t.isEmpty) return null;
                    final parsed = int.tryParse(t);
                    if (parsed == null) return 'Age must be a number';
                    if (parsed < 1) return 'Age must be positive';
                    return null;
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextFormField(
                  controller: _genderController,
                  decoration: const InputDecoration(labelText: 'Gender (male/female/other)'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Gender is required' : null,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4F46E5),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: _saving ? null : _handleSave,
                  child: _saving
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Save', style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: _saving ? null : _handleCancel,
                  child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 3,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: Color(0xFF64748B),
                letterSpacing: 0.6,
              ),
            ),
          ),
          Expanded(
            flex: 4,
            child: Text(
              value.isEmpty ? '—' : value,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }
}

