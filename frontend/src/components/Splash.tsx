import { Activity } from 'lucide-react';

const Splash = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-base-100 z-9999 overflow-hidden">
        {/* Animated Background Decoration */}
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 bg-primary/5 rounded-full blur-[120px] animate-pulse"></div>
        </div>

        <style>
            {`
        @keyframes splash-entrance {
            0% { transform: scale(0.9); opacity: 0; filter: blur(10px); }
            20% { transform: scale(1); opacity: 1; filter: blur(0px); }
            85% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(1.1); opacity: 0; }
        }

        .animate-splash-content {
            animation: splash-entrance 3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .letter-glow {
            text-shadow: 0 0 20px rgba(var(--p), 0.2);
        }
      `}
        </style>

        <div className="flex flex-col items-center justify-center animate-splash-content px-6">
            {/* Logo Container */}
            <div className="bg-indigo-600 p-1.5 rounded-lg mb-6">
                <Activity className="text-white" size={75} />
            </div>

            {/* Brand Identity */}
            <div className="text-center space-y-2">
                <h1 className="text-5xl font-black text-base-content tracking-[0.2em] uppercase letter-glow">
                    Medi<span className="text-primary">Raksha</span>
                </h1>
                <p className="text-slate-400 font-medium tracking-[0.3em] text-xs uppercase opacity-70">
                    Your Health, Protected
                </p>
            </div>

            {/* Modern Loading Indicator */}
            <div className="mt-12 flex flex-col items-center gap-3">
                <span className="loading loading-infinity loading-lg text-primary opacity-80"></span>
                <span className="text-[10px] font-bold text-base-content/30 tracking-[0.2em] uppercase">
                    Initializing Secure Portal
                </span>
            </div>
        </div>
    </div>
);

export default Splash;