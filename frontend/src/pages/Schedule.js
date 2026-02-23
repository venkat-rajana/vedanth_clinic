import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Header } from '../components/layout/Header';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  User,
  Phone,
  Mail,
  Clock,
  Video,
  Building2,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { cn, formatTime } from '../lib/utils';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Time slots from 7 AM to 8 PM
const TIME_SLOTS = [];
for (let hour = 7; hour < 20; hour++) {
  TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:00`);
  TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:30`);
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Schedule() {
  const { user } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 1 }); // Monday
  });
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentWeekStart, selectedDoctor]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appointmentsRes, doctorsRes] = await Promise.all([
        axios.get(`${API}/appointments`, { withCredentials: true }),
        axios.get(`${API}/doctors`, { withCredentials: true })
      ]);
      
      // Filter appointments for the current week
      const weekEnd = addDays(currentWeekStart, 6);
      const filteredAppointments = appointmentsRes.data.filter(apt => {
        const aptDate = new Date(apt.date);
        const inWeek = aptDate >= currentWeekStart && aptDate <= weekEnd;
        const matchesDoctor = selectedDoctor === 'all' || apt.doctor_id === selectedDoctor;
        return inWeek && matchesDoctor;
      });
      
      setAppointments(filteredAppointments);
      setDoctors(doctorsRes.data);
    } catch (error) {
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const getWeekDates = () => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const getAppointmentForSlot = (date, time) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.find(apt => 
      apt.date === dateStr && apt.start_time === time
    );
  };

  const getAppointmentStyle = (status) => {
    const styles = {
      scheduled: 'bg-blue-100 border-l-4 border-blue-500 hover:bg-blue-200',
      checked_in: 'bg-amber-100 border-l-4 border-amber-500 hover:bg-amber-200',
      in_progress: 'bg-teal-100 border-l-4 border-teal-500 hover:bg-teal-200',
      completed: 'bg-emerald-100 border-l-4 border-emerald-500 hover:bg-emerald-200',
      cancelled: 'bg-red-100 border-l-4 border-red-400 opacity-50',
      no_show: 'bg-slate-100 border-l-4 border-slate-400 opacity-50'
    };
    return styles[status] || styles.scheduled;
  };

  const handleAppointmentClick = async (appointment) => {
    try {
      const res = await axios.get(`${API}/appointments/${appointment.appointment_id}`, { 
        withCredentials: true 
      });
      setSelectedAppointment(res.data);
      setShowDetailDialog(true);
    } catch (error) {
      toast.error('Failed to load appointment details');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'video': return <Video className="h-3 w-3" />;
      case 'follow_up': return <RefreshCw className="h-3 w-3" />;
      default: return <Building2 className="h-3 w-3" />;
    }
  };

  const weekDates = getWeekDates();
  const today = new Date();

  return (
    <DashboardLayout>
      <Header 
        title="Schedule" 
        subtitle="Weekly appointment calendar"
        showBack={true}
        backPath="/dashboard"
      />
      <div className="p-6" data-testid="schedule-page">
        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={goToToday}>
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="ml-4 font-semibold text-slate-900">
                  {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
                </span>
              </div>
              
              {(user?.role === 'admin' || user?.role === 'staff') && (
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger className="w-[200px]" data-testid="doctor-filter">
                    <SelectValue placeholder="All Doctors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Doctors</SelectItem>
                    {doctors.map(doctor => (
                      <SelectItem key={doctor.user_id} value={doctor.user_id}>
                        {doctor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <Card>
          <CardContent className="p-0 overflow-auto">
            {loading ? (
              <div className="p-6">
                <Skeleton className="h-[600px] w-full" />
              </div>
            ) : (
              <div className="min-w-[800px]">
                {/* Header Row - Days */}
                <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50">
                  <div className="p-3 text-center text-sm font-medium text-slate-500 border-r border-slate-200">
                    Time
                  </div>
                  {weekDates.map((date, index) => (
                    <div 
                      key={index}
                      className={cn(
                        "p-3 text-center border-r border-slate-200 last:border-r-0",
                        isSameDay(date, today) && "bg-teal-50"
                      )}
                    >
                      <div className="text-sm font-medium text-slate-500">{DAYS[index]}</div>
                      <div className={cn(
                        "text-lg font-bold",
                        isSameDay(date, today) ? "text-teal-700" : "text-slate-900"
                      )}>
                        {format(date, 'd')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time Slots */}
                <div className="max-h-[600px] overflow-y-auto">
                  {TIME_SLOTS.map((time, timeIndex) => (
                    <div key={time} className="grid grid-cols-8 border-b border-slate-100 last:border-b-0">
                      {/* Time Label */}
                      <div className="p-2 text-xs text-slate-500 text-right pr-3 border-r border-slate-200 bg-slate-50">
                        {time.endsWith(':00') ? formatTime(time) : ''}
                      </div>
                      
                      {/* Day Columns */}
                      {weekDates.map((date, dayIndex) => {
                        const appointment = getAppointmentForSlot(date, time);
                        
                        return (
                          <div 
                            key={`${dayIndex}-${time}`}
                            className={cn(
                              "min-h-[40px] border-r border-slate-100 last:border-r-0 p-0.5",
                              isSameDay(date, today) && "bg-teal-50/30"
                            )}
                          >
                            {appointment && (
                              <button
                                onClick={() => handleAppointmentClick(appointment)}
                                className={cn(
                                  "w-full h-full rounded px-2 py-1 text-left transition-colors cursor-pointer",
                                  getAppointmentStyle(appointment.status)
                                )}
                                data-testid={`appointment-${appointment.appointment_id}`}
                              >
                                <div className="flex items-center gap-1">
                                  {getTypeIcon(appointment.appointment_type)}
                                  <span className="text-xs font-medium truncate">
                                    {appointment.patient_name}
                                  </span>
                                </div>
                                {user?.role !== 'doctor' && (
                                  <div className="text-xs text-slate-500 truncate">
                                    {appointment.doctor_name?.split(' ')[0]}
                                  </div>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border-l-4 border-blue-500 rounded"></div>
            <span className="text-slate-600">Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-100 border-l-4 border-amber-500 rounded"></div>
            <span className="text-slate-600">Checked In</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-teal-100 border-l-4 border-teal-500 rounded"></div>
            <span className="text-slate-600">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-emerald-100 border-l-4 border-emerald-500 rounded"></div>
            <span className="text-slate-600">Completed</span>
          </div>
        </div>

        {/* Appointment Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Appointment Details</DialogTitle>
            </DialogHeader>
            {selectedAppointment && (
              <div className="space-y-4">
                {/* Patient Info */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
                    Patient Information
                  </h3>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-teal-700" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{selectedAppointment.patient_name}</p>
                      <p className="text-sm text-slate-500">{selectedAppointment.patient_email}</p>
                    </div>
                  </div>
                  {selectedAppointment.patient_phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-4 w-4" />
                      {selectedAppointment.patient_phone}
                    </div>
                  )}
                </div>

                {/* Appointment Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="font-medium">{format(new Date(selectedAppointment.date), 'EEEE, MMMM d, yyyy')}</p>
                      <p className="text-sm text-slate-500">
                        {formatTime(selectedAppointment.start_time)} • {selectedAppointment.duration} min
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="font-medium">{selectedAppointment.doctor_name}</p>
                      <p className="text-sm text-slate-500">{selectedAppointment.doctor_specialization}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getTypeIcon(selectedAppointment.appointment_type)}
                    <span className="capitalize">{selectedAppointment.appointment_type?.replace('_', ' ')} Visit</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium",
                      selectedAppointment.status === 'scheduled' && "bg-blue-100 text-blue-700",
                      selectedAppointment.status === 'checked_in' && "bg-amber-100 text-amber-700",
                      selectedAppointment.status === 'in_progress' && "bg-teal-100 text-teal-700",
                      selectedAppointment.status === 'completed' && "bg-emerald-100 text-emerald-700",
                      selectedAppointment.status === 'cancelled' && "bg-red-100 text-red-700"
                    )}>
                      {selectedAppointment.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {selectedAppointment.notes && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-slate-500 mb-1">Notes</p>
                    <p className="text-sm text-slate-700">{selectedAppointment.notes}</p>
                  </div>
                )}

                {/* Diagnosis & Prescription */}
                {selectedAppointment.diagnosis && (
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-emerald-700 mb-1">Diagnosis</p>
                    <p className="text-sm text-slate-700">{selectedAppointment.diagnosis}</p>
                  </div>
                )}
                {selectedAppointment.prescription && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-blue-700 mb-1">Prescription</p>
                    <p className="text-sm text-slate-700">{selectedAppointment.prescription}</p>
                  </div>
                )}

                <Button 
                  className="w-full bg-teal-700 hover:bg-teal-800"
                  onClick={() => {
                    setShowDetailDialog(false);
                    window.location.href = `/appointments/${selectedAppointment.appointment_id}`;
                  }}
                >
                  View Full Details
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
