import { Status, BallInCourt } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function StatusBadge({ status }: { status: Status }) {
  const styles = {
    PENDING: 'bg-wunder-bg text-wunder-gray border border-wunder-border',
    SUBMITTED: 'bg-wunder-yellow text-wunder-dark border border-wunder-olive',
    REVISE_AND_RESUBMIT: 'bg-red-100 text-red-800 border border-red-200',
    APPROVED: 'bg-wunder-lime text-wunder-dark border border-wunder-olive',
  };

  const labels = {
    PENDING: 'Pending',
    SUBMITTED: 'Submitted',
    REVISE_AND_RESUBMIT: 'Revise & Resubmit',
    APPROVED: 'Approved',
  };

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', styles[status])}>
      {labels[status]}
    </span>
  );
}

export function BallInCourtBadge({ bic }: { bic: BallInCourt }) {
  const styles = {
    GC: 'bg-wunder-dark text-wunder-light',
    SUBCONTRACTOR: 'bg-wunder-gray text-wunder-light',
  };

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', styles[bic])}>
      {bic === 'GC' ? 'General Contractor' : 'Subcontractor'}
    </span>
  );
}
