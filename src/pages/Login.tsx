import React, { useState } from 'react';
import { User } from '../types';
import { Orbit } from 'lucide-react';

export default function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      if (res.ok) {
        const user = await res.json();
        onLogin(user);
      } else {
        const data = await res.json();
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-wunder-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-wunder-light p-8 rounded-xl shadow-md border border-wunder-border">
        <div>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Orbit className="h-10 w-10 text-wunder-lime drop-shadow-[0_0_8px_rgba(226,249,156,0.6)]" />
            <h2 className="text-4xl font-black tracking-[0.3em] text-wunder-dark">
              SYZYGY
            </h2>
          </div>
          <p className="mt-2 text-center text-sm text-wunder-gray">
            Sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-wunder-border placeholder-wunder-gray text-wunder-dark focus:outline-none focus:ring-wunder-lime focus:border-wunder-lime focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-wunder-dark bg-wunder-lime hover:bg-wunder-yellow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wunder-lime disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          
          <div className="mt-4 text-xs text-wunder-gray text-center">
            <p>Demo accounts:</p>
            <p>admin@gc.com (Admin)</p>
            <p>sub1@electric.com (Subcontractor)</p>
          </div>
        </form>
      </div>
    </div>
  );
}
