import React, { useState, useEffect } from 'react';
import { User, ProcurementItem } from '../types';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Package, Plus, Clock, Truck, CheckCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default function Procurement({ user }: { user: User }) {
  const { projectId } = useParams<{projectId: string}>();
  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newItem, setNewItem] = useState({ item_name: '', expected_delivery_date: '', assigned_company: '' });

  const fetchItems = async () => {
    const url = user.role === 'ADMIN' 
      ? `/api/projects/${projectId}/procurement`
      : `/api/projects/${projectId}/procurement?company_name=${encodeURIComponent(user.company_name)}`;
    const res = await fetch(url);
    if (res.ok) setItems(await res.json());
  };

  useEffect(() => {
    if (projectId) fetchItems();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/projects/${projectId}/procurement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    });

    if (res.ok) {
      setIsCreating(false);
      setNewItem({ item_name: '', expected_delivery_date: '', assigned_company: '' });
      fetchItems();
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    const res = await fetch(`/api/procurement/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) fetchItems();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-5 w-5 text-gray-400" />;
      case 'ORDERED': return <ArrowRight className="h-5 w-5 text-blue-500" />;
      case 'IN_TRANSIT': return <Truck className="h-5 w-5 text-amber-500" />;
      case 'DELIVERED': return <CheckCircle className="h-5 w-5 text-wunder-lime" />;
      case 'INSTALLED': return <CheckCircle className="h-5 w-5 text-green-600" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-gray-100 text-gray-800';
      case 'ORDERED': return 'bg-blue-100 text-blue-800';
      case 'IN_TRANSIT': return 'bg-amber-100 text-amber-800';
      case 'DELIVERED': return 'bg-lime-100 text-lime-800';
      case 'INSTALLED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/projects/${projectId}`} className="p-2 hover:bg-wunder-light rounded-full transition-colors">
          <ArrowLeft className="h-6 w-6 text-wunder-dark" />
        </Link>
        <h2 className="text-2xl font-bold text-wunder-dark flex items-center gap-2">
          <Package className="h-6 w-6 text-wunder-olive" />
          Procurement Tracking
        </h2>
      </div>
      <div className="flex justify-between items-center">
        <div></div>
        {user.role === 'ADMIN' && (
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-wunder-dark bg-wunder-lime hover:bg-wunder-yellow transition-colors"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Add Item
          </button>
        )}
      </div>

      <div className="bg-wunder-light shadow overflow-hidden sm:rounded-md border border-wunder-border">
        <ul className="divide-y divide-wunder-border">
          {items.map((item) => (
            <li key={item.id} className="p-4 sm:px-6 hover:bg-wunder-bg transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(item.status)}
                  <p className="text-sm font-medium text-wunder-dark truncate">
                    {item.item_name}
                  </p>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex gap-2">
                  {user.role === 'ADMIN' && (
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusUpdate(item.id, e.target.value)}
                      className="text-sm border-wunder-border rounded-md shadow-sm focus:ring-wunder-lime focus:border-wunder-lime"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="ORDERED">Ordered</option>
                      <option value="IN_TRANSIT">In Transit</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="INSTALLED">Installed</option>
                    </select>
                  )}
                  {user.role === 'SUBCONTRACTOR' && item.status === 'DELIVERED' && (
                    <button
                      onClick={() => handleStatusUpdate(item.id, 'INSTALLED')}
                      className="text-sm text-green-600 hover:text-green-900 font-medium transition-colors"
                    >
                      Mark Installed
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-2 sm:flex sm:justify-between">
                <div className="sm:flex">
                  <p className="flex items-center text-sm text-wunder-gray">
                    Expected Delivery: {item.expected_delivery_date ? format(new Date(item.expected_delivery_date), 'MMM d, yyyy') : 'TBD'}
                  </p>
                </div>
                <div className="mt-2 flex items-center text-sm text-wunder-gray sm:mt-0">
                  <p>
                    Assigned to: <span className="font-medium text-wunder-dark">{item.assigned_company}</span>
                  </p>
                </div>
              </div>
            </li>
          ))}
          {items.length === 0 && (
            <li className="p-8 text-center text-wunder-gray">
              No procurement items found.
            </li>
          )}
        </ul>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-wunder-dark/75 transition-opacity" onClick={() => setIsCreating(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-wunder-light rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <form onSubmit={handleCreate}>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-wunder-dark">New Procurement Item</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Item Name</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark"
                        value={newItem.item_name}
                        onChange={e => setNewItem({...newItem, item_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-wunder-gray">Expected Delivery Date</label>
                      <input
                        type="date"
                        className="mt-1 block w-full border border-wunder-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime sm:text-sm bg-wunder-light text-wunder-dark"
                        value={newItem.expected_delivery_date}
                        onChange={e => setNewItem({...newItem, expected_delivery_date: e.target.value})}
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
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-2">
                  <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-wunder-lime text-base font-medium text-wunder-dark hover:bg-wunder-yellow focus:outline-none sm:w-auto sm:text-sm transition-colors">
                    Add Item
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
    </div>
  );
}
