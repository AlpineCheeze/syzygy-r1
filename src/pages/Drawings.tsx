import React, { useState, useEffect, useRef } from 'react';
import { User, Project, DrawingSet } from '../types';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, Archive, Star } from 'lucide-react';

export default function Drawings({ user }: { user: User }) {
  const { projectId } = useParams<{projectId: string}>();
  const [project, setProject] = useState<Project | null>(null);
  const [drawings, setDrawings] = useState<DrawingSet[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [newDrawingName, setNewDrawingName] = useState('');
  const [isCurrent, setIsCurrent] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProject = async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) setProject(await res.json());
  };

  const fetchDrawings = async () => {
    const res = await fetch(`/api/projects/${projectId}/drawings`);
    if (res.ok) setDrawings(await res.json());
  };

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchDrawings();
    }
  }, [projectId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileInputRef.current?.files?.[0]) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', fileInputRef.current.files[0]);
    formData.append('name', newDrawingName);
    formData.append('uploaded_by', user.company_name);
    formData.append('is_current', isCurrent.toString());

    try {
      const res = await fetch(`/api/projects/${projectId}/drawings`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        setIsUploading(false);
        setNewDrawingName('');
        setIsCurrent(true);
        fetchDrawings();
      } else {
        alert('Upload failed');
      }
    } catch (err) {
      alert('Network error during upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSetCurrent = async (id: string) => {
    const res = await fetch(`/api/drawings/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_current: true })
    });
    if (res.ok) fetchDrawings();
  };

  const handleArchive = async (id: string, is_archived: boolean) => {
    const res = await fetch(`/api/drawings/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_archived })
    });
    if (res.ok) fetchDrawings();
  };

  const currentDrawing = drawings.find(d => d.is_current === 1);
  const otherDrawings = drawings.filter(d => d.is_current === 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link to={`/projects/${projectId}`} className="text-wunder-gray hover:text-wunder-olive transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-2xl font-bold text-wunder-dark">
          {project ? project.name : 'Loading Project...'} - Drawings
        </h2>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-wunder-dark">Drawing Sets</h3>
        {user.role === 'ADMIN' && (
          <button
            onClick={() => setIsUploading(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-wunder-dark bg-wunder-lime hover:bg-wunder-yellow transition-colors"
          >
            <Upload className="-ml-1 mr-2 h-5 w-5" />
            Upload Drawing Set
          </button>
        )}
      </div>

      {currentDrawing && (
        <div className="bg-wunder-light shadow rounded-lg overflow-hidden border-2 border-wunder-olive">
          <div className="bg-wunder-bg px-6 py-4 border-b border-wunder-border flex justify-between items-center">
            <div className="flex items-center gap-2 text-wunder-olive font-semibold">
              <Star className="h-5 w-5 fill-current" />
              Current Set
            </div>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-wunder-bg text-wunder-olive rounded-lg flex items-center justify-center border border-wunder-border">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-lg font-medium text-wunder-dark">{currentDrawing.name}</h4>
                <p className="text-sm text-wunder-gray">
                  Uploaded by {currentDrawing.uploaded_by} on {new Date(currentDrawing.uploaded_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <a 
                href={currentDrawing.file_url} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center px-4 py-2 border border-wunder-border shadow-sm text-sm font-medium rounded-md text-wunder-dark bg-wunder-light hover:bg-wunder-bg transition-colors"
              >
                View / Download
              </a>
            </div>
          </div>
        </div>
      )}

      {otherDrawings.length > 0 && (
        <div className="bg-wunder-light shadow overflow-hidden sm:rounded-md border border-wunder-border">
          <div className="px-4 py-5 border-b border-wunder-border sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-wunder-dark">Previous & Archived Sets</h3>
          </div>
          <ul className="divide-y divide-wunder-border">
            {otherDrawings.map((drawing) => (
              <li key={drawing.id} className={`p-4 sm:px-6 hover:bg-wunder-bg transition-colors ${drawing.is_archived ? 'opacity-75 bg-wunder-bg' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${drawing.is_archived ? 'bg-wunder-border text-wunder-gray' : 'bg-wunder-bg text-wunder-olive'}`}>
                      {drawing.is_archived ? <Archive className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`text-md font-medium ${drawing.is_archived ? 'text-wunder-gray line-through' : 'text-wunder-dark'}`}>
                          {drawing.name}
                        </h4>
                        {drawing.is_archived ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-wunder-border text-wunder-dark">
                            Archived
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-wunder-gray">
                        Uploaded by {drawing.uploaded_by} on {new Date(drawing.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a 
                      href={drawing.file_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-sm text-wunder-olive hover:text-wunder-dark font-medium transition-colors"
                    >
                      View
                    </a>
                    {user.role === 'ADMIN' && (
                      <>
                        <span className="text-wunder-border">|</span>
                        <button
                          onClick={() => handleSetCurrent(drawing.id)}
                          className="text-sm text-green-600 hover:text-green-900 font-medium transition-colors"
                        >
                          Make Current
                        </button>
                        <span className="text-wunder-border">|</span>
                        <button
                          onClick={() => handleArchive(drawing.id, !drawing.is_archived)}
                          className="text-sm text-wunder-gray hover:text-wunder-dark font-medium transition-colors"
                        >
                          {drawing.is_archived ? 'Unarchive' : 'Archive'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {drawings.length === 0 && (
        <div className="py-12 text-center bg-wunder-light rounded-lg border-2 border-dashed border-wunder-border">
          <FileText className="mx-auto h-12 w-12 text-wunder-gray" />
          <h3 className="mt-2 text-sm font-medium text-wunder-dark">No drawings</h3>
          <p className="mt-1 text-sm text-wunder-gray">Upload the first drawing set for this project.</p>
        </div>
      )}

      {/* Upload Modal */}
      {isUploading && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => !uploading && setIsUploading(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <form onSubmit={handleUpload}>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-wunder-dark">Upload Drawing Set</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Set Name</label>
                      <input 
                        type="text" 
                        required 
                        className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark" 
                        value={newDrawingName} 
                        onChange={e => setNewDrawingName(e.target.value)} 
                        placeholder="e.g., 100% CD, Permit Set" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">File (PDF)</label>
                      <input 
                        type="file" 
                        required 
                        accept=".pdf,image/*"
                        ref={fileInputRef}
                        className="mt-1 block w-full text-sm text-wunder-gray file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-wunder-bg file:text-wunder-dark hover:file:bg-wunder-border transition-colors" 
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        id="is_current"
                        type="checkbox"
                        checked={isCurrent}
                        onChange={e => setIsCurrent(e.target.checked)}
                        className="h-4 w-4 text-wunder-olive focus:ring-wunder-lime border-wunder-border rounded bg-wunder-light"
                      />
                      <label htmlFor="is_current" className="ml-2 block text-sm text-wunder-dark">
                        Mark as Current Set
                      </label>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-2">
                  <button 
                    type="submit" 
                    disabled={uploading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-wunder-lime text-base font-medium text-wunder-dark hover:bg-wunder-yellow focus:outline-none disabled:opacity-50 sm:w-auto sm:text-sm transition-colors"
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                  <button 
                    type="button" 
                    disabled={uploading}
                    onClick={() => setIsUploading(false)} 
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-wunder-border shadow-sm px-4 py-2 bg-wunder-light text-base font-medium text-wunder-gray hover:bg-wunder-bg focus:outline-none disabled:opacity-50 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
