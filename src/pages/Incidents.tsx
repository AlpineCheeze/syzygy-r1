import React from 'react';
import { User } from '../types';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function Incidents({ user }: { user: User }) {
  const { projectId } = useParams<{projectId: string}>();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to={`/projects/${projectId}`} className="text-wunder-gray hover:text-wunder-olive transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-wunder-dark flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-wunder-olive" />
          Incident Tracking
        </h1>
      </div>

      <div className="bg-wunder-light shadow rounded-lg border border-wunder-border overflow-hidden p-12 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-wunder-gray mb-4" />
        <h3 className="text-lg font-medium text-wunder-dark mb-2">Incident Tracking Module</h3>
        <p className="text-wunder-gray max-w-md mx-auto">
          This module is currently under construction. Check back later for updates.
        </p>
      </div>
    </div>
  );
}
