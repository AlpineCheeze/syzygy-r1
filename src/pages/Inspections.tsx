import React, { useState, useEffect } from 'react';
import { User, Project, Inspection, InspectionItem, InspectionTemplate } from '../types';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, CheckCircle, Clock, ChevronDown, ChevronRight, User as UserIcon, Building, Camera, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Inspections({ user }: { user: User }) {
  const { projectId } = useParams<{projectId: string}>();
  const [project, setProject] = useState<Project | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [inspectionItems, setInspectionItems] = useState<Record<string, InspectionItem[]>>({});
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newInspection, setNewInspection] = useState({ name: '', type: 'OBSERVATION', description: '', assigned_company: '', template_id: '' });
  
  const [isCreatingItem, setIsCreatingItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<{
    description: string;
    assigned_company: string;
    ball_in_court: string;
    photoFile: File | null;
    photoTag: 'issue' | 'solution' | '';
    photoLocation: string;
  }>({ description: '', assigned_company: '', ball_in_court: 'GC', photoFile: null, photoTag: '', photoLocation: '' });
  
  const [editingItem, setEditingItem] = useState<InspectionItem | null>(null);
  const [photoUploadModal, setPhotoUploadModal] = useState<{
    itemId: string;
    file: File | null;
    tag: 'issue' | 'solution' | '';
    location: string;
  } | null>(null);

  const fetchProject = async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) setProject(await res.json());
  };

  const fetchInspections = async () => {
    const url = user.role === 'ADMIN' 
      ? `/api/projects/${projectId}/inspections`
      : `/api/projects/${projectId}/inspections?company_name=${encodeURIComponent(user.company_name)}`;
    const res = await fetch(url);
    if (res.ok) setInspections(await res.json());
  };

  const fetchItems = async (inspectionId: string) => {
    const res = await fetch(`/api/inspections/${inspectionId}/items`);
    if (res.ok) {
      const items = await res.json();
      setInspectionItems(prev => ({ ...prev, [inspectionId]: items }));
    }
  };

  const toggleExpand = (inspectionId: string) => {
    if (expandedId === inspectionId) {
      setExpandedId(null);
    } else {
      setExpandedId(inspectionId);
      if (!inspectionItems[inspectionId]) {
        fetchItems(inspectionId);
      }
    }
  };

  const fetchTemplates = async () => {
    const res = await fetch(`/api/projects/${projectId}/inspection-templates`);
    if (res.ok) setTemplates(await res.json());
  };

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchInspections();
      fetchTemplates();
    }
  }, [projectId, user]);

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setNewInspection({
        ...newInspection,
        template_id: templateId,
        name: template.name,
        type: template.type,
        description: template.description
      });
    } else {
      setNewInspection({
        ...newInspection,
        template_id: '',
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/projects/${projectId}/inspections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newInspection)
    });

    if (res.ok) {
      setIsCreating(false);
      setNewInspection({ name: '', type: 'OBSERVATION', description: '', assigned_company: '', template_id: '' });
      fetchInspections();
    }
  };

  const handleCreateItem = async (e: React.FormEvent, inspectionId: string) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('description', newItem.description);
    formData.append('assigned_company', newItem.assigned_company);
    formData.append('ball_in_court', newItem.ball_in_court);
    formData.append('uploaded_by', user.name);
    if (newItem.photoFile) {
      formData.append('file', newItem.photoFile);
      if (newItem.photoTag) formData.append('tag', newItem.photoTag);
      if (newItem.photoLocation) formData.append('location', newItem.photoLocation);
    }

    const res = await fetch(`/api/inspections/${inspectionId}/items`, {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      setIsCreatingItem(null);
      setNewItem({ description: '', assigned_company: '', ball_in_court: 'GC', photoFile: null, photoTag: '', photoLocation: '' });
      fetchItems(inspectionId);
    }
  };

  const handleStatusUpdate = async (id: string, updates: { status?: string, ball_in_court?: string }, isItem: boolean = false) => {
    const endpoint = isItem ? `/api/inspection_items/${id}/status` : `/api/inspections/${id}/status`;
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (res.ok) {
      if (isItem && expandedId) {
        fetchItems(expandedId);
      } else {
        fetchInspections();
      }
    }
  };

  const handleUploadPhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUploadModal || !photoUploadModal.file) return;

    const formData = new FormData();
    formData.append('file', photoUploadModal.file);
    formData.append('uploaded_by', user.name);
    if (photoUploadModal.tag) formData.append('tag', photoUploadModal.tag);
    if (photoUploadModal.location) formData.append('location', photoUploadModal.location);
    
    const res = await fetch(`/api/inspection_items/${photoUploadModal.itemId}/photos`, {
      method: 'POST',
      body: formData
    });
    
    if (res.ok && expandedId) {
      setPhotoUploadModal(null);
      fetchItems(expandedId);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    const res = await fetch(`/api/inspection_items/${editingItem.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingItem)
    });
    
    if (res.ok) {
      setEditingItem(null);
      if (expandedId) fetchItems(expandedId);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this inspection item?')) return;
    
    const res = await fetch(`/api/inspection_items/${id}`, {
      method: 'DELETE'
    });
    
    if (res.ok) {
      setEditingItem(null);
      if (expandedId) fetchItems(expandedId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link to={`/projects/${projectId}`} className="text-wunder-gray hover:text-wunder-olive transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-2xl font-bold text-wunder-dark">
          {project ? project.name : 'Loading Project...'} - Inspections
        </h2>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-wunder-dark">Observations & Punch Lists</h3>
        {user.role === 'ADMIN' && (
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-wunder-dark bg-wunder-lime hover:bg-wunder-yellow transition-colors"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            New Inspection
          </button>
        )}
      </div>

      <div className="bg-wunder-light shadow overflow-hidden sm:rounded-md border border-wunder-border">
        <ul className="divide-y divide-wunder-border">
          {inspections.map((inspection) => (
            <li key={inspection.id} className="hover:bg-wunder-bg transition-colors">
              <div 
                className="p-4 sm:px-6 cursor-pointer flex items-center justify-between"
                onClick={() => toggleExpand(inspection.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedId === inspection.id ? (
                    <ChevronDown className="h-5 w-5 text-wunder-gray" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-wunder-gray" />
                  )}
                  {inspection.status === 'RESOLVED' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-500" />
                  )}
                  <p className="text-sm font-medium text-wunder-dark truncate">
                    {inspection.name || (inspection.type === 'OBSERVATION' ? 'Observation' : 'Punch List')}
                  </p>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    inspection.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {inspection.status}
                  </span>
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  {user.role === 'SUBCONTRACTOR' && inspection.status === 'OPEN' && (
                    <button
                      onClick={() => handleStatusUpdate(inspection.id, { status: 'RESOLVED' })}
                      className="text-sm text-green-600 hover:text-green-900 font-medium transition-colors"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
              
              {expandedId === inspection.id && (
                <div className="px-4 pb-4 sm:px-6 pl-14 bg-wunder-light border-t border-wunder-border/50">
                  <div className="py-3 text-sm text-wunder-gray">
                    <p className="mb-1"><span className="font-medium text-wunder-dark">Description:</span> {inspection.description}</p>
                    <p><span className="font-medium text-wunder-dark">Assigned to:</span> {inspection.assigned_company}</p>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-wunder-dark">Inspection Items</h4>
                      {user.role === 'ADMIN' && (
                        <button
                          onClick={() => setIsCreatingItem(inspection.id)}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-wunder-dark bg-wunder-lime hover:bg-wunder-yellow transition-colors"
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add Item
                        </button>
                      )}
                    </div>
                    
                    <div className="bg-white border border-wunder-border rounded-md overflow-hidden">
                      <ul className="divide-y divide-wunder-border">
                        {inspectionItems[inspection.id]?.map(item => (
                          <li key={item.id} className="p-3 hover:bg-wunder-bg transition-colors flex justify-between items-start">
                            <div className="flex items-start gap-3">
                              {item.status === 'RESOLVED' ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                              ) : (
                                <Clock className="h-4 w-4 text-amber-500 mt-0.5" />
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-wunder-dark">{item.description}</p>
                                  {user.role === 'ADMIN' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingItem(item);
                                      }}
                                      className="text-wunder-gray hover:text-wunder-olive p-1 rounded transition-colors"
                                      title="Edit Item"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                                <p className="text-xs text-wunder-gray mt-1">Assigned: {item.assigned_company}</p>
                                
                                {item.photos && item.photos.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-3 mb-2">
                                    {item.photos.map(photo => (
                                      <div key={photo.id} className="relative group">
                                        <a href={photo.file_url} target="_blank" rel="noreferrer">
                                          <img src={photo.file_url} alt="Inspection" className="h-16 w-16 object-cover rounded border border-wunder-border hover:opacity-75 transition-opacity" />
                                        </a>
                                        {(photo.tag || photo.location) && (
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                                            {photo.tag && <span className="font-semibold capitalize">{photo.tag}</span>}
                                            {photo.tag && photo.location && <span> - </span>}
                                            {photo.location && <span>{photo.location}</span>}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-2 mt-3">
                                  <button 
                                    onClick={() => setPhotoUploadModal({ itemId: item.id, file: null, tag: '', location: '' })}
                                    className="cursor-pointer inline-flex items-center px-2 py-1 border border-wunder-border text-xs font-medium rounded text-wunder-gray bg-wunder-light hover:bg-wunder-bg transition-colors"
                                  >
                                    <Camera className="mr-1 h-3 w-3" />
                                    Add Photo
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${
                                  item.ball_in_court === 'GC' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {item.ball_in_court === 'GC' ? <Building className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                                  {item.ball_in_court}
                                </span>
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  item.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                                  item.status === 'REVIEW' ? 'bg-purple-100 text-purple-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}>
                                  {item.status}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                {user.role === 'ADMIN' && item.status !== 'RESOLVED' && (
                                  <button
                                    onClick={() => handleStatusUpdate(item.id, { ball_in_court: item.ball_in_court === 'GC' ? 'SUBCONTRACTOR' : 'GC' }, true)}
                                    className="text-xs text-wunder-gray hover:text-wunder-dark font-medium transition-colors"
                                  >
                                    Shift BIC
                                  </button>
                                )}
                                {user.role === 'SUBCONTRACTOR' && item.status === 'OPEN' && item.ball_in_court === 'SUBCONTRACTOR' && (
                                  <button
                                    onClick={() => handleStatusUpdate(item.id, { status: 'REVIEW', ball_in_court: 'GC' }, true)}
                                    className="text-xs text-purple-600 hover:text-purple-900 font-medium transition-colors"
                                  >
                                    Submit for Review
                                  </button>
                                )}
                                {user.role === 'ADMIN' && item.status === 'REVIEW' && item.ball_in_court === 'GC' && (
                                  <>
                                    <button
                                      onClick={() => handleStatusUpdate(item.id, { status: 'RESOLVED', ball_in_court: 'GC' }, true)}
                                      className="text-xs text-green-600 hover:text-green-900 font-medium transition-colors"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleStatusUpdate(item.id, { status: 'OPEN', ball_in_court: 'SUBCONTRACTOR' }, true)}
                                      className="text-xs text-red-600 hover:text-red-900 font-medium transition-colors"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                        {(!inspectionItems[inspection.id] || inspectionItems[inspection.id].length === 0) && (
                          <li className="p-3 text-sm text-wunder-gray text-center">No items added yet.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
          {inspections.length === 0 && (
            <li className="p-8 text-center text-wunder-gray">
              No inspections found.
            </li>
          )}
        </ul>
      </div>

      {/* Create Inspection Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => setIsCreating(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <form onSubmit={handleCreate}>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-wunder-dark">New Inspection</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Template (Optional)</label>
                      <select
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-wunder-border focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm rounded-md bg-wunder-light text-wunder-dark"
                        value={newInspection.template_id}
                        onChange={e => handleTemplateChange(e.target.value)}
                      >
                        <option value="">-- No Template --</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Name</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark"
                        value={newInspection.name}
                        onChange={e => setNewInspection({...newInspection, name: e.target.value})}
                        placeholder="e.g., Level 1 Framing Inspection"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Type</label>
                      <select
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-wunder-border focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm rounded-md bg-wunder-light text-wunder-dark"
                        value={newInspection.type}
                        onChange={e => setNewInspection({...newInspection, type: e.target.value})}
                      >
                        <option value="OBSERVATION">Observation</option>
                        <option value="PUNCH_LIST">Punch List</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Description</label>
                      <textarea
                        required
                        rows={3}
                        className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark"
                        value={newInspection.description}
                        onChange={e => setNewInspection({...newInspection, description: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Assigned Company</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark"
                        value={newInspection.assigned_company}
                        onChange={e => setNewInspection({...newInspection, assigned_company: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-2">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-wunder-lime text-base font-medium text-wunder-dark hover:bg-wunder-yellow focus:outline-none sm:w-auto sm:text-sm transition-colors">
                    Create Inspection
                  </button>
                  <button type="button" onClick={() => setIsCreating(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-wunder-border shadow-sm px-4 py-2 bg-wunder-light text-base font-medium text-wunder-gray hover:bg-wunder-bg focus:outline-none sm:mt-0 sm:w-auto sm:text-sm transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Item Modal */}
      {isCreatingItem && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => setIsCreatingItem(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <form onSubmit={(e) => handleCreateItem(e, isCreatingItem)}>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-wunder-dark">Add Inspection Item</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Description</label>
                      <textarea
                        required
                        rows={3}
                        className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark"
                        value={newItem.description}
                        onChange={e => setNewItem({...newItem, description: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Assigned Company</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark"
                        value={newItem.assigned_company}
                        onChange={e => setNewItem({...newItem, assigned_company: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Ball in Court</label>
                      <select
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-wunder-border focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm rounded-md bg-wunder-light text-wunder-dark"
                        value={newItem.ball_in_court}
                        onChange={e => setNewItem({...newItem, ball_in_court: e.target.value})}
                      >
                        <option value="GC">General Contractor (GC)</option>
                        <option value="SUBCONTRACTOR">Subcontractor</option>
                      </select>
                    </div>
                    
                    <div className="border-t border-wunder-border pt-4 mt-4">
                      <h4 className="text-sm font-medium text-wunder-dark mb-3">Include Photo (Optional)</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-wunder-gray">Photo File</label>
                          <input 
                            type="file" 
                            accept="image/*"
                            className="mt-1 block w-full text-sm text-wunder-gray file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-wunder-lime file:text-wunder-dark hover:file:bg-wunder-yellow"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setNewItem({...newItem, photoFile: e.target.files[0]});
                              }
                            }}
                          />
                        </div>
                        {newItem.photoFile && (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-wunder-gray">Tag</label>
                                <select
                                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-wunder-border focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm rounded-md bg-wunder-light text-wunder-dark"
                                  value={newItem.photoTag}
                                  onChange={e => setNewItem({...newItem, photoTag: e.target.value as any})}
                                >
                                  <option value="">-- None --</option>
                                  <option value="issue">Issue</option>
                                  <option value="solution">Solution</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-wunder-gray">Location</label>
                                <input
                                  type="text"
                                  className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark"
                                  value={newItem.photoLocation}
                                  onChange={e => setNewItem({...newItem, photoLocation: e.target.value})}
                                  placeholder="e.g., North Wall"
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-2">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-wunder-lime text-base font-medium text-wunder-dark hover:bg-wunder-yellow focus:outline-none sm:w-auto sm:text-sm transition-colors">
                    Add Item
                  </button>
                  <button type="button" onClick={() => setIsCreatingItem(null)} className="mt-3 w-full inline-flex justify-center rounded-md border border-wunder-border shadow-sm px-4 py-2 bg-wunder-light text-base font-medium text-wunder-gray hover:bg-wunder-bg focus:outline-none sm:mt-0 sm:w-auto sm:text-sm transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Photo Upload Modal */}
      {photoUploadModal && (
        <div className="fixed inset-0 z-30 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => setPhotoUploadModal(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <form onSubmit={handleUploadPhotoSubmit}>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-wunder-dark">Add Photo</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Photo File</label>
                      <input 
                        type="file" 
                        required
                        accept="image/*"
                        className="mt-1 block w-full text-sm text-wunder-gray file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-wunder-lime file:text-wunder-dark hover:file:bg-wunder-yellow"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setPhotoUploadModal({...photoUploadModal, file: e.target.files[0]});
                          }
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-wunder-gray">Tag</label>
                        <select
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-wunder-border focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm rounded-md bg-wunder-light text-wunder-dark"
                          value={photoUploadModal.tag}
                          onChange={e => setPhotoUploadModal({...photoUploadModal, tag: e.target.value as any})}
                        >
                          <option value="">-- None --</option>
                          <option value="issue">Issue</option>
                          <option value="solution">Solution</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-wunder-gray">Location</label>
                        <input
                          type="text"
                          className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark"
                          value={photoUploadModal.location}
                          onChange={e => setPhotoUploadModal({...photoUploadModal, location: e.target.value})}
                          placeholder="e.g., North Wall"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-2">
                  <button type="submit" disabled={!photoUploadModal.file} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-wunder-lime text-base font-medium text-wunder-dark hover:bg-wunder-yellow focus:outline-none sm:w-auto sm:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Upload
                  </button>
                  <button type="button" onClick={() => setPhotoUploadModal(null)} className="mt-3 w-full inline-flex justify-center rounded-md border border-wunder-border shadow-sm px-4 py-2 bg-wunder-light text-base font-medium text-wunder-gray hover:bg-wunder-bg focus:outline-none sm:mt-0 sm:w-auto sm:text-sm transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-20 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => setEditingItem(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <form onSubmit={handleUpdateItem}>
                <div>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-wunder-dark">Edit Inspection Item</h3>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(editingItem.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                      title="Delete Item"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Description</label>
                      <textarea
                        required
                        className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark"
                        rows={3}
                        value={editingItem.description}
                        onChange={e => setEditingItem({...editingItem, description: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Assigned Company</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark"
                        value={editingItem.assigned_company}
                        onChange={e => setEditingItem({...editingItem, assigned_company: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-wunder-gray">Status</label>
                        <select
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-wunder-border focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm rounded-md bg-wunder-light text-wunder-dark"
                          value={editingItem.status}
                          onChange={e => setEditingItem({...editingItem, status: e.target.value as any})}
                        >
                          <option value="OPEN">Open</option>
                          <option value="REVIEW">Review</option>
                          <option value="RESOLVED">Resolved</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-wunder-gray">Ball in Court</label>
                        <select
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-wunder-border focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm rounded-md bg-wunder-light text-wunder-dark"
                          value={editingItem.ball_in_court}
                          onChange={e => setEditingItem({...editingItem, ball_in_court: e.target.value as any})}
                        >
                          <option value="GC">General Contractor (GC)</option>
                          <option value="SUBCONTRACTOR">Subcontractor</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-2">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-wunder-lime text-base font-medium text-wunder-dark hover:bg-wunder-yellow focus:outline-none sm:w-auto sm:text-sm transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
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
