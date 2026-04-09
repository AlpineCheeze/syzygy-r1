import React from 'react';
import { User } from '../types';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function Warranty({ user }: { user: User }) {
  const { projectId } = useParams<{projectId: string}>();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link to={`/projects/${projectId}`} className="text-wunder-gray hover:text-wunder-olive transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-2xl font-bold text-wunder-dark">Warranty</h2>
      </div>
      <div className="bg-wunder-light rounded-lg shadow p-8 text-center border border-wunder-border">
        <ShieldCheck className="mx-auto h-12 w-12 text-wunder-gray mb-4" />
        <h3 className="text-lg font-medium text-wunder-dark">Warranty Module</h3>
        <p className="text-wunder-gray mt-2">This module is currently under construction.</p>
      </div>
    </div>
  );
}
