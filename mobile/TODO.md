# Mediraksha Flutter Port (mobile -> match mediraksha2.0/frontend)

## Completed
- [x] Inspected React frontend routing (`mediraksha2.0/frontend/src/App.tsx`) to identify required mobile routes/pages.
- [x] Added Flutter route table for all pages: `mobile/lib/router.dart` (Full React path parity, including redirect handling).
- [x] Updated `mobile/lib/main.dart` to use `onGenerateRoute: AppRouter.onGenerateRoute`.
- [x] Updated login success in `mobile/lib/auth.dart` to navigate to `/`.
- [x] Enforced "Login First" routing guard to prevent direct dashboard access.
- [x] Verified Android build+install via `flutter run -d RMX3870`.

## Next steps
- [ ] Implement UI for all screens in `lib/screens/`.
- [ ] Port API logic from React `fetch`/`axios` calls to Flutter `Dio`.
- [ ] Add logout navigation logic similar to React (call `/auth/logout` then go to `/auth`).
- [ ] If backend session uses HTTP-only cookies, add cookie support in Flutter Dio.
