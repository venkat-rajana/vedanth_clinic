import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
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
  UserPlus, 
  Users,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import { formatDate } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Patients() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // New patient form
  const [newPatient, setNewPatient] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await axios.get(`${API}/users?role=patient`, { withCredentials: true });
      setPatients(res.data);
    } catch (error) {
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatient = async () => {
    if (!newPatient.name || !newPatient.email) {
      toast.error('Name and email are required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newPatient.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setCreating(true);
    try {
      await axios.post(
        `${API}/users`,
        {
          ...newPatient,
          role: 'patient'
        },
        { withCredentials: true }
      );
      toast.success('Patient registered successfully');
      setShowAddDialog(false);
      setNewPatient({ name: '', email: '', phone: '', address: '' });
      fetchPatients();
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error('A patient with this email already exists');
      } else {
        toast.error('Failed to register patient');
      }
    } finally {
      setCreating(false);
    }
  };

  const filteredPatients = patients.filter(patient => 
    patient.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone?.includes(searchQuery)
  );

  const canAddPatients = currentUser?.role === 'staff' || currentUser?.role === 'admin';

  return (
    <DashboardLayout>
      <Header 
        title="Patients" 
        subtitle="Manage patient records"
        showBack={true}
        backPath="/dashboard"
      />
      <div className="p-6" data-testid="patients-page">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{patients.length}</p>
                <p className="text-xs text-slate-500">Total Patients</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {patients.filter(p => {
                    const created = new Date(p.created_at);
                    const today = new Date();
                    return created.toDateString() === today.toDateString();
                  }).length}
                </p>
                <p className="text-xs text-slate-500">New Today</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <User className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {patients.filter(p => p.is_active).length}
                </p>
                <p className="text-xs text-slate-500">Active Patients</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Add */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-patients"
                />
              </div>
              {canAddPatients && (
                <Button 
                  className="bg-teal-700 hover:bg-teal-800"
                  onClick={() => setShowAddDialog(true)}
                  data-testid="add-patient-btn"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Register New Patient
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Patients Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No patients found</p>
                {canAddPatients && (
                  <Button 
                    variant="link" 
                    className="text-teal-700 mt-2"
                    onClick={() => setShowAddDialog(true)}
                  >
                    Register your first patient
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow key={patient.user_id} data-testid={`patient-row-${patient.user_id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                            {patient.picture ? (
                              <img src={patient.picture} alt={patient.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-slate-600 font-medium">
                                {patient.name?.charAt(0)?.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{patient.name}</p>
                            <p className="text-sm text-slate-500">{patient.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {patient.phone ? (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Phone className="h-3 w-3" />
                            {patient.phone}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">No phone</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {patient.address ? (
                          <div className="flex items-center gap-1 text-sm text-slate-600 max-w-xs truncate">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {patient.address}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">No address</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {formatDate(patient.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/book-appointment?patient=${patient.user_id}`)}
                          data-testid={`book-for-${patient.user_id}`}
                        >
                          <Calendar className="h-4 w-4 mr-1" />
                          Book
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add Patient Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register New Patient</DialogTitle>
              <DialogDescription>
                Add a new patient to the clinic. They can later login with Google using this email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Full Name <span className="text-red-500">*</span></Label>
                <Input
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  placeholder="Enter patient's full name"
                  data-testid="patient-name-input"
                />
              </div>
              <div>
                <Label>Email Address <span className="text-red-500">*</span></Label>
                <Input
                  type="email"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                  placeholder="patient@email.com"
                  data-testid="patient-email-input"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Patient will use this email to login with Google
                </p>
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  data-testid="patient-phone-input"
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={newPatient.address}
                  onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                  placeholder="Full address"
                  data-testid="patient-address-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-teal-700 hover:bg-teal-800"
                onClick={handleAddPatient}
                disabled={creating}
                data-testid="confirm-add-patient"
              >
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Register Patient
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
