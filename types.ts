
export enum ColorType {
  BLUE = 'blue',
  GREEN = 'green',
  PURPLE = 'purple',
  ORANGE = 'orange',
  RED = 'red'
}

export interface ScheduleItem {
  id: string;
  day: number; // 0 (Sun) to 6 (Sat)
  dayName: string;
  startTime: string; // "HH:mm"
  endTime: string;
  code: string;
  title: string;
  room: string;
  faculty: string;
  color: ColorType;
  credits: number; // Added for NUB Credit Hour System
}

export type StatusType = 'active' | 'upcoming' | 'free';

export interface CurrentStatus {
  type: StatusType;
  class?: ScheduleItem;
  minutesUntil?: number;
}

export interface AttendanceRecord {
  [key: string]: boolean; // key = "COURSECODE-YYYY-MM-DD"
}

export interface Assignment {
  id: string;
  title: string;
  courseCode: string;
  dueDate: string;
  type: 'Assignment' | 'Exam' | 'Project' | 'Quiz';
  status: 'pending' | 'completed';
}

export type AssessmentType = 'Continuous' | 'Mid-term' | 'Final';

export interface Grade {
  id: string;
  courseCode: string;
  title: string;
  score: number; // raw marks out of assessment max
  weight: number; // max marks for this assessment (30, 30, or 40)
  type: AssessmentType;
}

export interface TranscriptCourse {
  code: string;
  title: string;
  credits: number;
  grade: string;
  gp: number;
  tgp: number;
}

export interface StudyTipResponse {
  course: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string; // base64
  timestamp: Date;
}
