import { useState, ChangeEvent } from "react";
import { User, Mail, Phone, Calendar, Venus, ArrowLeft, LogOut, Pencil, Check, X } from "lucide-react";
import { useNavigate } from "react-router";
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

/* ── Mock Initial Data for Preview ── */
const MOCK_USER: UserData = {
  name: "Jane Doe",
  email: "janedoe@example.com",
  age: 28,
  gender: "female",
  number: "+1 (555) 019-2834",
};

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
  // Initialized with mock data directly instead of loading via API
  const [user, setUser]       = useState<UserData | null>(MOCK_USER);
  const [loading]             = useState<boolean>(false); 
  const [editing, setEditing] = useState<boolean>(false);
  const [saving, setSaving]   = useState<boolean>(false);
  
  const [formData, setFormData] = useState<FormData>({
    name:   MOCK_USER.name,
    age:    String(MOCK_USER.age),
    gender: MOCK_USER.gender,
    number: MOCK_USER.number,
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    
    // Simulate a brief network delay to view the "Saving..." state UI
    setTimeout(() => {
      if (user) {
        setUser({
          ...user,
          name: formData.name,
          age: formData.age,
          gender: formData.gender,
          number: formData.number,
        });
      }
      setSaving(false);
      setEditing(false);
    }, 600);
  };

  const handleLogout = (): void => {
    alert("Logout clicked (API logic bypassed)");
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  /* ── Avatar initials ── */
  const initials = user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 overflow-hidden">

        {/* Header band */}
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

        {/* Avatar overlap */}
        <div className="flex justify-center -mt-10 mb-2">
          <div className="w-20 h-20 rounded-2xl bg-white shadow-lg border-4 border-white flex items-center justify-center text-2xl font-black text-indigo-600">
            {initials || "??"}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">

          {/* ── VIEW MODE ── */}
          {!editing && (
            <>
              <div className="mb-4">
                <InfoRow icon={<User size={16} />}     label="Full Name" value={user.name} />
                <InfoRow icon={<Mail size={16} />}     label="Email"     value={user.email} />
                <InfoRow icon={<Phone size={16} />}    label="Phone"     value={user.number} />
                <InfoRow icon={<Calendar size={16} />} label="Age"       value={String(user.age)} />
                <InfoRow icon={<Venus size={16} />}    label="Gender"    value={user.gender} />
              </div>

              <button
                onClick={() => setEditing(true)}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all"
              >
                <Pencil size={16} /> Edit Profile
              </button>
            </>
          )}

          {/* ── EDIT MODE ── */}
          {editing && (
            <>
              <div className="space-y-4 mb-6">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Email</label>
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
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all"
                >
                  <Check size={16} /> {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all"
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