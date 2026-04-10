import React, { useState, useEffect, useRef } from 'react';
import { User, Project, Milestone, MilestoneRequirement, MilestoneDeliverable, MilestoneActivity } from '../types';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, ChevronDown, ChevronRight, CheckCircle, Circle, Upload, File as FileIcon, Trash2, MoreVertical, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Milestones({ user }: { user: User }) {
  const { projectId } = useParams<{projectId: string}>();
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const [deliverables, setDeliverables] = useState<Record<string, MilestoneDeliverable[]>>({});
  const [activities, setActivities] = useState<Record<string, MilestoneActivity[]>>({});
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [activeDelivMenu, setActiveDelivMenu] = useState<string | null>(null);
  const [activeMilestoneMenu, setActiveMilestoneMenu] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);
  const [isEditingMilestone, setIsEditingMilestone] = useState<Milestone | null>(null);
  const [newMilestone, setNewMilestone] = useState<{
    name: string;
    deliverables: {
      description: string;
      ball_in_court: string;
    }[];
  }>({ 
    name: '', 
    deliverables: [] 
  });
  
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [isCreatingDeliv, setIsCreatingDeliv] = useState<string | null>(null);
  const [isEditingDeliv, setIsEditingDeliv] = useState<MilestoneDeliverable | null>(null);
  const [newDeliv, setNewDeliv] = useState({ description: '', ball_in_court: 'GC' });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'milestone' | 'deliverable';
    id: string;
    parentId?: string;
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProject = async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) setProject(await res.json());
  };

  const fetchMilestones = async () => {
    const res = await fetch(`/api/projects/${projectId}/milestones`);
    if (res.ok) setMilestones(await res.json());
  };

  const fetchDeliverables = async (milestoneId: string) => {
    const res = await fetch(`/api/milestones/${milestoneId}/deliverables`);
    if (res.ok) {
      const data = await res.json();
      setDeliverables(prev => ({ ...prev, [milestoneId]: data }));
    }
  };

  const fetchActivity = async (milestoneId: string) => {
    const res = await fetch(`/api/milestones/${milestoneId}/activity`);
    if (res.ok) {
      const data = await res.json();
      setActivities(prev => ({ ...prev, [milestoneId]: data }));
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchMilestones();
    }
  }, [projectId]);

  const toggleMilestone = (id: string) => {
    if (expandedMilestone === id) {
      setExpandedMilestone(null);
    } else {
      setExpandedMilestone(id);
      if (!deliverables[id]) {
        fetchDeliverables(id);
      }
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', newMilestone.name);
    formData.append('deliverables', JSON.stringify(newMilestone.deliverables));
    if (certificateFile) {
      formData.append('certificate', certificateFile);
    }

    const res = await fetch(`/api/projects/${projectId}/milestones`, {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      setIsCreatingMilestone(false);
      setNewMilestone({ name: '', deliverables: [] });
      setCertificateFile(null);
      fetchMilestones();
    }
  };

  const addDelivToNewMilestone = () => {
    setNewMilestone(prev => ({
      ...prev,
      deliverables: [
        ...prev.deliverables,
        { description: '', ball_in_court: 'GC' }
      ]
    }));
  };

  const removeDelivFromNewMilestone = (index: number) => {
    setNewMilestone(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index)
    }));
  };

  const updateDelivInNewMilestone = (index: number, field: string, value: string) => {
    setNewMilestone(prev => {
      const updated = [...prev.deliverables];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, deliverables: updated };
    });
  };

  const handleUpdateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingMilestone) return;
    setFormError(null);
    const res = await fetch(`/api/milestones/${isEditingMilestone.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: isEditingMilestone.name })
    });

    if (res.ok) {
      setIsEditingMilestone(null);
      fetchMilestones();
    } else {
      const errorData = await res.json();
      setFormError(errorData.error || 'Failed to update milestone');
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    setDeleteConfirm({
      type: 'milestone',
      id,
      message: 'Are you sure you want to delete this milestone? This will also delete all associated requirements and deliverables.'
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    let res;
    if (deleteConfirm.type === 'milestone') {
      res = await fetch(`/api/milestones/${deleteConfirm.id}`, { method: 'DELETE' });
      if (res.ok) fetchMilestones();
    } else if (deleteConfirm.type === 'deliverable') {
      res = await fetch(`/api/milestone_deliverables/${deleteConfirm.id}`, { method: 'DELETE' });
      if (res.ok && deleteConfirm.parentId) fetchDeliverables(deleteConfirm.parentId);
    }

    setDeleteConfirm(null);
  };

  const handleUpdateDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingDeliv) return;
    setFormError(null);
    const res = await fetch(`/api/milestone_deliverables/${isEditingDeliv.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        description: isEditingDeliv.description, 
        ball_in_court: isEditingDeliv.ball_in_court,
        status: isEditingDeliv.status,
        userId: user.id,
        userName: user.name
      })
    });

    if (res.ok) {
      const milestoneId = isEditingDeliv.milestone_id;
      setIsEditingDeliv(null);
      fetchDeliverables(milestoneId);
      fetchActivity(milestoneId);
    } else {
      const errorData = await res.json();
      console.error("Failed to update deliverable:", errorData);
      setFormError(errorData.error || 'Failed to update deliverable');
    }
  };

  const handleDeleteDeliverable = async (id: string, milestoneId: string) => {
    setDeleteConfirm({
      type: 'deliverable',
      id,
      parentId: milestoneId,
      message: 'Are you sure you want to delete this deliverable?'
    });
  };

  const handleCreateDeliverable = async (e: React.FormEvent, milestoneId: string) => {
    e.preventDefault();
    const res = await fetch(`/api/milestones/${milestoneId}/deliverables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDeliv)
    });

    if (res.ok) {
      setIsCreatingDeliv(null);
      setNewDeliv({ description: '', ball_in_court: 'GC' });
      fetchDeliverables(milestoneId);
    }
  };

  const handleDeliverableStatusUpdate = async (delivId: string, milestoneId: string, status: string, ball_in_court: string) => {
    try {
      const res = await fetch(`/api/milestone_deliverables/${delivId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ball_in_court, userId: user.id, userName: user.name })
      });
      if (res.ok) {
        fetchDeliverables(milestoneId);
        fetchActivity(milestoneId);
      } else {
        const errorData = await res.json();
        console.error("Failed to update deliverable status:", errorData);
        alert(`Failed to save changes: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Error updating deliverable status:", err);
      alert("An error occurred while saving changes.");
    }
  };

  const handleFileUpload = async (delivId: string, milestoneId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user.id);
    formData.append('userName', user.name);
    
    const res = await fetch(`/api/milestone_deliverables/${delivId}/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (res.ok) {
      fetchDeliverables(milestoneId);
      fetchActivity(milestoneId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-wunder-lime text-wunder-dark';
      case 'IN_REVIEW': return 'bg-wunder-yellow text-wunder-dark';
      case 'REJECTED': return 'bg-red-100 text-red-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getBICColor = (bic: string) => {
    switch (bic) {
      case 'GC': return 'bg-wunder-olive text-white';
      case 'SUBCONTRACTOR': return 'bg-wunder-dark text-white';
      default: return 'bg-wunder-bg text-wunder-olive border border-wunder-border';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link to={`/projects/${projectId}`} className="text-wunder-gray hover:text-wunder-olive transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-2xl font-bold text-wunder-dark">
          {project ? project.name : 'Loading Project...'} - Milestones
        </h2>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-wunder-dark">Construction Milestones</h3>
        {user.role === 'ADMIN' && (
          <button
            onClick={() => setIsCreatingMilestone(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-wunder-dark bg-wunder-lime hover:bg-wunder-yellow transition-colors"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            New Milestone
          </button>
        )}
      </div>

      <div className="space-y-4">
        {milestones.map((milestone) => (
          <div key={milestone.id} className={`bg-white shadow-sm rounded-xl border-2 transition-all ${expandedMilestone === milestone.id ? 'border-wunder-olive ring-1 ring-wunder-olive/20' : 'border-wunder-border hover:border-wunder-gray'}`}>
            <div 
              className={`px-6 py-5 flex items-center justify-between cursor-pointer transition-colors ${expandedMilestone === milestone.id ? 'bg-wunder-light/50 rounded-t-[10px]' : 'hover:bg-wunder-light/30 rounded-[10px]'}`}
              onClick={() => toggleMilestone(milestone.id)}
            >
                <div className="flex items-center gap-4">
                  <div className={`p-1 rounded-full transition-transform duration-200 ${expandedMilestone === milestone.id ? 'rotate-180 bg-wunder-olive text-white' : 'bg-wunder-bg text-wunder-gray'}`}>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-wunder-dark tracking-tight">{milestone.name}</h4>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-wunder-gray bg-wunder-bg px-1.5 py-0.5 rounded">
                        Milestone
                      </span>
                      <span className="text-xs text-wunder-gray font-medium">
                        Created {format(new Date(milestone.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {milestone.certificate_url && (
                    <a 
                      href={milestone.certificate_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs font-bold uppercase tracking-wider text-wunder-olive hover:text-wunder-dark flex items-center gap-1.5 bg-wunder-lime/10 px-3 py-1.5 rounded-full transition-all"
                      onClick={e => e.stopPropagation()}
                    >
                      <FileIcon className="h-3.5 w-3.5" /> Certificate
                    </a>
                  )}
                  
                  {user.role === 'ADMIN' && (
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMilestoneMenu(activeMilestoneMenu === milestone.id ? null : milestone.id);
                        }}
                        className="p-2 text-wunder-gray hover:text-wunder-dark hover:bg-wunder-bg rounded-full transition-all"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      
                      {activeMilestoneMenu === milestone.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setActiveMilestoneMenu(null)}
                          />
                          <div className="absolute right-0 mt-1 w-40 bg-white border border-wunder-border rounded-lg shadow-lg z-20 py-1 overflow-hidden">
                            <button 
                              onClick={() => {
                                setIsEditingMilestone(milestone);
                                setActiveMilestoneMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-wunder-dark hover:bg-wunder-light transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              Rename
                            </button>
                            <button 
                              onClick={() => {
                                handleDeleteMilestone(milestone.id);
                                setActiveMilestoneMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

            {expandedMilestone === milestone.id && (
              <div className="border-t border-wunder-border bg-wunder-bg p-6 rounded-b-[10px]">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="text-sm font-medium text-wunder-gray uppercase tracking-wider">Deliverables</h5>
                  {user.role === 'ADMIN' && (
                    <button
                      onClick={() => setIsCreatingDeliv(milestone.id)}
                      className="text-xs font-bold uppercase tracking-widest text-wunder-olive hover:text-wunder-dark transition-all bg-wunder-lime/10 px-3 py-1.5 rounded-full"
                    >
                      + Add Deliverable
                    </button>
                  )}
                </div>

                <ul className="space-y-2">
                  {(deliverables[milestone.id] || []).map(deliv => (
                    <li key={deliv.id} className="bg-wunder-light border border-wunder-border rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all hover:shadow-sm relative">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">
                          {deliv.status === 'APPROVED' ? (
                            <CheckCircle className="h-5 w-5 text-wunder-olive flex-shrink-0" />
                          ) : deliv.status === 'REJECTED' ? (
                            <Circle className="h-5 w-5 text-red-500 flex-shrink-0" />
                          ) : (
                            <Circle className="h-5 w-5 text-wunder-border flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className={`text-sm font-medium ${deliv.status === 'APPROVED' ? 'text-wunder-gray line-through' : 'text-wunder-dark'}`}>
                              {deliv.description}
                            </p>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusColor(deliv.status)}`}>
                              {deliv.status.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getBICColor(deliv.ball_in_court)}`}>
                              BIC: {deliv.ball_in_court}
                            </span>
                          </div>
                          
                          {deliv.file_url && (
                            <a href={deliv.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-wunder-olive hover:text-wunder-dark transition-colors bg-wunder-bg px-2 py-1 rounded border border-wunder-border">
                              <FileIcon className="h-3.5 w-3.5" /> View Certificate
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-wunder-border">
                        {user.role === 'ADMIN' && (
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col min-w-[100px]">
                              <label className="text-[10px] text-wunder-gray mb-1 font-bold uppercase tracking-wider">Status</label>
                              <select
                                value={deliv.status}
                                onChange={(e) => handleDeliverableStatusUpdate(deliv.id, milestone.id, e.target.value, deliv.ball_in_court)}
                                className="text-xs border border-wunder-border rounded-md bg-white text-wunder-dark py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-wunder-lime focus:border-wunder-lime shadow-sm"
                              >
                                <option value="PENDING">Pending</option>
                                <option value="IN_REVIEW">In Review</option>
                                <option value="APPROVED">Approved</option>
                                <option value="REJECTED">Rejected</option>
                              </select>
                            </div>
                            
                            <div className="flex flex-col min-w-[120px]">
                              <label className="text-[10px] text-wunder-gray mb-1 font-bold uppercase tracking-wider">Ball In Court</label>
                              <select
                                value={deliv.ball_in_court}
                                onChange={(e) => handleDeliverableStatusUpdate(deliv.id, milestone.id, deliv.status, e.target.value)}
                                className="text-xs border border-wunder-border rounded-md bg-white text-wunder-dark py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-wunder-lime focus:border-wunder-lime shadow-sm"
                              >
                                <option value="GC">GC</option>
                                <option value="SUBCONTRACTOR">Subcontractor</option>
                                <option value="ARCHITECT">Architect</option>
                                <option value="OWNER">Owner</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {!deliv.file_url && (user.role === 'SUBCONTRACTOR' || user.role === 'ADMIN') && (
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full border border-wunder-border bg-wunder-lime text-wunder-dark hover:bg-wunder-yellow transition-all shadow-sm self-end">
                            <Upload className="h-3.5 w-3.5" />
                            Upload
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleFileUpload(deliv.id, milestone.id, e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                        )}

                        {user.role === 'ADMIN' && (
                          <div className="relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDelivMenu(activeDelivMenu === deliv.id ? null : deliv.id);
                              }}
                              className="p-2 text-wunder-gray hover:text-wunder-dark hover:bg-wunder-bg rounded-md transition-all"
                            >
                              <MoreVertical className="h-5 w-5" />
                            </button>
                            
                            {activeDelivMenu === deliv.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setActiveDelivMenu(null)}
                                />
                                <div className="absolute right-0 mt-1 w-32 bg-white border border-wunder-border rounded-lg shadow-lg z-20 py-1 overflow-hidden">
                                  <button 
                                    onClick={() => {
                                      setIsEditingDeliv(deliv);
                                      setActiveDelivMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-wunder-dark hover:bg-wunder-light transition-colors"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                    Edit
                                  </button>
                                  <button 
                                    onClick={() => {
                                      handleDeleteDeliverable(deliv.id, milestone.id);
                                      setActiveDelivMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-500 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                  {(deliverables[milestone.id] || []).length === 0 && (
                    <li className="text-sm text-wunder-gray italic list-none">No deliverables assigned.</li>
                  )}
                </ul>

                <div className="mt-8 border-t border-wunder-border pt-6">
                  <button 
                    onClick={() => {
                      if (expandedActivity === milestone.id) {
                        setExpandedActivity(null);
                      } else {
                        setExpandedActivity(milestone.id);
                        fetchActivity(milestone.id);
                      }
                    }}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-wunder-gray hover:text-wunder-dark transition-colors"
                  >
                    {expandedActivity === milestone.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    Activity Log
                  </button>
                  
                  {expandedActivity === milestone.id && (
                    <div className="mt-4 space-y-4 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-wunder-border">
                      {(activities[milestone.id] || []).map(activity => (
                        <div key={activity.id} className="relative pl-6">
                          <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-wunder-olive z-10" />
                          <div className="bg-white border border-wunder-border rounded-lg p-3 shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-wunder-dark uppercase tracking-wider">{activity.user_name}</span>
                              <span className="text-[10px] font-medium text-wunder-gray">{format(new Date(activity.created_at), 'MMM d, HH:mm')}</span>
                            </div>
                            <p className="text-xs text-wunder-gray leading-relaxed">{activity.details}</p>
                          </div>
                        </div>
                      ))}
                      {(activities[milestone.id] || []).length === 0 && (
                        <p className="text-xs text-wunder-gray italic pl-6">No activity recorded yet.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {milestones.length === 0 && (
          <div className="p-8 text-center text-wunder-gray bg-wunder-light shadow rounded-lg border border-wunder-border">
            No milestones found.
          </div>
        )}
      </div>

      {/* Create Milestone Modal */}
      {isCreatingMilestone && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => setIsCreatingMilestone(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <form onSubmit={handleCreateMilestone}>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-wunder-dark">New Milestone</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Name</label>
                      <input type="text" required className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark" value={newMilestone.name} onChange={e => setNewMilestone({...newMilestone, name: e.target.value})} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Milestone Certificate</label>
                      <input 
                        type="file" 
                        className="mt-1 block w-full text-sm text-wunder-gray file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-wunder-lime file:text-wunder-dark hover:file:bg-wunder-yellow cursor-pointer"
                        onChange={e => setCertificateFile(e.target.files ? e.target.files[0] : null)}
                      />
                    </div>

                    <div className="mt-6">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold text-wunder-gray uppercase tracking-wider">Deliverables</h4>
                        <button type="button" onClick={addDelivToNewMilestone} className="text-xs text-wunder-olive hover:text-wunder-dark font-medium flex items-center gap-1">
                          <Plus className="h-3 w-3" /> Add Deliverable
                        </button>
                      </div>

                      <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                        {newMilestone.deliverables.map((deliv, delivIdx) => (
                          <div key={delivIdx} className="p-4 border border-wunder-border rounded-md bg-wunder-bg relative">
                            <button 
                              type="button" 
                              onClick={() => removeDelivFromNewMilestone(delivIdx)}
                              className="absolute top-2 right-2 text-wunder-gray hover:text-red-500"
                            >
                              <Plus className="h-4 w-4 rotate-45" />
                            </button>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-wunder-gray">Deliverable Description</label>
                                <input 
                                  type="text" 
                                  required 
                                  className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-1.5 px-2 text-xs bg-wunder-light text-wunder-dark" 
                                  value={deliv.description} 
                                  onChange={e => updateDelivInNewMilestone(delivIdx, 'description', e.target.value)} 
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-wunder-gray">Ball in Court</label>
                                <select 
                                  className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-1.5 px-2 text-xs bg-wunder-light text-wunder-dark"
                                  value={deliv.ball_in_court}
                                  onChange={e => updateDelivInNewMilestone(delivIdx, 'ball_in_court', e.target.value)}
                                >
                                  <option value="GC">GC</option>
                                  <option value="SUBCONTRACTOR">Subcontractor</option>
                                  <option value="ARCHITECT">Architect</option>
                                  <option value="OWNER">Owner</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                        {newMilestone.deliverables.length === 0 && (
                          <p className="text-xs text-wunder-gray italic text-center py-4">No deliverables added yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-2">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-wunder-lime text-base font-medium text-wunder-dark hover:bg-wunder-yellow transition-colors sm:w-auto sm:text-sm">Create Milestone</button>
                  <button type="button" onClick={() => setIsCreatingMilestone(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-wunder-border shadow-sm px-4 py-2 bg-wunder-light text-base font-medium text-wunder-gray hover:bg-wunder-bg transition-colors sm:mt-0 sm:w-auto sm:text-sm">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Milestone Modal */}
      {isEditingMilestone && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => { setIsEditingMilestone(null); setFormError(null); }}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <form onSubmit={handleUpdateMilestone}>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-wunder-dark">Rename Milestone</h3>
                  {formError && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 text-sm rounded">
                      {formError}
                    </div>
                  )}
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">New Name</label>
                      <input type="text" required className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark" value={isEditingMilestone.name} onChange={e => setIsEditingMilestone({...isEditingMilestone, name: e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-2">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-wunder-lime text-base font-medium text-wunder-dark hover:bg-wunder-yellow transition-colors sm:w-auto sm:text-sm">Save Changes</button>
                  <button type="button" onClick={() => { setIsEditingMilestone(null); setFormError(null); }} className="mt-3 w-full inline-flex justify-center rounded-md border border-wunder-border shadow-sm px-4 py-2 bg-wunder-light text-base font-medium text-wunder-gray hover:bg-wunder-bg transition-colors sm:mt-0 sm:w-auto sm:text-sm">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Deliverable Modal */}
      {isEditingDeliv && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => { setIsEditingDeliv(null); setFormError(null); }}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <form onSubmit={handleUpdateDeliverable}>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-wunder-dark">Edit Deliverable</h3>
                  {formError && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 text-sm rounded">
                      {formError}
                    </div>
                  )}
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Description</label>
                      <input type="text" required className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark" value={isEditingDeliv.description} onChange={e => setIsEditingDeliv({...isEditingDeliv, description: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Ball in Court</label>
                      <select required className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark" value={isEditingDeliv.ball_in_court} onChange={e => setIsEditingDeliv({...isEditingDeliv, ball_in_court: e.target.value})}>
                        <option value="GC">GC</option>
                        <option value="SUBCONTRACTOR">Subcontractor</option>
                        <option value="ARCHITECT">Architect</option>
                        <option value="OWNER">Owner</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Status</label>
                      <select required className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark" value={isEditingDeliv.status} onChange={e => setIsEditingDeliv({...isEditingDeliv, status: e.target.value as any})}>
                        <option value="PENDING">Pending</option>
                        <option value="IN_REVIEW">In Review</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-2">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-wunder-lime text-base font-medium text-wunder-dark hover:bg-wunder-yellow transition-colors sm:w-auto sm:text-sm">Save Changes</button>
                  <button type="button" onClick={() => { setIsEditingDeliv(null); setFormError(null); }} className="mt-3 w-full inline-flex justify-center rounded-md border border-wunder-border shadow-sm px-4 py-2 bg-wunder-light text-base font-medium text-wunder-gray hover:bg-wunder-bg transition-colors sm:mt-0 sm:w-auto sm:text-sm">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Create Deliverable Modal */}
      {isCreatingDeliv && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => setIsCreatingDeliv(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <form onSubmit={e => handleCreateDeliverable(e, isCreatingDeliv)}>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-wunder-dark">Add Deliverable</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Description</label>
                      <input type="text" required className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark" value={newDeliv.description} onChange={e => setNewDeliv({...newDeliv, description: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Ball in Court</label>
                      <select required className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark" value={newDeliv.ball_in_court} onChange={e => setNewDeliv({...newDeliv, ball_in_court: e.target.value})}>
                        <option value="GC">GC</option>
                        <option value="SUBCONTRACTOR">Subcontractor</option>
                        <option value="ARCHITECT">Architect</option>
                        <option value="OWNER">Owner</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-2">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-wunder-lime text-base font-medium text-wunder-dark hover:bg-wunder-yellow transition-colors sm:w-auto sm:text-sm">Add</button>
                  <button type="button" onClick={() => setIsCreatingDeliv(null)} className="mt-3 w-full inline-flex justify-center rounded-md border border-wunder-border shadow-sm px-4 py-2 bg-wunder-light text-base font-medium text-wunder-gray hover:bg-wunder-bg transition-colors sm:mt-0 sm:w-auto sm:text-sm">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => setDeleteConfirm(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <Plus className="h-6 w-6 text-red-600 rotate-45" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-wunder-dark">Confirm Delete</h3>
                  <div className="mt-2">
                    <p className="text-sm text-wunder-gray">
                      {deleteConfirm.message}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-2">
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 transition-colors sm:w-auto sm:text-sm"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-wunder-border shadow-sm px-4 py-2 bg-wunder-light text-base font-medium text-wunder-gray hover:bg-wunder-bg transition-colors sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
