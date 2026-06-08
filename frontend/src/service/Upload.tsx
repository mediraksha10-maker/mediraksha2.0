import { useState, useEffect, type ChangeEvent } from 'react';
import { 
  ArrowLeft, Upload, FileText, Trash2, 
  Eye, FileUp, Shield, Tag, Info, User 
} from "lucide-react";
import { useNavigate } from 'react-router';
import api from '../api/Api';

/* ── Type Definitions ── */
interface MedicalFile {
  id: string;
  title: string;
  originalFileName: string;
  category: string;
  visibility: 'private' | 'doctor';
  mimeType?: string;
  fileData?: string;
  created_at: string;
}

// Added Linked Doctor Type Interface
interface LinkedDoctor {
  id: string | number;
  name: string;
  speciality: string;
}

interface MessageState {
  text: string;
  type: 'success' | 'error';
}

type PreviewType = 'image' | 'pdf' | 'other' | null;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export default function UploadReport() {
  // --- Form State ---
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('lab');
  const [visibility, setVisibility] = useState<'private' | 'doctor'>('private');
  
  // --- Connected Doctor State ---
  const [assignedDoctor, setAssignedDoctor] = useState<LinkedDoctor | null>(null);

  // --- UI & Data State ---
  const [message, setMessage] = useState<MessageState | null>(null);
  const [files, setFiles] = useState<MedicalFile[]>([]);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<PreviewType>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const navigate = useNavigate();

  const showMessage = (text: string, type: 'success' | 'error', duration = 4000) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), duration);
  };

  useEffect(() => {
    // 1. Fetch user's historical reports
    const fetchReports = async () => {
      try {
        setIsFetching(true);
        setFetchError(null);
        const response = await api.get('/user/report/all');
        if (response.data?.success) {
          setFiles(response.data.data);
        }
      } catch (error: any) {
        console.error('Error fetching reports:', error);
        if (error.response?.status === 401) {
          navigate('/auth');
        } else {
          setFetchError('Failed to load your medical records. Please try again.');
        }
      } finally {
        setIsFetching(false);
      }
    };

    // 2. Fetch active assigned doctor profile connection
    const fetchCurrentDoctor = async () => {
      try {
        const response = await api.get('/user/doctor/my');
        if (response.data?.success) {
          setAssignedDoctor(response.data.data);
        }
      } catch (error: any) {
        console.log('No registered primary clinician profile active yet.', error.response?.status);
        // Soft catch: If 404, assignedDoctor stays null which is safe behavior
      }
    };

    fetchReports();
    fetchCurrentDoctor();
  }, [navigate]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
      showMessage('Only PDF and image files are allowed.', 'error');
      e.target.value = '';
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      showMessage('File is too large. Maximum size is 5MB.', 'error');
      e.target.value = '';
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async (): Promise<void> => {
    if (!file || !title) {
      showMessage('Please provide a title and select a file', 'error');
      return;
    }

    // Protection check: prevent sharing configuration bugs if no link is configured
    if (visibility === 'doctor' && !assignedDoctor) {
      showMessage('You have no registered clinician profile to share this with. Link a doctor first.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file); 
      formData.append('title', title);
      formData.append('category', category);
      formData.append('visibility', visibility);
      
      // Pass doctorId if visibility is configured for doctor access
      if (visibility === 'doctor' && assignedDoctor) {
        formData.append('doctorId', String(assignedDoctor.id));
      }

      const response = await api.post('/user/report/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.success) {
        setFiles((prev) => [response.data.data, ...prev]);
        showMessage('Medical record uploaded successfully!', 'success');

        // Reset form states
        setFile(null);
        setTitle('');
        setCategory('lab');
        setVisibility('private');
        
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      const errorMessage = error.response?.data?.message || 'Upload failed. Please try again.';
      if (error.response?.status === 401) {
        navigate('/auth');
      } else {
        showMessage(errorMessage, 'error');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!window.confirm('Delete this medical record permanently?')) return;

    try {
      const response = await api.delete(`/user/report/${id}`);
      if (response.data?.success) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
        showMessage('File deleted from health vault', 'success', 3000);
      }
    } catch (error: any) {
      console.error('Delete failed:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete record.';
      if (error.response?.status === 401) {
        navigate('/auth');
      } else {
        showMessage(errorMessage, 'error');
      }
    }
  };

  const getPreviewType = (mimeType?: string, originalFileName = ''): PreviewType => {
    if (mimeType === 'application/pdf' || /\.pdf$/i.test(originalFileName)) return 'pdf';
    if (mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(originalFileName)) return 'image';
    return 'other';
  };

  const handlePreview = async (id: string): Promise<void> => {
    try {
      const response = await api.get(`/user/report/${id}`);
      const report: MedicalFile = response.data.data;

      if (!report?.fileData) {
        showMessage('File data is missing for this record.', 'error');
        return;
      }

      const type = getPreviewType(report.mimeType, report.originalFileName);
      setPreviewType(type);
      setPreviewFile(`data:${report.mimeType || 'application/octet-stream'};base64,${report.fileData}`);
    } catch (error: any) {
      console.error('Preview failed:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load file preview.';
      if (error.response?.status === 401) {
        navigate('/auth');
      } else {
        showMessage(errorMessage, 'error');
      }
    }
  };

  const closePreview = (): void => {
    setPreviewFile(null);
    setPreviewType(null);
  };

  const formatCategoryLabel = (cat: string) => {
    if (!cat) return 'Other';
    return cat.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

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
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 items-center gap-1.5">
                      <Tag size={14} /> Category
                    </label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                      value={category}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)}
                    >
                      <option value="lab">Lab Report</option>
                      <option value="prescription">Prescription</option>
                      <option value="scan">Scan (MRI, X-Ray)</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Visibility Select */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 items-center gap-1.5">
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
                    
                    {/* NEW: Contextual helper showing which doctor will receive access */}
                    {visibility === 'doctor' && (
                      <div className="mt-2 p-2.5 rounded-xl border border-blue-100 bg-blue-50/50 flex items-center gap-2 text-xs text-blue-700 animate-fade-in">
                        <User size={14} className="shrink-0" />
                        {assignedDoctor ? (
                          <p>Will be shared with <span className="font-bold">Dr. {assignedDoctor.name}</span> ({assignedDoctor.speciality})</p>
                        ) : (
                          <p className="text-rose-600 font-semibold">No active doctor linked. Please link a profile first.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* File Dropzone */}
                  <div className={`relative border-2 border-dashed rounded-2xl p-6 transition-all duration-200 group 
                    ${file ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 hover:border-indigo-500 bg-slate-50'}`}>
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                      onChange={handleFileChange}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center">
                      {file ? (
                        <div className="text-center">
                          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full inline-block mb-2">
                            <FileText size={32} />
                          </div>
                          <p className="text-xs font-bold text-slate-700 truncate max-w-50 mx-auto">{file.name}</p>
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
                    className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3 rounded-xl transition-all shadow-md text-sm cursor-pointer disabled:cursor-not-allowed"
                    onClick={handleUpload}
                    disabled={!file || !title || isUploading || (visibility === 'doctor' && !assignedDoctor)}
                  >
                    {isUploading ? 'Processing...' : 'Upload Record'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Records List */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-125">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-700 text-lg">Stored Documents</h3>
                <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full font-semibold">{files.length} Files</span>
              </div>

              {isFetching ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-slate-400">Loading your records...</p>
                </div>
              ) : fetchError ? (
                <div className="flex flex-col items-center justify-center py-32 text-center px-8">
                  <p className="text-rose-500 font-semibold mb-2">{fetchError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-sm text-indigo-600 underline"
                  >
                    Retry
                  </button>
                </div>
              ) : files.length > 0 ? (
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
                        <tr key={f.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                                <FileText size={18} />
                              </div>
                              <div>
                                <div className="font-bold text-sm text-slate-800">{f.title || f.originalFileName}</div>
                                <div className="text-[10px] text-slate-400 italic mt-0.5">
                                  Uploaded {new Date(f.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-block text-[11px] font-bold tracking-wider px-2 py-0.5 rounded border border-slate-200 text-slate-500 bg-white">
                              {formatCategoryLabel(f.category)}
                            </span>
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
                                onClick={() => handlePreview(f.id)}
                                title="View document"
                              >
                                <Eye size={18} />
                              </button>
                              <button
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                onClick={() => handleDelete(f.id)}
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
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-100 p-4 md:p-10">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-full flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-2">
                <FileText className="text-indigo-600" size={20} />
                <span className="font-bold text-slate-800 text-sm md:text-base">Record Preview Sandbox</span>
              </div>
              <button
                className="w-8 h-8 rounded-full border border-slate-200 text-slate-400 hover:bg-slate-50 flex items-center justify-center text-sm font-semibold transition-colors"
                onClick={closePreview}
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