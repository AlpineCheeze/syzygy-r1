import React, { useState, useEffect } from 'react';
import { User, WarrantyItem } from '../types';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Plus, Clock, CheckCircle, Image as ImageIcon, MessageSquare, User as UserIcon, X } from 'lucide-react';
import { format } from 'date-fns';

export default function Warranty({ user }: { user: User }) {
  const { projectId } = useParams<{projectId: string}>();
  const [items, setItems] = useState<WarrantyItem[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isResolving, setIsResolving] = useState<WarrantyItem | null>(null);
  const [newItem, setNewItem] = useState({ title: '', description: '', assigned_company: '' });
  const [newFile, setNewFile] = useState<File | null>(null);
  const [solutionComment, setSolutionComment] = useState('');
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchItems = async () => {
    const url = user.role === 'ADMIN' 
      ? `/api/projects/${projectId}/warranty`
      : `/api/projects/${projectId}/warranty?company_name=${encodeURIComponent(user.company_name)}`;
    const res = await fetch(url);
    if (res.ok) setItems(await res.json());
  };

  useEffect(() => {
    if (projectId) fetchItems();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData();
    formData.append('title', newItem.title);
    formData.append('description', newItem.description);
    formData.append('assigned_company', newItem.assigned_company);
    formData.append('created_by', user.name);
    if (newFile) formData.append('file', newFile);

    const res = await fetch(`/api/projects/${projectId}/warranty`, {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      setIsCreating(false);
      setNewItem({ title: '', description: '', assigned_company: '' });
      setNewFile(null);
      fetchItems();
    }
    setIsLoading(false);
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isResolving) return;
    setIsLoading(true);

    const formData = new FormData();
    formData.append('solution_comment', solutionComment);
    if (solutionFile) formData.append('file', solutionFile);

    const res = await fetch(`/api/warranty/${isResolving.id}/resolve`, {
      method: 'PUT',
      body: formData
    });

    if (res.ok) {
      setIsResolving(null);
      setSolutionComment('');
      setSolutionFile(null);
      fetchItems();
    }
    setIsLoading(false);
  };

  const handleClose = async (id: string) => {
    if (!confirm('Are you sure you want to close this warranty item?')) return;
    const res = await fetch(`/api/warranty/${id}/close`, {
      method: 'PUT'
    });
    if (res.ok) fetchItems();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-800';
      case 'IN_PROGRESS': return 'bg-amber-100 text-amber-800';
      case 'RESOLVED': return 'bg-blue-100 text-blue-800';
      case 'CLOSED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/projects/${projectId}`} className="p-2 hover:bg-wunder-light rounded-full transition-colors">
            <ArrowLeft className="h-6 w-6 text-wunder-dark" />
          </Link>
          <h2 className="text-2xl font-bold text-wunder-dark flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-wunder-olive" />
            Warranty Management
          </h2>
        </div>
        {user.role === 'ADMIN' && (
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-wunder-dark bg-wunder-lime hover:bg-wunder-yellow transition-colors"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            New Warranty Item
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {items.map((item) => (
          <div key={item.id} className="bg-wunder-light rounded-lg shadow-sm border border-wunder-border overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-wunder-dark">{item.title}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-wunder-gray flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Created on {format(new Date(item.created_at), 'MMM d, yyyy')} by {item.created_by}
                  </p>
                </div>
                {user.role === 'ADMIN' && item.status === 'RESOLVED' && (
                  <button
                    onClick={() => handleClose(item.id)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="mr-1.5 h-4 w-4" />
                    Close Item
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-wunder-gray mb-1">Description</h4>
                    <p className="text-sm text-wunder-dark bg-wunder-bg p-3 rounded border border-wunder-border">
                      {item.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-wunder-gray">
                    <UserIcon className="h-4 w-4" />
                    Assigned to: <span className="font-medium text-wunder-dark">{item.assigned_company}</span>
                  </div>
                  {item.issue_photo_url && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-wunder-gray mb-2">Issue Photo</h4>
                      <a href={item.issue_photo_url} target="_blank" rel="noopener noreferrer" className="block relative group">
                        <img 
                          src={item.issue_photo_url} 
                          alt="Issue" 
                          className="rounded-lg border border-wunder-border max-h-48 w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                          <ImageIcon className="text-white h-8 w-8" />
                        </div>
                      </a>
                    </div>
                  )}
                </div>

                <div className="space-y-4 border-l border-wunder-border pl-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-wunder-gray mb-1">Resolution</h4>
                  {item.status === 'OPEN' || item.status === 'IN_PROGRESS' ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-wunder-bg rounded-lg border border-dashed border-wunder-border">
                      <Clock className="h-8 w-8 text-wunder-gray mb-2" />
                      <p className="text-sm text-wunder-gray italic">Awaiting resolution from subcontractor.</p>
                      {user.company_name === item.assigned_company && (
                        <button
                          onClick={() => setIsResolving(item)}
                          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-wunder-dark bg-wunder-lime hover:bg-wunder-yellow transition-colors"
                        >
                          Submit Solution
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {item.solution_comment && (
                        <div className="flex gap-3">
                          <MessageSquare className="h-5 w-5 text-wunder-olive flex-shrink-0" />
                          <div className="bg-wunder-lime/10 p-3 rounded-lg border border-wunder-lime/20 flex-1">
                            <p className="text-sm text-wunder-dark italic">"{item.solution_comment}"</p>
                          </div>
                        </div>
                      )}
                      {item.solution_photo_url && (
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-wunder-gray mb-2">Solution Photo</h4>
                          <a href={item.solution_photo_url} target="_blank" rel="noopener noreferrer" className="block relative group">
                            <img 
                              src={item.solution_photo_url} 
                              alt="Solution" 
                              className="rounded-lg border border-wunder-lime/30 max-h-48 w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                              <ImageIcon className="text-white h-8 w-8" />
                            </div>
                          </a>
                        </div>
                      )}
                      <p className="text-[10px] text-wunder-gray italic">
                        Resolved on {item.resolved_at ? format(new Date(item.resolved_at), 'MMM d, yyyy HH:mm') : 'N/A'}
                      </p>
                      {item.closed_at && (
                        <div className="flex items-center gap-2 text-green-600 font-bold text-xs uppercase tracking-widest">
                          <CheckCircle className="h-4 w-4" />
                          Closed on {format(new Date(item.closed_at), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="bg-wunder-light rounded-lg shadow p-12 text-center border border-wunder-border">
            <ShieldCheck className="mx-auto h-12 w-12 text-wunder-gray mb-4" />
            <h3 className="text-lg font-medium text-wunder-dark">No Warranty Items</h3>
            <p className="text-wunder-gray mt-2">There are currently no warranty items tracked for this project.</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => setIsCreating(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button onClick={() => setIsCreating(false)} className="text-wunder-gray hover:text-wunder-dark">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleCreate}>
                <h3 className="text-lg leading-6 font-bold text-wunder-dark mb-4">New Warranty Item</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-wunder-gray mb-1">Title</label>
                    <input
                      type="text"
                      required
                      className="block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-bg text-wunder-dark"
                      value={newItem.title}
                      onChange={e => setNewItem({...newItem, title: e.target.value})}
                      placeholder="e.g., Leaking HVAC unit in Room 302"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-wunder-gray mb-1">Description</label>
                    <textarea
                      required
                      rows={3}
                      className="block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-bg text-wunder-dark"
                      value={newItem.description}
                      onChange={e => setNewItem({...newItem, description: e.target.value})}
                      placeholder="Describe the issue in detail..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-wunder-gray mb-1">Assigned Company</label>
                    <input
                      type="text"
                      required
                      className="block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-bg text-wunder-dark"
                      value={newItem.assigned_company}
                      onChange={e => setNewItem({...newItem, assigned_company: e.target.value})}
                      placeholder="e.g., Sparky Electric"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-wunder-gray mb-1">Issue Photo (Optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setNewFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-wunder-gray file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-wunder-lime file:text-wunder-dark hover:file:bg-wunder-yellow"
                    />
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-wunder-lime text-sm font-bold uppercase tracking-wider text-wunder-dark hover:bg-wunder-yellow transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Creating...' : 'Create Item'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 inline-flex justify-center rounded-md border border-wunder-border shadow-sm px-4 py-2 bg-white text-sm font-bold uppercase tracking-wider text-wunder-gray hover:bg-wunder-bg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {isResolving && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => setIsResolving(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button onClick={() => setIsResolving(null)} className="text-wunder-gray hover:text-wunder-dark">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleResolve}>
                <h3 className="text-lg leading-6 font-bold text-wunder-dark mb-4">Submit Solution</h3>
                <p className="text-sm text-wunder-gray mb-4">Provide details and a photo of the completed warranty work.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-wunder-gray mb-1">Solution Comment</label>
                    <textarea
                      required
                      rows={3}
                      className="block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-bg text-wunder-dark"
                      value={solutionComment}
                      onChange={e => setSolutionComment(e.target.value)}
                      placeholder="Explain what was done to fix the issue..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-wunder-gray mb-1">Solution Photo (Optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setSolutionFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-wunder-gray file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-wunder-lime file:text-wunder-dark hover:file:bg-wunder-yellow"
                    />
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-wunder-lime text-sm font-bold uppercase tracking-wider text-wunder-dark hover:bg-wunder-yellow transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Submitting...' : 'Submit Resolution'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsResolving(null)}
                    className="flex-1 inline-flex justify-center rounded-md border border-wunder-border shadow-sm px-4 py-2 bg-white text-sm font-bold uppercase tracking-wider text-wunder-gray hover:bg-wunder-bg transition-colors"
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
