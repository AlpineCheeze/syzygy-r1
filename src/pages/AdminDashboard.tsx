import React, { useState, useEffect } from 'react';
import { User, Submittal, Requirement, Project } from '../types';
import { StatusBadge, BallInCourtBadge } from '../components/Badges';
import { format } from 'date-fns';
import { FileText, CheckCircle, XCircle, Plus, ArrowLeft } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';

export default function AdminDashboard({ user }: { user: User }) {
  const { projectId } = useParams<{projectId: string}>();
  const [project, setProject] = useState<Project | null>(null);
  const [submittals, setSubmittals] = useState<Submittal[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTION_REQUIRED'>('ALL');
  const [selectedSubmittal, setSelectedSubmittal] = useState<Submittal | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newReq, setNewReq] = useState({ category: '', description: '', assigned_company: '', target_due_date: '' });

  const fetchProject = async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) setProject(await res.json());
  };

  const fetchSubmittals = async () => {
    const res = await fetch(`/api/projects/${projectId}/submittals`);
    if (res.ok) {
      setSubmittals(await res.json());
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchSubmittals();
    }
  }, [projectId]);

  const filteredSubmittals = submittals.filter(s => {
    if (filter === 'ACTION_REQUIRED') {
      return s.ball_in_court === 'GC' && s.status === 'SUBMITTED';
    }
    return true;
  });

  const handleReview = async (status: 'APPROVED' | 'REVISE_AND_RESUBMIT') => {
    if (!selectedSubmittal) return;
    
    const res = await fetch(`/api/submittals/${selectedSubmittal.id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewer_notes: reviewNotes })
    });

    if (res.ok) {
      setSelectedSubmittal(null);
      setReviewNotes('');
      fetchSubmittals();
    }
  };

  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/projects/${projectId}/requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReq)
    });

    if (res.ok) {
      setIsCreating(false);
      setNewReq({ category: '', description: '', assigned_company: '', target_due_date: '' });
      fetchSubmittals();
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
        <h3 className="text-lg font-medium text-wunder-dark">Master Submittals Registry</h3>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-wunder-dark bg-wunder-lime hover:bg-wunder-yellow transition-colors"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" />
          New Requirement
        </button>
      </div>

      <div className="bg-wunder-light shadow rounded-lg overflow-hidden border border-wunder-border">
        <div className="border-b border-wunder-border">
          <nav className="-mb-px flex" aria-label="Tabs">
            <button
              onClick={() => setFilter('ALL')}
              className={`${
                filter === 'ALL'
                  ? 'border-wunder-lime text-wunder-dark'
                  : 'border-transparent text-wunder-gray hover:text-wunder-dark hover:border-wunder-border'
              } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors`}
            >
              All Submittals
            </button>
            <button
              onClick={() => setFilter('ACTION_REQUIRED')}
              className={`${
                filter === 'ACTION_REQUIRED'
                  ? 'border-wunder-lime text-wunder-dark'
                  : 'border-transparent text-wunder-gray hover:text-wunder-dark hover:border-wunder-border'
              } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm flex items-center justify-center gap-2 transition-colors`}
            >
              Action Required
              {submittals.filter(s => s.ball_in_court === 'GC' && s.status === 'SUBMITTED').length > 0 && (
                <span className="bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">
                  {submittals.filter(s => s.ball_in_court === 'GC' && s.status === 'SUBMITTED').length}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-wunder-border">
            <thead className="bg-wunder-bg">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-wunder-gray uppercase tracking-wider">Subcontractor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-wunder-gray uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-wunder-gray uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-wunder-gray uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-wunder-gray uppercase tracking-wider">Ball in Court</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-wunder-gray uppercase tracking-wider">Due Date</th>
              </tr>
            </thead>
            <tbody className="bg-wunder-light divide-y divide-wunder-border">
              {filteredSubmittals.map((submittal) => (
                <tr 
                  key={submittal.id} 
                  onClick={() => setSelectedSubmittal(submittal)}
                  className="hover:bg-wunder-bg cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-wunder-dark">
                    {submittal.assigned_company}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-wunder-gray">
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
              ))}
              {filteredSubmittals.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-wunder-gray">
                    No submittals found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedSubmittal && (
        <div className="fixed inset-0 z-10 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => setSelectedSubmittal(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-wunder-dark" id="modal-title">
                    Review Submittal: {selectedSubmittal.category}
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-wunder-gray">Company:</span> {selectedSubmittal.assigned_company}
                      </div>
                      <div>
                        <span className="font-medium text-wunder-gray">Revision:</span> {selectedSubmittal.revision_no}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium text-wunder-gray">Description:</span> {selectedSubmittal.description}
                      </div>
                    </div>

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
                    ) : (
                      <div className="mt-4 p-4 bg-wunder-bg rounded-md border border-wunder-border text-center text-sm text-wunder-gray">
                        No document uploaded yet.
                      </div>
                    )}

                    {selectedSubmittal.status === 'SUBMITTED' && selectedSubmittal.ball_in_court === 'GC' && (
                      <div className="mt-6">
                        <label htmlFor="notes" className="block text-sm font-medium text-wunder-gray">
                          Reviewer Notes
                        </label>
                        <div className="mt-1">
                          <textarea
                            id="notes"
                            rows={3}
                            className="shadow-sm focus:ring-wunder-lime focus:border-wunder-lime block w-full sm:text-sm border-wunder-border rounded-md p-2 border bg-wunder-light text-wunder-dark"
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder="Add notes for the subcontractor..."
                          />
                        </div>
                      </div>
                    )}
                    
                    {selectedSubmittal.reviewer_notes && selectedSubmittal.status !== 'SUBMITTED' && (
                      <div className="mt-4 p-4 bg-wunder-bg rounded-md border border-wunder-border">
                        <h4 className="text-sm font-medium text-wunder-dark mb-1">Previous Review Notes</h4>
                        <p className="text-sm text-wunder-gray">{selectedSubmittal.reviewer_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-2">
                {selectedSubmittal.status === 'SUBMITTED' && selectedSubmittal.ball_in_court === 'GC' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleReview('APPROVED')}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none sm:w-auto sm:text-sm transition-colors"
                    >
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview('REVISE_AND_RESUBMIT')}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm transition-colors"
                    >
                      <XCircle className="mr-2 h-5 w-5" />
                      Reject & Resubmit
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedSubmittal(null)}
                    className="w-full inline-flex justify-center rounded-md border border-wunder-border shadow-sm px-4 py-2 bg-wunder-light text-base font-medium text-wunder-gray hover:bg-wunder-bg focus:outline-none sm:w-auto sm:text-sm transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-10 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => setIsCreating(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <form onSubmit={handleCreateRequirement}>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-wunder-dark" id="modal-title">
                    Create New Requirement
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Category</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark"
                        value={newReq.category}
                        onChange={e => setNewReq({...newReq, category: e.target.value})}
                        placeholder="e.g., Insurance, Safety Plan"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Description</label>
                      <textarea
                        required
                        rows={3}
                        className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark"
                        value={newReq.description}
                        onChange={e => setNewReq({...newReq, description: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Assigned Company</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark"
                        value={newReq.assigned_company}
                        onChange={e => setNewReq({...newReq, assigned_company: e.target.value})}
                        placeholder="e.g., Sparky Electric"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Target Due Date</label>
                      <input
                        type="date"
                        required
                        className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark"
                        value={newReq.target_due_date}
                        onChange={e => setNewReq({...newReq, target_due_date: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-2">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-wunder-lime text-base font-medium text-wunder-dark hover:bg-wunder-yellow focus:outline-none sm:w-auto sm:text-sm transition-colors"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-wunder-border shadow-sm px-4 py-2 bg-wunder-light text-base font-medium text-wunder-gray hover:bg-wunder-bg focus:outline-none sm:mt-0 sm:w-auto sm:text-sm transition-colors"
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
