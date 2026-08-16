import React, { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { User, Mail, Phone, Calendar, Venus, Hospital, Stethoscope, ArrowLeft, LogOut, Pencil, Check, X, Trash2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router";
import api from "../api/Api";

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
function InfoRow({
  icon,
  label,
  value,
  iconBg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconBg?: string;
}) {
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-slate-100 last:border-0">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          iconBg ?? "bg-indigo-50 text-indigo-500"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-slate-800 font-semibold text-sm truncate mt-0.5">{value || "—"}</p>
      </div>
    </div>
  );
}

const inputClass =
  "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";
const labelClass = "block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5";

export default function DoctorProfile() {
  const [doctor, setDoctor]               = useState<DoctorData | null>(null);
  const [loading, setLoading]             = useState<boolean>(true);
  const [editing, setEditing]             = useState<boolean>(false);
  const [saving, setSaving]               = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleting, setDeleting]           = useState<boolean>(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    number: "",
    age: "",
    gender: "",
    hospital: "",
    speciality: "",
  });

  const navigate = useNavigate();

  const buildFormData = (profile: DoctorData): FormData => ({
    name:       profile.name       || "",
    number:     profile.number     || "",
    age:        profile.age        ? String(profile.age) : "",
    gender:     profile.gender     || "",
    hospital:   profile.hospital   || "",
    speciality: profile.speciality || "",
  });

  useEffect(() => {
    const fetchDoctorProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get("/doctor/info/detail");
        if (response.data?.success) {
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

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      const response = await api.patch("/doctor/info/update", {
        name:       formData.name,
        number:     formData.number,
        age:        formData.age ? parseInt(formData.age, 10) : null,
        gender:     formData.gender,
        hospital:   formData.hospital,
        speciality: formData.speciality,
      });
      if (response.data?.success) {
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

  const handleCancel = (): void => {
    if (doctor) setFormData(buildFormData(doctor));
    setEditing(false);
  };

  const handleLogout = async (): Promise<void> => {
    localStorage.removeItem("token");
    try {
      await api.post("/auth/logout");
    } catch (_) {
      // proceed to redirect anyway
    } finally {
      navigate("/auth");
    }
  };

  const handleDeleteAccount = async (): Promise<void> => {
    setDeleting(true);
    try {
      const response = await api.delete("/doctor/info/delete");
      if (response.data?.success) {
        alert("Account completely deleted. Goodbye!");
        navigate("/auth");
      }
    } catch (error: any) {
      console.error("Failed to delete account:", error);
      const errorMessage = error.response?.data?.message || "An error occurred during account deletion.";
      alert(errorMessage);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-11 h-11 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (!doctor) return null;

  const initials = doctor.name
    ? doctor.name.replace(/^(Dr\.\s*)/i, "").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "DR";

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100 flex flex-col items-center justify-center px-4 py-10">

      {/* ── Main Card ── */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-indigo-300/30 overflow-hidden">

        {/* ── Rich Hero Header ── */}
        <div className="relative bg-linear-to-br from-indigo-900 via-blue-800 to-violet-900 px-6 pt-10 pb-20 overflow-hidden">

          {/* Decorative glow blobs */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-blue-500/25 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-violet-600/25 blur-3xl pointer-events-none" />
          <div className="absolute top-10 right-1/3 w-20 h-20 rounded-full bg-indigo-400/20 blur-xl pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-12 h-12 rounded-full bg-blue-300/15 blur-lg pointer-events-none" />

          {/* Subtle dot grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />

          {/* Top nav buttons — glassmorphism style */}
          <button
            onClick={() => navigate("/")}
            className="absolute top-4 left-4 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur-sm transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            onClick={handleLogout}
            className="absolute top-4 right-4 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur-sm transition-all"
          >
            <LogOut size={18} />
          </button>

          {/* Header content */}
          <div className="relative z-10 text-center pt-2">
            {/* Verified pill */}
            <div className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 backdrop-blur-sm rounded-full px-3.5 py-1.5 mb-4">
              <ShieldCheck size={11} className="text-emerald-300" />
              <span className="text-white/90 text-[10px] font-bold uppercase tracking-[0.15em]">
                Verified Medical Professional
              </span>
            </div>

            <h1 className="text-white font-black text-[1.65rem] tracking-tight leading-tight drop-shadow">
              {doctor.name}
            </h1>

            {doctor.speciality && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 bg-white/12 border border-white/15 rounded-full px-3 py-1">
                <Stethoscope size={11} className="text-indigo-200" />
                <span className="text-indigo-100 text-xs font-semibold">{doctor.speciality}</span>
              </div>
            )}

            {doctor.hospital && (
              <p className="text-indigo-300/80 text-[11px] mt-2 flex items-center justify-center gap-1.5">
                <Hospital size={10} className="text-indigo-400/70" />
                {doctor.hospital}
              </p>
            )}
          </div>
        </div>

        {/* ── Floating Avatar ── */}
        <div className="flex justify-center -mt-14 mb-2 relative z-10">
          <div className="relative">
            {/* Gradient ring */}
            <div className="p-[3px] rounded-[22px] bg-linear-to-br from-blue-400 via-indigo-500 to-violet-500 shadow-2xl shadow-indigo-500/40">
              <div className="w-24 h-24 rounded-[18px] bg-white flex items-center justify-center">
                <span className="text-3xl font-black text-indigo-600">{initials}</span>
              </div>
            </div>
            {/* Stethoscope badge */}
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg border-2 border-white">
              <Stethoscope size={14} className="text-white" />
            </div>
          </div>
        </div>

        {/* ── Info / Edit Body ── */}
        <div className="px-6 pb-6">

          {/* ── VIEW MODE ── */}
          {!editing && (
            <>
              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                Profile Details
              </p>

              <div className="bg-slate-50/70 rounded-2xl px-2 mb-6">
                <InfoRow icon={<User size={15} />}        label="Full Name"   value={doctor.name}                               iconBg="bg-indigo-50 text-indigo-500" />
                <InfoRow icon={<Mail size={15} />}        label="Email"       value={doctor.email}                              iconBg="bg-blue-50 text-blue-500" />
                <InfoRow icon={<Phone size={15} />}       label="Phone"       value={doctor.number}                             iconBg="bg-emerald-50 text-emerald-500" />
                <InfoRow icon={<Stethoscope size={15} />} label="Speciality"  value={doctor.speciality}                         iconBg="bg-violet-50 text-violet-500" />
                <InfoRow icon={<Hospital size={15} />}    label="Hospital"    value={doctor.hospital}                           iconBg="bg-amber-50 text-amber-600" />
                <InfoRow icon={<Calendar size={15} />}    label="Age"         value={doctor.age ? String(doctor.age) : "—"}     iconBg="bg-rose-50 text-rose-500" />
                <InfoRow icon={<Venus size={15} />}       label="Gender"      value={doctor.gender}                             iconBg="bg-pink-50 text-pink-500" />
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setEditing(true)}
                  className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-indigo-400/30 cursor-pointer"
                >
                  <Pencil size={15} /> Edit Profile
                </button>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-sm border border-rose-100"
                >
                  <Trash2 size={14} /> Delete Account
                </button>
              </div>
            </>
          )}

          {/* ── EDIT MODE ── */}
          {editing && (
            <>
              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                Edit Your Information
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Email Address</label>
                  <input
                    type="email"
                    value={doctor.email}
                    disabled
                    className={`${inputClass} opacity-50 cursor-not-allowed`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input type="tel" name="number" value={formData.number} onChange={handleChange} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Speciality</label>
                  <input
                    type="text"
                    name="speciality"
                    value={formData.speciality}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="e.g. Cardiology"
                  />
                </div>

                <div>
                  <label className={labelClass}>Hospital / Clinic</label>
                  <input
                    type="text"
                    name="hospital"
                    value={formData.hospital}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="e.g. City General Hospital"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Age</label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      className={inputClass}
                      min="22"
                      max="100"
                    />
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
                  className="flex-1 flex items-center justify-center gap-2 bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-indigo-400/30 cursor-pointer"
                >
                  <Check size={15} /> {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all cursor-pointer"
                >
                  <X size={15} /> Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mx-auto mb-4">
              <AlertTriangle size={26} />
            </div>
            <h3 className="text-slate-900 font-black text-lg mb-2">Delete Account Permanently?</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              This action cannot be undone. All active slots, histories, and patient attachments will be wiped out.
              You cannot delete your profile if you have active upcoming appointments.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors cursor-pointer text-sm"
              >
                {deleting ? "Deleting…" : "Yes, Delete"}
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
