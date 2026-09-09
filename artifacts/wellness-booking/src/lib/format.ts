import type { BookingStatus, DeliveryMode, TherapistStatus } from '@workspace/api-client-react';

export function formatKes(value: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(value);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`));
}

export function formatLongDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`));
}

export function formatTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  const suffix = hour >= 12 ? 'pm' : 'am';
  const normalized = hour % 12 || 12;
  return `${normalized}:${String(minute).padStart(2, '0')}${suffix}`;
}

export function modeLabel(mode: DeliveryMode) {
  return mode === 'studio' ? 'At the studio' : mode === 'home' ? 'At home' : 'At your hotel';
}

export function statusLabel(status: BookingStatus) {
  return status.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
}

export function therapistStatusLabel(status: TherapistStatus) {
  return status === 'on_job' ? 'On a session' : status[0].toUpperCase() + status.slice(1);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}