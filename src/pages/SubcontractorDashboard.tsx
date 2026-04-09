import React, { useState, useEffect, useRef } from 'react';
import { User, Submittal, Project } from '../types';
import { StatusBadge, BallInCourtBadge } from '../components/Badges';
import { format } from 'date-fns';
import { Upload, FileText, AlertCircle, ArrowLeft } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';

export default function SubcontractorDashboard({ user }: { user: User }) {
  const { projectId } = useParams<{projectId: string}>();
  const [project, setProject] = useState<Project | null>(null);
  const [submittals, setSubmittals] = useState<Submittal[]>([]);
  const [selectedSubmittal, setSelectedSubmittal] = useState<Submittal | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProject = async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) setProject(await res.json());
  };

  const fetchSubmittals = async () => {
    const res = await fetch(`/api/projects/${projectId}/submittals?company_name=${encodeURIComponent(user.company_name)}`);
    if (res.ok) {
      setSubmittals(await res.json());
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchSubmittals();
    }
  }, [projectId, user.company_name]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedSubmittal) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);

    try {
      const res = await fetch(`/api/submittals/${selectedSubmittal.id}/upload`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        setSelectedSubmittal(null);
        fetchSubmittals();
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
        <Link to={`/projects/${projectId}`} className="text-wunder-gray hover:text-wunder-olive transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-2xl font-bold text-wunder-dark">
          {project ? project.name : 'Loading Project...'} - Submittals
        </h2>
      </div>
      
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-wunder-dark">My Submittals</h3>
      </div>

      <div className="bg-wunder-light shadow rounded-lg overflow-hidden border border-wunder-border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-wunder-border">
            <thead className="bg-wunder-bg">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-wunder-gray uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-wunder-gray uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-wunder-gray uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-wunder-gray uppercase tracking-wider">Ball in Court</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-wunder-gray uppercase tracking-wider">Due Date</th>
              </tr>
            </thead>
            <tbody className="bg-wunder-light divide-y divide-wunder-border">
              {submittals.map((submittal) => {
                const actionRequired = submittal.ball_in_court === 'SUBCONTRACTOR' && 
                  (submittal.status === 'PENDING' || submittal.status === 'REVISE_AND_RESUBMIT');

                return (
                  <tr 
                    key={submittal.id} 
                    onClick={() => setSelectedSubmittal(submittal)}
                    className={`hover:bg-wunder-bg cursor-pointer transition-colors ${actionRequired ? 'bg-red-50/30' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-wunder-dark flex items-center gap-2">
                      {actionRequired && <AlertCircle className="h-4 w-4 text-red-500" />}
                      {submittal.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-wunder-gray max-w-xs truncate">
                      {submittal.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={submittal.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <BallInCourtBadge bic={submittal.ball_in_court} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-wunder-gray">
                      {format(new Date(submittal.target_due_date), 'MMM d, yyyy')}
                    </td>
                  </tr>
                );
              })}
              {submittals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-wunder-gray">
                    No submittals assigned to your company.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {selectedSubmittal && (
        <div className="fixed inset-0 z-10 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => setSelectedSubmittal(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-wunder-dark" id="modal-title">
                    Submittal Details: {selectedSubmittal.category}
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-wunder-gray">Revision:</span> {selectedSubmittal.revision_no}
                      </div>
                      <div>
                        <span className="font-medium text-wunder-gray">Due Date:</span> {format(new Date(selectedSubmittal.target_due_date), 'MMM d, yyyy')}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium text-wunder-gray">Description:</span> {selectedSubmittal.description}
                      </div>
                    </div>

                    {selectedSubmittal.reviewer_notes && (
                      <div className="mt-4 p-4 bg-red-50 rounded-md border border-red-200">
                        <h4 className="text-sm font-medium text-red-800 mb-1">Reviewer Notes</h4>
                        <p className="text-sm text-red-700">{selectedSubmittal.reviewer_notes}</p>
                      </div>
                    )}

                    {selectedSubmittal.file_url ? (
                      <div className="mt-4 p-4 bg-wunder-bg rounded-md border border-wunder-border flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="h-6 w-6 text-wunder-gray mr-2" />
                          <span className="text-sm font-medium text-wunder-dark">Submitted Document</span>
                        </div>
                        <a 
                          href={selectedSubmittal.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-wunder-olive hover:text-wunder-dark text-sm font-medium transition-colors"
                        >
                          View PDF
                        </a>
                      </div>
                    ) : null}

                    {selectedSubmittal.ball_in_court === 'SUBCONTRACTOR' && (
                      <div className="mt-6 border-2 border-dashed border-wunder-border rounded-lg p-6 flex flex-col items-center justify-center bg-wunder-bg">
                        <Upload className="h-12 w-12 text-wunder-gray mb-4" />
                        <p className="text-sm text-wunder-gray mb-4">Upload your PDF document here</p>
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleUpload}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-wunder-dark bg-wunder-lime hover:bg-wunder-yellow disabled:opacity-50 transition-colors"
                        >
                          {uploading ? 'Uploading...' : 'Select File'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSubmittal(null)}
                  className="w-full inline-flex justify-center rounded-md border border-wunder-border shadow-sm px-4 py-2 bg-wunder-light text-base font-medium text-wunder-gray hover:bg-wunder-bg focus:outline-none sm:w-auto sm:text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
