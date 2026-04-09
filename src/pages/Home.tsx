import React, { useState, useEffect } from 'react';
import { User, Project } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Folder, ArrowRight, ChevronDown, BarChart3, Building2, Users as UsersIcon } from 'lucide-react';

/**
 * Home Component
 * 
 * Acts as the primary dashboard for users upon logging in.
 * It provides two views:
 * 1. Projects View: A grid of project cards the user has access to.
 * 2. Portfolio View: A high-level overview including a Gantt-style timeline and summary metrics.
 */
export default function Home({ user }: { user: User }) {
  const navigate = useNavigate();
  // State for storing the list of projects fetched from the API
  const [projects, setProjects] = useState<Project[]>([]);
  // State for managing the "Create Project" modal visibility
  const [isCreating, setIsCreating] = useState(false);
  // State for the new project form data
  const [newProject, setNewProject] = useState({ name: '', description: '', start_date: '', end_date: '' });
  // State for toggling between 'projects' grid and 'portfolio' timeline
  const [viewMode, setViewMode] = useState<'projects' | 'portfolio'>('projects');
  // State for the view mode dropdown menu
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  /**
   * Calculates the timeline boundaries and project positions for the Portfolio view.
   * Determines the earliest start date and latest end date across all projects,
   * adds padding, and calculates the relative left offset and width (in percentages)
   * for each project bar to be rendered on the timeline.
   */
  const getTimelineData = () => {
    if (projects.length === 0) return { minDate: new Date(), maxDate: new Date(), timelineProjects: [] };
    
    const validProjects = projects.filter(p => p.start_date && p.end_date);
    if (validProjects.length === 0) return { minDate: new Date(), maxDate: new Date(), timelineProjects: [] };

    const minDate = new Date(Math.min(...validProjects.map(p => new Date(p.start_date).getTime())));
    const maxDate = new Date(Math.max(...validProjects.map(p => new Date(p.end_date).getTime())));
    
    // Add padding (1 month) and align to start/end of month
    minDate.setMonth(minDate.getMonth() - 1);
    minDate.setDate(1);
    minDate.setHours(0, 0, 0, 0);

    maxDate.setMonth(maxDate.getMonth() + 2);
    maxDate.setDate(0); // Last day of the previous month (which is maxDate.getMonth() + 1)
    maxDate.setHours(23, 59, 59, 999);

    const totalDuration = maxDate.getTime() - minDate.getTime();

    const timelineProjects = validProjects.map(p => {
      const start = new Date(p.start_date).getTime();
      const end = new Date(p.end_date).getTime();
      const left = ((start - minDate.getTime()) / totalDuration) * 100;
      const width = ((end - start) / totalDuration) * 100;
      return { ...p, left, width };
    });

    return { minDate, maxDate, timelineProjects };
  };

  /**
   * Fetches the list of projects from the backend API.
   * Passes the user's role and company name to ensure they only see
   * projects they are authorized to access.
   */
  const fetchProjects = async () => {
    const res = await fetch(`/api/projects?role=${user.role}&company_name=${encodeURIComponent(user.company_name)}`);
    if (res.ok) {
      setProjects(await res.json());
    }
  };

  // Fetch projects when the component mounts or when the user changes
  useEffect(() => {
    fetchProjects();
  }, [user]);

  /**
   * Handles the submission of the "Create Project" form.
   * Sends a POST request to the backend with the new project details.
   */
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProject)
    });

    if (res.ok) {
      setIsCreating(false);
      setNewProject({ name: '', description: '', start_date: '', end_date: '' });
      fetchProjects();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 text-2xl font-bold text-wunder-dark hover:text-wunder-olive transition-colors focus:outline-none"
          >
            {viewMode === 'projects' ? 'Projects' : 'Portfolio'}
            <ChevronDown className={`h-6 w-6 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-wunder-light ring-1 ring-black ring-opacity-5 z-20 border border-wunder-border">
              <div className="py-1" role="menu" aria-orientation="vertical">
                <button
                  onClick={() => { setViewMode('projects'); setIsDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm ${viewMode === 'projects' ? 'bg-wunder-bg text-wunder-dark font-medium' : 'text-wunder-gray hover:bg-wunder-bg hover:text-wunder-dark'}`}
                  role="menuitem"
                >
                  Projects
                </button>
                <button
                  onClick={() => { setViewMode('portfolio'); setIsDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm ${viewMode === 'portfolio' ? 'bg-wunder-bg text-wunder-dark font-medium' : 'text-wunder-gray hover:bg-wunder-bg hover:text-wunder-dark'}`}
                  role="menuitem"
                >
                  Portfolio
                </button>
              </div>
            </div>
          )}
        </div>
        {user.role === 'ADMIN' && (
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-wunder-dark bg-wunder-lime hover:bg-wunder-yellow transition-colors"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            New Project
          </button>
        )}
      </div>

      {viewMode === 'projects' ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="bg-wunder-light overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200 border border-wunder-border group"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-wunder-bg rounded-md p-3">
                    <Folder className="h-6 w-6 text-wunder-olive" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-wunder-dark group-hover:text-wunder-olive transition-colors">
                      {project.name}
                    </h3>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-wunder-gray line-clamp-2">
                    {project.description || 'No description provided.'}
                  </p>
                </div>
              </div>
              <div className="bg-wunder-bg px-6 py-3 border-t border-wunder-border flex justify-between items-center">
                <span className="text-sm text-wunder-gray">
                  Created {new Date(project.created_at).toLocaleDateString()}
                </span>
                <ArrowRight className="h-4 w-4 text-wunder-gray group-hover:text-wunder-olive transition-colors" />
              </div>
            </Link>
          ))}
          {projects.length === 0 && (
            <div className="col-span-full py-12 text-center bg-wunder-light rounded-lg border-2 border-dashed border-wunder-border">
              <Folder className="mx-auto h-12 w-12 text-wunder-gray" />
              <h3 className="mt-2 text-sm font-medium text-wunder-dark">No projects</h3>
              <p className="mt-1 text-sm text-wunder-gray">
                {user.role === 'ADMIN' 
                  ? 'Get started by creating a new project.' 
                  : 'You have not been assigned to any projects yet.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Portfolio Dashboard */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="bg-wunder-light p-6 rounded-lg shadow border border-wunder-border">
              <div className="flex items-center">
                <div className="p-3 rounded-md bg-wunder-lime/20 text-wunder-olive">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-wunder-gray">Active Projects</p>
                  <p className="text-2xl font-semibold text-wunder-dark">{projects.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-wunder-light p-6 rounded-lg shadow border border-wunder-border">
              <div className="flex items-center">
                <div className="p-3 rounded-md bg-wunder-lime/20 text-wunder-olive">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-wunder-gray">Total Value</p>
                  <p className="text-2xl font-semibold text-wunder-dark">TBD</p>
                </div>
              </div>
            </div>
            <div className="bg-wunder-light p-6 rounded-lg shadow border border-wunder-border">
              <div className="flex items-center">
                <div className="p-3 rounded-md bg-wunder-lime/20 text-wunder-olive">
                  <UsersIcon className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-wunder-gray">Total Subcontractors</p>
                  <p className="text-2xl font-semibold text-wunder-dark">TBD</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-wunder-light shadow rounded-lg border border-wunder-border overflow-hidden p-6 relative">
            <div className="absolute top-6 right-6 bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-200">
              Under Construction
            </div>
            <h3 className="text-lg font-medium text-wunder-dark mb-4">Margin Tracker</h3>
            <div className="h-48 flex items-center justify-center bg-wunder-bg rounded-md border border-dashed border-wunder-border">
              <p className="text-wunder-gray text-sm">Margin tracking visualization will appear here.</p>
            </div>
          </div>

          <div className="bg-wunder-light shadow rounded-lg border border-wunder-border overflow-hidden p-6">
            <h3 className="text-lg font-medium text-wunder-dark mb-6">Portfolio Timeline</h3>
            {(() => {
              const { minDate, maxDate, timelineProjects } = getTimelineData();
              if (timelineProjects.length === 0) return <p className="text-sm text-wunder-gray">No schedule data available.</p>;
              
              const months = [];
              let current = new Date(minDate);
              while (current <= maxDate) {
                months.push(new Date(current));
                current.setMonth(current.getMonth() + 1);
              }

              return (
                <div className="relative overflow-x-auto pb-4">
                  <div className="min-w-[600px]">
                    {/* Timeline Header (Months) */}
                    <div className="flex border-b border-wunder-border pb-2 mb-4 ml-32">
                      {months.map((m, i) => (
                        <div key={i} className="flex-1 text-xs text-wunder-gray text-center border-l border-wunder-border first:border-l-0">
                          {m.toLocaleDateString('default', { month: 'short', year: '2-digit' })}
                        </div>
                      ))}
                    </div>
                    
                    {/* Timeline Rows */}
                    <div className="space-y-4 relative">
                      {/* Vertical grid lines */}
                      <div className="absolute inset-0 left-32 flex pointer-events-none">
                        {months.map((_, i) => (
                          <div key={i} className="flex-1 border-l border-wunder-border/30 first:border-l-0"></div>
                        ))}
                      </div>

                      {timelineProjects.map(p => (
                        <div key={p.id} className="relative h-10 flex items-center">
                          <Link to={`/projects/${p.id}`} className="w-32 flex-shrink-0 pr-4 truncate text-sm font-medium text-wunder-dark hover:text-wunder-olive z-10 bg-wunder-light transition-colors">
                            {p.name}
                          </Link>
                          <div className="flex-1 relative h-full bg-wunder-bg/50 rounded">
                            <Link 
                              to={`/projects/${p.id}`}
                              className="absolute h-6 top-2 bg-wunder-olive rounded shadow-sm flex items-center px-2 overflow-hidden group hover:bg-wunder-lime transition-colors cursor-pointer block"
                              style={{ left: `${p.left}%`, width: `${p.width}%` }}
                              title={`${p.name}: ${new Date(p.start_date).toLocaleDateString()} - ${new Date(p.end_date).toLocaleDateString()}`}
                            >
                              <span className="text-xs text-white group-hover:text-wunder-dark font-medium truncate">
                                {p.name}
                              </span>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          
          <div className="bg-wunder-light shadow rounded-lg border border-wunder-border overflow-hidden">
            <div className="px-6 py-5 border-b border-wunder-border">
              <h3 className="text-lg font-medium text-wunder-dark">Project Overview</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-wunder-border">
                <thead className="bg-wunder-bg">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-wunder-gray uppercase tracking-wider">Project Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-wunder-gray uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-wunder-gray uppercase tracking-wider">Next Milestone</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-wunder-gray uppercase tracking-wider">Created</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-wunder-gray uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-wunder-light divide-y divide-wunder-border">
                  {projects.map((project) => (
                    <tr 
                      key={project.id} 
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="hover:bg-wunder-bg/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-wunder-dark">{project.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-wunder-gray">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-wunder-gray">
                        {project.next_milestone_date ? new Date(project.next_milestone_date).toLocaleDateString() : 'None'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-wunder-gray">{new Date(project.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <span className="text-wunder-olive hover:text-wunder-dark">View</span>
                      </td>
                    </tr>
                  ))}
                  {projects.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-wunder-gray">No projects found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-10 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => setIsCreating(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <form onSubmit={handleCreateProject}>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-wunder-dark" id="modal-title">
                    Create New Project
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Project Name</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark"
                        value={newProject.name}
                        onChange={e => setNewProject({...newProject, name: e.target.value})}
                        placeholder="e.g., Downtown Highrise"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Description</label>
                      <textarea
                        rows={3}
                        className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark"
                        value={newProject.description}
                        onChange={e => setNewProject({...newProject, description: e.target.value})}
                        placeholder="Brief description of the project"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-wunder-gray">Start Date</label>
                        <input
                          type="date"
                          required
                          className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark"
                          value={newProject.start_date}
                          onChange={e => setNewProject({...newProject, start_date: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-wunder-gray">End Date</label>
                        <input
                          type="date"
                          required
                          className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark"
                          value={newProject.end_date}
                          onChange={e => setNewProject({...newProject, end_date: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-2">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-wunder-lime text-base font-medium text-wunder-dark hover:bg-wunder-yellow focus:outline-none sm:w-auto sm:text-sm transition-colors"
                  >
                    Create Project
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
