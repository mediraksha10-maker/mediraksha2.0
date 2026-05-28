import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { User, Activity, Menu, X } from "lucide-react";

export default function Navbar() {
  const location = useLocation();
  const [servicesOpen, setServicesOpen] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string): boolean => location.pathname === path;

  // Close desktop dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setServicesOpen(false);
      }
      servicesOpen;
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setServicesOpen(false);
  }, [location.pathname]);

  return (
    <div className="sticky top-0 z-50 w-full px-4 py-3">
      <nav className="bg-white/80 backdrop-blur-md border border-white/20 shadow-lg rounded-2xl w-full px-6 flex items-center justify-between h-16">

        {/* --- LEFT: Logo + Mobile Hamburger --- */}
        <div className="flex items-center gap-2">
          <button
            className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600 mr-1"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-indigo-600 p-1.5 rounded-lg group-hover:rotate-12 transition-transform duration-300">
              <Activity className="text-white" size={22} />
            </div>
            <span className="font-black text-2xl tracking-tight bg-linear-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent">
              MediRaksha
            </span>
          </Link>
        </div>

        {/* --- CENTER: Desktop Nav --- */}
        <div className="hidden lg:flex items-center gap-1">
          <Link
            to="/"
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              isActive("/")
                ? "bg-indigo-50 text-indigo-600"
                : "hover:bg-slate-50 text-slate-600"
            }`}
          >
            Home
          </Link>

          {/* Services dropdown */}
          <Link
            to="/services"
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              isActive("/services")
                ? "bg-indigo-50 text-indigo-600"
                : "hover:bg-slate-50 text-slate-600"
            }`}
          >
            Services
          </Link>
        </div>

        {/* --- RIGHT: Profile --- */}
        <Link
          to="/userprofile"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-indigo-50 transition-all group"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <User size={18} />
          </div>
          <span className="hidden sm:inline font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
            Profile
          </span>
        </Link>

      </nav>

      {/* --- MOBILE DROPDOWN MENU --- */}
      {mobileOpen && (
        <div className="lg:hidden mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4">
          <ul className="flex flex-col gap-1">
            <li>
              <Link
                to="/"
                className={`block px-4 py-3 rounded-xl font-medium transition-all ${
                  isActive("/")
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Home
              </Link>
              <Link
                to="/services"
                className={`block px-4 py-3 rounded-xl font-medium transition-all ${
                  isActive("/services")
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Services
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}