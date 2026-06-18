import 'package:flutter/material.dart';
import 'router.dart';

void main() {
  runApp(const MedirakshaApp());
}

class MedirakshaApp extends StatelessWidget {
  const MedirakshaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Mediraksha',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      // Use the logic-guarded router
      onGenerateRoute: AppRouter.onGenerateRoute,
      initialRoute: AppRouter.root,
    );
  }
}