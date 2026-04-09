import React, { useState, useEffect, useRef } from 'react';
import { User, Project, PhotoFolder, Photo } from '../types';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Folder, Image as ImageIcon, Plus, Upload } from 'lucide-react';

export default function Photos({ user }: { user: User }) {
  const { projectId } = useParams<{projectId: string}>();
  const [project, setProject] = useState<Project | null>(null);
  const [folders, setFolders] = useState<PhotoFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<PhotoFolder | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProject = async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) setProject(await res.json());
  };

  const fetchFolders = async () => {
    const res = await fetch(`/api/projects/${projectId}/photo-folders`);
    if (res.ok) setFolders(await res.json());
  };

  const fetchPhotos = async (folderId: string) => {
    const res = await fetch(`/api/photo-folders/${folderId}/photos`);
    if (res.ok) setPhotos(await res.json());
  };

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchFolders();
    }
  }, [projectId]);

  useEffect(() => {
    if (selectedFolder) {
      fetchPhotos(selectedFolder.id);
    }
  }, [selectedFolder]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/projects/${projectId}/photo-folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName, created_by: user.company_name })
    });

    if (res.ok) {
      setIsCreatingFolder(false);
      setNewFolderName('');
      fetchFolders();
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedFolder) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    formData.append('uploaded_by', user.company_name);

    try {
      const res = await fetch(`/api/photo-folders/${selectedFolder.id}/photos`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        fetchPhotos(selectedFolder.id);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        {selectedFolder ? (
          <button 
            onClick={() => setSelectedFolder(null)}
            className="text-wunder-gray hover:text-wunder-olive transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <Link to={`/projects/${projectId}`} className="text-wunder-gray hover:text-wunder-olive transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
        <h2 className="text-2xl font-bold text-wunder-dark">
          {project ? project.name : 'Loading Project...'} - {selectedFolder ? selectedFolder.name : 'Photos'}
        </h2>
      </div>

      {!selectedFolder ? (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-wunder-dark">Photo Folders</h3>
            <button
              onClick={() => setIsCreatingFolder(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-wunder-dark bg-wunder-lime hover:bg-wunder-yellow transition-colors"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              New Folder
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => setSelectedFolder(folder)}
                className="bg-wunder-light overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200 border border-wunder-border cursor-pointer group"
              >
                <div className="p-6 flex items-center">
                  <div className="flex-shrink-0 bg-wunder-bg rounded-md p-3">
                    <Folder className="h-6 w-6 text-wunder-olive" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-wunder-dark group-hover:text-wunder-olive transition-colors">
                      {folder.name}
                    </h3>
                    <p className="text-sm text-wunder-gray mt-1">
                      Created by {folder.created_by}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {folders.length === 0 && (
              <div className="col-span-full py-12 text-center bg-wunder-light rounded-lg border-2 border-dashed border-wunder-border">
                <Folder className="mx-auto h-12 w-12 text-wunder-gray" />
                <h3 className="mt-2 text-sm font-medium text-wunder-dark">No folders</h3>
                <p className="mt-1 text-sm text-wunder-gray">Get started by creating a new folder.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-wunder-dark">Folder Contents</h3>
            <div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-wunder-dark bg-wunder-lime hover:bg-wunder-yellow transition-colors disabled:opacity-50"
              >
                <Upload className="-ml-1 mr-2 h-5 w-5" />
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square bg-wunder-bg rounded-lg overflow-hidden border border-wunder-border">
                <img 
                  src={photo.file_url} 
                  alt="Project Photo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-end">
                  <div className="p-3 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <p className="text-xs text-white font-medium truncate">By {photo.uploaded_by}</p>
                    <p className="text-xs text-wunder-border truncate">{new Date(photo.uploaded_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
            {photos.length === 0 && (
              <div className="col-span-full py-12 text-center bg-wunder-light rounded-lg border-2 border-dashed border-wunder-border">
                <ImageIcon className="mx-auto h-12 w-12 text-wunder-gray" />
                <h3 className="mt-2 text-sm font-medium text-wunder-dark">No photos</h3>
                <p className="mt-1 text-sm text-wunder-gray">Upload the first photo to this folder.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Folder Modal */}
      {isCreatingFolder && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => setIsCreatingFolder(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <form onSubmit={handleCreateFolder}>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-wunder-dark">New Photo Folder</h3>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-wunder-gray">Folder Name</label>
                    <input type="text" required className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="e.g., Foundation Pour" />
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-2">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-wunder-lime text-base font-medium text-wunder-dark hover:bg-wunder-yellow transition-colors sm:w-auto sm:text-sm">Create</button>
                  <button type="button" onClick={() => setIsCreatingFolder(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-wunder-border shadow-sm px-4 py-2 bg-wunder-light text-base font-medium text-wunder-gray hover:bg-wunder-bg transition-colors sm:mt-0 sm:w-auto sm:text-sm">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
