import React, { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { User, Mail, Phone, Calendar, Venus, Hospital, Stethoscope, ArrowLeft, LogOut, Pencil, Check, X, Trash2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router";
import api from "../api/Api"; // Your configured Axios instance

/* ── Types ── */
interface DoctorData {
  id: number;
  name: string;
  email: string;
  number: string;
  age: string | number;
  gender: string;
  hospital: string;
  speciality: string;
}

interface FormData {
  name: string;
  number: string;
  age: string;
  gender: string;
  hospital: string;
  speciality: string;
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

export default function DoctorProfile() {
  const [doctor, setDoctor] = useState<DoctorData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [editing, setEditing] = useState<boolean>(false);
  const [saving, setSaving]   = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    number: "",
    age: "",
    gender: "",
    hospital: "",
    speciality: "",
  });

  const navigate = useNavigate();

  // Helper to build formData from a DoctorData object
  const buildFormData = (profile: DoctorData): FormData => ({
    name: profile.name || "",
    number: profile.number || "",
    age: profile.age ? String(profile.age) : "",
    gender: profile.gender || "",
    hospital: profile.hospital || "",
    speciality: profile.speciality || "",
  });

  // --- Fetch Profile Details on Load ---
  useEffect(() => {
    const fetchDoctorProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get("/doctor/info/detail");

        if (response.data && response.data.success) {
          const profileData: DoctorData = response.data.data;
          setDoctor(profileData);
          setFormData(buildFormData(profileData));
        }
      } catch (error: any) {
        console.error("Error retrieving doctor profile:", error);

        const errorMessage = error.response?.data?.message || "";
        if (error.response?.status === 401 || errorMessage.toLowerCase().includes("token")) {
          alert("Session expired or missing credentials. Redirecting to login...");
          navigate("/auth");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorProfile();
  }, [navigate]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // --- Handle Profile Update Submission (PATCH) ---
  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      const response = await api.patch("/doctor/info/update", {
        name: formData.name,
        number: formData.number,
        age: formData.age ? parseInt(formData.age, 10) : null,
        gender: formData.gender,
        hospital: formData.hospital,
        speciality: formData.speciality,
      });

      if (response.data && response.data.success) {
        setDoctor(response.data.data);
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

  // Resets formData to current saved doctor values
  const handleCancel = (): void => {
    if (doctor) {
      setFormData(buildFormData(doctor));
    }
    setEditing(false);
  };

  // --- Handle Logout (Using HTTP-only cookie backend process) ---
  const handleLogout = async (): Promise<void> => {
    try {
      await api.post("/auth/logout"); 
    } catch (_) {
      // Proceed to redirect anyway
    } finally {
      navigate("/auth");
    }
  };

  // --- Handle Account Deletion ---
  const handleDeleteAccount = async (): Promise<void> => {
    setDeleting(true);
    try {
      const response = await api.delete("/doctor/info/delete");
      if (response.data && response.data.success) {
        alert("Account completely deleted. Goodbye!");
        navigate("/auth");
      }
    } catch (error: any) {
      console.error("Failed to delete account:", error);
      const errorMessage = error.response?.data?.message || "An error occurred during account deletion.";
      
      // Catches 409 Conflict if there are pending appointments
      alert(errorMessage);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
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

  if (!doctor) return null;

  /* ── Avatar initials generator ── */
  const initials = doctor.name
    ? doctor.name.replace(/^(Dr\.\s*)/i, "").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "DR";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10 relative">
      
      {/* Main Structural Card Container */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 overflow-hidden">
        
        {/* Top Header Background Panel */}
        <div className="bg-linear-to-br from-indigo-600 to-violet-600 px-6 pt-8 pb-14 relative">
          <button
            onClick={() => navigate("/")}
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
          <p className="text-center text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Doctor Profile</p>
          <p className="text-center text-white font-black text-xl tracking-tight">{doctor.name}</p>
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
              <div className="mb-6">
                <InfoRow icon={<User size={16} />}           label="Full Name"       value={doctor.name} />
                <InfoRow icon={<Mail size={16} />}           label="Email"           value={doctor.email} />
                <InfoRow icon={<Phone size={16} />}          label="Phone"           value={doctor.number} />
                <InfoRow icon={<Stethoscope size={16} />}    label="Speciality"      value={doctor.speciality} />
                <InfoRow icon={<Hospital size={16} />}       label="Hospital"        value={doctor.hospital} />
                <InfoRow icon={<Calendar size={16} />}       label="Age"             value={doctor.age ? String(doctor.age) : "—"} />
                <InfoRow icon={<Venus size={16} />}          label="Gender"          value={doctor.gender} />
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setEditing(true)}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all cursor-pointer"
                >
                  <Pencil size={16} /> Edit Profile
                </button>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-sm"
                >
                  <Trash2 size={15} /> Delete Account
                </button>
              </div>
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
                  <input type="email" value={doctor.email} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
                </div>

                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input type="tel" name="number" value={formData.number} onChange={handleChange} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Speciality</label>
                  <input type="text" name="speciality" value={formData.speciality} onChange={handleChange} className={inputClass} placeholder="e.g. Cardiology" />
                </div>

                <div>
                  <label className={labelClass}>Hospital / Clinic</label>
                  <input type="text" name="hospital" value={formData.hospital} onChange={handleChange} className={inputClass} placeholder="e.g. City General Hospital" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Age</label>
                    <input type="number" name="age" value={formData.age} onChange={handleChange} className={inputClass} min="22" max="100" />
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

      {/* ── SAFETY INTERLOCK MODAL: DELETION CONFIRMATION ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-slate-900 font-bold text-lg mb-2">Delete Account Permanently?</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              This action cannot be undone. All active slots, histories, and patient attachments will be wiped out. You cannot delete your profile if you have active upcoming appointments.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors cursor-pointer text-sm"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors cursor-pointer text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}