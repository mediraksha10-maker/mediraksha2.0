import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import api from '../api/Api';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const Auth = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [number, setNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleAuth = () => {
    // Redirect to your backend's Google OAuth endpoint
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google`;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/signup', {
        name, email, age, gender, number, password,
      });
      if (response.status === 201) {
        toast.success("Registration successful! Please log in.");
        setName(""); setAge(""); setGender(""); setNumber(""); setPassword("");
        setIsSignUp(false);
      } else {
        toast.error("Registration failed. Please try again.");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.status === 200 && response.data?.token) {
        localStorage.setItem("token", response.data.token);
        toast.success("Login successful!");
        navigate("/");
      } else {
        toast.error("Login failed. Please try again.");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Reusable Google button
  const GoogleButton = () => (
    <div className="mt-1">
      <div className="relative flex items-center my-4">
        <div className="grow border-t border-slate-200" />
        <span className="mx-3 text-xs text-slate-400 font-medium">or</span>
        <div className="grow border-t border-slate-200" />
      </div>
      <button
        type="button"
        onClick={handleGoogleAuth}
        className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-700 font-medium shadow-sm"
      >
        <GoogleIcon />
        Continue with Google
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <Link
        to="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back to Home</span>
      </Link>

      <div className="relative w-full max-w-4xl h-162.5 bg-white rounded-4xl shadow-2xl overflow-hidden flex">

        {/* --- SIGN IN FORM (Left Side) --- */}
        <div
          className={`absolute top-0 left-0 w-1/2 h-full transition-all duration-700 ease-in-out
            ${isSignUp ? "opacity-0 pointer-events-none" : "opacity-100 z-10"}`}
        >
          <div className="h-full flex flex-col justify-center px-16">
            <form onSubmit={handleLogIn} className="space-y-5">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-black text-slate-800 tracking-tight">Welcome Back</h1>
                <p className="text-slate-400 mt-2">Please enter your details</p>
              </div>

              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Email"
                  className="input input-bordered w-full bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  className="input input-bordered w-full bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full bg-indigo-600 border-none hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 rounded-xl h-12 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>

              <GoogleButton />
            </form>
          </div>
        </div>

        {/* --- SIGN UP FORM (Right Side) --- */}
        <div
          className={`absolute top-0 right-0 w-1/2 h-full transition-all duration-700 ease-in-out
            ${isSignUp ? "opacity-100 z-10" : "opacity-0 pointer-events-none"}`}
        >
          <div className="h-full flex flex-col justify-center px-16">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="text-center mb-6">
                <h1 className="text-4xl font-black text-slate-800 tracking-tight">Create Account</h1>
                <p className="text-slate-400 mt-2">Join our healthcare community</p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  className="input input-bordered w-full bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  className="input input-bordered w-full bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  type="number"
                  placeholder="Age"
                  min="1"
                  max="120"
                  className="input input-bordered w-full bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                />
                <select
                  className="input input-bordered w-full bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                >
                  <option value="" disabled>Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="tel"
                  placeholder="Phone Number"
                  className="input input-bordered w-full bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Password"
                  className="input input-bordered w-full bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full bg-indigo-600 border-none hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 rounded-xl h-12 mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Signing Up..." : "Sign Up"}
              </button>

              <GoogleButton />
            </form>
          </div>
        </div>

        {/* --- SLIDING OVERLAY PANEL --- */}
        <div
          className={`absolute top-0 left-0 w-1/2 h-full z-20 transition-transform duration-700 ease-in-out overflow-hidden
            ${isSignUp ? "translate-x-0" : "translate-x-full"}`}
          style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
        >
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center p-12 text-center text-white transition-opacity duration-500
              ${isSignUp ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <h2 className="text-4xl font-bold mb-4">One of us?</h2>
            <p className="mb-8 opacity-80 leading-relaxed text-lg">
              If you already have an account, just sign in.
            </p>
            <button
              onClick={() => setIsSignUp(false)}
              className="btn btn-outline border-white text-white hover:bg-white hover:text-indigo-600 px-12 rounded-full border-2 h-12"
            >
              SIGN IN
            </button>
            <Link to="/doctor-auth" className="mt-8 text-sm underline opacity-70 hover:opacity-100 transition-opacity">
              Are you a doctor?
            </Link>
          </div>

          <div
            className={`absolute inset-0 flex flex-col items-center justify-center p-12 text-center text-white transition-opacity duration-500
              ${isSignUp ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          >
            <h2 className="text-4xl font-bold mb-4">New Here?</h2>
            <p className="mb-8 opacity-80 leading-relaxed text-lg">
              Enter your personal details and start your journey with our healthcare platform.
            </p>
            <button
              onClick={() => setIsSignUp(true)}
              className="btn btn-outline border-white text-white hover:bg-white hover:text-indigo-600 px-12 rounded-full border-2 h-12"
            >
              SIGN UP
            </button>
            <Link to="/doctor-auth" className="mt-8 text-sm underline opacity-70 hover:opacity-100 transition-opacity">
              Are you a doctor?
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Auth;