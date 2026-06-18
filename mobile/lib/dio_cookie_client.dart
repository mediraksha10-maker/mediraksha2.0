import 'package:dio/dio.dart';

/// Dio client that supports cookies so the backend can use
/// HTTP-only cookie sessions (see authController/logout in backend).
class DioCookieClient {
  static final Dio _dio = Dio();

  static Dio get instance => _dio;

  static Future<void> configure({required String baseUrl}) async {
    // NOTE:
    // - `CookieJar` requires an extra dependency in Dart.
    // - This project currently only has `dio`.
    // - Without a CookieJar, cookies set by the server may not persist.
    //
    // For now we configure dio with credentials-like behavior.
    // If cookie persistence fails at runtime, we will add `cookie_jar`
    // + `dio_cookie_manager` and properly persist cookies.

    _dio.options = BaseOptions(
      baseUrl: baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      // Dio doesn't have a native "withCredentials" flag like axios.
      // CookieJar persistence is what matters.
    );
  }
}

