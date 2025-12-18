import React, { useState } from 'react';
import { MIBTree } from '../components/MIBTree';
import { api } from '../services/api';

// PUBLIC_INTERFACE
export default function MIBBrowser(): JSX.Element {
  /** MIB Browser with upload functionality. */
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccess(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api().post('/mib/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess(true);
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('mib-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      console.log('Upload response:', response.data);
    } catch (err: any) {
      console.error('Failed to upload MIB:', err);
      setError(err?.response?.data?.detail || 'Failed to upload MIB file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="panel">
      <h2>MIB Browser</h2>
      
      <div style={{ marginBottom: '24px', padding: '16px', background: '#f9f9f9', borderRadius: '4px' }}>
        <h3 style={{ marginTop: 0 }}>Upload MIB File</h3>
        <form onSubmit={handleUpload} className="row" style={{ gap: '8px' }}>
          <input 
            id="mib-file"
            type="file" 
            accept=".mib,.txt,.tar.gz"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <button 
            className="primary" 
            type="submit" 
            disabled={!file || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
        {error && (
          <div style={{ marginTop: '8px', color: '#c33', fontSize: '0.9em' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ marginTop: '8px', color: '#2a7', fontSize: '0.9em' }}>
            MIB file uploaded successfully! It will be parsed in the background.
          </div>
        )}
      </div>

      <MIBTree />
    </div>
  );
}
