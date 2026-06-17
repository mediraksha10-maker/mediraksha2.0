import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Stethoscope } from "lucide-react";
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

const DoctorAuth = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);

  // Signup fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [number, setNumber] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [hospital, setHospital] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [password, setPassword] = useState("");

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const handleGoogleAuth = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/doctor/google`;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/doctor/signup', {
        name, email, number, age, gender, hospital, speciality, password,
      });
      if (response.status === 201) {
        toast.success("Registration submitted! Awaiting verification.");
        setName(""); setEmail(""); setNumber(""); setAge("");
        setGender(""); setHospital(""); setSpeciality(""); setPassword("");
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
      const response = await api.post('/auth/doctor/login', {
        email: loginEmail,
        password: loginPassword,
      });
      if (response.status === 200 && response.data?.token) {
        localStorage.setItem("token", response.data.token);
        toast.success("Login successful!");
        navigate("/doctor");
      } else {
        toast.error("Login failed. Please try again.");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "input input-bordered w-full bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-cyan-500 transition-all";
  const labelClass = "label-text font-semibold mb-1 ml-1 text-slate-600 block text-sm";

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <Link
        to="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-cyan-600 transition-colors group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back to Home</span>
      </Link>

      <div className="relative w-full max-w-4xl h-170 bg-white rounded-4xl shadow-2xl overflow-hidden flex">

        {/* --- DOCTOR LOGIN FORM (Left Side) --- */}
        <div
          className={`absolute top-0 left-0 w-1/2 h-full transition-all duration-700 ease-in-out
            ${isSignUp ? "opacity-0 pointer-events-none" : "opacity-100 z-10"}`}
        >
          <div className="h-full flex flex-col justify-center px-16">
            <form onSubmit={handleLogIn} className="space-y-5">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-3 text-cyan-600">
                  <Stethoscope size={40} />
                </div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Doctor Login</h1>
                <p className="text-slate-400 mt-2">Access your medical dashboard</p>
              </div>

              <div className="space-y-4">
                <div className="form-control">
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    placeholder="doctor@hospital.com"
                    className={inputClass}
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className={labelClass}>Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className={inputClass}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-accent w-full bg-cyan-600 border-none hover:bg-cyan-700 text-white shadow-lg shadow-cyan-100 rounded-xl h-12 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>

              {/* Google Sign In */}
              <div>
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
            </form>
          </div>
        </div>

        {/* --- DOCTOR REGISTRATION FORM (Right Side) --- */}
        <div
          className={`absolute top-0 right-0 w-1/2 h-full transition-all duration-700 ease-in-out
            ${isSignUp ? "opacity-100 z-10" : "opacity-0 pointer-events-none"}`}
        >
          <div className="h-full flex flex-col justify-center px-14 overflow-y-auto py-8">
            <form onSubmit={handleSignUp} className="space-y-3">
              <div className="text-center mb-4">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Registration</h1>
                <p className="text-slate-400 mt-1 text-sm">Submit your credentials for verification</p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className={labelClass}>Full Name</label>
                    <input type="text" placeholder="Dr. Jane Smith" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="form-control">
                    <label className={labelClass}>Email</label>
                    <input type="email" placeholder="doctor@hospital.com" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className={labelClass}>Age</label>
                    <input type="number" placeholder="Age" min="22" max="100" className={inputClass} value={age} onChange={(e) => setAge(e.target.value)} required />
                  </div>
                  <div className="form-control">
                    <label className={labelClass}>Gender</label>
                    <select className={inputClass} value={gender} onChange={(e) => setGender(e.target.value)} required>
                      <option value="" disabled>Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-control">
                  <label className={labelClass}>Phone Number</label>
                  <input type="tel" placeholder="+91 98765 43210" className={inputClass} value={number} onChange={(e) => setNumber(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className={labelClass}>Hospital</label>
                    <input type="text" placeholder="Hospital name" className={inputClass} value={hospital} onChange={(e) => setHospital(e.target.value)} required />
                  </div>
                  <div className="form-control">
                    <label className={labelClass}>Speciality</label>
                    <input type="text" placeholder="e.g. Cardiology" className={inputClass} value={speciality} onChange={(e) => setSpeciality(e.target.value)} required />
                  </div>
                </div>

                <div className="form-control">
                  <label className={labelClass}>Password</label>
                  <input type="password" placeholder="••••••••" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                <p className="text-xs text-amber-700 leading-tight italic text-center">
                  MediRaksha will manually verify your credentials before full access is granted.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full bg-cyan-600 border-none hover:bg-cyan-700 text-white shadow-lg shadow-cyan-100 rounded-xl h-12 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Submitting..." : "Send for Verification"}
              </button>
            </form>
          </div>
        </div>

        {/* --- SLIDING OVERLAY PANEL --- */}
        <div
          className={`absolute top-0 left-0 w-1/2 h-full z-20 transition-transform duration-700 ease-in-out overflow-hidden
            ${isSignUp ? "translate-x-0" : "translate-x-full"}`}
          style={{ background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)' }}
        >
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center p-12 text-center text-white transition-opacity duration-500
              ${isSignUp ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <Stethoscope size={48} className="mb-4 opacity-90" />
            <h2 className="text-4xl font-bold mb-4">Registered Doctor?</h2>
            <p className="mb-8 opacity-80 leading-relaxed">
              Log in to view your patient history and clinical schedule.
            </p>
            <button
              onClick={() => setIsSignUp(false)}
              className="btn btn-outline border-white text-white hover:bg-white hover:text-cyan-700 px-12 rounded-full border-2 h-12"
            >
              LOG IN
            </button>
            <Link to="/auth" className="mt-8 text-sm underline opacity-70 hover:opacity-100 transition-opacity">
              Are you a Patient?
            </Link>
          </div>

          <div
            className={`absolute inset-0 flex flex-col items-center justify-center p-12 text-center text-white transition-opacity duration-500
              ${isSignUp ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          >
            <Stethoscope size={48} className="mb-4 opacity-90" />
            <h2 className="text-4xl font-bold mb-4">New Doctor?</h2>
            <p className="mb-8 opacity-80 leading-relaxed">
              Join our professional network and manage your patients effectively.
            </p>
            <button
              onClick={() => setIsSignUp(true)}
              className="btn btn-outline border-white text-white hover:bg-white hover:text-cyan-700 px-12 rounded-full border-2 h-12"
            >
              REGISTER NOW
            </button>
            <Link to="/auth" className="mt-8 text-sm underline opacity-70 hover:opacity-100 transition-opacity">
              Are you a Patient?
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DoctorAuth;