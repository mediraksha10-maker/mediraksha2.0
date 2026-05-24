import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Stethoscope } from "lucide-react";

const DoctorAuth = () => {
  const [isSignUp, setIsSignUp] = useState(true);
  // const [name, setName] = useState("");
  // const [email, setEmail] = useState("");
  // const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      {/* Back Button */}
      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-cyan-600 transition-colors group">
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Back to Home</span>
      </Link>

      {/* Main Auth Card */}
      <div className="relative w-full max-w-4xl h-150 bg-white rounded-4xl shadow-2xl overflow-hidden flex">
        
        {/* --- DOCTOR LOGIN FORM (Left Side) --- */}
        <div className={`absolute top-0 left-0 w-1/2 h-full transition-all duration-700 ease-in-out z-1 ${isSignUp ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"}`}>
          <div className="h-full flex flex-col justify-center px-16">
            <form onSubmit={() => {}} className="space-y-6">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-2 text-cyan-600">
                   <Stethoscope size={40} />
                </div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Doctor Login</h1>
                <p className="text-slate-400 mt-2">Access your medical dashboard</p>
              </div>
              
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label-text font-semibold mb-2 ml-1 text-slate-600">Doctor ID</label>
                  <input 
                    type="text" 
                    placeholder="Enter your ID"
                    className="input input-bordered w-full bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-cyan-500 transition-all" 
                    
                    required 
                  />
                </div>
                <div className="form-control">
                  <label className="label-text font-semibold mb-2 ml-1 text-slate-600">Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="input input-bordered w-full bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-cyan-500 transition-all" 
                    
                    required 
                  />
                </div>
              </div>

              <button className="btn btn-accent w-full bg-cyan-600 border-none hover:bg-cyan-700 text-white shadow-lg shadow-cyan-100 rounded-xl h-12 text-lg">
                Sign In
              </button>
            </form>
          </div>
        </div>

        {/* --- DOCTOR REGISTRATION FORM (Right Side) --- */}
        <div className={`absolute top-0 left-0 w-1/2 h-full transition-all duration-700 ease-in-out z-2 ${isSignUp ? "translate-x-full opacity-100" : "translate-x-0 opacity-0 pointer-events-none"}`}>
          <div className="h-full flex flex-col justify-center px-16">
            <form onSubmit={() => {}} className="space-y-6">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Registration</h1>
                <p className="text-slate-400 mt-2">Submit your credentials for verification</p>
              </div>
              
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label-text font-semibold mb-2 ml-1 text-slate-600">Official Doctor ID</label>
                  <input 
                    type="text" 
                    placeholder="E.g. DOC12345"
                    className="input input-bordered w-full bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-cyan-500 transition-all" 
                    
                    required 
                  />
                </div>
                <div className="form-control">
                  <label className="label-text font-semibold mb-2 ml-1 text-slate-600">Set Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="input input-bordered w-full bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-cyan-500 transition-all" 
                    
                    required 
                  />
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                 <p className="text-xs text-amber-700 leading-tight italic text-center">
                   MediRaksha will manually verify your credentials before full access is granted.
                 </p>
              </div>

              <button className="btn btn-primary w-full bg-cyan-600 border-none hover:bg-cyan-700 text-white shadow-lg shadow-cyan-100 rounded-xl h-12">
                Send for Verification
              </button>
            </form>
          </div>
        </div>

        {/* --- SLIDING OVERLAY PANEL --- */}
        <div 
          className={`absolute top-0 left-1/2 w-1/2 h-full z-100 transition-transform duration-700 ease-in-out overflow-hidden
            ${isSignUp ? "-translate-x-full" : "translate-x-0"}`}
        >
          <div 
            className={`relative -left-full h-full w-[200%] transform transition-transform duration-700 ease-in-out text-white flex
              ${isSignUp ? "translate-x-1/2" : "translate-x-0"}`}
            style={{ background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)' }}
          >
            {/* Content for Login Side */}
            <div className="w-1/2 h-full flex flex-col items-center justify-center p-12 text-center">
              <h2 className="text-4xl font-bold mb-4">Registered Doctor?</h2>
              <p className="mb-8 opacity-80 leading-relaxed">Log in to view your patient history and clinical schedule.</p>
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

            {/* Content for Signup Side */}
            <div className="w-1/2 h-full flex flex-col items-center justify-center p-12 text-center">
              <h2 className="text-4xl font-bold mb-4">New Doctor?</h2>
              <p className="mb-8 opacity-80 leading-relaxed">Sign up to join our professional network and manage your patients effectively.</p>
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
    </div>
  );
};

export default DoctorAuth;