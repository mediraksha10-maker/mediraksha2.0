import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { toast } from "react-hot-toast";
import api from '../api/Api';

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

  // Login fields (separate state to avoid cross-contamination)
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/doctor/signup', {
        name,
        email,
        number,
        age,
        gender,
        hospital,
        speciality,
        password,
      });

      if (response.status === 201) {
        toast.success("Registration submitted! Awaiting verification.");
        // Reset signup fields and switch to login
        setName(""); setEmail(""); setNumber(""); setAge("");
        setGender(""); setHospital(""); setSpeciality(""); setPassword("");
        setIsSignUp(false);
      } else {
        toast.error("Registration failed. Please try again.");
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || "Registration failed. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/doctor/login', {
        email: loginEmail,
        password: loginPassword,
      });

      if (response.status === 200) {
        toast.success("Login successful!");
        navigate("/doctor-dashboard");
      } else {
        toast.error("Login failed. Please try again.");
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || "Login failed. Please check your credentials.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "input input-bordered w-full bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-cyan-500 transition-all";
  const labelClass = "label-text font-semibold mb-1 ml-1 text-slate-600 block text-sm";

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      {/* Back Button */}
      <Link
        to="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-cyan-600 transition-colors group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back to Home</span>
      </Link>

      {/* Main Auth Card */}
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
                {/* Row 1: Name + Email */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className={labelClass}>Full Name</label>
                    <input
                      type="text"
                      placeholder="Dr. Jane Smith"
                      className={inputClass}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-control">
                    <label className={labelClass}>Email</label>
                    <input
                      type="email"
                      placeholder="doctor@hospital.com"
                      className={inputClass}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Row 2: Age + Gender */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className={labelClass}>Age</label>
                    <input
                      type="number"
                      placeholder="Age"
                      min="22"
                      max="100"
                      className={inputClass}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-control">
                    <label className={labelClass}>Gender</label>
                    <select
                      className={inputClass}
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      required
                    >
                      <option value="" disabled>Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Phone */}
                <div className="form-control">
                  <label className={labelClass}>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    className={inputClass}
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                  />
                </div>

                {/* Row 4: Hospital + Speciality */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className={labelClass}>Hospital</label>
                    <input
                      type="text"
                      placeholder="Hospital name"
                      className={inputClass}
                      value={hospital}
                      onChange={(e) => setHospital(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-control">
                    <label className={labelClass}>Speciality</label>
                    <input
                      type="text"
                      placeholder="e.g. Cardiology"
                      className={inputClass}
                      value={speciality}
                      onChange={(e) => setSpeciality(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Row 5: Password */}
                <div className="form-control">
                  <label className={labelClass}>Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className={inputClass}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
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
          {/* Shown when Sign Up is active → prompt to Log In */}
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
            <Link
              to="/auth"
              className="mt-8 text-sm underline opacity-70 hover:opacity-100 transition-opacity"
            >
              Are you a Patient?
            </Link>
          </div>

          {/* Shown when Login is active → prompt to Register */}
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
            <Link
              to="/auth"
              className="mt-8 text-sm underline opacity-70 hover:opacity-100 transition-opacity"
            >
              Are you a Patient?
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DoctorAuth;