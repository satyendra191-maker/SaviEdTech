'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users,
  Loader2,
  Filter,
  Mail,
  Calendar,
  Shield
} from 'lucide-react';

interface PendingUser {
  id: string;
  email: string;
  full_name: string | null;
  name: string | null;
  role: string;
  status: string;
  is_verified: boolean;
  created_at: string;
}

type FilterStatus = 'pending' | 'active' | 'blocked' | 'all';

export default function UserVerificationPanel() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUser = async (userId: string, approved: boolean) => {
    setProcessingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_verified: approved,
          status: approved ? 'active' : 'blocked',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user:', error);
        return;
      }

      setSuccessMessage(approved 
        ? 'User has been approved successfully!' 
        : 'User has been blocked!'
      );
      
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchUsers();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    pending: users.filter(u => u.status === 'pending').length,
    active: users.filter(u => u.status === 'active').length,
    blocked: users.filter(u => u.status === 'blocked').length,
  };

  const getStatusBadge = (status: string, isVerified: boolean) => {
    if (status === 'active' && isVerified) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle className="w-3 h-3" />
          Verified
        </span>
      );
    }
    if (status === 'blocked') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle className="w-3 h-3" />
          Blocked
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Verification</h1>
          <p className="text-slate-500 mt-1">Review and verify new user registrations</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Shield className="w-4 h-4" />
          Admin Only
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setFilter('pending')}
          className={`p-4 rounded-xl border-2 transition-all ${
            filter === 'pending' 
              ? 'border-orange-500 bg-orange-50' 
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Pending</p>
              <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </button>
        
        <button
          onClick={() => setFilter('active')}
          className={`p-4 rounded-xl border-2 transition-all ${
            filter === 'active' 
              ? 'border-green-500 bg-green-50' 
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Active</p>
              <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </button>
        
        <button
          onClick={() => setFilter('blocked')}
          className={`p-4 rounded-xl border-2 transition-all ${
            filter === 'blocked' 
              ? 'border-red-500 bg-red-50' 
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Blocked</p>
              <p className="text-2xl font-bold text-slate-900">{stats.blocked}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterStatus)}
              className="px-4 py-2 rounded-lg border border-slate-200 focus:border-primary-500 outline-none"
            >
              <option value="all">All Users</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">User</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Role</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Joined</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-slate-900">
                          {user.full_name || user.name || 'No name'}
                        </p>
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(user.status, user.is_verified)}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {user.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleVerifyUser(user.id, true)}
                              disabled={processingId === user.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              {processingId === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => handleVerifyUser(user.id, false)}
                              disabled={processingId === user.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              {processingId === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                              Block
                            </button>
                          </>
                        )}
                        {user.status === 'active' && (
                          <button
                            onClick={() => handleVerifyUser(user.id, false)}
                            disabled={processingId === user.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 disabled:opacity-50 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            Block
                          </button>
                        )}
                        {user.status === 'blocked' && (
                          <button
                            onClick={() => handleVerifyUser(user.id, true)}
                            disabled={processingId === user.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-sm font-medium hover:bg-green-200 disabled:opacity-50 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Unblock
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
