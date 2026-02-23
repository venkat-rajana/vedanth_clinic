import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatTime = (timeString) => {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export const getStatusColor = (status) => {
  const colors = {
    scheduled: 'bg-slate-100 text-slate-700 border-slate-300',
    checked_in: 'bg-amber-50 text-amber-700 border-amber-300',
    in_progress: 'bg-teal-50 text-teal-700 border-teal-300',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    cancelled: 'bg-red-50 text-red-700 border-red-300',
    no_show: 'bg-slate-100 text-slate-500 border-slate-300'
  };
  return colors[status] || colors.scheduled;
};

export const getAppointmentTypeIcon = (type) => {
  const icons = {
    in_person: '🏥',
    video: '📹',
    follow_up: '🔄'
  };
  return icons[type] || icons.in_person;
};

export const getWeekDates = (date = new Date()) => {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday
  
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
};

export const generateTimeSlots = (startHour = 7, endHour = 20, interval = 30) => {
  const slots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};
