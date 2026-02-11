import { useState, useRef } from 'react';
import { Upload, X, FileIcon, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FileUploadProps {
  onUpload: (url: string, fileName: string) => void;
  accept?: string;
  maxSizeMB?: number;
  bucket?: string;
}

export default function FileUpload({
  onUpload,
  accept = 'image/*,.pdf,.ai,.eps,.svg',
  maxSizeMB = 10,
  bucket = 'uploads'
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Le fichier est trop volumineux (max ${maxSizeMB}MB)`);
      return;
    }

    setFileName(file.name);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onUpload(urlData.publicUrl, file.name);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Erreur lors du téléchargement du fichier');
    } finally {
      setUploading(false);
    }
  }

  function clearFile() {
    setPreview(null);
    setFileName(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        id="file-upload"
      />

      {!preview && !fileName && (
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-brand-400 hover:bg-brand-50/50 transition-all"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-10 h-10 text-slate-400 mb-3" />
            <p className="text-sm text-slate-600 font-medium">
              Cliquez pour télécharger un fichier
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Images, PDF, AI, EPS, SVG (max {maxSizeMB}MB)
            </p>
          </div>
        </label>
      )}

      {(preview || fileName) && (
        <div className="relative border-2 border-slate-200 rounded-xl p-4 bg-white">
          <button
            onClick={clearFile}
            className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
          >
            <X className="w-4 h-4" />
          </button>

          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-40 object-contain rounded-lg" />
          ) : (
            <div className="flex items-center gap-3">
              <FileIcon className="w-10 h-10 text-brand-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">{fileName}</p>
                <p className="text-xs text-slate-500">Fichier téléchargé</p>
              </div>
            </div>
          )}
        </div>
      )}

      {uploading && (
        <div className="flex items-center justify-center gap-2 text-brand-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Téléchargement...</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
