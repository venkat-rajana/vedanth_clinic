import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Calendar } from '../components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Stethoscope, 
  Video, 
  Building2, 
  RefreshCw,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import { cn, formatTime } from '../lib/utils';
import { PresenceIndicator } from '../components/shared/PresenceIndicator';
import { format } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BookAppointment() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [appointmentType, setAppointmentType] = useState('in_person');
  const [duration, setDuration] = useState('30');
  const [notes, setNotes] = useState('');
  
  // Confirmation dialog
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const doctorsRes = await axios.get(`${API}/doctors`, { withCredentials: true });
        setDoctors(doctorsRes.data);
        
        // Staff can book for any patient
        if (user?.role === 'staff') {
          const patientsRes = await axios.get(`${API}/users?role=patient`, { withCredentials: true });
          setPatients(patientsRes.data);
        } else {
          // Patients book for themselves
          setSelectedPatient(user);
        }
      } catch (error) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDoctor, selectedDate]);

  const fetchAvailableSlots = async () => {
    if (!selectedDoctor) return;
    
    setSlotsLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await axios.get(
        `${API}/appointments/slots/${selectedDoctor.user_id}/${dateStr}`,
        { withCredentials: true }
      );
      setAvailableSlots(res.data);
      setSelectedSlot(null);
    } catch (error) {
      toast.error('Failed to load available slots');
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedDoctor || !selectedSlot || !selectedPatient) {
      toast.error('Please complete all required fields');
      return;
    }
    
    setSubmitting(true);
    try {
      const appointmentData = {
        patient_id: selectedPatient.user_id,
        doctor_id: selectedDoctor.user_id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: selectedSlot,
        duration: parseInt(duration),
        appointment_type: appointmentType,
        notes: notes || null
      };
      
      await axios.post(`${API}/appointments`, appointmentData, { withCredentials: true });
      
      toast.success('Appointment booked successfully!');
      setShowConfirm(false);
      
      // Reset form
      setSelectedSlot(null);
      setNotes('');
      fetchAvailableSlots();
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error('This slot was just taken. Please select another.');
        fetchAvailableSlots();
      } else {
        toast.error('Failed to book appointment');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const appointmentTypes = [
    { value: 'in_person', label: 'In-Person Visit', icon: Building2 },
    { value: 'video', label: 'Video Consultation', icon: Video },
    { value: 'follow_up', label: 'Follow-up', icon: RefreshCw },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="Book Appointment" />
        <div className="p-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header 
        title="Book Appointment" 
        subtitle="Schedule a visit with one of our doctors"
      />
      <div className="p-6" data-testid="book-appointment-page">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Step 1: Select Doctor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="w-6 h-6 rounded-full bg-teal-700 text-white flex items-center justify-center text-sm">1</span>
                Select Doctor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {doctors.map((doctor) => (
                <div
                  key={doctor.user_id}
                  onClick={() => setSelectedDoctor(doctor)}
                  className={cn(
                    'p-4 rounded-lg border cursor-pointer transition-all',
                    selectedDoctor?.user_id === doctor.user_id
                      ? 'border-teal-700 bg-teal-50'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                  data-testid={`doctor-card-${doctor.user_id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                      {doctor.picture ? (
                        <img src={doctor.picture} alt={doctor.name} className="w-full h-full object-cover" />
                      ) : (
                        <Stethoscope className="h-6 w-6 text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{doctor.name}</p>
                      <p className="text-sm text-slate-500">{doctor.specialization}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <PresenceIndicator presence={doctor.presence} size="sm" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Step 2: Select Date & Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="w-6 h-6 rounded-full bg-teal-700 text-white flex items-center justify-center text-sm">2</span>
                Select Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="rounded-md border"
                  data-testid="appointment-calendar"
                />
              </div>
              
              {/* Time Slots */}
              <div className="mt-4">
                <Label className="text-sm font-medium text-slate-700 mb-2 block">
                  Available Slots for {format(selectedDate, 'MMM dd, yyyy')}
                </Label>
                
                {!selectedDoctor ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Please select a doctor first
                  </p>
                ) : slotsLoading ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <Skeleton key={i} className="h-10" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto" data-testid="slot-picker-grid">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={selectedSlot === slot.time ? 'default' : 'outline'}
                        size="sm"
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot.time)}
                        className={cn(
                          'text-xs',
                          selectedSlot === slot.time && 'bg-teal-700 hover:bg-teal-800',
                          !slot.available && 'opacity-50 cursor-not-allowed'
                        )}
                        data-testid={`slot-${slot.time}`}
                      >
                        {formatTime(slot.time)}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Appointment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="w-6 h-6 rounded-full bg-teal-700 text-white flex items-center justify-center text-sm">3</span>
                Appointment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Patient Selection (Staff only) */}
              {user?.role === 'staff' && (
                <div>
                  <Label>Patient</Label>
                  <Select
                    value={selectedPatient?.user_id}
                    onValueChange={(value) => {
                      const patient = patients.find(p => p.user_id === value);
                      setSelectedPatient(patient);
                    }}
                  >
                    <SelectTrigger data-testid="patient-select">
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.user_id} value={patient.user_id}>
                          {patient.name} ({patient.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Appointment Type */}
              <div>
                <Label>Appointment Type</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {appointmentTypes.map((type) => (
                    <Button
                      key={type.value}
                      variant={appointmentType === type.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAppointmentType(type.value)}
                      className={cn(
                        'flex-col h-auto py-3',
                        appointmentType === type.value && 'bg-teal-700 hover:bg-teal-800'
                      )}
                      data-testid={`type-${type.value}`}
                    >
                      <type.icon className="h-5 w-5 mb-1" />
                      <span className="text-xs">{type.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <Label>Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger data-testid="duration-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Reason for visit, symptoms, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-2"
                  data-testid="appointment-notes"
                />
              </div>

              {/* Book Button */}
              <Button
                className="w-full bg-teal-700 hover:bg-teal-800"
                disabled={!selectedDoctor || !selectedSlot || !selectedPatient}
                onClick={() => setShowConfirm(true)}
                data-testid="confirm-booking-btn"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirm Booking
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Appointment</DialogTitle>
              <DialogDescription>
                Please review the appointment details before confirming.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Stethoscope className="h-5 w-5 text-teal-700" />
                <div>
                  <p className="font-medium">{selectedDoctor?.name}</p>
                  <p className="text-sm text-slate-500">{selectedDoctor?.specialization}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-teal-700" />
                <div>
                  <p className="font-medium">{selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                  <p className="text-sm text-slate-500">{selectedSlot && formatTime(selectedSlot)} ({duration} min)</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <User className="h-5 w-5 text-teal-700" />
                <div>
                  <p className="font-medium">{selectedPatient?.name}</p>
                  <p className="text-sm text-slate-500">{appointmentTypes.find(t => t.value === appointmentType)?.label}</p>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleBooking} 
                disabled={submitting}
                className="bg-teal-700 hover:bg-teal-800"
                data-testid="final-confirm-btn"
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm Booking
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
