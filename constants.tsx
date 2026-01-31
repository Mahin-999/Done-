
import React from 'react';
import { ScheduleItem, ColorType, TranscriptCourse } from './types.ts';

export const SCHEDULE: ScheduleItem[] = [
  { id: '1', day: 0, dayName: 'Sunday', startTime: '11:00', endTime: '12:30', code: 'MKT 2127', title: 'Principles of Marketing', room: '006 (MB)', faculty: 'SKG 2', color: ColorType.BLUE, credits: 3 },
  { id: '2', day: 0, dayName: 'Sunday', startTime: '13:00', endTime: '14:30', code: 'GED 1117', title: 'History of Bangladesh', room: '217 (MB)', faculty: 'GED 2 DMA', color: ColorType.GREEN, credits: 3 },
  { id: '3', day: 0, dayName: 'Sunday', startTime: '16:00', endTime: '17:30', code: 'BIS 2122', title: 'Computer Applications', room: '501 (MB)', faculty: 'MZT 1', color: ColorType.PURPLE, credits: 3 },
  
  { id: '4', day: 1, dayName: 'Monday', startTime: '11:00', endTime: '12:30', code: 'MAT 1110', title: 'Basic Math', room: '501 (MB)', faculty: 'MSB 2', color: ColorType.ORANGE, credits: 3 },
  
  { id: '5', day: 2, dayName: 'Tuesday', startTime: '11:00', endTime: '12:30', code: 'MKT 2127', title: 'Principles of Marketing', room: '006 (MB)', faculty: 'SKG 2', color: ColorType.BLUE, credits: 3 },
  { id: '6', day: 2, dayName: 'Tuesday', startTime: '13:00', endTime: '14:30', code: 'GED 1117', title: 'History of Bangladesh', room: '217 (MB)', faculty: 'GED 2 DMA', color: ColorType.GREEN, credits: 3 },
  { id: '7', day: 2, dayName: 'Tuesday', startTime: '16:00', endTime: '17:30', code: 'BIS 2122', title: 'Computer Applications', room: '501 (MB)', faculty: 'MZT 1', color: ColorType.PURPLE, credits: 3 },
  
  { id: '8', day: 3, dayName: 'Wednesday', startTime: '11:00', endTime: '12:30', code: 'MAT 1110', title: 'Basic Math', room: '501 (MB)', faculty: 'MSB 2', color: ColorType.ORANGE, credits: 3 },
];

export const PAST_TRANSCRIPT: TranscriptCourse[] = [
  { code: 'ACT 2124', title: 'Financial Accounting-I', credits: 3.0, grade: 'A', gp: 3.75, tgp: 11.25 },
  { code: 'BBA 2121', title: 'Introduction to Business', credits: 3.0, grade: 'A+', gp: 4.0, tgp: 12.0 },
  { code: 'BUS 2123', title: 'Business Communication', credits: 3.0, grade: 'A', gp: 3.75, tgp: 11.25 },
  { code: 'ENG 1100', title: 'English Language-I : Sentence and their Elements', credits: 0.0, grade: 'B+', gp: 3.25, tgp: 0.0 },
  { code: 'ENG 1111', title: 'Business English I (Listening and Speaking)', credits: 3.0, grade: 'A-', gp: 3.5, tgp: 10.5 },
  { code: 'ENG 1113', title: 'Business English II (Reading and Writing)', credits: 3.0, grade: 'A-', gp: 3.5, tgp: 10.5 },
  { code: 'GED 1213', title: 'Health & Environment', credits: 3.0, grade: 'A', gp: 3.75, tgp: 11.25 },
  { code: 'MGT 2125', title: 'Principles of Management', credits: 3.0, grade: 'A+', gp: 4.0, tgp: 12.0 },
];

export const COLOR_MAP = {
  [ColorType.BLUE]: { bg: 'bg-rose-500', light: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-500', dark: 'dark:bg-rose-900/30' },
  [ColorType.GREEN]: { bg: 'bg-pink-500', light: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-500', dark: 'dark:bg-pink-900/30' },
  [ColorType.PURPLE]: { bg: 'bg-fuchsia-500', light: 'bg-fuchsia-100', text: 'text-fuchsia-600', border: 'border-fuchsia-500', dark: 'dark:bg-fuchsia-900/30' },
  [ColorType.ORANGE]: { bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-500', dark: 'dark:bg-orange-900/30' },
  [ColorType.RED]: { bg: 'bg-red-500', light: 'bg-red-100', text: 'text-red-600', border: 'border-red-500', dark: 'dark:bg-red-900/30' },
};

export const Icons = {
  Clock: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ),
  MapPin: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
  ),
  User: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  Sparkles: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
  ),
  Calendar: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
  ),
  CheckCircle: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  ),
  Dashboard: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
  ),
  Moon: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
  ),
  Sun: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
  ),
  Book: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
  ),
  Message: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  ),
  Paperclip: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
  ),
  Send: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="22" x2="11" y1="2" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>
  ),
  Trash: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
  ),
  Heart: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
  ),
  Shield: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  ),
  Clipboard: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
  )
};
