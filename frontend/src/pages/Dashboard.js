import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Receipt, 
  Stethoscope,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Video
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { formatDate, formatTime, getStatusColor } from '../lib/utils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, appointmentsRes] = await Promise.all([
          axios.get(`${API}/stats/dashboard`, { withCredentials: true }),
          axios.get(`${API}/appointments`, { withCredentials: true })
        ]);
        setStats(statsRes.data);
        setAppointments(appointmentsRes.data.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const renderRoleDashboard = () => {
    switch (user?.role) {
      case 'admin':
        return <AdminDashboard stats={stats} appointments={appointments} loading={loading} />;
      case 'doctor':
        return <DoctorDashboard stats={stats} appointments={appointments} loading={loading} user={user} />;
      case 'staff':
        return <StaffDashboard stats={stats} appointments={appointments} loading={loading} />;
      default:
        return <PatientDashboard stats={stats} appointments={appointments} loading={loading} user={user} />;
    }
  };

  return (
    <DashboardLayout>
      <Header
        title={`${getGreeting()}, ${user?.name?.split(' ')[0]}`}
        subtitle={new Date().toLocaleDateString('en-IN', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      />
      <div className="p-6" data-testid="dashboard-content">
        {renderRoleDashboard()}
      </div>
    </DashboardLayout>
  );
}

// Admin Dashboard
const AdminDashboard = ({ stats, appointments, loading }) => {
  const statCards = [
    { label: 'Total Patients', value: stats?.total_patients || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', link: '/users?role=patient' },
    { label: 'Total Doctors', value: stats?.total_doctors || 0, icon: Stethoscope, color: 'text-teal-600', bg: 'bg-teal-50', link: '/users?role=doctor' },
    { label: 'Today\'s Appointments', value: stats?.today_appointments || 0, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50', link: '/appointments' },
    { label: 'Pending Invoices', value: stats?.pending_invoices || 0, icon: Receipt, color: 'text-red-600', bg: 'bg-red-50', link: '/invoices?status=pending' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Link to={stat.link} key={index}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                {loading ? (
                  <Skeleton className="h-20 w-full" />
                ) : (
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-slate-900 tabular-nums">{stat.value}</p>
                      <p className="text-sm text-slate-500">{stat.label}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/users">
              <Button variant="outline" className="w-full justify-between" data-testid="manage-users-btn">
                Manage Users
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/appointments">
              <Button variant="outline" className="w-full justify-between" data-testid="view-appointments-btn">
                View All Appointments
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/invoices">
              <Button variant="outline" className="w-full justify-between" data-testid="manage-invoices-btn">
                Manage Invoices
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <AppointmentsList appointments={appointments} loading={loading} title="Recent Appointments" />
      </div>
    </div>
  );
};

// Doctor Dashboard
const DoctorDashboard = ({ stats, appointments, loading, user }) => {
  const todayAppointments = appointments.filter(
    apt => apt.date === new Date().toISOString().split('T')[0]
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 tabular-nums">
                  {loading ? <Skeleton className="h-8 w-16" /> : stats?.today_appointments || 0}
                </p>
                <p className="text-sm text-slate-500">Today's Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 tabular-nums">
                  {loading ? <Skeleton className="h-8 w-16" /> : stats?.total_patients || 0}
                </p>
                <p className="text-sm text-slate-500">My Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 tabular-nums">
                  {loading ? <Skeleton className="h-8 w-16" /> : stats?.total_appointments || 0}
                </p>
                <p className="text-sm text-slate-500">Total Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Today's Schedule</CardTitle>
          <Link to="/appointments">
            <Button variant="ghost" size="sm" className="text-teal-700">
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : todayAppointments.length > 0 ? (
            <div className="space-y-3">
              {todayAppointments.map(apt => (
                <AppointmentCard key={apt.appointment_id} appointment={apt} />
              ))}
            </div>
          ) : (
            <EmptyState message="No appointments scheduled for today" />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Staff Dashboard
const StaffDashboard = ({ stats, appointments, loading }) => {
  const todayAppointments = appointments.filter(
    apt => apt.date === new Date().toISOString().split('T')[0]
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 tabular-nums">
                  {loading ? <Skeleton className="h-8 w-16" /> : stats?.today_appointments || 0}
                </p>
                <p className="text-sm text-slate-500">Today's Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 tabular-nums">
                  {loading ? <Skeleton className="h-8 w-16" /> : stats?.pending_checkins || 0}
                </p>
                <p className="text-sm text-slate-500">Pending Check-ins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 tabular-nums">
                  {loading ? <Skeleton className="h-8 w-16" /> : stats?.pending_invoices || 0}
                </p>
                <p className="text-sm text-slate-500">Pending Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Today's Appointments */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/book-appointment">
              <Button className="w-full bg-teal-700 hover:bg-teal-800" data-testid="book-appointment-btn">
                <Calendar className="h-4 w-4 mr-2" />
                Book New Appointment
              </Button>
            </Link>
            <Link to="/appointments">
              <Button variant="outline" className="w-full justify-between" data-testid="todays-schedule-btn">
                Today's Schedule
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/invoices">
              <Button variant="outline" className="w-full justify-between" data-testid="billing-btn">
                Billing & Invoices
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <AppointmentsList appointments={todayAppointments} loading={loading} title="Pending Check-ins" />
      </div>
    </div>
  );
};

// Patient Dashboard
const PatientDashboard = ({ stats, appointments, loading, user }) => {
  const upcomingAppointments = appointments.filter(
    apt => apt.status === 'scheduled' && new Date(apt.date) >= new Date()
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-teal-700 to-teal-600 border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-white">
              <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
              <p className="text-teal-100">
                {upcomingAppointments.length > 0
                  ? `You have ${upcomingAppointments.length} upcoming appointment${upcomingAppointments.length > 1 ? 's' : ''}`
                  : 'Book your next appointment today'}
              </p>
            </div>
            <Link to="/book-appointment">
              <Button 
                className="bg-white text-teal-700 hover:bg-teal-50"
                data-testid="book-now-btn"
              >
                Book Now
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 tabular-nums">
                  {loading ? <Skeleton className="h-8 w-16" /> : stats?.upcoming_appointments || 0}
                </p>
                <p className="text-sm text-slate-500">Upcoming Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 tabular-nums">
                  {loading ? <Skeleton className="h-8 w-16" /> : stats?.total_appointments || 0}
                </p>
                <p className="text-sm text-slate-500">Total Visits</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
          <Link to="/appointments">
            <Button variant="ghost" size="sm" className="text-teal-700">
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : upcomingAppointments.length > 0 ? (
            <div className="space-y-3">
              {upcomingAppointments.slice(0, 3).map(apt => (
                <AppointmentCard key={apt.appointment_id} appointment={apt} showDoctor />
              ))}
            </div>
          ) : (
            <EmptyState message="No upcoming appointments" action="Book your first appointment" />
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/book-appointment">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 text-teal-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-900">Book Appointment</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/medical-records">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Stethoscope className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-900">Medical Records</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/invoices">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Receipt className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-900">My Invoices</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/settings">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-900">My Profile</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};

// Shared Components
const AppointmentCard = ({ appointment, showDoctor = false }) => {
  const statusConfig = getStatusColor(appointment.status);
  
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="text-center min-w-[60px]">
          <p className="text-lg font-bold text-slate-900">{formatTime(appointment.start_time)}</p>
          <p className="text-xs text-slate-500">{formatDate(appointment.date)}</p>
        </div>
        <div>
          <p className="font-medium text-slate-900">
            {showDoctor ? appointment.doctor_name : appointment.patient_name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusConfig}`}>
              {appointment.status.replace('_', ' ')}
            </span>
            {appointment.appointment_type === 'video' && (
              <span className="inline-flex items-center gap-1 text-xs text-teal-700">
                <Video className="h-3 w-3" /> Video
              </span>
            )}
          </div>
        </div>
      </div>
      <Link to={`/appointments/${appointment.appointment_id}`}>
        <Button variant="ghost" size="sm">
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
};

const AppointmentsList = ({ appointments, loading, title }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : appointments.length > 0 ? (
        <div className="space-y-3">
          {appointments.map(apt => (
            <AppointmentCard key={apt.appointment_id} appointment={apt} />
          ))}
        </div>
      ) : (
        <EmptyState message="No appointments to show" />
      )}
    </CardContent>
  </Card>
);

const EmptyState = ({ message, action }) => (
  <div className="text-center py-8">
    <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
    <p className="text-slate-500">{message}</p>
    {action && (
      <Link to="/book-appointment">
        <Button variant="link" className="text-teal-700 mt-2">{action}</Button>
      </Link>
    )}
  </div>
);
