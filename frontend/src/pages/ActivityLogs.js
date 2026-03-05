import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Search, 
  Filter, 
  RefreshCw,
  LogIn,
  LogOut,
  User,
  Activity,
  Calendar,
  Clock,
  Monitor,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Users,
  Stethoscope,
  UserCog,
  ShieldCheck
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const API = process.env.REACT_APP_BACKEND_URL || '';

const roleColors = {
  admin: 'bg-purple-100 text-purple-700',
  doctor: 'bg-blue-100 text-blue-700',
  staff: 'bg-amber-100 text-amber-700',
  patient: 'bg-green-100 text-green-700'
};

const roleIcons = {
  admin: ShieldCheck,
  doctor: Stethoscope,
  staff: UserCog,
  patient: User
};

const activityTypeColors = {
  login: 'bg-green-100 text-green-700',
  logout: 'bg-red-100 text-red-700',
  action: 'bg-blue-100 text-blue-700',
  page_view: 'bg-slate-100 text-slate-700'
};

const activityTypeIcons = {
  login: LogIn,
  logout: LogOut,
  action: Activity,
  page_view: Monitor
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit] = useState(20);
  
  // Filters
  const [roleFilter, setRoleFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', limit);
      params.append('skip', page * limit);
      
      if (roleFilter && roleFilter !== 'all') {
        params.append('role', roleFilter);
      }
      if (activityFilter && activityFilter !== 'all') {
        params.append('activity_type', activityFilter);
      }
      
      const response = await axios.get(`${API}/api/activity-logs?${params.toString()}`, {
        withCredentials: true
      });
      
      setLogs(response.data.logs);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, roleFilter, activityFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/api/activity-logs/stats`, {
        withCredentials: true
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString) => {
    try {
      return format(parseISO(dateString), 'h:mm:ss a');
    } catch {
      return dateString;
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.user_name?.toLowerCase().includes(query) ||
      log.user_email?.toLowerCase().includes(query) ||
      log.action?.toLowerCase().includes(query) ||
      log.description?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(total / limit);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Activity Logs</h1>
            <p className="text-slate-500">Monitor user activities and login history</p>
          </div>
          <Button onClick={() => { fetchLogs(); fetchStats(); }} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-teal-100 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-teal-700" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.today_count}</p>
                    <p className="text-sm text-slate-500">Today's Activities</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.active_users_today}</p>
                    <p className="text-sm text-slate-500">Active Users Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <LogIn className="h-6 w-6 text-green-700" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.by_type?.login || 0}</p>
                    <p className="text-sm text-slate-500">Total Logins</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-slate-700" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total_count}</p>
                    <p className="text-sm text-slate-500">Total Activities</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Role Stats */}
        {stats && stats.by_role && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity by Role</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.by_role).map(([role, data]) => {
                  const RoleIcon = roleIcons[role] || User;
                  return (
                    <div key={role} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${roleColors[role] || 'bg-slate-100'}`}>
                        <RoleIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold capitalize">{role}</p>
                        <p className="text-sm text-slate-500">{data.count} activities</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by name, email, or action..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={(value) => { setRoleFilter(value); setPage(0); }}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                </SelectContent>
              </Select>
              <Select value={activityFilter} onValueChange={(value) => { setActivityFilter(value); setPage(0); }}>
                <SelectTrigger className="w-[180px]">
                  <Activity className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Activity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activities</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="action">Action</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Activity History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No activity logs found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log) => {
                  const RoleIcon = roleIcons[log.user_role] || User;
                  const ActivityIcon = activityTypeIcons[log.activity_type] || Activity;
                  
                  return (
                    <div key={log.log_id} className="flex items-start gap-4 p-4 rounded-lg border hover:bg-slate-50 transition-colors">
                      {/* Activity Icon */}
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${activityTypeColors[log.activity_type] || 'bg-slate-100'}`}>
                        <ActivityIcon className="h-5 w-5" />
                      </div>
                      
                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900">{log.user_name || 'Unknown User'}</span>
                          <Badge variant="outline" className={roleColors[log.user_role]}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {log.user_role}
                          </Badge>
                          <Badge variant="outline" className={activityTypeColors[log.activity_type]}>
                            {log.activity_type}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-slate-600 mt-1">
                          {log.description || log.action || 'Activity recorded'}
                        </p>
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(log.timestamp)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(log.timestamp)}
                          </span>
                          {log.ip_address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {log.ip_address}
                            </span>
                          )}
                        </div>
                        
                        {log.user_agent && (
                          <p className="text-xs text-slate-400 mt-1 truncate">
                            <Monitor className="h-3 w-3 inline mr-1" />
                            {log.user_agent.substring(0, 80)}...
                          </p>
                        )}
                      </div>
                      
                      {/* Email */}
                      <div className="text-right hidden md:block">
                        <p className="text-sm text-slate-500">{log.user_email}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <p className="text-sm text-slate-500">
                  Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-slate-500">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
