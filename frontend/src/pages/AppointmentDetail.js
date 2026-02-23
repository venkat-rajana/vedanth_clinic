import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  Video, 
  Phone,
  Mail,
  MapPin,
  FileText,
  Pill,
  Receipt,
  CheckCircle2,
  Play,
  XCircle,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import { formatDate, formatTime, getStatusColor } from '../lib/utils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  const fetchAppointment = async () => {
    try {
      const res = await axios.get(`${API}/appointments/${id}`, { withCredentials: true });
      setAppointment(res.data);
    } catch (error) {
      toast.error('Failed to load appointment');
      navigate('/appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      await axios.put(
        `${API}/appointments/${id}`,
        { status: newStatus, version: appointment.version },
        { withCredentials: true }
      );
      toast.success(`Appointment ${newStatus.replace('_', ' ')}`);
      fetchAppointment();
    } catch (error) {
      toast.error('Failed to update appointment');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      scheduled: { label: 'Scheduled', className: 'bg-slate-100 text-slate-700' },
      checked_in: { label: 'Checked In', className: 'bg-amber-100 text-amber-700' },
      in_progress: { label: 'In Progress', className: 'bg-teal-100 text-teal-700' },
      completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700' },
      cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
      no_show: { label: 'No Show', className: 'bg-slate-100 text-slate-500' },
    };
    const { label, className } = config[status] || config.scheduled;
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${className}`}>{label}</span>;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="Appointment Details" />
        <div className="p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!appointment) {
    return (
      <DashboardLayout>
        <Header title="Appointment Not Found" />
        <div className="p-6 text-center">
          <p className="text-slate-500">The appointment could not be found.</p>
          <Button onClick={() => navigate('/appointments')} className="mt-4">
            Back to Appointments
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const canUpdateStatus = user?.role !== 'patient' && !['completed', 'cancelled', 'no_show'].includes(appointment.status);

  return (
    <DashboardLayout>
      <Header 
        title="Appointment Details" 
        showBack={true}
        backPath="/appointments"
      />
      <div className="p-6" data-testid="appointment-detail-page">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Appointment Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Appointment #{appointment.appointment_id.slice(-8)}</CardTitle>
                  <p className="text-sm text-slate-500 mt-1">
                    Created {formatDate(appointment.created_at)}
                  </p>
                </div>
                {getStatusBadge(appointment.status)}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date & Time */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                  <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-teal-700" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">{formatDate(appointment.date)}</p>
                    <p className="text-slate-500">
                      {formatTime(appointment.start_time)} • {appointment.duration} minutes
                    </p>
                  </div>
                </div>

                {/* Type */}
                <div className="flex items-center gap-4">
                  {appointment.appointment_type === 'video' ? (
                    <>
                      <Video className="h-5 w-5 text-teal-700" />
                      <div>
                        <p className="font-medium">Video Consultation</p>
                        {appointment.status === 'checked_in' && (
                          <Button 
                            size="sm" 
                            className="mt-2 bg-teal-700 hover:bg-teal-800"
                            onClick={() => navigate(`/video-call/${appointment.appointment_id}`)}
                            data-testid="join-video-btn"
                          >
                            <Video className="h-4 w-4 mr-2" />
                            Join Video Call
                          </Button>
                        )}
                      </div>
                    </>
                  ) : appointment.appointment_type === 'follow_up' ? (
                    <>
                      <FileText className="h-5 w-5 text-slate-600" />
                      <span className="font-medium">Follow-up Visit</span>
                    </>
                  ) : (
                    <>
                      <Stethoscope className="h-5 w-5 text-slate-600" />
                      <span className="font-medium">In-Person Visit</span>
                    </>
                  )}
                </div>

                {/* Notes */}
                {appointment.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">
                        Pre-Visit Notes
                      </p>
                      <p className="text-slate-700">{appointment.notes}</p>
                    </div>
                  </>
                )}

                {/* Diagnosis & Prescription (if completed) */}
                {appointment.status === 'completed' && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      {appointment.diagnosis && (
                        <div>
                          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">
                            Diagnosis
                          </p>
                          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                            <p className="text-slate-700">{appointment.diagnosis}</p>
                          </div>
                        </div>
                      )}
                      {appointment.prescription && (
                        <div>
                          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">
                            <Pill className="h-4 w-4 inline mr-1" />
                            Prescription
                          </p>
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-slate-700">{appointment.prescription}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Actions Card */}
            {canUpdateStatus && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  {appointment.status === 'scheduled' && (
                    <Button 
                      onClick={() => handleStatusUpdate('checked_in')}
                      disabled={updating}
                      className="bg-amber-500 hover:bg-amber-600"
                      data-testid="checkin-btn"
                    >
                      {updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      Check In Patient
                    </Button>
                  )}
                  {appointment.status === 'checked_in' && (
                    <Button 
                      onClick={() => handleStatusUpdate('in_progress')}
                      disabled={updating}
                      className="bg-teal-700 hover:bg-teal-800"
                      data-testid="start-session-btn"
                    >
                      {updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                      Start Session
                    </Button>
                  )}
                  {appointment.status === 'in_progress' && user?.role === 'doctor' && (
                    <Button 
                      onClick={() => navigate(`/appointments/${id}/complete`)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                      data-testid="complete-btn"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Complete & Add Notes
                    </Button>
                  )}
                  {['scheduled', 'checked_in'].includes(appointment.status) && (
                    <Button 
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleStatusUpdate('cancelled')}
                      disabled={updating}
                      data-testid="cancel-apt-btn"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Appointment
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Doctor Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-slate-500 uppercase tracking-wider">Doctor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                    <Stethoscope className="h-6 w-6 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{appointment.doctor_name}</p>
                    <p className="text-sm text-slate-500">{appointment.doctor_specialization}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Patient Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-slate-500 uppercase tracking-wider">Patient</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                    <User className="h-6 w-6 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{appointment.patient_name}</p>
                  </div>
                </div>
                {appointment.patient_email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4" />
                    {appointment.patient_email}
                  </div>
                )}
                {appointment.patient_phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4" />
                    {appointment.patient_phone}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoice Link */}
            {appointment.invoice_id && (
              <Card>
                <CardContent className="p-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate(`/invoices/${appointment.invoice_id}`)}
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    View Invoice
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
