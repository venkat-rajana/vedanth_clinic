import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { 
  Search, 
  Filter, 
  UserPlus, 
  Users,
  Stethoscope,
  UserCog,
  User,
  Mail,
  Phone,
  MoreVertical,
  Edit,
  Ban,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import axios from 'axios';
import { formatDate } from '../lib/utils';
import { PresenceIndicator } from '../components/shared/PresenceIndicator';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Create user form
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'staff',
    specialization: '',
    phone: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/users`, { withCredentials: true });
      setUsers(res.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email) {
      toast.error('Name and email are required');
      return;
    }

    setCreating(true);
    try {
      await axios.post(`${API}/users`, newUser, { withCredentials: true });
      toast.success('User created successfully');
      setShowCreateDialog(false);
      setNewUser({ name: '', email: '', role: 'staff', specialization: '', phone: '' });
      fetchUsers();
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error('Email already exists');
      } else {
        toast.error('Failed to create user');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (userId, currentActive) => {
    try {
      await axios.put(
        `${API}/users/${userId}`,
        { is_active: !currentActive },
        { withCredentials: true }
      );
      toast.success(`User ${currentActive ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <UserCog className="h-4 w-4" />;
      case 'doctor': return <Stethoscope className="h-4 w-4" />;
      case 'staff': return <Users className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadge = (role) => {
    const config = {
      admin: { label: 'Admin', className: 'bg-purple-100 text-purple-700' },
      doctor: { label: 'Doctor', className: 'bg-teal-100 text-teal-700' },
      staff: { label: 'Staff', className: 'bg-blue-100 text-blue-700' },
      patient: { label: 'Patient', className: 'bg-slate-100 text-slate-700' },
    };
    const { label, className } = config[role] || config.patient;
    return <span className={`px-2 py-1 rounded text-xs font-medium ${className}`}>{label}</span>;
  };

  return (
    <DashboardLayout>
      <Header 
        title="User Management" 
        subtitle="Manage clinic staff and patients"
        showBack={true}
        backPath="/dashboard"
      />
      <div className="p-6" data-testid="user-management-page">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <UserCog className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {users.filter(u => u.role === 'admin').length}
                </p>
                <p className="text-xs text-slate-500">Admins</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {users.filter(u => u.role === 'doctor').length}
                </p>
                <p className="text-xs text-slate-500">Doctors</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {users.filter(u => u.role === 'staff').length}
                </p>
                <p className="text-xs text-slate-500">Staff</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <User className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {users.filter(u => u.role === 'patient').length}
                </p>
                <p className="text-xs text-slate-500">Patients</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-users"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-48" data-testid="role-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="doctor">Doctors</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="patient">Patients</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                className="bg-teal-700 hover:bg-teal-800"
                onClick={() => setShowCreateDialog(true)}
                data-testid="add-user-btn"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No users found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.user_id} data-testid={`user-row-${user.user_id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                            {user.picture ? (
                              <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-slate-600 font-medium">
                                {user.name?.charAt(0)?.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{user.name}</p>
                            {user.specialization && (
                              <p className="text-sm text-slate-500">{user.specialization}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(user.role)}
                          {getRoleBadge(user.role)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1 text-sm text-slate-600">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.role === 'doctor' ? (
                          <PresenceIndicator presence={user.presence} size="sm" />
                        ) : (
                          <Badge variant={user.is_active ? 'success' : 'secondary'}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`user-actions-${user.user_id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.user_id !== currentUser?.user_id && (
                              <DropdownMenuItem 
                                onClick={() => handleToggleActive(user.user_id, user.is_active)}
                                className={user.is_active ? 'text-red-600' : 'text-emerald-600'}
                              >
                                {user.is_active ? (
                                  <>
                                    <Ban className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create User Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new staff member or doctor account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="John Doe"
                  data-testid="new-user-name"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="john@vedanth.com"
                  data-testid="new-user-email"
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select 
                  value={newUser.role} 
                  onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger data-testid="new-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newUser.role === 'doctor' && (
                <div>
                  <Label>Specialization</Label>
                  <Input
                    value={newUser.specialization}
                    onChange={(e) => setNewUser({ ...newUser, specialization: e.target.value })}
                    placeholder="Cardiologist"
                    data-testid="new-user-specialization"
                  />
                </div>
              )}
              <div>
                <Label>Phone (Optional)</Label>
                <Input
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  data-testid="new-user-phone"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-teal-700 hover:bg-teal-800"
                onClick={handleCreateUser}
                disabled={creating}
                data-testid="confirm-create-user"
              >
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
