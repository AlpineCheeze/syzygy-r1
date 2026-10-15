import React, { useState, useEffect } from 'react';
import { User, Project, Contact, ToolPermissions, PermissionLevel, DistributionGroup } from '../types';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Mail, Phone, Building, Edit2, Shield, Eye, Edit3, XCircle, ChevronRight, UserPlus, Trash2 } from 'lucide-react';

const DEFAULT_PERMISSIONS: ToolPermissions = {
  submittals: 'NONE',
  inspections: 'NONE',
  milestones: 'NONE',
  photos: 'NONE',
  drawings: 'NONE',
  meetings: 'NONE',
  warranty: 'NONE',
  schedule: 'NONE',
  procurement: 'NONE',
  incidents: 'NONE',
  directory: 'NONE',
  forum: 'NONE'
};

const TOOLS: { key: keyof ToolPermissions; label: string }[] = [
  { key: 'submittals', label: 'Submittals' },
  { key: 'inspections', label: 'Inspections' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'photos', label: 'Photos' },
  { key: 'drawings', label: 'Drawings' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'warranty', label: 'Warranty' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'procurement', label: 'Procurement' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'directory', label: 'Directory' },
  { key: 'forum', label: 'Forum' },
];

export default function Directory({ user }: { user: User }) {
  const { projectId } = useParams<{projectId: string}>();
  const [project, setProject] = useState<Project | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeTab, setActiveTab] = useState<'contacts' | 'groups'>('contacts');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  
  // Group state
  const [groups, setGroups] = useState<DistributionGroup[]>([]);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DistributionGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [newGroupData, setNewGroupData] = useState({ name: '', description: '' });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    project_role: 'SUBCONTRACTOR' as 'ADMIN' | 'SUBCONTRACTOR',
    permissions: DEFAULT_PERMISSIONS
  });

  const fetchProject = async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) setProject(await res.json());
  };

  const fetchContacts = async () => {
    const res = await fetch(`/api/projects/${projectId}/contacts`);
    if (res.ok) setContacts(await res.json());
  };

  const fetchGroups = async () => {
    const res = await fetch(`/api/projects/${projectId}/distribution-groups`);
    if (res.ok) setGroups(await res.json());
  };

  const fetchGroupMembers = async (groupId: string) => {
    const res = await fetch(`/api/distribution-groups/${groupId}/members`);
    if (res.ok) {
      const data = await res.json();
      setGroupMembers(data.map((m: any) => m.user_id));
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchContacts();
      fetchGroups();
    }
  }, [projectId]);

  const handleOpenModal = (contact?: Contact) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        name: contact.name,
        email: contact.email,
        phone: contact.phone || '',
        company_name: contact.company_name,
        project_role: contact.project_role,
        permissions: (typeof contact.permissions === 'string' ? JSON.parse(contact.permissions) : contact.permissions) || DEFAULT_PERMISSIONS
      });
    } else {
      setEditingContact(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        company_name: '',
        project_role: 'SUBCONTRACTOR',
        permissions: DEFAULT_PERMISSIONS
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingContact) {
      const res = await fetch(`/api/contacts/${editingContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchContacts();
      }
    } else {
      const res = await fetch(`/api/projects/${projectId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchContacts();
      }
    }
  };

  const handleInvite = async (id: string) => {
    const res = await fetch(`/api/contacts/${id}/invite`, {
      method: 'POST'
    });
    if (res.ok) {
      fetchContacts();
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/projects/${projectId}/distribution-groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newGroupData)
    });
    if (res.ok) {
      setIsGroupModalOpen(false);
      setNewGroupData({ name: '', description: '' });
      fetchGroups();
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    const res = await fetch(`/api/distribution-groups/${groupId}`, { method: 'DELETE' });
    if (res.ok) fetchGroups();
  };

  const toggleMember = async (groupId: string, userId: string) => {
    const isMember = groupMembers.includes(userId);
    if (isMember) {
      const res = await fetch(`/api/distribution-groups/${groupId}/members/${userId}`, { method: 'DELETE' });
      if (res.ok) fetchGroupMembers(groupId);
    } else {
      const res = await fetch(`/api/distribution-groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [userId] })
      });
      if (res.ok) fetchGroupMembers(groupId);
    }
    fetchGroups(); // Refresh member counts
  };

  // Group contacts by company
  const groupedContacts = contacts.reduce((acc, contact) => {
    if (!acc[contact.company_name]) {
      acc[contact.company_name] = [];
    }
    acc[contact.company_name].push(contact);
    return acc;
  }, {} as Record<string, Contact[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link to={`/projects/${projectId}`} className="text-wunder-gray hover:text-wunder-olive transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-2xl font-bold text-wunder-dark">
          {project ? project.name : 'Loading Project...'} - Directory
        </h2>
      </div>

      <div className="flex border-b border-wunder-border">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-6 py-3 text-sm font-bold uppercase tracking-widest transition-colors border-b-2 ${
            activeTab === 'contacts' ? 'border-wunder-lime text-wunder-dark' : 'border-transparent text-wunder-gray hover:text-wunder-dark'
          }`}
        >
          Project Contacts
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-6 py-3 text-sm font-bold uppercase tracking-widest transition-colors border-b-2 ${
            activeTab === 'groups' ? 'border-wunder-lime text-wunder-dark' : 'border-transparent text-wunder-gray hover:text-wunder-dark'
          }`}
        >
          Distribution Groups
        </button>
      </div>

      {activeTab === 'contacts' ? (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-wunder-dark">Project Contacts</h3>
            {user.role === 'ADMIN' && (
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-wunder-dark bg-wunder-lime hover:bg-wunder-yellow transition-colors"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Add Contact
              </button>
            )}
          </div>

          <div className="space-y-8">
            {Object.entries(groupedContacts).map(([company, companyContacts]) => (
              <div key={company} className="bg-wunder-light shadow overflow-hidden sm:rounded-lg border border-wunder-border">
                <div className="px-4 py-4 border-b border-wunder-border sm:px-6 bg-wunder-bg flex items-center gap-3">
                  <Building className="h-5 w-5 text-wunder-gray" />
                  <h3 className="text-lg leading-6 font-medium text-wunder-dark">{company}</h3>
                </div>
                <ul className="divide-y divide-wunder-border">
                  {(companyContacts as Contact[]).map((contact) => (
                    <li key={contact.id} className="p-4 sm:px-6 hover:bg-wunder-bg transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-medium text-wunder-dark truncate">{contact.name}</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              contact.project_role === 'ADMIN' ? 'bg-wunder-dark text-wunder-lime' : 'bg-wunder-border text-wunder-dark'
                            }`}>
                              {contact.project_role}
                            </span>
                            {contact.is_invited === 1 && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-wunder-lime text-wunder-dark">
                                Invited
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap sm:space-x-6">
                            <div className="mt-2 flex items-center text-sm text-wunder-gray sm:mt-0">
                              <Mail className="flex-shrink-0 mr-1.5 h-4 w-4 text-wunder-gray" />
                              {contact.email}
                            </div>
                            {contact.phone && (
                              <div className="mt-2 flex items-center text-sm text-wunder-gray sm:mt-0">
                                <Phone className="flex-shrink-0 mr-1.5 h-4 w-4 text-wunder-gray" />
                                {contact.phone}
                              </div>
                            )}
                            <div className="mt-2 flex items-center text-sm text-wunder-gray sm:mt-0">
                              <Shield className="flex-shrink-0 mr-1.5 h-4 w-4 text-wunder-olive" />
                              {(() => {
                                const p = (typeof contact.permissions === 'string' ? JSON.parse(contact.permissions) : contact.permissions) as ToolPermissions;
                                if (!p) return 'No permissions set';
                                const active = Object.values(p).filter(l => l !== 'NONE');
                                return active.length === 0 ? 'No access' : `${active.length} tools enabled`;
                              })()}
                            </div>
                          </div>
                        </div>
                        {user.role === 'ADMIN' && (
                          <div className="flex items-center gap-4 ml-4">
                            {contact.is_invited === 0 && (
                              <button
                                onClick={() => handleInvite(contact.id)}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-wunder-dark bg-wunder-lime hover:bg-wunder-yellow transition-colors"
                              >
                                Invite to Project
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenModal(contact)}
                              className="text-wunder-gray hover:text-wunder-dark transition-colors"
                            >
                              <Edit2 className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            
            {contacts.length === 0 && (
              <div className="py-12 text-center bg-wunder-light rounded-lg border-2 border-dashed border-wunder-border">
                <Users className="mx-auto h-12 w-12 text-wunder-gray" />
                <h3 className="mt-2 text-sm font-medium text-wunder-dark">No contacts</h3>
                <p className="mt-1 text-sm text-wunder-gray">Get started by adding a new contact to the directory.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-wunder-dark">Distribution Groups</h3>
            {user.role === 'ADMIN' && (
              <button
                onClick={() => setIsGroupModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-wunder-dark bg-wunder-lime hover:bg-wunder-yellow transition-colors"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                New Group
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <div key={group.id} className="bg-wunder-light rounded-xl border border-wunder-border p-6 shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-wunder-bg rounded-lg">
                      <Users className="h-5 w-5 text-wunder-olive" />
                    </div>
                    <div>
                      <h4 className="font-bold text-wunder-dark">{group.name}</h4>
                      <p className="text-xs text-wunder-gray">{group.member_count} members</p>
                    </div>
                  </div>
                  {user.role === 'ADMIN' && (
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="p-1.5 text-wunder-gray hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {group.description && (
                  <p className="text-sm text-wunder-gray mb-6 flex-grow">{group.description}</p>
                ) || <div className="flex-grow"></div>}
                <button
                  onClick={() => {
                    setSelectedGroup(group);
                    fetchGroupMembers(group.id);
                  }}
                  className="w-full inline-flex items-center justify-center px-3 py-2 border-2 border-wunder-border text-xs font-bold uppercase tracking-widest text-wunder-dark rounded-lg hover:bg-wunder-bg hover:border-wunder-dark transition-all group"
                >
                  Manage Members
                  <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            ))}
            {groups.length === 0 && (
              <div className="col-span-full py-12 text-center bg-wunder-light rounded-lg border-2 border-dashed border-wunder-border">
                <Users className="mx-auto h-12 w-12 text-wunder-gray" />
                <h3 className="mt-2 text-sm font-medium text-wunder-dark">No distribution groups</h3>
                <p className="mt-1 text-sm text-wunder-gray">Groups allow you to easily manage project-wide distribution lists.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Distribution Group Create Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => setIsGroupModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-2xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6 border-2 border-wunder-border">
              <form onSubmit={handleCreateGroup}>
                <h3 className="text-xl font-bold text-wunder-dark mb-6">Create New Group</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-wunder-gray uppercase tracking-widest mb-1.5">Group Name</label>
                    <input
                      type="text"
                      required
                      value={newGroupData.name}
                      onChange={e => setNewGroupData({ ...newGroupData, name: e.target.value })}
                      className="w-full bg-wunder-bg border-2 border-wunder-border rounded-xl px-4 py-3 focus:outline-none focus:border-wunder-olive transition-colors"
                      placeholder="e.g., HVAC Team, Design Review"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-wunder-gray uppercase tracking-widest mb-1.5">Description (Optional)</label>
                    <textarea
                      value={newGroupData.description}
                      onChange={e => setNewGroupData({ ...newGroupData, description: e.target.value })}
                      className="w-full bg-wunder-bg border-2 border-wunder-border rounded-xl px-4 py-3 focus:outline-none focus:border-wunder-olive transition-colors h-24"
                      placeholder="What is this group for?"
                    />
                  </div>
                </div>
                <div className="mt-8 flex gap-3">
                  <button type="submit" className="flex-1 bg-wunder-lime text-wunder-dark font-bold py-3 rounded-xl hover:bg-wunder-yellow transition-colors uppercase tracking-widest text-xs">
                    Create Group
                  </button>
                  <button type="button" onClick={() => setIsGroupModalOpen(false)} className="flex-1 bg-wunder-light border-2 border-wunder-border text-wunder-gray font-bold py-3 rounded-xl hover:bg-wunder-bg transition-colors uppercase tracking-widest text-xs">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Member Management Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => setSelectedGroup(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-2xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 border-2 border-wunder-border">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-wunder-dark">{selectedGroup.name}</h3>
                  <p className="text-xs text-wunder-gray mt-1">Manage group members</p>
                </div>
                <button onClick={() => setSelectedGroup(null)} className="p-2 hover:bg-wunder-bg rounded-lg">
                  <XCircle className="h-6 w-6 text-wunder-gray" />
                </button>
              </div>
              
              <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => toggleMember(selectedGroup.id, contact.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${
                        groupMembers.includes(contact.id)
                          ? 'border-wunder-lime bg-wunder-lime/5'
                          : 'border-wunder-border hover:border-wunder-gray'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold text-wunder-dark">{contact.name}</p>
                        <p className="text-[10px] text-wunder-gray uppercase tracking-widest">{contact.company_name}</p>
                      </div>
                      <div className={`p-1.5 rounded-lg transition-colors ${
                        groupMembers.includes(contact.id)
                          ? 'bg-wunder-lime text-wunder-dark'
                          : 'bg-wunder-bg text-wunder-gray'
                      }`}>
                        {groupMembers.includes(contact.id) ? <Users className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-8 flex">
                <button
                  type="button"
                  onClick={() => setSelectedGroup(null)}
                  className="w-full bg-wunder-dark text-wunder-lime font-bold py-3 rounded-xl hover:bg-wunder-olive transition-colors uppercase tracking-widest text-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <form onSubmit={handleSubmit}>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-wunder-dark">
                    {editingContact ? 'Edit Contact' : 'New Contact'}
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Name</label>
                      <input type="text" required className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Email</label>
                      <input type="email" required className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Phone</label>
                      <input type="tel" className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Company Name</label>
                      <input type="text" required className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Project Role</label>
                      <select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-wunder-border focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm rounded-md bg-wunder-light text-wunder-dark" value={formData.project_role} onChange={e => setFormData({...formData, project_role: e.target.value as 'ADMIN' | 'SUBCONTRACTOR'})}>
                        <option value="SUBCONTRACTOR">Subcontractor</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>

                    <div className="pt-4 border-t border-wunder-border">
                      <div className="flex items-center gap-2 mb-4">
                        <Shield className="h-5 w-5 text-wunder-olive" />
                        <h4 className="text-sm font-bold uppercase tracking-wider text-wunder-dark">Tool Permissions</h4>
                      </div>
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {TOOLS.map((tool) => (
                          <div key={tool.key} className="flex items-center justify-between p-2 bg-wunder-bg rounded-lg border border-wunder-border">
                            <span className="text-xs font-medium text-wunder-dark">{tool.label}</span>
                            <div className="flex items-center gap-1">
                              {(['NONE', 'VIEWER', 'EDITOR'] as PermissionLevel[]).map((level) => (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => setFormData({
                                    ...formData,
                                    permissions: { ...formData.permissions, [tool.key]: level }
                                  })}
                                  className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${
                                    formData.permissions[tool.key] === level
                                      ? level === 'NONE' ? 'bg-red-500 text-white' : level === 'VIEWER' ? 'bg-wunder-olive text-white' : 'bg-wunder-lime text-wunder-dark'
                                      : 'bg-wunder-light text-wunder-gray hover:bg-wunder-border'
                                  }`}
                                >
                                  {level}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-2">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-wunder-lime text-base font-medium text-wunder-dark hover:bg-wunder-yellow transition-colors sm:w-auto sm:text-sm">
                    {editingContact ? 'Save Changes' : 'Create Contact'}
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-wunder-border shadow-sm px-4 py-2 bg-wunder-light text-base font-medium text-wunder-gray hover:bg-wunder-bg transition-colors sm:mt-0 sm:w-auto sm:text-sm">
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
