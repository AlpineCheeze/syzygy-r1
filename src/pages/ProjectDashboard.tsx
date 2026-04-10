import React, { useState, useEffect } from 'react';
import { User, Project, ToolPermissions } from '../types';
import { Link, useParams } from 'react-router-dom';
import { FileText, ClipboardCheck, Flag, ArrowLeft, Image as ImageIcon, PenTool, Users, Edit2, Check, X, ShieldCheck, MessageSquare, CalendarDays, Package, AlertTriangle, MessageCircle } from 'lucide-react';
import { hasPermission } from '../lib/permissions';

/**
 * ProjectDashboard Component
 * 
 * Serves as the central hub for a specific project.
 * Displays project details and provides navigation to various project-specific tools
 * such as Submittals, Inspections, Milestones, Photos, etc.
 */
export default function ProjectDashboard({ user }: { user: User }) {
  const { projectId } = useParams<{projectId: string}>();
  // State to hold the current project's data
  const [project, setProject] = useState<Project | null>(null);
  // State to manage the inline editing of the project's name
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  // Fetch project details when the component mounts or the projectId changes
  useEffect(() => {
    const fetchProject = async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        setEditName(data.name);
      }
    };
    if (projectId) fetchProject();
  }, [projectId]);

  /**
   * Saves the updated project name to the backend.
   */
  const handleSaveName = async () => {
    if (!editName.trim() || !project) return;
    
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() })
    });
    
    if (res.ok) {
      setProject({ ...project, name: editName.trim() });
      setIsEditingName(false);
    }
  };

  /**
   * Cancels the inline editing of the project name and resets the input field.
   */
  const handleCancelEdit = () => {
    if (project) setEditName(project.name);
    setIsEditingName(false);
  };

  // List of tools available for the project, rendered as a grid of cards
  const allTools = [
    {
      key: 'submittals' as keyof ToolPermissions,
      name: 'Submittals',
      description: 'Manage document submittals, reviews, and approvals.',
      icon: FileText,
      href: `/projects/${projectId}/submittals`,
      color: 'text-wunder-dark',
      bgColor: 'bg-wunder-lime'
    },
    {
      key: 'inspections' as keyof ToolPermissions,
      name: 'Inspections',
      description: 'Track construction observations and punch lists.',
      icon: ClipboardCheck,
      href: `/projects/${projectId}/inspections`,
      color: 'text-wunder-dark',
      bgColor: 'bg-wunder-lime'
    },
    {
      key: 'milestones' as keyof ToolPermissions,
      name: 'Milestones',
      description: 'Manage construction milestones and requirements.',
      icon: Flag,
      href: `/projects/${projectId}/milestones`,
      color: 'text-wunder-dark',
      bgColor: 'bg-wunder-lime'
    },
    {
      key: 'schedule' as keyof ToolPermissions,
      name: 'Schedule',
      description: 'Track project timeline, tasks, and dependencies.',
      icon: CalendarDays,
      href: `/projects/${projectId}/schedule`,
      color: 'text-wunder-dark',
      bgColor: 'bg-wunder-lime'
    },
    {
      key: 'procurement' as keyof ToolPermissions,
      name: 'Procurement',
      description: 'Track procurement status of equipment and materials.',
      icon: Package,
      href: `/projects/${projectId}/procurement`,
      color: 'text-wunder-dark',
      bgColor: 'bg-wunder-lime'
    },
    {
      key: 'photos' as keyof ToolPermissions,
      name: 'Photos',
      description: 'Upload and organize project photos into folders.',
      icon: ImageIcon,
      href: `/projects/${projectId}/photos`,
      color: 'text-wunder-dark',
      bgColor: 'bg-wunder-lime'
    },
    {
      key: 'drawings' as keyof ToolPermissions,
      name: 'Drawings',
      description: 'Manage and view project drawing sets.',
      icon: PenTool,
      href: `/projects/${projectId}/drawings`,
      color: 'text-wunder-dark',
      bgColor: 'bg-wunder-lime'
    },
    {
      key: 'directory' as keyof ToolPermissions,
      name: 'Directory',
      description: 'Manage project contacts, companies, and permissions.',
      icon: Users,
      href: `/projects/${projectId}/directory`,
      color: 'text-wunder-dark',
      bgColor: 'bg-wunder-lime'
    },
    {
      key: 'rfis' as keyof ToolPermissions,
      name: 'RFIs',
      description: 'Manage Requests for Information and track responses.',
      icon: MessageSquare,
      href: `/projects/${projectId}/rfis`,
      color: 'text-wunder-dark',
      bgColor: 'bg-wunder-lime'
    },
    {
      key: 'warranty' as keyof ToolPermissions,
      name: 'Warranty',
      description: 'Track warranty information and claims.',
      icon: ShieldCheck,
      href: `/projects/${projectId}/warranty`,
      color: 'text-wunder-dark',
      bgColor: 'bg-wunder-lime'
    },
    {
      key: 'incidents' as keyof ToolPermissions,
      name: 'Incident Tracking',
      description: 'Log and track safety incidents and reports.',
      icon: AlertTriangle,
      href: `/projects/${projectId}/incidents`,
      color: 'text-wunder-dark',
      bgColor: 'bg-wunder-lime'
    },
    {
      key: 'forum' as keyof ToolPermissions,
      name: 'Forum',
      description: 'Project message board for posts, replies, and important notes.',
      icon: MessageCircle,
      href: `/projects/${projectId}/forum`,
      color: 'text-wunder-dark',
      bgColor: 'bg-wunder-lime'
    }
  ];

  const tools = allTools.filter(tool => hasPermission(user, tool.key, 'VIEWER'));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link to="/" className="text-wunder-gray hover:text-wunder-olive transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {isEditingName ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-2xl font-bold text-wunder-dark border-b-2 border-wunder-lime focus:outline-none focus:border-wunder-yellow bg-transparent px-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') handleCancelEdit();
              }}
            />
            <button onClick={handleSaveName} className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded">
              <Check className="h-5 w-5" />
            </button>
            <button onClick={handleCancelEdit} className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded">
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            <h2 className="text-2xl font-bold text-wunder-dark">
              {project ? project.name : 'Loading Project...'}
            </h2>
            {user.role === 'ADMIN' && project && (
              <button 
                onClick={() => setIsEditingName(true)}
                className="p-1 text-wunder-gray hover:text-wunder-olive opacity-0 group-hover:opacity-100 transition-opacity rounded"
                title="Edit Project Name"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool.name}
            to={tool.href}
            className="bg-wunder-light overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200 border border-wunder-border group"
          >
            <div className="p-6">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${tool.bgColor}`}>
                  <tool.icon className={`h-6 w-6 ${tool.color}`} />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium text-wunder-dark group-hover:text-wunder-olive transition-colors">
                    {tool.name}
                  </h3>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-wunder-gray">
                  {tool.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
