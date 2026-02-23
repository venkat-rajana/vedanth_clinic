import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
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
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  Video, 
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  FileText,
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
import { Link, useNavigate } from 'react-router-dom';
import { formatDate, formatTime, getStatusColor, cn } from '../lib/utils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Appointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateData, setUpdateData] = useState({ diagnosis: '', prescription: '' });

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await axios.get(`${API}/appointments`, { withCredentials: true });
      setAppointments(res.data);
    } catch (error) {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (appointmentId, newStatus, version) => {
    setUpdating(true);
    try {
      await axios.put(
        `${API}/appointments/${appointmentId}`,
        { status: newStatus, version },
        { withCredentials: true }
      );
      toast.success(`Appointment ${newStatus.replace('_', ' ')}`);
      fetchAppointments();
      setShowUpdateDialog(false);
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error('Appointment was modified. Please refresh.');
        fetchAppointments();
      } else {
        toast.error('Failed to update appointment');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedAppointment) return;
    
    setUpdating(true);
    try {
      await axios.delete(`${API}/appointments/${selectedAppointment.appointment_id}`, { 
        withCredentials: true 
      });
      toast.success('Appointment cancelled');
      fetchAppointments();
      setShowCancelDialog(false);
      setSelectedAppointment(null);
    } catch (error) {
      toast.error('Failed to cancel appointment');
    } finally {
      setUpdating(false);
    }
  };

  const handleMedicalUpdate = async () => {
    if (!selectedAppointment) return;
    
    setUpdating(true);
    try {
      await axios.put(
        `${API}/appointments/${selectedAppointment.appointment_id}`,
        { 
          ...updateData, 
          status: 'completed',
          version: selectedAppointment.version 
        },
        { withCredentials: true }
      );
      toast.success('Appointment completed');
      fetchAppointments();
      setShowUpdateDialog(false);
      setSelectedAppointment(null);
      setUpdateData({ diagnosis: '', prescription: '' });
    } catch (error) {
      toast.error('Failed to update appointment');
    } finally {
      setUpdating(false);
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = 
      apt.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const config = {
      scheduled: { label: 'Scheduled', variant: 'secondary' },
      checked_in: { label: 'Checked In', variant: 'warning' },
      in_progress: { label: 'In Progress', variant: 'info' },
      completed: { label: 'Completed', variant: 'success' },
      cancelled: { label: 'Cancelled', variant: 'destructive' },
      no_show: { label: 'No Show', variant: 'outline' },
    };
    const { label, variant } = config[status] || config.scheduled;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const canUpdateStatus = (apt) => {
    if (user?.role === 'patient') return false;
    return !['completed', 'cancelled', 'no_show'].includes(apt.status);
  };

  const getNextStatus = (currentStatus) => {
    const flow = {
      scheduled: 'checked_in',
      checked_in: 'in_progress',
      in_progress: 'completed'
    };
    return flow[currentStatus];
  };

  return (
    <DashboardLayout>
      <Header 
        title="Appointments" 
        subtitle={user?.role === 'patient' ? 'View and manage your appointments' : 'Manage all appointments'}
        showBack={true}
        backPath="/dashboard"
      />
      <div className="p-6" data-testid="appointments-page">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by patient or doctor name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-appointments"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48" data-testid="status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="checked_in">Checked In</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              {user?.role !== 'doctor' && (
                <Link to="/book-appointment">
                  <Button className="bg-teal-700 hover:bg-teal-800" data-testid="new-appointment-btn">
                    <Calendar className="h-4 w-4 mr-2" />
                    New Appointment
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Appointments Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No appointments found</p>
                {user?.role !== 'doctor' && (
                  <Link to="/book-appointment">
                    <Button variant="link" className="text-teal-700 mt-2">
                      Book your first appointment
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    {user?.role !== 'patient' && <TableHead>Patient</TableHead>}
                    {user?.role !== 'doctor' && <TableHead>Doctor</TableHead>}
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((apt) => (
                    <TableRow key={apt.appointment_id} data-testid={`appointment-row-${apt.appointment_id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="font-medium">{formatDate(apt.date)}</p>
                            <p className="text-sm text-slate-500">{formatTime(apt.start_time)}</p>
                          </div>
                        </div>
                      </TableCell>
                      {user?.role !== 'patient' && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-slate-400" />
                            <span>{apt.patient_name}</span>
                          </div>
                        </TableCell>
                      )}
                      {user?.role !== 'doctor' && (
                        <TableCell>
                          <div>
                            <p className="font-medium">{apt.doctor_name}</p>
                            <p className="text-sm text-slate-500">{apt.doctor_specialization}</p>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        {apt.appointment_type === 'video' ? (
                          <span className="inline-flex items-center gap-1 text-teal-700">
                            <Video className="h-4 w-4" /> Video
                          </span>
                        ) : apt.appointment_type === 'follow_up' ? (
                          <span className="text-slate-600">Follow-up</span>
                        ) : (
                          <span className="text-slate-600">In-Person</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(apt.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`apt-actions-${apt.appointment_id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/appointments/${apt.appointment_id}`)}>
                              <FileText className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            
                            {apt.appointment_type === 'video' && apt.status === 'checked_in' && (
                              <DropdownMenuItem onClick={() => navigate(`/video-call/${apt.appointment_id}`)}>
                                <Video className="h-4 w-4 mr-2" />
                                Join Video Call
                              </DropdownMenuItem>
                            )}
                            
                            {canUpdateStatus(apt) && (
                              <>
                                <DropdownMenuSeparator />
                                {apt.status === 'scheduled' && (
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusUpdate(apt.appointment_id, 'checked_in', apt.version)}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-2 text-amber-600" />
                                    Check In
                                  </DropdownMenuItem>
                                )}
                                {apt.status === 'checked_in' && (
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusUpdate(apt.appointment_id, 'in_progress', apt.version)}
                                  >
                                    <Play className="h-4 w-4 mr-2 text-teal-600" />
                                    Start Session
                                  </DropdownMenuItem>
                                )}
                                {apt.status === 'in_progress' && user?.role === 'doctor' && (
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedAppointment(apt);
                                      setShowUpdateDialog(true);
                                    }}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />
                                    Complete & Add Notes
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                            
                            {['scheduled', 'checked_in'].includes(apt.status) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => {
                                    setSelectedAppointment(apt);
                                    setShowCancelDialog(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel Appointment
                                </DropdownMenuItem>
                              </>
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

        {/* Cancel Confirmation Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Appointment</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this appointment? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedAppointment && (
              <div className="py-4">
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <p><strong>Patient:</strong> {selectedAppointment.patient_name}</p>
                  <p><strong>Doctor:</strong> {selectedAppointment.doctor_name}</p>
                  <p><strong>Date:</strong> {formatDate(selectedAppointment.date)} at {formatTime(selectedAppointment.start_time)}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                Keep Appointment
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleCancel}
                disabled={updating}
                data-testid="confirm-cancel-btn"
              >
                {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cancel Appointment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Complete Appointment Dialog (Doctor only) */}
        <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Complete Appointment</DialogTitle>
              <DialogDescription>
                Add diagnosis and prescription notes before marking as complete.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Diagnosis
                </label>
                <Textarea
                  placeholder="Enter diagnosis..."
                  value={updateData.diagnosis}
                  onChange={(e) => setUpdateData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  rows={3}
                  data-testid="diagnosis-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Prescription
                </label>
                <Textarea
                  placeholder="Enter prescription..."
                  value={updateData.prescription}
                  onChange={(e) => setUpdateData(prev => ({ ...prev, prescription: e.target.value }))}
                  rows={3}
                  data-testid="prescription-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-teal-700 hover:bg-teal-800"
                onClick={handleMedicalUpdate}
                disabled={updating}
                data-testid="complete-appointment-btn"
              >
                {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Complete Appointment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
