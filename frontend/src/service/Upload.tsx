import { useState, useEffect, ChangeEvent } from 'react';
import { 
  ArrowLeft, Upload, FileText, Trash2, 
  Eye, FileUp, Shield, Tag, Info 
} from "lucide-react";
import { useNavigate } from 'react-router';

/* ── Type Definitions ── */
interface MedicalFile {
  _id: string;
  title: string;
  filename: string;
  category: string;
  visibility: 'private' | 'doctor';
  createdAt: string;
}

interface MessageState {
  text: string;
  type: 'success' | 'error';
}

type PreviewType = 'image' | 'pdf' | 'other' | null;

/* ── Mock Initial Stored Records ── */
const MOCK_FILES: MedicalFile[] = [
  {
    _id: "rec_01",
    title: "CBC & Lipid Profile Test",
    filename: "blood_report.pdf",
    category: "LAB",
    visibility: "private",
    createdAt: "2026-05-15T08:30:00.000Z"
  },
  {
    _id: "rec_02",
    title: "Lumbar Spine X-Ray",
    filename: "xray_spine.jpg",
    category: "SCAN",
    visibility: "doctor",
    createdAt: "2026-04-22T14:15:00.000Z"
  },
  {
    _id: "rec_03",
    title: "Amoxicillin Prescription",
    filename: "rx_dr_smith.png",
    category: "PRESCRIPTION",
    visibility: "doctor",
    createdAt: "2026-05-20T11:05:00.000Z"
  }
];

export default function UploadReport() {
  // --- Form State ---
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('LAB');
  const [visibility, setVisibility] = useState<'private' | 'doctor'>('private');
  
  // --- UI & Data State ---
  const [message, setMessage] = useState<MessageState | null>(null);
  const [files, setFiles] = useState<MedicalFile[]>([]);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<PreviewType>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Load local dummy data on mount
  useEffect(() => {
    setFiles(MOCK_FILES);
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

  const handleUpload = (): void => {
    if (!file || !title) {
      setMessage({ text: 'Please provide a title and select a file', type: 'error' });
      return;
    }

    setIsUploading(true);

    // Simulate Network Request Delay for UI Feedback Loop
    setTimeout(() => {
      const newRecord: MedicalFile = {
        _id: `rec_${Date.now()}`,
        title: title,
        filename: file.name,
        category: category,
        visibility: visibility,
        createdAt: new Date().toISOString()
      };

      setFiles((prev) => [newRecord, ...prev]);
      setMessage({ text: 'Medical record uploaded and encrypted successfully!', type: 'success' });
      
      // Reset Form State
      setFile(null);
      setTitle('');
      setCategory('LAB');
      setVisibility('private');
      setIsUploading(false);

      setTimeout(() => setMessage(null), 4000);
    }, 900);
  };

  const handleDelete = (id: string): void => {
    if (!window.confirm("Delete this medical record permanently?")) return;
    setFiles((prev) => prev.filter((f) => f._id !== id));
    setMessage({ text: 'File deleted from health vault', type: 'success'});
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePreview = (filename: string): void => {
    // Generate functional sandbox URLs based on file configurations
    if (/\.pdf$/i.test(filename)) {
      setPreviewType('pdf');
      // Shared sample fallback iframe asset
      setPreviewFile('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
    } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) {
      setPreviewType('image');
      // Placeholder layout asset
      setPreviewFile('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=60');
    } else {
      setPreviewType('other');
      setPreviewFile('#');
    }
  };
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/services')}
              className="w-10 h-10 rounded-full bg-white shadow-sm hover:text-indigo-600 border border-slate-200 flex items-center justify-center transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Medical Records</h1>
              <p className="text-sm text-slate-500">Securely store and manage your health reports</p>
            </div>
          </div>
          {message && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl shadow-md border ${
              message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <Info size={18} />
              <span className="text-sm font-semibold">{message.text}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: Upload Form Card */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-100 border border-slate-100 overflow-visible lg:sticky lg:top-8">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-6 text-indigo-600">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <FileUp size={20} />
                  </div>
                  <h2 className="text-lg font-bold">Upload Report</h2>
                </div>

                <div className="space-y-5">
                  {/* Title Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Title <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g., Annual Checkup 2026" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      value={title}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                    />
                  </div>

                  {/* Category Select */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                      <Tag size={14} /> Category
                    </label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                      value={category}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)}
                    >
                      <option value="LAB">Lab Report</option>
                      <option value="PRESCRIPTION">Prescription</option>
                      <option value="SCAN">Scan (MRI, X-Ray)</option>
                      <option value="DISCHARGE">Discharge Summary</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  {/* Visibility Select */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                      <Shield size={14} /> Privacy
                    </label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                      value={visibility}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setVisibility(e.target.value as 'private' | 'doctor')}
                    >
                      <option value="private">Private (Me Only)</option>
                      <option value="doctor">Visible to Doctor</option>
                    </select>
                  </div>

                  {/* File Dropzone */}
                  <div className={`relative border-2 border-dashed rounded-2xl p-6 transition-all duration-200 group 
                    ${file ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 hover:border-indigo-500 bg-slate-50'}`}>
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center">
                      {file ? (
                        <div className="text-center">
                          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full inline-block mb-2">
                            <FileText size={32} />
                          </div>
                          <p className="text-xs font-bold text-slate-700 truncate max-w-[200px] mx-auto">{file.name}</p>
                          <p className="text-[10px] text-slate-400 mt-1">Click to change</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="text-slate-300 group-hover:text-indigo-600 mb-2 mx-auto transition-colors" size={32} />
                          <p className="text-xs font-medium text-slate-500 italic">PNG, JPG or PDF supported</p>
                        </div>
                      )}
                    </label>
                  </div>

                  <button 
                    className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold py-3 rounded-xl transition-all shadow-md text-sm cursor-pointer disabled:cursor-not-allowed"
                    onClick={handleUpload}
                    disabled={!file || !title || isUploading}
                  >
                    {isUploading ? 'Processing...' : 'Upload Record'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Records List */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[500px]">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-700 text-lg">Stored Documents</h3>
                <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full font-semibold">{files.length} Files</span>
              </div>

              {files.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-100 bg-slate-50/50">
                        <th className="py-4 px-6 font-semibold">Report Info</th>
                        <th className="py-4 px-6 font-semibold">Category</th>
                        <th className="py-4 px-6 font-semibold">Privacy</th>
                        <th className="py-4 px-6 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {files.map((f) => (
                        <tr key={f._id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                                <FileText size={18} />
                              </div>
                              <div>
                                <div className="font-bold text-sm text-slate-800">{f.title || f.filename}</div>
                                <div className="text-[10px] text-slate-400 italic mt-0.5">Uploaded {new Date(f.createdAt).toLocaleDateString()}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-block text-[11px] font-bold tracking-wider px-2 py-0.5 rounded border border-slate-200 text-slate-500 bg-white">{f.category}</span>
                          </td>
                          <td className="py-4 px-6">
                            {f.visibility === 'private' ? (
                              <span className="flex items-center gap-1 text-xs text-slate-500"><Shield size={12}/> Private</span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-blue-500 font-semibold"><Eye size={12}/> Doctor Access</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex justify-center gap-1">
                              <button
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                onClick={() => handlePreview(f.filename)}
                                title="View document"
                              >
                                <Eye size={18} />
                              </button>
                              <button
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                onClick={() => handleDelete(f._id)}
                                title="Delete document"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                  <FileText size={64} strokeWidth={1} className="mb-4 opacity-20" />
                  <p className="text-lg font-medium text-slate-700">No medical reports found</p>
                  <p className="text-sm text-slate-400">Use the form on the left to start uploading.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- PREVIEW MODAL --- */}
      {previewFile && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 md:p-10">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-full flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-2">
                <FileText className="text-indigo-600" size={20} />
                <span className="font-bold text-slate-800 text-sm md:text-base">Record Preview Sandbox</span>
              </div>
              <button
                className="w-8 h-8 rounded-full border border-slate-200 text-slate-400 hover:bg-slate-50 flex items-center justify-center text-sm font-semibold transition-colors"
                onClick={() => setPreviewFile(null)}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center">
              {previewType === 'image' && (
                <img src={previewFile} alt="Preview" className="max-w-full max-h-full object-contain p-2 rounded-xl" />
              )}
              {previewType === 'pdf' && (
                <iframe src={previewFile} className="w-full h-full border-none" title="PDF Preview" />
              )}
              {previewType === 'other' && (
                <div className="text-center p-10">
                   <div className="p-6 bg-white rounded-2xl shadow-sm inline-block">
                    <p className="mb-4 text-slate-600 font-medium">This file format cannot be previewed online.</p>
                    <button onClick={() => alert("Simulating file download...")} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm">Download to View</button>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}