import 'dart:io';
import 'package:dio/dio.dart';

class ApiClient {
  static final Dio _dio = Dio(
    BaseOptions(
      // 1. Dynamic base URL depending on the platform running the app
      baseUrl: _baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    ),
  );

  // Getter to handle the localhost emulator quirks
  static String get _baseUrl {
    // If you are using a production URL later, just return it here:
    // return "https://your-production-api.com/api";

    if (Platform.isAndroid) {
      // 10.0.2.2 is Android's special redirect to your computer's localhost
      return 'http://10.141.252.2:8000/api'; 
    } else if (Platform.isIOS) {
      // iOS simulators can use localhost normally
      return 'http://localhost:8000/api';
    }
    
    // Fallback for web/other platforms
    return 'http://localhost:8000/api';
  }

  // Expose the instance (equivalent to 'export default instance')
  static Dio get instance {
    // Note: Dio handles cookies/credentials automatically via adapters 
    // if your backend relies on HttpOnly cookies.
    return _dio;
  }
}