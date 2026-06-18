import 'package:flutter/material.dart';
import 'auth.dart'; // Assuming your auth logic is here

class AppRouter {
  static const String root = '/';
  static const String auth = '/auth';
  static const String userProfile = '/userprofile';
  static const String doctorAuth = '/doctor-auth';
  static const String doctor = '/doctor';
  static const String doctorProfile = '/doctorprofile';
  static const String services = '/services';
  static const String map = '/map';
  static const String chat = '/chat';
  static const String hospital = '/hospital';
  static const String disease = '/disease';
  static const String upload = '/upload';
  static const String appointments = '/appointment';
  static const String doctorAvailability = '/doctoravailability';
  static const String addDoctor = '/adddoctor';

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    // 1. Check if user is authenticated
    final bool isAuthenticated = AuthService.isLoggedIn();

    // 2. Strict Logic: Force Login unless accessing auth routes
    final bool isAuthRoute = settings.name == auth || settings.name == doctorAuth;
    if (!isAuthenticated && !isAuthRoute) {
      return MaterialPageRoute(builder: (_) => const AuthPage());
    }

    // 3. Handle Routes
    switch (settings.name) {
      case root:
        return MaterialPageRoute(builder: (_) => const UserPage());
      case auth:
        return MaterialPageRoute(builder: (_) => const AuthPage());
      case userProfile:
        return MaterialPageRoute(builder: (_) => const UserProfilePage());
      case doctorAuth:
        return MaterialPageRoute(builder: (_) => const DoctorAuthPage());
      case doctor:
        return MaterialPageRoute(builder: (_) => const DoctorPage());
      case doctorProfile:
        return MaterialPageRoute(builder: (_) => const DoctorProfilePage());
      case services:
        return MaterialPageRoute(builder: (_) => const ServicesPage());
      case map:
        return MaterialPageRoute(builder: (_) => const HospitalMapPage());
      case chat:
        return MaterialPageRoute(builder: (_) => const AIConsultationPage());
      case hospital:
        return MaterialPageRoute(builder: (_) => const HospitalFinderPage());
      case disease:
        return MaterialPageRoute(builder: (_) => const DiseaseAnalysisPage());
      case upload:
        return MaterialPageRoute(builder: (_) => const ReportUploadPage());
      case appointments:
        return MaterialPageRoute(builder: (_) => const AppointmentBookingPage());
      case doctorAvailability:
        return MaterialPageRoute(builder: (_) => const AppointmentBookingPage()); // Replicates frontend's redirect to /appointment
      case addDoctor:
        return MaterialPageRoute(builder: (_) => const AddDoctorPage());
      default:
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            body: Center(child: Text('No route defined for ${settings.name}')),
          ),
        );
    }
  }
}

// Basic placeholders for features replicated from Web
class UserPage extends StatelessWidget {
  const UserPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text("User Dashboard")));
}

class UserProfilePage extends StatelessWidget {
  const UserProfilePage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text("User Profile")));
}

class DoctorAuthPage extends StatelessWidget {
  const DoctorAuthPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text("Doctor Login")));
}

class DoctorPage extends StatelessWidget {
  const DoctorPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text("Doctor Dashboard")));
}

class DoctorProfilePage extends StatelessWidget {
  const DoctorProfilePage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text("Doctor Profile")));
}

class AIConsultationPage extends StatelessWidget {
  const AIConsultationPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text("AI Consultation Chat")));
}

class HospitalMapPage extends StatelessWidget {
  const HospitalMapPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text("Hospital Map View")));
}

class HospitalFinderPage extends StatelessWidget {
  const HospitalFinderPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text("Hospital Directory")));
}

class DiseaseAnalysisPage extends StatelessWidget {
  const DiseaseAnalysisPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text("Disease Analysis")));
}

class ServicesPage extends StatelessWidget {
  const ServicesPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text("Healthcare Services")));
}

class ReportUploadPage extends StatelessWidget {
  const ReportUploadPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text("Upload Medical Reports")));
}

class AppointmentBookingPage extends StatelessWidget {
  const AppointmentBookingPage({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Smart Booking")),
      body: const Center(child: Text("Replicating Web Booking System...")),
    );
  }
}

class AddDoctorPage extends StatelessWidget {
  const AddDoctorPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text("Admin: Add New Doctor")));
}