import React, { useState, useEffect } from "react";
import type { ChangeEvent } from 'react'
import { User, Mail, Phone, Calendar, Venus, ArrowLeft, LogOut, Pencil, Check, X } from "lucide-react";
import { useNavigate } from "react-router";
import api from '../api/Api'; // Importing your configured Axios instance

/* ── Types ── */
interface UserData {
  name: string;
  email: string;
  age: string | number;
  gender: string;
  number: string;
}

interface FormData {
  name: string;
  age: string;
  gender: string;
  number: string;
}

/* ── Field row (view mode) ── */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-slate-100 last:border-0">
      <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-slate-800 font-semibold truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

const inputClass =
  "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";
const labelClass = "block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5";

export default function MyDetail() {
  const [user, setUser]       = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true); 
  const [editing, setEditing] = useState<boolean>(false);
  const [saving, setSaving]   = useState<boolean>(false);
  
  const [formData, setFormData] = useState<FormData>({
    name:   "",
    age:    "",
    gender: "",
    number: "",
  });

  const navigate = useNavigate();

  // Helper to build formData from a UserData object
  const buildFormData = (profile: UserData): FormData => ({
    name:   profile.name   || "",
    age:    profile.age    ? String(profile.age) : "",
    gender: profile.gender || "",
    number: profile.number || "",
  });

  // --- Fetch Profile Details on Load ---
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get("/user/info/detail");

        if(response.status == 401) {
          navigate("/auth");
        }
        
        if (response.data && response.data.success) {
          // FIX 1: was storing entire response.data object; must use response.data.data
          const profileData: UserData = response.data.data;
          setUser(profileData);
          
          // FIX 2: was reading profileData.name etc. directly from the wrapper object
          setFormData(buildFormData(profileData));
        }
      } catch (error: any) {
        console.error("Error retrieving user context profiles:", error);
        
        const errorMessage = error.response?.data?.message || "";
        if (error.response?.status === 401 || errorMessage.toLowerCase().includes("token")) {
          alert("Session expired or missing credentials. Redirecting to login...");
          navigate("/auth");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // --- Handle Profile Update Submission (PATCH) ---
  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      const response = await api.patch("/user/info/update", {
        name: formData.name,
        number: formData.number,
        age: formData.age ? parseInt(formData.age, 10) : null,
        gender: formData.gender
      });

      if (response.data && response.data.success) {
        setUser(response.data.data);
        setEditing(false);
      }
    } catch (error: any) {
      console.error("Failed to update profile changes:", error);
      const errorMessage = error.response?.data?.message || "Something went wrong while saving changes.";
      
      if (error.response?.status === 401) {
        navigate("/auth");
      } else {
        alert(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  // FIX 3: Cancel now resets formData to current saved user values,
  // preventing stale edits from persisting when reopening edit mode.
  const handleCancel = (): void => {
    if (user) {
      setFormData(buildFormData(user));
    }
    setEditing(false);
  };

  // Auth token is stored locally and sent on every request via Authorization header.
  const handleLogout = async (): Promise<void> => {
    localStorage.removeItem("token");
    try {
      await api.post("/auth/logout");
    } catch (_) {
      // Even if the call fails, proceed to redirect
    } finally {
      navigate("/auth");
    }
  };

  /* ── Loading State ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  /* ── Avatar initials generator ── */
  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "??";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">

      {/* Main Structural Card Container */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 overflow-hidden">

        {/* Top Header Background Panel */}
        <div className="bg-linear-to-br from-indigo-600 to-violet-600 px-6 pt-8 pb-14 relative">
          <button
            onClick={() => navigate('/')}
            className="absolute top-4 left-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            onClick={handleLogout}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <LogOut size={18} />
          </button>
          <p className="text-center text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">My Profile</p>
          <p className="text-center text-white font-black text-xl tracking-tight">{user.name}</p>
        </div>

        {/* Avatar badge graphic offset layer */}
        <div className="flex justify-center -mt-10 mb-2">
          <div className="w-20 h-20 rounded-2xl bg-white shadow-lg border-4 border-white flex items-center justify-center text-2xl font-black text-indigo-600">
            {initials}
          </div>
        </div>

        {/* Structural Info/Form Body Block */}
        <div className="px-6 pb-6">

          {/* ── CONDITIONAL RENDER: PROFILE VIEW MODE ── */}
          {!editing && (
            <>
              <div className="mb-4">
                <InfoRow icon={<User size={16} />}     label="Full Name" value={user.name} />
                <InfoRow icon={<Mail size={16} />}     label="Email"     value={user.email} />
                <InfoRow icon={<Phone size={16} />}    label="Phone"     value={user.number} />
                <InfoRow icon={<Calendar size={16} />} label="Age"       value={user.age ? String(user.age) : "—"} />
                <InfoRow icon={<Venus size={16} />}    label="Gender"    value={user.gender} />
              </div>

              <button
                onClick={() => setEditing(true)}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all cursor-pointer"
              >
                <Pencil size={16} /> Edit Profile
              </button>
            </>
          )}

          {/* ── CONDITIONAL RENDER: PROFILE EDITING INTERACTIVE MODE ── */}
          {editing && (
            <>
              <div className="space-y-4 mb-6">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Email Address</label>
                  <input
                    type="email" value={user.email} disabled
                    className={`${inputClass} opacity-50 cursor-not-allowed`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input type="tel" name="number" value={formData.number} onChange={handleChange} className={inputClass} placeholder="+91 98765 43210" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Age</label>
                    <input type="number" name="age" value={formData.age} onChange={handleChange} className={inputClass} min="1" max="120" />
                  </div>
                  <div>
                    <label className={labelClass}>Gender</label>
                    <select name="gender" value={formData.gender} onChange={handleChange} className={inputClass}>
                      <option value="" disabled>Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all cursor-pointer"
                >
                  <Check size={16} /> {saving ? "Saving..." : "Save"}
                </button>
                {/* FIX 3: was calling setEditing(false) directly; now uses handleCancel to reset form */}
                <button
                  onClick={handleCancel}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all cursor-pointer"
                >
                  <X size={16} /> Cancel
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}