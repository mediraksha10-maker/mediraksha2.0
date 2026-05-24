import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  Menu, X, HeartPulse, ChevronLeft, ChevronRight, 
  ShieldAlert, Building2, UploadCloud, 
  Bot, Send, Phone, MapPin, Star, Calendar, 
  FileText, CheckCircle2, User, ArrowRight
} from 'lucide-react';

// --- Types & Mock Data ---
interface CarouselItem {
  id: number;
  title: string;
  description: string;
  badge: string;
  bgColor: string;
}

interface ServiceItem {
  icon: React.ReactNode;
  title: string;
  desc: string;
  stats: string;
}

interface HospitalItem {
  name: string;
  distance: string;
  rating: number;
  type: string;
  address: string;
  available: boolean;
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  time: string;
}

export default function UserPage() {
  // Mobile menu toggle
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  
  // Hero Carousel state
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  
  // File Upload state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: string }>>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // AI Chat state
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hello! I'm your AI Health Assistant. How can I help you track or understand your wellness goals today?", sender: 'ai', time: '10:00 AM' }
  ]);
  const [inputValue, setInputValue] = useState<string>('');

  const carouselData: CarouselItem[] = [
    {
      id: 1,
      badge: "New Feature",
      title: "Instant AI Symptom Assessment",
      description: "Chat with our trained AI model to get instant clarity on minor health anomalies and recommendations.",
      bgColor: "from-blue-600 to-indigo-700"
    },
    {
      id: 2,
      badge: "Partnership",
      title: "24/7 Virtual Emergency Care",
      description: "Connect with certified practitioners within 10 minutes, anytime, anywhere seamlessly.",
      bgColor: "from-teal-600 to-cyan-700"
    },
    {
      id: 3,
      badge: "Health Track",
      title: "Secure Encrypted Health Records",
      description: "Upload clinical results, parse documents instantly, and monitor biometric progress dynamically.",
      bgColor: "from-purple-600 to-indigo-700"
    }
  ];

  const services: ServiceItem[] = [
    { icon: <HeartPulse className="w-6 h-6 text-emerald-500" />, title: "Primary Telehealth", desc: "Face-to-face video consultations with leading specialists.", stats: "12k+ Active Doctors" },
    { icon: <ShieldAlert className="w-6 h-6 text-blue-500" />, title: "Preventative Screening", desc: "Comprehensive risk profiles driven by biomarker tracking.", stats: "99.4% Precision" },
    { icon: <Calendar className="w-6 h-6 text-purple-500" />, title: "Chronic Management", desc: "Tailored routines, dietary restrictions, and prescription management.", stats: "24/7 Monitoring" }
  ];

  const hospitals: HospitalItem[] = [
    { name: "Metro General Medical Center", distance: "0.8 miles", rating: 4.8, type: "Trauma Level 1", address: "742 Evergreen Terrace, Springfield", available: true },
    { name: "St. Jude Wellness Hospital", distance: "2.4 miles", rating: 4.6, type: "Specialty Clinic", address: "1012 Mountain View Ave, Heights", available: true },
    { name: "Grace Community Clinic", distance: "3.1 miles", rating: 4.2, type: "Urgent Care", address: "404 Valley Road, Riverdale", available: false }
  ];

  // Auto-play Carousel effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselData.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [carouselData.length]);

  const handleNextSlide = () => setCurrentSlide((prev) => (prev + 1) % carouselData.length);
  const handlePrevSlide = () => setCurrentSlide((prev) => (prev - 1 + carouselData.length) % carouselData.length);

  // Drag & Drop simulation handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const processFiles = (fileList: FileList) => {
    setIsUploading(true);
    // Simulating API loading states
    setTimeout(() => {
      const parsed = Array.from(fileList).map(file => ({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
      }));
      setUploadedFiles(prev => [...prev, ...parsed]);
      setIsUploading(false);
    }, 1500);
  };

  // Chat Submission
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    // Simulated Intelligent Response
    setTimeout(() => {
      const aiMsg: Message = {
        id: Date.now() + 1,
        text: "I've noted that observation in your file context. If this issue is persistent or accompanied by severe symptoms, I highly recommend parsing it via our Document Upload module or arranging a direct sync with Metro General Hospital.",
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 1200);
  };
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 scroll-smooth selection:bg-blue-500 selection:text-white">
      
      {/* --- FIXED NAVBAR --- */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="p-2 bg-blue-600 rounded-xl text-white">
                <HeartPulse className="w-6 h-6" />
              </div>
              <span className="font-bold text-xl tracking-tight bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                MediRaksha
              </span>
            </div>

            {/* Desktop Navigation Link IDs matching page sections */}
            <div className="hidden md:flex items-center gap-1">
              <a href="/" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 rounded-lg transition-colors">Home</a>
              <a href="#services" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 rounded-lg transition-colors">Services</a>
              <a href="#about" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 rounded-lg transition-colors">About</a>
            </div>

            {/* Profile Target Anchor */}
            <div className="hidden md:flex items-center gap-3">
              <button onClick={() => { navigate('/auth') }} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                <h2 className="font-bold"><User className="w-5 h-5 inline mr-1" />Profile</h2>
              </button>
            </div>

            {/* Hamburger Button */}
            <div className="md:hidden flex items-center">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className="p-2 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
                aria-label="Toggle navigation menu"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Flyout Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 transition-all duration-300 ease-in-out">
            <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3">
              <a href="#hero" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600">Home</a>
              <a href="#services" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600">Services</a>
              <a href="#about" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600">About</a>
            </div>
          </div>
        )}
      </nav>

      {/* --- MAIN PAGE CONTENT CONTAINER --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-20">

        {/* --- 1. HERO CAROUSEL SECTION --- */}
        <section id="hero" className="relative rounded-3xl overflow-hidden shadow-lg bg-slate-900">
          <div className="relative h-115 sm:h-100 flex items-center transition-all duration-700">
            {/* Background Gradient Layer dynamically changed via selection state */}
            <div className={`absolute inset-0 bg-linear-to-r ${carouselData[currentSlide].bgColor} opacity-95 transition-all duration-500`} />
            
            {/* Slide Content */}
            <div className="relative z-10 max-w-3xl px-8 sm:px-12 md:px-16 text-white space-y-4">
              <span className="inline-block px-3 py-1 bg-white/20 text-white font-medium text-xs tracking-wider uppercase rounded-full backdrop-blur-sm">
                {carouselData[currentSlide].badge}
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight transition-all">
                {carouselData[currentSlide].title}
              </h1>
              <p className="text-white/80 text-base sm:text-lg max-w-xl">
                {carouselData[currentSlide].description}
              </p>
              <div className="pt-4 flex items-center gap-3">
                <a href="#ai-chat" className="px-5 py-2.5 bg-white text-blue-700 text-sm font-semibold rounded-xl hover:bg-slate-50 shadow transition-all flex items-center gap-2 group">
                  Get Started <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <a href="#services" className="px-5 py-2.5 bg-white/10 text-white text-sm font-medium rounded-xl hover:bg-white/20 transition-all border border-white/20">
                  Explore Services
                </a>
              </div>
            </div>
          </div>

          {/* Carousel Left Control */}
          <button 
            onClick={handlePrevSlide} 
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all z-20"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          {/* Carousel Right Control */}
          <button 
            onClick={handleNextSlide} 
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all z-20"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Slide Indicator Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {carouselData.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all ${currentSlide === index ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </section>


        {/* --- 2. SERVICES SECTION --- */}
        <section id="services" className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Comprehensive Clinical Ecosystem</h2>
            <p className="text-slate-500 text-sm sm:text-base">Modern medical paradigms structured directly around patient metrics and continuous remote diagnostics.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {services.map((srv, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all space-y-4 group">
                <div className="p-3 bg-slate-50 group-hover:bg-blue-50 w-fit rounded-xl transition-colors">
                  {srv.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-800">{srv.title}</h3>
                  <p className="text-slate-500 text-sm mt-1">{srv.desc}</p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-400">
                  <span>Capacity</span>
                  <span className="text-slate-700">{srv.stats}</span>
                </div>
              </div>
            ))}
          </div>
        </section>


        {/* --- 3. TWO-COLUMN INTERACTIVE ZONE (HOSPITALS & UPLOAD) --- */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Nearby Hospitals List (7 Columns Wide) */}
          <section id="hospitals" className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Nearby Medical Facilities</h2>
                <p className="text-slate-500 text-xs">Real-time distance and trauma capabilities based on your location tracking.</p>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-4">
              {hospitals.map((hospital, index) => (
                <div key={index} className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm sm:text-base text-slate-800">{hospital.name}</h3>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded">
                        {hospital.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {hospital.distance}</span>
                      <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {hospital.rating}</span>
                    </div>
                    <p className="text-xs text-slate-400">{hospital.address}</p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${hospital.available ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${hospital.available ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {hospital.available ? 'ER Open' : 'At Capacity'}
                    </span>
                    <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                      Directions <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Secure Document Upload Portal (5 Columns Wide) */}
          <section id="upload" className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Secure Laboratory Upload</h2>
                <p className="text-slate-500 text-xs">HIPAA-compliant encrypted lab telemetry reports parser.</p>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <UploadCloud className="w-5 h-5" />
              </div>
            </div>

            {/* Interactive Drop Zone Area */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all relative cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'}`}
            >
              <input 
                type="file" 
                multiple 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                id="file-input-field"
              />
              <div className="space-y-2 pointer-events-none">
                <div className="p-3 bg-white rounded-xl shadow-sm w-fit mx-auto text-slate-400">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-blue-600 hover:text-blue-700">Click to browse files</span> or drag reports here
                </div>
                <p className="text-xs text-slate-400">Supports DICOM, PDF, HL7 JSON data up to 15MB</p>
              </div>
            </div>

            {/* Displaying Uploading States & Output Manifests */}
            {isUploading && (
              <div className="flex items-center justify-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-500 font-medium">Parsing document structure metadata...</span>
              </div>
            )}

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Processed Records ({uploadedFiles.length})</h4>
                <div className="max-h-35 overflow-y-auto space-y-2 pr-1">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                      <div className="flex items-center gap-2 truncate max-w-[70%]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="font-medium text-slate-700 truncate">{file.name}</span>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px]">{file.size}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>


        {/* --- 4. INTEGRATED AI HEALTH CORE ASSISTANT PANEL --- */}
        <section id="ai-chat" className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm grid md:grid-cols-12 min-h-125">
          
          {/* Conversational Core Sidebar Info */}
          <div className="md:col-span-4 bg-slate-900 text-white p-6 sm:p-8 flex flex-col justify-between space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium border border-blue-500/30">
                <Bot className="w-3.5 h-3.5" /> LLM Core Active
              </div>
              <h2 className="text-2xl font-bold tracking-tight">AI Diagnostic Consultation</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Interact dynamically with our foundational medical model. Review diagnostic patterns, map complex symptom maps, or translate sophisticated laboratory readings.
              </p>
            </div>
            
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/50 space-y-2.5 text-xs">
              <span className="font-medium text-slate-300 block">System Guardrails</span>
              <p className="text-slate-400 leading-normal">This deployment serves analytical informational triage context and does not constitute formal medical emergency prescription.</p>
            </div>
          </div>

          {/* Interactive Chat Console Window */}
          <div className="md:col-span-8 flex flex-col h-125 bg-slate-50/50">
            {/* Header profile status banner */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-800">PulseCare Core AI</h3>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Context Sandbox Ready
                  </div>
                </div>
              </div>
              <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-all">
                <Phone className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable messages container feed area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'}`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <span className={`text-[10px] block text-right mt-1.5 ${msg.sender === 'user' ? 'text-white/60' : 'text-slate-400'}`}>
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Real-time conversational form tracking submission */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Query symptom logs, biometric ranges or drug alternatives..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
              />
              <button 
                type="submit"
                disabled={!inputValue.trim()}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl transition-all shadow-sm shrink-0"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </section>


        {/* --- 5. ABOUT ECOSYSTEM FOOTER SECTION --- */}
        <section id="about" className="bg-slate-100 p-8 rounded-3xl border border-slate-200/60 grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Next-Generation Telemedicine Infrastructure</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              PulseCare integrates multi-tenant clinical databases, secure end-to-end data pipelines, and intelligent semantic parsing to bring low-latency clinical advisory straight to your browser sandbox. 
            </p>
            <p className="text-slate-600 text-sm leading-relaxed">
              Built natively alongside hospital dispatch architectures to guarantee physical routing synchronicity if critical parameters are crossed.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 space-y-1">
              <span className="block text-2xl font-bold text-blue-600">99.99%</span>
              <span className="text-xs font-semibold text-slate-700">Platform Uptime SLA</span>
              <p className="text-[11px] text-slate-400 mt-1">Redundant compute grids.</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 space-y-1">
              <span className="block text-2xl font-bold text-indigo-600">AES-256</span>
              <span className="text-xs font-semibold text-slate-700">Encryption Layer</span>
              <p className="text-[11px] text-slate-400 mt-1">End-to-end telemetry safety.</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 space-y-1">
              <span className="block text-2xl font-bold text-emerald-600">ISO 27001</span>
              <span className="text-xs font-semibold text-slate-700">Compliance Standard</span>
              <p className="text-[11px] text-slate-400 mt-1">Full HIPAA architecture sync.</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 space-y-1">
              <span className="block text-2xl font-bold text-cyan-600">&lt; 120ms</span>
              <span className="text-xs font-semibold text-slate-700">AI Inference Speed</span>
              <p className="text-[11px] text-slate-400 mt-1">Optimized vector pipelines.</p>
            </div>
          </div>
        </section>

      </main>

      {/* Basic Footer Legal Credits */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-400 font-medium">
        &copy; {new Date().getFullYear()} PulseCare Digital Systems Inc. Distributed globally under high-availability parameters.
      </footer>
    </div>
  );
}