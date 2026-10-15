import React, { useState, useEffect } from 'react';
import { User, Meeting } from '../types';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Plus, Calendar, MapPin, FileText, CheckCircle, Trash2, Edit2, X, Save } from 'lucide-react';
import { format } from 'date-fns';

export default function Meetings({ user }: { user: User }) {
  const { projectId } = useParams<{projectId: string}>();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [newMeeting, setNewMeeting] = useState({ 
    title: '', 
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"), 
    location: '', 
    agenda: '' 
  });

  const fetchMeetings = async () => {
    const res = await fetch(`/api/projects/${projectId}/meetings`);
    if (res.ok) setMeetings(await res.json());
  };

  useEffect(() => {
    if (projectId) fetchMeetings();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/projects/${projectId}/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newMeeting, created_by: user.name })
    });

    if (res.ok) {
      setIsCreating(false);
      setNewMeeting({ 
        title: '', 
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm"), 
        location: '', 
        agenda: '' 
      });
      fetchMeetings();
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting) return;

    const res = await fetch(`/api/meetings/${editingMeeting.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingMeeting)
    });

    if (res.ok) {
      setEditingMeeting(null);
      fetchMeetings();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;
    const res = await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
    if (res.ok) fetchMeetings();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/projects/${projectId}`} className="p-2 hover:bg-wunder-light rounded-full transition-colors">
            <ArrowLeft className="h-6 w-6 text-wunder-dark" />
          </Link>
          <h2 className="text-2xl font-bold text-wunder-dark flex items-center gap-2">
            <Users className="h-6 w-6 text-wunder-olive" />
            Project Meetings
          </h2>
        </div>
        {user.role === 'ADMIN' && (
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-wunder-dark bg-wunder-lime hover:bg-wunder-yellow transition-colors"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            New Meeting
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {meetings.map((meeting) => (
          <div key={meeting.id} className="bg-wunder-light rounded-lg shadow-sm border border-wunder-border overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-wunder-dark">{meeting.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-4 text-sm text-wunder-gray">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(meeting.date), 'PPPP p')}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {meeting.location || 'No location set'}
                    </span>
                  </div>
                </div>
                {user.role === 'ADMIN' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingMeeting(meeting)}
                      className="p-2 text-wunder-gray hover:text-wunder-dark hover:bg-wunder-bg rounded-md transition-colors"
                      title="Edit Meeting"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(meeting.id)}
                      className="p-2 text-wunder-gray hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete Meeting"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-wunder-gray mb-2 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Agenda
                  </h4>
                  <div className="bg-white p-4 rounded-md border border-wunder-border text-sm text-wunder-dark whitespace-pre-wrap min-h-[100px]">
                    {meeting.agenda || 'No agenda documented.'}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-wunder-gray mb-2 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Meeting Minutes
                  </h4>
                  <div className={`p-4 rounded-md border text-sm whitespace-pre-wrap min-h-[100px] ${meeting.minutes ? 'bg-wunder-lime/5 border-wunder-lime/20 text-wunder-dark' : 'bg-wunder-bg border-wunder-border text-wunder-gray italic'}`}>
                    {meeting.minutes || 'Minutes have not been documented yet.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {meetings.length === 0 && (
          <div className="bg-wunder-light rounded-lg shadow p-12 text-center border border-wunder-border text-wunder-gray">
            <Users className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <h3 className="text-lg font-medium text-wunder-dark">No meetings scheduled</h3>
            <p className="mt-2">Create a new meeting to start documenting agendas and minutes.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(isCreating || editingMeeting) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => { setIsCreating(false); setEditingMeeting(null); }}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button onClick={() => { setIsCreating(false); setEditingMeeting(null); }} className="text-wunder-gray hover:text-wunder-dark">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={isCreating ? handleCreate : handleUpdate}>
                <h3 className="text-xl font-bold text-wunder-dark mb-6">
                  {isCreating ? 'Schedule New Meeting' : 'Update Meeting'}
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-wunder-gray mb-1">Meeting Title</label>
                      <input
                        type="text"
                        required
                        className="block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-white text-wunder-dark"
                        value={isCreating ? newMeeting.title : editingMeeting?.title}
                        onChange={e => isCreating 
                          ? setNewMeeting({...newMeeting, title: e.target.value})
                          : setEditingMeeting({...editingMeeting!, title: e.target.value})}
                        placeholder="e.g., Weekly OAC Meeting #12"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-wunder-gray mb-1">Date & Time</label>
                      <input
                        type="datetime-local"
                        required
                        className="block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-white text-wunder-dark"
                        value={isCreating ? newMeeting.date : editingMeeting?.date}
                        onChange={e => isCreating 
                          ? setNewMeeting({...newMeeting, date: e.target.value})
                          : setEditingMeeting({...editingMeeting!, date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-wunder-gray mb-1">Location</label>
                    <input
                      type="text"
                      className="block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-white text-wunder-dark"
                      value={isCreating ? newMeeting.location : editingMeeting?.location}
                      onChange={e => isCreating 
                        ? setNewMeeting({...newMeeting, location: e.target.value})
                        : setEditingMeeting({...editingMeeting!, location: e.target.value})}
                      placeholder="e.g., Jobsite Trailer / Microsoft Teams"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-wunder-gray mb-1">Agenda Items</label>
                    <textarea
                      rows={4}
                      className="block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-white text-wunder-dark"
                      value={isCreating ? newMeeting.agenda : editingMeeting?.agenda}
                      onChange={e => isCreating 
                        ? setNewMeeting({...newMeeting, agenda: e.target.value})
                        : setEditingMeeting({...editingMeeting!, agenda: e.target.value})}
                      placeholder="Enter the topics to be discussed..."
                    />
                  </div>

                  {!isCreating && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-wunder-gray mb-1">Meeting Minutes</label>
                      <textarea
                        rows={8}
                        className="block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-white text-wunder-dark"
                        value={editingMeeting?.minutes}
                        onChange={e => setEditingMeeting({...editingMeeting!, minutes: e.target.value})}
                        placeholder="Document the discussion, decisions, and action items..."
                      />
                    </div>
                  )}
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-wunder-lime text-sm font-bold uppercase tracking-wider text-wunder-dark hover:bg-wunder-yellow transition-colors"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isCreating ? 'Save Meeting' : 'Update Meeting'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsCreating(false); setEditingMeeting(null); }}
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
