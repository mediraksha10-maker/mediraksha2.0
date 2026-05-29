import { Link } from "react-router";
import { Activity, Mail } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-slate-900 text-slate-300">
            {/* Main Footer Content */}
            <div className="max-w-7xl mx-auto px-6 py-16">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10">
                    
                    {/* Brand Section */}
                    <div className="col-span-2 lg:col-span-2">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="bg-indigo-600 p-1.5 rounded-lg">
                                <Activity className="text-white" size={20} />
                            </div>
                            <span className="font-black text-2xl tracking-tight text-white">
                                MediRaksha
                            </span>
                        </div>
                        <p className="text-slate-400 max-w-xs mb-6 leading-relaxed">
                            Revolutionizing healthcare through secure data management and 
                            AI-driven insights. Your health, protected and accessible.
                        </p>
                    </div>

                    {/* Navigation Columns */}
                    <div>
                        <h6 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Services</h6>
                        <ul className="space-y-4 text-sm">
                            <li><Link to="/map" className="hover:text-indigo-400 transition-colors">Nearby Hospitals</Link></li>
                            <li><Link to="/upload" className="hover:text-indigo-400 transition-colors">Health Vault</Link></li>
                            <li><Link to="/doctoravailable" className="hover:text-indigo-400 transition-colors">Doctor Schedule</Link></li>
                            <li><Link to="/mydoctor" className="hover:text-indigo-400 transition-colors">Search Experts</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h6 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Platform</h6>
                        <ul className="space-y-4 text-sm">
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">AI Diagnostics</a></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Security</a></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Pricing</a></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Mobile Apps</a></li>
                        </ul>
                    </div>

                    <div>
                        <h6 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Company</h6>
                        <ul className="space-y-4 text-sm">
                            <li><Link to="/about" className="hover:text-indigo-400 transition-colors">About Us</Link></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Contact</a></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Careers</a></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Impact</a></li>
                        </ul>
                    </div>

                    <div>
                        <h6 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Legal</h6>
                        <ul className="space-y-4 text-sm">
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Terms of Use</a></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Privacy Policy</a></li>
                            <li><a href="#" className="hover:text-indigo-400 transition-colors">Cookie Settings</a></li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-slate-500">
                        © {new Date().getFullYear()} MediRaksha Health Systems. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6 text-sm text-slate-500">
                        <span className="flex items-center gap-2">
                            <Mail size={14} /> support@mediraksha.com
                        </span>
                        <div className="flex gap-4">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Systems Operational
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}