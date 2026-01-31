
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Icons, SCHEDULE, COLOR_MAP, PAST_TRANSCRIPT } from './constants';
import { ScheduleItem, CurrentStatus, AttendanceRecord, ChatMessage, Assignment, Grade, AssessmentType, TranscriptCourse } from './types';
import ProgressCircle from './components/ProgressCircle';
import { getStudyTips, askStudyQuestion } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'academic' | 'progress' | 'ask'>('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });
  
  // Data State
  const [attendance, setAttendance] = useState<AttendanceRecord>(() => {
    const saved = localStorage.getItem('attendance');
    return saved ? JSON.parse(saved) : {};
  });
  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    const saved = localStorage.getItem('assignments');
    return saved ? JSON.parse(saved) : [];
  });
  const [grades, setGrades] = useState<Grade[]>(() => {
    const saved = localStorage.getItem('grades');
    return saved ? JSON.parse(saved) : [];
  });
  const [transcript] = useState<TranscriptCourse[]>(PAST_TRANSCRIPT);

  // UI State
  const [currentStatus, setCurrentStatus] = useState<CurrentStatus>({ type: 'free' });
  const [nextClass, setNextClass] = useState<ScheduleItem | null>(null);
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(new Date());
  const [notifications, setNotifications] = useState<{ id: number; message: string; type: 'success' | 'info' | 'error' }[]>([]);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [showAddGrade, setShowAddGrade] = useState(false);

  // Personalized State
  const [personalNote, setPersonalNote] = useState(() => localStorage.getItem('personalNote') || "You're doing amazing, Mithila! Keep shining! 💖");
  const [isEditingNote, setIsEditingNote] = useState(false);

  // Ask Me State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('chatHistory');
    if (!saved) return [];
    try {
      return JSON.parse(saved).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
    } catch {
      return [];
    }
  });
  const [currentQuery, setCurrentQuery] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence
  useEffect(() => { localStorage.setItem('assignments', JSON.stringify(assignments)); }, [assignments]);
  useEffect(() => { localStorage.setItem('grades', JSON.stringify(grades)); }, [grades]);
  useEffect(() => { localStorage.setItem('attendance', JSON.stringify(attendance)); }, [attendance]);
  useEffect(() => { localStorage.setItem('chatHistory', JSON.stringify(chatMessages)); }, [chatMessages]);

  // Attendance Calculations
  const getTotalAttendanceStats = () => {
    const values = Object.values(attendance);
    const present = values.filter(v => v === true).length;
    const absent = values.filter(v => v === false).length;
    return {
      total: values.length,
      present,
      absent
    };
  };

  const getCourseAttendanceDetails = (code: string) => {
    const records = Object.entries(attendance).filter(([key]) => key.startsWith(code));
    const total = records.length;
    const present = records.filter(([, v]) => v === true).length;
    const percentage = total === 0 ? 0 : Math.round((present / total) * 100);
    return { total, present, percentage };
  };

  const adjustAttendanceManual = (code: string, increment: boolean, isPresent: boolean) => {
    if (increment) {
      const key = `${code}-MANUAL-${Date.now()}`;
      setAttendance(prev => ({ ...prev, [key]: isPresent }));
      addNotification(`Added manual ${isPresent ? 'Present' : 'Absent'} for ${code}`, "success");
    } else {
      const entries = Object.entries(attendance)
        .filter(([key, val]) => key.startsWith(`${code}-MANUAL`) && val === isPresent)
        .sort((a, b) => b[0].localeCompare(a[0]));
      
      if (entries.length > 0) {
        const [keyToDelete] = entries[0];
        const newAtt = { ...attendance };
        delete newAtt[keyToDelete];
        setAttendance(newAtt);
        addNotification(`Removed manual entry for ${code}`, "info");
      }
    }
  };

  const getGPFromMarks = (marks: number): number => {
    if (marks >= 80) return 4.0;
    if (marks >= 75) return 3.75;
    if (marks >= 70) return 3.50;
    if (marks >= 65) return 3.25;
    if (marks >= 60) return 3.00;
    if (marks >= 55) return 2.75;
    if (marks >= 50) return 2.50;
    if (marks >= 45) return 2.25;
    if (marks >= 40) return 2.0;
    return 0.0;
  };

  const getLetterFromMarks = (marks: number): string => {
    if (marks >= 80) return 'A+';
    if (marks >= 75) return 'A';
    if (marks >= 70) return 'A-';
    if (marks >= 65) return 'B+';
    if (marks >= 60) return 'B';
    if (marks >= 55) return 'B-';
    if (marks >= 50) return 'C+';
    if (marks >= 45) return 'C';
    if (marks >= 40) return 'D';
    return 'F';
  };

  const calculateGPA = () => {
    const pastCredits = transcript.reduce((acc, c) => acc + c.credits, 0);
    const pastTGP = transcript.reduce((acc, c) => acc + c.tgp, 0);

    const currentCourseCodes = Array.from(new Set(SCHEDULE.map(s => s.code)));
    let currentTGP = 0;
    let currentCredits = 0;

    currentCourseCodes.forEach(code => {
      const courseGrades = grades.filter(g => g.courseCode === code);
      if (courseGrades.length > 0) {
        const courseInfo = SCHEDULE.find(s => s.code === code);
        const credits = courseInfo?.credits || 3;
        const totalMarks = courseGrades.reduce((acc, g) => acc + g.score, 0);
        const gp = getGPFromMarks(totalMarks);
        currentTGP += (gp * credits);
        currentCredits += credits;
      }
    });

    const totalTGP = pastTGP + currentTGP;
    const totalCredits = pastCredits + currentCredits;

    if (totalCredits === 0) return "3.750";
    return (totalTGP / totalCredits).toFixed(3);
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hour, minute] = timeStr.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning, Ishana! ☀️";
    if (hour < 18) return "Good afternoon, Ishana! ✨";
    return "Good evening, Ishana! 🌙";
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const findNextClassGlobal = (currentDay: number, timeVal: number): ScheduleItem | null => {
    for (let i = 0; i < 7; i++) {
      const checkDay = (currentDay + i) % 7;
      const classes = SCHEDULE.filter(c => c.day === checkDay).sort((a, b) => a.startTime.localeCompare(b.startTime));
      if (classes.length > 0) {
        if (i === 0) {
          const valid = classes.find(c => {
             const [sh, sm] = c.startTime.split(':').map(Number);
             return (sh * 60 + sm) > timeVal;
          });
          if (valid) return valid;
        } else {
          return classes[0];
        }
      }
    }
    return null;
  };

  const calculateStatus = useCallback(() => {
    const now = new Date();
    const day = now.getDay();
    const timeVal = now.getHours() * 60 + now.getMinutes();

    const active = SCHEDULE.find(item => {
      if (item.day !== day) return false;
      const [sh, sm] = item.startTime.split(':').map(Number);
      const [eh, em] = item.endTime.split(':').map(Number);
      return timeVal >= (sh * 60 + sm) && timeVal < (eh * 60 + em);
    });

    if (active) {
      setCurrentStatus({ type: 'active', class: active });
      const after = SCHEDULE.filter(i => i.day === day && (i.startTime.split(':').map(Number)[0] * 60 + i.startTime.split(':').map(Number)[1]) >= (active.endTime.split(':').map(Number)[0] * 60 + active.endTime.split(':').map(Number)[1]))
                           .sort((a, b) => a.startTime.localeCompare(b.startTime));
      setNextClass(after.length > 0 ? after[0] : findNextClassGlobal(day, timeVal));
      return;
    }

    const upcomingToday = SCHEDULE.filter(item => {
      if (item.day !== day) return false;
      const [sh, sm] = item.startTime.split(':').map(Number);
      return (sh * 60 + sm) > timeVal;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (upcomingToday.length > 0) {
      const next = upcomingToday[0];
      const [sh, sm] = next.startTime.split(':').map(Number);
      setCurrentStatus({ type: 'upcoming', class: next, minutesUntil: (sh * 60 + sm) - timeVal });
      setNextClass(upcomingToday[1] || findNextClassGlobal(day, timeVal));
      return;
    }

    setCurrentStatus({ type: 'free' });
    setNextClass(findNextClassGlobal(day, timeVal));
  }, []);

  useEffect(() => { calculateStatus(); }, [currentTime, calculateStatus]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const addNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  };

  const handleAttendance = (code: string, present: boolean, date: Date) => {
    const dateKey = date.toLocaleDateString('en-CA'); 
    const key = `${code}-${dateKey}`;
    setAttendance(prev => {
        const newAtt = { ...prev };
        if (newAtt[key] === present) {
            delete newAtt[key];
            addNotification(`Cleared attendance for ${code}`, "info");
        } else {
            newAtt[key] = present;
            addNotification(`Logged ${present ? 'Present' : 'Absent'} for ${code}`, present ? 'success' : 'info');
        }
        return newAtt;
    });
  };

  const getSkipMargin = (code: string) => {
    const details = getCourseAttendanceDetails(code);
    const present = details.present;
    const total = details.total;
    if (total === 0) return 0;
    let safeSkips = 0;
    while (((present) / (total + safeSkips + 1)) >= 0.8) {
      safeSkips++;
      if (safeSkips > 10) break;
    }
    return safeSkips;
  };

  const sendMessage = async () => {
    if (!currentQuery.trim() && !attachedImage) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: currentQuery, image: attachedImage || undefined, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]);
    setCurrentQuery('');
    setAttachedImage(null);
    setIsTyping(true);
    try {
      const responseText = await askStudyQuestion(userMsg.content, userMsg.image);
      const assistantMsg: ChatMessage = { id: (Date.now() + 10).toString(), role: 'assistant', content: responseText, timestamp: new Date() };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = { id: (Date.now() + 10).toString(), role: 'assistant', content: "Mithila, I hit a glitch. Try again! 💖", timestamp: new Date() };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally { setIsTyping(false); }
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  const globalAttendance = getTotalAttendanceStats();

  const getDateRange = () => {
      const range = [];
      for (let i = -7; i <= 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() + i);
          range.push(d);
      }
      return range;
  };

  const nextAssignment = assignments
    .filter(a => a.status === 'pending')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  return (
    <div className="min-h-screen bg-[#FFF5F7] dark:bg-[#1A0B0E] text-slate-900 dark:text-pink-50 pb-20 sm:pb-0 transition-colors duration-300">
      <div className="fixed top-4 right-4 z-[100] space-y-2">
        {notifications.map(n => (
          <div key={n.id} className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in-up border border-white/20 backdrop-blur-md ${n.type === 'success' ? 'bg-rose-500/90' : 'bg-pink-500/90'} text-white`}>
            <Icons.Heart className="w-5 h-5" />
            <span className="font-medium text-sm">{n.message}</span>
          </div>
        ))}
      </div>

      <header className="sticky top-0 z-50 bg-white/70 dark:bg-[#2D1217]/70 backdrop-blur-xl border-b border-rose-100 dark:border-rose-900/30">
        <div className="max-w-5xl mx-auto px-4 flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500 rounded-xl text-white shadow-lg shadow-rose-500/20"><Icons.Heart className="w-6 h-6" /></div>
            <div>
              <h1 className="text-lg font-bold text-rose-600 dark:text-rose-400">Mithila Hub 💖</h1>
              <p className="text-[10px] text-pink-400 font-mono uppercase tracking-widest">{currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
            </div>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">{darkMode ? <Icons.Sun className="w-5 h-5 text-amber-400" /> : <Icons.Moon className="w-5 h-5 text-rose-600" />}</button>
        </div>
        <nav className="max-w-5xl mx-auto px-4 flex gap-6 overflow-x-auto custom-scrollbar">
          {[
            { id: 'dashboard', label: 'Home', icon: Icons.Dashboard },
            { id: 'academic', label: 'Academic', icon: Icons.Calendar },
            { id: 'progress', label: 'Performance', icon: Icons.CheckCircle },
            { id: 'ask', label: 'Ask Me', icon: Icons.Message },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 py-3 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-rose-500 text-rose-600 dark:text-rose-400' : 'border-transparent text-slate-400 hover:text-rose-400'}`}>
              <tab.icon className="w-4 h-4" /><span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className={`max-w-5xl mx-auto px-4 py-8 ${activeTab === 'ask' ? 'h-[calc(100vh-130px)] flex flex-col' : ''}`}>
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex flex-col gap-2">
                  <h2 className="text-4xl font-extrabold text-rose-600 dark:text-rose-400">{getGreeting()}</h2>
                  <p className="text-slate-500 dark:text-pink-300/60 font-medium">Ready to rule BBA Section 3B today?</p>
                </div>
                <div className="bg-white dark:bg-[#2D1217] rounded-[2.5rem] p-8 border border-rose-100 dark:border-rose-900/30 shadow-2xl relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <span className="px-3 py-1 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-[10px] font-bold rounded-full">DAILY BRIEF</span>
                      <Icons.Sparkles className="w-5 h-5 text-rose-400 animate-pulse" />
                    </div>
                    <div className="space-y-6">
                      <div className="flex gap-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl h-fit"><Icons.Clock className="w-6 h-6 text-blue-500" /></div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Next Engagement</p>
                          <h3 className="text-xl font-bold">{currentStatus.class ? currentStatus.class.title : nextClass ? nextClass.title : 'No more classes today!'}</h3>
                          <p className="text-sm text-slate-500 dark:text-pink-200/50">{currentStatus.class ? `In Room ${currentStatus.class.room} Now` : nextClass ? `${formatTime(nextClass.startTime)} • Room ${nextClass.room}` : 'Time for self-care, Mithila.'}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl h-fit"><Icons.Clipboard className="w-6 h-6 text-amber-500" /></div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Next Deadline</p>
                          <h3 className="text-xl font-bold">{nextAssignment ? nextAssignment.title : 'All clear for now!'}</h3>
                          <p className="text-sm text-slate-500 dark:text-pink-200/50">{nextAssignment ? `Due on ${new Date(nextAssignment.dueDate).toLocaleDateString()}` : 'No urgent tasks pending.'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-6">
                <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
                  <Icons.Heart className="absolute -bottom-6 -right-6 w-32 h-32 opacity-20" />
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Icons.Shield className="w-5 h-5" /> Mithila's Vision</h3>
                  <p className="text-sm italic font-medium leading-relaxed mb-4">"{personalNote}"</p>
                  <button onClick={() => setIsEditingNote(true)} className="text-[10px] uppercase font-bold text-white/60 hover:text-white transition-colors">Update Vision</button>
                </div>
                <div className="bg-white dark:bg-[#2D1217] p-6 rounded-[2rem] border border-rose-50 dark:border-rose-900/20 shadow-sm">
                  <h3 className="text-sm font-bold text-rose-500 mb-4 uppercase tracking-widest">Current Standing</h3>
                  <div className="flex items-center gap-4">
                    <ProgressCircle percentage={parseFloat(calculateGPA()) * 25} size={70} colorClass="text-green-500" />
                    <div>
                      <p className="text-2xl font-black text-slate-800 dark:text-pink-50">{calculateGPA()}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Estimated CGPA (NUB)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'academic' && (
          <div className="space-y-12 animate-fade-in-up">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <div className="bg-white dark:bg-[#2D1217] border border-rose-100 dark:border-rose-900/20 rounded-[2rem] p-6 flex items-center gap-4 shadow-sm">
                 <div className="p-3 bg-rose-50 dark:bg-rose-900/40 rounded-2xl text-rose-500"><Icons.CheckCircle className="w-6 h-6" /></div>
                 <div>
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Present</p>
                   <p className="text-2xl font-black text-rose-600">{globalAttendance.present}</p>
                 </div>
               </div>
               <div className="bg-white dark:bg-[#2D1217] border border-rose-100 dark:border-rose-900/20 rounded-[2rem] p-6 flex items-center gap-4 shadow-sm">
                 <div className="p-3 bg-pink-50 dark:bg-pink-900/40 rounded-2xl text-pink-500"><Icons.Shield className="w-6 h-6 rotate-180" /></div>
                 <div>
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Absent</p>
                   <p className="text-2xl font-black text-pink-600">{globalAttendance.absent}</p>
                 </div>
               </div>
               <div className="bg-white dark:bg-[#2D1217] border border-rose-100 dark:border-rose-900/20 rounded-[2rem] p-6 flex items-center gap-4 shadow-sm">
                 <div className="p-3 bg-fuchsia-50 dark:bg-fuchsia-900/40 rounded-2xl text-fuchsia-500"><Icons.Dashboard className="w-6 h-6" /></div>
                 <div>
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Logged Count</p>
                   <p className="text-2xl font-black text-fuchsia-600">{globalAttendance.total}</p>
                 </div>
               </div>
            </div>

            <div className="bg-white dark:bg-[#2D1217] p-4 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/20 flex items-center gap-4 overflow-x-auto custom-scrollbar no-scrollbar">
                {getDateRange().map((date, idx) => {
                    const isSelected = date.toDateString() === selectedAttendanceDate.toDateString();
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                        <button 
                            key={idx} 
                            onClick={() => setSelectedAttendanceDate(date)}
                            className={`flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center transition-all ${isSelected ? 'bg-rose-500 text-white shadow-xl scale-105' : 'hover:bg-rose-50 dark:hover:bg-rose-900/10'}`}
                        >
                            <span className={`text-[10px] font-black uppercase mb-1 ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                            <span className="text-lg font-black">{date.getDate()}</span>
                            {isToday && !isSelected && <div className="w-1 h-1 bg-rose-500 rounded-full mt-1" />}
                        </button>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-rose-600">Daily Attendance</h2>
                  <div className="px-3 py-1 bg-rose-50 dark:bg-rose-900/40 rounded-full text-[10px] font-bold text-rose-400 uppercase tracking-widest">
                    {selectedAttendanceDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div className="space-y-4">
                  {SCHEDULE.filter(s => s.day === selectedAttendanceDate.getDay()).length === 0 ? (
                      <div className="bg-white/40 dark:bg-[#2D1217]/40 border-2 border-dashed border-rose-100 dark:border-rose-900/10 rounded-[2.5rem] p-12 text-center">
                          <Icons.Clock className="w-10 h-10 text-rose-200 mx-auto mb-4" />
                          <p className="text-sm font-bold text-rose-300 uppercase italic">No classes today</p>
                      </div>
                  ) : (
                    SCHEDULE.filter(s => s.day === selectedAttendanceDate.getDay()).sort((a,b) => a.startTime.localeCompare(b.startTime)).map(item => {
                        const dateKey = selectedAttendanceDate.toLocaleDateString('en-CA');
                        const attKey = `${item.code}-${dateKey}`;
                        const isPresent = attendance[attKey];
                        return (
                        <div key={item.id} className="bg-white dark:bg-[#2D1217] border border-rose-100 dark:border-rose-900/20 rounded-[2.5rem] p-6 flex items-center justify-between group hover:shadow-lg transition-all">
                            <div className="flex items-center gap-4">
                            <div className={`w-2 h-12 rounded-full ${COLOR_MAP[item.color].bg}`} />
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-pink-50">{item.title}</h4>
                                <p className="text-xs text-slate-400 font-medium">{formatTime(item.startTime)} • Room {item.room}</p>
                            </div>
                            </div>
                            <div className="flex items-center gap-3">
                            <button 
                                onClick={() => handleAttendance(item.code, true, selectedAttendanceDate)}
                                className={`p-3 rounded-2xl transition-all ${isPresent === true ? 'bg-green-500 text-white shadow-xl shadow-green-500/20' : 'bg-slate-50 dark:bg-rose-900/10 text-slate-300'}`}
                            >
                                <Icons.CheckCircle className="w-6 h-6" />
                            </button>
                            <button 
                                onClick={() => handleAttendance(item.code, false, selectedAttendanceDate)}
                                className={`p-3 rounded-2xl transition-all ${isPresent === false ? 'bg-red-500 text-white shadow-xl shadow-red-500/20' : 'bg-slate-50 dark:bg-rose-900/10 text-slate-300'}`}
                            >
                                <Icons.Shield className="w-6 h-6 rotate-180" />
                            </button>
                            </div>
                        </div>
                        );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-rose-600">Challenge Vault</h2>
                  <button onClick={() => setShowAddAssignment(true)} className="p-2 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/20 hover:scale-110 transition-transform"><Icons.Clipboard className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  {assignments.length === 0 ? (
                    <div className="bg-white/40 dark:bg-[#2D1217]/40 border-2 border-dashed border-rose-100 dark:border-rose-900/10 rounded-[2rem] p-12 text-center">
                      <Icons.Clipboard className="w-10 h-10 text-rose-200 mx-auto mb-4" />
                      <p className="text-sm font-bold text-rose-300 uppercase tracking-widest italic">No active goals</p>
                    </div>
                  ) : (
                    assignments.map(a => (
                      <div key={a.id} className="bg-white dark:bg-[#2D1217] border border-rose-100 dark:border-rose-900/20 rounded-3xl p-6 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <button onClick={() => setAssignments(prev => prev.map(item => item.id === a.id ? {...item, status: item.status === 'completed' ? 'pending' : 'completed'} : item))} className={`p-2 rounded-xl border-2 transition-all ${a.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'border-rose-100 dark:border-rose-900/20 text-transparent'}`}><Icons.CheckCircle className="w-4 h-4" /></button>
                          <div>
                            <h4 className={`font-bold ${a.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-pink-50'}`}>{a.title}</h4>
                            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tighter">{a.courseCode} • {new Date(a.dueDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button onClick={() => setAssignments(prev => prev.filter(item => item.id !== a.id))} className="text-rose-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Icons.Trash className="w-4 h-4" /></button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="space-y-12 animate-fade-in-up">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-rose-600">Attendance Counter</h2>
                <div className="px-3 py-1 bg-rose-50 dark:bg-rose-900/40 rounded-full text-[10px] font-bold text-rose-400 uppercase tracking-widest">Global Overview</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from(new Set(SCHEDULE.map(s => s.code))).map(code => {
                  const details = getCourseAttendanceDetails(code);
                  const skipSafe = getSkipMargin(code);
                  const isLow = details.percentage < 80;
                  return (
                    <div key={code} className={`bg-white dark:bg-[#2D1217] p-6 rounded-[2.5rem] border ${isLow ? 'border-red-200 dark:border-red-900/50 shadow-lg' : 'border-rose-50 dark:border-rose-900/20 shadow-sm'} relative overflow-hidden group`}>
                      <div className="relative z-10 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="w-12 h-12">
                            <ProgressCircle percentage={details.percentage} size={48} strokeWidth={4} colorClass={isLow ? 'text-red-500' : 'text-rose-500'} />
                          </div>
                          <div className="text-right">
                             <span className={`text-xs font-black block ${isLow ? 'text-red-500' : 'text-rose-400'}`}>{details.percentage}%</span>
                             <span className="text-[9px] font-bold text-slate-400 uppercase">Manual Tracking</span>
                          </div>
                        </div>
                        
                        <h4 className="font-bold text-lg text-slate-800 dark:text-pink-50">{code}</h4>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                           <div className="space-y-2">
                              <p className="text-[10px] font-black text-center text-green-500 uppercase tracking-widest">Present</p>
                              <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/10 rounded-xl p-1">
                                 <button onClick={() => adjustAttendanceManual(code, false, true)} className="p-1.5 hover:bg-green-100 rounded-lg text-green-600"><Icons.Clock className="w-3 h-3 rotate-45" /></button>
                                 <span className="text-sm font-black text-green-700">{details.present}</span>
                                 <button onClick={() => adjustAttendanceManual(code, true, true)} className="p-1.5 hover:bg-green-100 rounded-lg text-green-600"><Icons.CheckCircle className="w-3 h-3" /></button>
                              </div>
                           </div>
                           <div className="space-y-2">
                              <p className="text-[10px] font-black text-center text-red-500 uppercase tracking-widest">Absent</p>
                              <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/10 rounded-xl p-1">
                                 <button onClick={() => adjustAttendanceManual(code, false, false)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-600"><Icons.Clock className="w-3 h-3 rotate-45" /></button>
                                 <span className="text-sm font-black text-red-700">{details.total - details.present}</span>
                                 <button onClick={() => adjustAttendanceManual(code, true, false)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-600"><Icons.Shield className="w-3 h-3 rotate-180" /></button>
                              </div>
                           </div>
                        </div>

                        <div className={`mt-2 pt-4 border-t ${isLow ? 'border-red-50' : 'border-rose-50 dark:border-rose-900/10'} flex items-center gap-2`}>
                          <Icons.Shield className={`w-4 h-4 ${isLow ? 'text-red-400' : 'text-green-400'}`} />
                          <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                            {skipSafe > 0 ? `${skipSafe} Skips Safe` : 'CRITICAL STANDING'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-[#2D1217] rounded-[2.5rem] p-4 sm:p-10 border border-rose-100 dark:border-rose-900/30 shadow-sm overflow-hidden">
               <div className="flex justify-between items-center border-b border-rose-100 dark:border-rose-900/20 pb-6 mb-6">
                 <div>
                    <h3 className="text-2xl font-black text-rose-600">Transcript Copy</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NUB Student Portal Clone</p>
                 </div>
                 <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 px-4 py-2 rounded-xl">
                   <Icons.Shield className="w-5 h-5 text-rose-500" />
                   <span className="text-xs font-bold text-rose-600 uppercase tracking-widest">Verified Academic</span>
                 </div>
               </div>
               <div className="overflow-x-auto custom-scrollbar">
                 <table className="w-full text-left text-sm">
                   <thead>
                     <tr className="border-b border-rose-50 dark:border-rose-900/10 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       <th className="py-4 pr-4">#</th>
                       <th className="py-4 pr-4">Course Code</th>
                       <th className="py-4 pr-4">Course Title</th>
                       <th className="py-4 pr-4 text-center">Cr. Hour</th>
                       <th className="py-4 pr-4 text-center">Grade</th>
                       <th className="py-4 pr-4 text-center">GP</th>
                       <th className="py-4 text-center">TGP</th>
                     </tr>
                   </thead>
                   <tbody className="font-medium text-slate-700 dark:text-pink-50/80">
                     {transcript.map((item, idx) => (
                       <tr key={item.code} className="border-b border-rose-50 dark:border-rose-900/5 hover:bg-rose-50/30 dark:hover:bg-rose-900/5 transition-colors">
                         <td className="py-4 pr-4 opacity-40">{idx + 1}</td>
                         <td className="py-4 pr-4 font-bold text-rose-600/70">{item.code}</td>
                         <td className="py-4 pr-4 max-w-[200px] truncate">{item.title}</td>
                         <td className="py-4 pr-4 text-center">{item.credits.toFixed(1)}</td>
                         <td className="py-4 pr-4 text-center font-bold">{item.grade}</td>
                         <td className="py-4 pr-4 text-center">{item.gp.toFixed(2)}</td>
                         <td className="py-4 text-center">{item.tgp.toFixed(2)}</td>
                       </tr>
                     ))}
                   </tbody>
                   <tfoot className="bg-rose-50/30 dark:bg-rose-900/10">
                      <tr className="font-black text-rose-600">
                        <td colSpan={3} className="py-4 px-4 text-right uppercase tracking-widest text-[10px] opacity-60">Total Cumulative</td>
                        <td className="py-4 text-center">{transcript.reduce((acc, c) => acc + c.credits, 0).toFixed(1)}</td>
                        <td colSpan={2}></td>
                        <td className="py-4 text-center">{transcript.reduce((acc, c) => acc + c.tgp, 0).toFixed(2)}</td>
                      </tr>
                   </tfoot>
                 </table>
               </div>
               <div className="mt-8 p-8 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-[2.5rem] flex flex-col sm:flex-row justify-between items-center gap-6 shadow-2xl">
                 <div className="text-center sm:text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-1">Status</p>
                    <h4 className="text-2xl font-black">Credits Completed: {transcript.reduce((acc, c) => acc + c.credits, 0).toFixed(1)}</h4>
                 </div>
                 <div className="h-16 w-px bg-white/20 hidden sm:block" />
                 <div className="text-center sm:text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-1">Lifetime CGPA</p>
                    <h4 className="text-5xl font-black">{ (transcript.reduce((acc, c) => acc + c.tgp, 0) / (transcript.reduce((acc, c) => acc + c.credits, 0) || 1)).toFixed(3) }</h4>
                 </div>
               </div>
            </div>

            <div className="bg-white dark:bg-[#2D1217] rounded-[2.5rem] p-10 border border-rose-100 dark:border-rose-900/30">
              <div className="flex flex-col sm:flex-row justify-between gap-12">
                <div className="space-y-6 flex-grow">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 dark:text-pink-50">Current Semester Vault</h3>
                      <p className="text-xs text-slate-400 uppercase tracking-widest font-bold tracking-[0.3em]">Assessment Performance</p>
                    </div>
                    <button onClick={() => setShowAddGrade(true)} className="p-2 bg-pink-500 text-white rounded-xl shadow-lg hover:scale-110 transition-transform"><Icons.Calendar className="w-5 h-5" /></button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {grades.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">Start logging marks to track current semester performance.</p>
                    ) : (
                      Array.from(new Set(grades.map(g => g.courseCode))).map(code => {
                        const courseGrades = grades.filter(g => g.courseCode === code);
                        const totalMarks = courseGrades.reduce((acc, g) => acc + g.score, 0);
                        const letter = getLetterFromMarks(totalMarks);
                        const gp = getGPFromMarks(totalMarks);
                        return (
                          <div key={code} className="p-6 bg-[#FFF9FA] dark:bg-rose-900/10 rounded-3xl border border-rose-100 dark:border-rose-900/20">
                            <div className="flex justify-between items-start mb-4">
                              <div><h4 className="font-black text-lg text-rose-600">{code}</h4><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Score: {totalMarks}/100</p></div>
                              <div className="text-right"><span className="text-2xl font-black text-rose-500">{letter}</span><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">GP: {gp.toFixed(2)}</p></div>
                            </div>
                            <div className="space-y-2">
                               {courseGrades.map(g => (
                                 <div key={g.id} className="flex justify-between items-center text-xs py-1.5 border-t border-rose-50 dark:border-rose-900/10"><span className="font-medium text-slate-600 dark:text-pink-200/60">{g.type} ({g.title})</span><span className="font-bold">{g.score}/{g.weight}</span></div>
                               ))}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
                <div className="max-w-md w-full bg-rose-50 dark:bg-rose-900/10 p-10 rounded-[3rem] border border-rose-100 dark:border-rose-900/30 text-center">
                   <ProgressCircle percentage={parseFloat(calculateGPA()) * 25} size={140} strokeWidth={12} colorClass="text-rose-500" />
                   <h4 className="text-5xl font-black mt-6 text-rose-600">{calculateGPA()}</h4>
                   <p className="text-[10px] font-black uppercase text-rose-300 tracking-[0.4em] mt-4">Estimated Final CGPA</p>
                   <div className="mt-8 pt-8 border-t border-rose-100 dark:border-rose-900/20">
                     <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                       <span>Total Credits Tracked</span>
                       <span className="text-rose-500 font-black">{(transcript.reduce((acc, c) => acc + c.credits, 0) + Array.from(new Set(grades.map(g => g.courseCode))).reduce((acc, code) => {
                         const course = SCHEDULE.find(s => s.code === code);
                         return acc + (course ? course.credits : 3);
                       }, 0)).toFixed(1)}</span>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ask' && (
          <div className="flex-grow flex flex-col gap-4 animate-fade-in-up relative h-full max-h-full overflow-hidden">
            <div className="flex items-center justify-between border-b border-rose-100 dark:border-rose-900/30 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 dark:bg-pink-900/40 rounded-xl"><Icons.Sparkles className="w-5 h-5 text-pink-600" /></div>
                <div><h3 className="text-xl font-bold text-rose-600">Academic Concierge</h3><p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">24/7 S-Tier Support</p></div>
              </div>
              <button onClick={() => { if(window.confirm('Clear history?')) { setChatMessages([]); localStorage.removeItem('chatHistory'); }}} className="p-2 text-rose-200 hover:text-rose-500"><Icons.Trash className="w-5 h-5" /></button>
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar px-2 py-4 space-y-6">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-[2rem] flex items-center justify-center text-rose-500 mb-6 shadow-inner"><Icons.Heart className="w-10 h-10 fill-rose-500" /></div>
                  <h4 className="font-bold text-xl mb-2 text-rose-600">Ishana's Study Buddy</h4>
                  <p className="text-sm text-slate-400 max-w-sm italic">Analyze BBA concepts or solve Math problems. I'm here for you! ✨</p>
                </div>
              ) : (
                chatMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] sm:max-w-[70%] rounded-3xl px-5 py-3.5 shadow-sm border ${msg.role === 'user' ? 'bg-rose-500 text-white rounded-tr-none border-rose-400' : 'bg-white dark:bg-[#2D1217] border-rose-100 dark:border-rose-900/20 rounded-tl-none text-slate-700 dark:text-pink-50'}`}>
                      {msg.image && <img src={msg.image} alt="Ref" className="rounded-2xl mb-3 w-full object-cover max-h-72 border border-white/20" />}
                      <div className={`text-sm leading-relaxed ${msg.role === 'assistant' ? 'prose dark:prose-invert prose-sm' : ''}`}>{msg.content}</div>
                      <p className={`text-[10px] mt-2 font-bold opacity-40 uppercase tracking-tighter ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>{msg.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                    </div>
                  </div>
                ))
              )}
              {isTyping && <div className="flex justify-start"><div className="bg-white dark:bg-[#2D1217] border border-rose-100 dark:border-rose-900/20 rounded-2xl px-5 py-3 rounded-tl-none flex items-center gap-1.5 shadow-sm"><div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} /><div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} /></div></div>}
              <div ref={chatEndRef} />
            </div>
            <div className="pt-4 bg-[#FFF5F7] dark:bg-[#1A0B0E]">
              {attachedImage && <div className="flex items-center gap-3 mb-3 p-2 bg-white dark:bg-[#2D1217] rounded-2xl border border-rose-100 dark:border-rose-900/20 relative w-fit"><img src={attachedImage} className="w-14 h-14 rounded-xl object-cover" /><button onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1"><Icons.Clock className="w-3 h-3 rotate-45" /></button></div>}
              <div className="flex items-center gap-2 bg-white dark:bg-[#2D1217] p-2.5 rounded-3xl border border-rose-100 dark:border-rose-900/30 focus-within:ring-4 focus-within:ring-rose-500/10 shadow-sm transition-all">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileAttach} />
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-rose-300 hover:text-rose-500 transition-colors"><Icons.Paperclip className="w-5 h-5" /></button>
                <input type="text" value={currentQuery} onChange={(e) => setCurrentQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Ask anything, Mithila..." className="flex-grow bg-transparent border-none focus:ring-0 text-sm py-2 px-1 text-slate-700 dark:text-pink-50 placeholder:text-rose-200 outline-none" />
                <button onClick={sendMessage} disabled={isTyping || (!currentQuery.trim() && !attachedImage)} className={`p-3 rounded-2xl transition-all ${(currentQuery.trim() || attachedImage) && !isTyping ? 'bg-rose-500 text-white shadow-xl active:scale-95' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-200'}`}><Icons.Send className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        )}
      </main>

      {showAddAssignment && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#2D1217] w-full max-w-md rounded-[2.5rem] p-8 border border-rose-100 dark:border-rose-900/30 shadow-2xl space-y-6">
            <div className="flex justify-between items-center"><h3 className="text-2xl font-black text-rose-600">New Goal</h3><button onClick={() => setShowAddAssignment(false)} className="p-2 text-rose-200 hover:text-rose-500 transition-transform"><Icons.Clock className="w-6 h-6 rotate-45" /></button></div>
            <form onSubmit={(e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); const newAs: Assignment = { id: Date.now().toString(), title: formData.get('title') as string, courseCode: formData.get('course') as string, dueDate: formData.get('date') as string, type: 'Assignment', status: 'pending' }; setAssignments(prev => [...prev, newAs]); setShowAddAssignment(false); addNotification("Goal set. Go get it!", "success"); }} className="space-y-4"><input name="title" required placeholder="Task Title" className="w-full bg-rose-50/50 dark:bg-rose-900/20 border-none rounded-2xl p-4 text-sm dark:text-pink-50 outline-none" /><select name="course" className="w-full bg-rose-50/50 dark:bg-rose-900/20 border-none rounded-2xl p-4 text-sm dark:text-pink-50 outline-none">{Array.from(new Set(SCHEDULE.map(s => s.code))).map(c => <option key={c} value={c}>{c}</option>)}</select><input name="date" type="date" required className="w-full bg-rose-50/50 dark:bg-rose-900/20 border-none rounded-2xl p-4 text-sm dark:text-pink-50 outline-none" /><button type="submit" className="w-full bg-rose-500 text-white font-black py-4 rounded-2xl shadow-xl hover:scale-105 transition-transform">COMMIT</button></form>
          </div>
        </div>
      )}

      {showAddGrade && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#2D1217] w-full max-w-md rounded-[2.5rem] p-8 border border-rose-100 dark:border-rose-900/30 shadow-2xl space-y-6">
            <div className="flex justify-between items-center"><h3 className="text-2xl font-black text-rose-600">Performance Log</h3><button onClick={() => setShowAddGrade(false)} className="p-2 text-rose-200 hover:text-rose-500 transition-transform"><Icons.Clock className="w-6 h-6 rotate-45" /></button></div>
            <form onSubmit={(e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); const type = formData.get('type') as AssessmentType; const weight = type === 'Continuous' ? 30 : type === 'Mid-term' ? 30 : 40; const newGr: Grade = { id: Date.now().toString(), courseCode: formData.get('course') as string, title: formData.get('title') as string, score: Number(formData.get('score')), weight: weight, type: type }; setGrades(prev => [...prev, newGr]); setShowAddGrade(false); addNotification(`${type} assessment updated.`, "success"); }} className="space-y-4"><select name="course" className="w-full bg-rose-50/50 dark:bg-rose-900/20 border-none rounded-2xl p-4 text-sm dark:text-pink-50 outline-none">{Array.from(new Set(SCHEDULE.map(s => s.code))).map(c => <option key={c} value={c}>{c}</option>)}</select><select name="type" className="w-full bg-rose-50/50 dark:bg-rose-900/20 border-none rounded-2xl p-4 text-sm dark:text-pink-50 outline-none"><option value="Continuous">Continuous (Max 30)</option><option value="Mid-term">Mid-term (Max 30)</option><option value="Final">Final (Max 40)</option></select><input name="title" placeholder="Description (e.g. Quiz 1)" className="w-full bg-rose-50/50 dark:bg-rose-900/20 border-none rounded-2xl p-4 text-sm dark:text-pink-50 outline-none" /><input name="score" type="number" required placeholder="Marks Obtained" className="w-full bg-rose-50/50 dark:bg-rose-900/20 border-none rounded-2xl p-4 text-sm dark:text-pink-50 outline-none" /><button type="submit" className="w-full bg-pink-500 text-white font-black py-4 rounded-2xl shadow-xl hover:scale-105 transition-transform">SAVE PERFORMANCE</button></form>
          </div>
        </div>
      )}

      {isEditingNote && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#2D1217] w-full max-w-md rounded-[2.5rem] p-8 border border-rose-100 shadow-2xl space-y-6"><h3 className="text-2xl font-black text-rose-600">Daily Affirmation</h3><textarea value={personalNote} onChange={(e) => setPersonalNote(e.target.value)} rows={4} className="w-full bg-rose-50/50 dark:bg-rose-900/20 border-none rounded-2xl p-4 text-sm dark:text-pink-50 outline-none resize-none" /><button onClick={() => { setIsEditingNote(false); localStorage.setItem('personalNote', personalNote); }} className="w-full bg-rose-500 text-white font-black py-4 rounded-2xl shadow-xl hover:scale-105 transition-transform">SAVE AFFIRMATION</button></div>
        </div>
      )}

      <footer className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#2D1217]/80 backdrop-blur-xl border-t border-rose-100 dark:border-rose-900/20 px-6 py-4 flex justify-between items-center z-50">{[{ id: 'dashboard', icon: Icons.Dashboard }, { id: 'academic', icon: Icons.Calendar }, { id: 'progress', icon: Icons.CheckCircle }, { id: 'ask', icon: Icons.Message }].map(item => (<button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`p-3 rounded-2xl transition-all ${activeTab === item.id ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/30' : 'text-rose-200 hover:text-rose-400'}`}><item.icon className="w-6 h-6" /></button>))}</footer>

      <div className="hidden sm:block py-10 text-center border-t border-rose-100 dark:border-rose-900/20 mt-10"><p className="text-[10px] text-rose-300 font-bold tracking-[0.2em] uppercase mb-1">Mithila's S-Tier Space</p><p className="text-xs text-rose-400 flex items-center justify-center gap-1 font-medium italic">Handcrafted for Ishana <Icons.Heart className="w-3 h-3 fill-rose-400" /></p></div>
    </div>
  );
};

export default App;
