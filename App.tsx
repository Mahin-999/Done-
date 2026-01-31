
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Icons, SCHEDULE, COLOR_MAP, PAST_TRANSCRIPT } from './constants';
import { ScheduleItem, CurrentStatus, AttendanceRecord, ChatMessage, Assignment, Grade, AssessmentType, TranscriptCourse } from './types';
import ProgressCircle from './components/ProgressCircle';
import { askStudyQuestion } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'academic' | 'progress' | 'ask'>('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  
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

  // UI State
  const [currentStatus, setCurrentStatus] = useState<CurrentStatus>({ type: 'free' });
  const [nextClass, setNextClass] = useState<ScheduleItem | null>(null);
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(new Date());
  const [notifications, setNotifications] = useState<{ id: number; message: string; type: 'success' | 'info' | 'error' }[]>([]);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [showAddGrade, setShowAddGrade] = useState(false);
  const [personalNote, setPersonalNote] = useState(() => localStorage.getItem('personalNote') || "You're doing amazing, Mithila! Keep shining! 💖");
  const [isEditingNote, setIsEditingNote] = useState(false);

  // Ask Me State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('chatHistory');
    if (!saved) return [];
    try {
      return JSON.parse(saved).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
    } catch { return []; }
  });
  const [currentQuery, setCurrentQuery] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Class Progress Calculation
  const classProgress = useMemo(() => {
    if (currentStatus.type !== 'active' || !currentStatus.class) return 0;
    const [sh, sm] = currentStatus.class.startTime.split(':').map(Number);
    const [eh, em] = currentStatus.class.endTime.split(':').map(Number);
    const startTotal = sh * 60 + sm;
    const endTotal = eh * 60 + em;
    const currentTotal = currentTime.getHours() * 60 + currentTime.getMinutes();
    const duration = endTotal - startTotal;
    const elapsed = currentTotal - startTotal;
    return Math.min(100, Math.max(0, (elapsed / duration) * 100));
  }, [currentStatus, currentTime]);

  // Persistence
  useEffect(() => { localStorage.setItem('assignments', JSON.stringify(assignments)); }, [assignments]);
  useEffect(() => { localStorage.setItem('grades', JSON.stringify(grades)); }, [grades]);
  useEffect(() => { localStorage.setItem('attendance', JSON.stringify(attendance)); }, [attendance]);
  useEffect(() => { localStorage.setItem('chatHistory', JSON.stringify(chatMessages)); }, [chatMessages]);

  const addNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  };

  const calculateGPA = useCallback(() => {
    const pastCredits = PAST_TRANSCRIPT.reduce((acc, c) => acc + c.credits, 0);
    const pastTGP = PAST_TRANSCRIPT.reduce((acc, c) => acc + c.tgp, 0);
    const currentCourseCodes = Array.from(new Set(SCHEDULE.map(s => s.code)));
    let currentTGP = 0;
    let currentCredits = 0;

    currentCourseCodes.forEach(code => {
      const courseGrades = grades.filter(g => g.courseCode === code);
      if (courseGrades.length > 0) {
        const courseInfo = SCHEDULE.find(s => s.code === code);
        const credits = courseInfo?.credits || 3;
        const totalMarks = courseGrades.reduce((acc, g) => acc + g.score, 0);
        const gp = totalMarks >= 80 ? 4.0 : totalMarks >= 75 ? 3.75 : totalMarks >= 70 ? 3.5 : totalMarks >= 65 ? 3.25 : totalMarks >= 60 ? 3.0 : totalMarks >= 55 ? 2.75 : totalMarks >= 50 ? 2.5 : totalMarks >= 45 ? 2.25 : totalMarks >= 40 ? 2.0 : 0;
        currentTGP += (gp * credits);
        currentCredits += credits;
      }
    });

    const totalCredits = pastCredits + currentCredits;
    return totalCredits === 0 ? "3.750" : ((pastTGP + currentTGP) / totalCredits).toFixed(3);
  }, [grades]);

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
        } else { return classes[0]; }
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

    const upcomingToday = SCHEDULE.filter(item => item.day === day && (item.startTime.split(':').map(Number)[0] * 60 + item.startTime.split(':').map(Number)[1]) > timeVal)
                                  .sort((a, b) => a.startTime.localeCompare(b.startTime));

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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      calculateStatus();
    }, 10000); // Update every 10s
    calculateStatus();
    return () => clearInterval(timer);
  }, [calculateStatus]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

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
      setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Mithila, I hit a glitch. Try again! 💖", timestamp: new Date() }]);
    } finally { setIsTyping(false); }
  };

  const getCourseAttendanceDetails = (code: string) => {
    const records = Object.entries(attendance).filter(([key]) => key.startsWith(code));
    const total = records.length;
    const present = records.filter(([, v]) => v === true).length;
    const percentage = total === 0 ? 0 : Math.round((present / total) * 100);
    return { total, present, percentage };
  };

  return (
    <div className="min-h-screen bg-[#FFF5F7] dark:bg-[#1A0B0E] text-slate-900 dark:text-pink-50 pb-20 sm:pb-0 transition-colors duration-300 font-sans">
      <div className="fixed top-4 right-4 z-[100] space-y-2">
        {notifications.map(n => (
          <div key={n.id} className={`px-6 py-4 rounded-[1.5rem] shadow-2xl flex items-center gap-3 animate-fade-in-up border border-white/20 backdrop-blur-xl ${n.type === 'success' ? 'bg-rose-500/90' : 'bg-pink-500/90'} text-white`}>
            <Icons.Heart className="w-5 h-5 fill-white/20" />
            <span className="font-bold text-sm">{n.message}</span>
          </div>
        ))}
      </div>

      <header className="sticky top-0 z-50 bg-white/60 dark:bg-[#2D1217]/60 backdrop-blur-2xl border-b border-rose-100 dark:border-rose-900/20">
        <div className="max-w-5xl mx-auto px-6 flex justify-between items-center h-20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-rose-400 to-rose-600 rounded-2xl text-white shadow-xl shadow-rose-500/30"><Icons.Heart className="w-6 h-6" /></div>
            <div>
              <h1 className="text-xl font-black text-rose-600 dark:text-rose-400 tracking-tight">Mithila Hub <span className="text-pink-300">V2</span></h1>
              <p className="text-[10px] text-pink-400 font-black uppercase tracking-[0.2em]">BBA Student Excellence</p>
            </div>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="p-3 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all border border-transparent hover:border-rose-100">{darkMode ? <Icons.Sun className="w-5 h-5 text-amber-400" /> : <Icons.Moon className="w-5 h-5 text-rose-600" />}</button>
        </div>
        <nav className="max-w-5xl mx-auto px-6 flex gap-8 overflow-x-auto no-scrollbar">
          {[
            { id: 'dashboard', label: 'Overview', icon: Icons.Dashboard },
            { id: 'academic', label: 'Schedule', icon: Icons.Calendar },
            { id: 'progress', label: 'Analytics', icon: Icons.CheckCircle },
            { id: 'ask', label: 'Concierge', icon: Icons.Message },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 py-4 border-b-4 font-bold text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-rose-500 text-rose-600 dark:text-rose-400' : 'border-transparent text-slate-400 hover:text-rose-400'}`}>
              <tab.icon className="w-4 h-4" /><span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className={`max-w-5xl mx-auto px-6 py-10 ${activeTab === 'ask' ? 'h-[calc(100vh-160px)] flex flex-col' : ''}`}>
        {activeTab === 'dashboard' && (
          <div className="space-y-10 animate-fade-in-up">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="space-y-2">
                  <h2 className="text-5xl font-black text-rose-600 dark:text-rose-400 leading-tight">
                    {currentTime.getHours() < 12 ? "Good morning, Ishana! ☀️" : currentTime.getHours() < 18 ? "Good afternoon, Ishana! ✨" : "Good evening, Ishana! 🌙"}
                  </h2>
                  <p className="text-slate-500 dark:text-pink-300/60 font-bold text-lg">Your academic empire is growing today.</p>
                </div>
                
                <div className="bg-white dark:bg-[#2D1217] rounded-[3rem] p-10 border border-rose-100 dark:border-rose-900/20 shadow-2xl shadow-rose-500/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Icons.Sparkles className="w-32 h-32 text-rose-500" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                      <span className="px-4 py-2 bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 text-[10px] font-black rounded-full uppercase tracking-widest">Active Pulse</span>
                      <div className="flex items-center gap-2 text-rose-400 font-mono text-xs">
                         <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                         LIVE TRACKING
                      </div>
                    </div>
                    
                    <div className="space-y-10">
                      <div className="flex gap-6 items-start">
                        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-[1.5rem]"><Icons.Clock className="w-8 h-8 text-rose-500" /></div>
                        <div className="flex-grow">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status: {currentStatus.type.toUpperCase()}</p>
                          <h3 className="text-2xl font-black text-slate-800 dark:text-pink-50">{currentStatus.class ? currentStatus.class.title : nextClass ? nextClass.title : 'All Duties Fulfilled'}</h3>
                          <p className="text-sm text-slate-500 dark:text-pink-200/50 mt-1">{currentStatus.class ? `Room ${currentStatus.class.room}` : nextClass ? `Next at ${nextClass.startTime}` : 'Time for strategic rest.'}</p>
                          
                          {currentStatus.type === 'active' && (
                            <div className="mt-6 space-y-2">
                              <div className="flex justify-between text-[10px] font-black text-rose-400">
                                <span>CLASS PROGRESS</span>
                                <span>{Math.round(classProgress)}%</span>
                              </div>
                              <div className="w-full bg-rose-50 dark:bg-rose-900/20 h-2 rounded-full overflow-hidden">
                                <div className="bg-rose-500 h-full transition-all duration-1000" style={{ width: `${classProgress}%` }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-8">
                <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                  <Icons.Heart className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-black mb-6 flex items-center gap-3"><Icons.Shield className="w-6 h-6" /> Vision Statement</h3>
                  <p className="text-lg italic font-medium leading-relaxed mb-6 opacity-90">"{personalNote}"</p>
                  <button onClick={() => setIsEditingNote(true)} className="px-4 py-2 bg-white/20 rounded-xl text-[10px] uppercase font-black hover:bg-white/30 transition-colors">Refine Vision</button>
                </div>
                
                <div className="bg-white dark:bg-[#2D1217] p-8 rounded-[2.5rem] border border-rose-50 dark:border-rose-900/20 shadow-sm flex items-center gap-6">
                  <ProgressCircle percentage={parseFloat(calculateGPA()) * 25} size={80} strokeWidth={8} colorClass="text-green-500" />
                  <div>
                    <p className="text-3xl font-black text-slate-800 dark:text-pink-50">{calculateGPA()}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Current CGPA</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'academic' && (
          <div className="space-y-10 animate-fade-in-up">
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-4">
              {[-3, -2, -1, 0, 1, 2, 3].map(offset => {
                const date = new Date();
                date.setDate(date.getDate() + offset);
                const isSelected = date.toDateString() === selectedAttendanceDate.toDateString();
                return (
                  <button 
                    key={offset} 
                    onClick={() => setSelectedAttendanceDate(date)}
                    className={`flex-shrink-0 w-20 h-24 rounded-[1.5rem] flex flex-col items-center justify-center transition-all ${isSelected ? 'bg-rose-500 text-white shadow-2xl scale-110' : 'bg-white dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20'}`}
                  >
                    <span className={`text-[10px] font-black uppercase mb-1 ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="text-xl font-black">{date.getDate()}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
               <div className="space-y-8">
                  <h2 className="text-2xl font-black text-rose-600 flex items-center gap-3"><Icons.Calendar className="w-6 h-6" /> Today's Sessions</h2>
                  <div className="space-y-4">
                    {SCHEDULE.filter(s => s.day === selectedAttendanceDate.getDay()).length === 0 ? (
                      <div className="p-10 border-2 border-dashed border-rose-100 dark:border-rose-900/20 rounded-[2.5rem] text-center text-slate-400 font-bold italic">No classes scheduled for this date.</div>
                    ) : (
                      SCHEDULE.filter(s => s.day === selectedAttendanceDate.getDay()).map(item => {
                        const dateKey = selectedAttendanceDate.toLocaleDateString('en-CA');
                        const isPresent = attendance[`${item.code}-${dateKey}`];
                        return (
                          <div key={item.id} className="bg-white dark:bg-[#2D1217] p-6 rounded-[2rem] border border-rose-100 dark:border-rose-900/20 flex items-center justify-between group">
                            <div className="flex gap-4">
                              <div className={`w-1.5 h-12 rounded-full ${COLOR_MAP[item.color].bg}`} />
                              <div>
                                <h4 className="font-bold text-slate-800 dark:text-pink-50">{item.title}</h4>
                                <p className="text-xs text-slate-400 font-bold">{item.startTime} - {item.endTime}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                               <button onClick={() => setAttendance(prev => ({...prev, [`${item.code}-${dateKey}`]: true}))} className={`p-3 rounded-xl transition-all ${isPresent === true ? 'bg-green-500 text-white' : 'bg-slate-50 dark:bg-rose-900/20 text-slate-300'}`}><Icons.CheckCircle className="w-5 h-5" /></button>
                               <button onClick={() => setAttendance(prev => ({...prev, [`${item.code}-${dateKey}`]: false}))} className={`p-3 rounded-xl transition-all ${isPresent === false ? 'bg-red-500 text-white' : 'bg-slate-50 dark:bg-rose-900/20 text-slate-300'}`}><Icons.Shield className="w-5 h-5 rotate-180" /></button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
               </div>
               
               <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-black text-rose-600 flex items-center gap-3"><Icons.Clipboard className="w-6 h-6" /> Priority Vault</h2>
                    <button onClick={() => setShowAddAssignment(true)} className="p-3 bg-rose-500 text-white rounded-2xl shadow-lg hover:scale-110 transition-transform"><Icons.Sparkles className="w-4 h-4" /></button>
                  </div>
                  <div className="space-y-4">
                    {assignments.length === 0 ? (
                      <div className="p-10 border-2 border-dashed border-rose-100 dark:border-rose-900/20 rounded-[2.5rem] text-center text-slate-400 font-bold italic">No pending challenges.</div>
                    ) : (
                      assignments.map(a => (
                        <div key={a.id} className="bg-white dark:bg-[#2D1217] p-6 rounded-[2rem] border border-rose-100 dark:border-rose-900/20 flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <button onClick={() => setAssignments(prev => prev.map(item => item.id === a.id ? {...item, status: item.status === 'completed' ? 'pending' : 'completed'} : item))} className={`p-2 rounded-xl border-2 transition-all ${a.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'border-rose-100 dark:border-rose-900/20 text-transparent'}`}><Icons.CheckCircle className="w-4 h-4" /></button>
                            <div>
                              <h4 className={`font-bold ${a.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-pink-50'}`}>{a.title}</h4>
                              <p className="text-[10px] font-black text-rose-400 uppercase">{a.courseCode} • {a.dueDate}</p>
                            </div>
                          </div>
                          <button onClick={() => setAssignments(prev => prev.filter(item => item.id !== a.id))} className="text-rose-200 hover:text-rose-500 opacity-0 group-hover:opacity-100"><Icons.Trash className="w-4 h-4" /></button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from(new Set(SCHEDULE.map(s => s.code))).map(code => {
                const { percentage, present, total } = getCourseAttendanceDetails(code);
                const isLow = percentage < 80;
                return (
                  <div key={code} className={`bg-white dark:bg-[#2D1217] p-6 rounded-[2.5rem] border ${isLow ? 'border-red-200 shadow-xl' : 'border-rose-50'} flex flex-col items-center text-center gap-4`}>
                    <ProgressCircle percentage={percentage} size={60} strokeWidth={6} colorClass={isLow ? 'text-red-500' : 'text-rose-500'} />
                    <div>
                      <h4 className="font-black text-rose-600">{code}</h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{percentage}% Attendance</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white dark:bg-[#2D1217] p-10 rounded-[3rem] border border-rose-100 dark:border-rose-900/20">
               <div className="flex justify-between items-center mb-10">
                  <h3 className="text-3xl font-black text-rose-600">BBA Analytics</h3>
                  <button onClick={() => setShowAddGrade(true)} className="p-4 bg-pink-500 text-white rounded-[1.5rem] shadow-xl hover:scale-105 transition-transform font-bold text-xs uppercase tracking-widest">Add Assessment</button>
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 space-y-4">
                    {grades.length === 0 ? (
                      <p className="text-slate-400 italic">No grade logs yet. Start adding marks to see your projection.</p>
                    ) : (
                      Array.from(new Set(grades.map(g => g.courseCode))).map(code => {
                        const courseGrades = grades.filter(g => g.courseCode === code);
                        const totalMarks = courseGrades.reduce((acc, g) => acc + g.score, 0);
                        return (
                          <div key={code} className="p-6 bg-rose-50/50 dark:bg-rose-900/10 rounded-[2rem] flex justify-between items-center">
                            <div><h4 className="font-black text-lg text-slate-800 dark:text-pink-50">{code}</h4><p className="text-xs font-bold text-rose-400">Total: {totalMarks}/100</p></div>
                            <div className="text-right"><span className="text-2xl font-black text-rose-500">{totalMarks >= 80 ? 'A+' : totalMarks >= 70 ? 'A-' : 'B+'}</span></div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  <div className="bg-rose-500 rounded-[2.5rem] p-10 text-white text-center flex flex-col items-center justify-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-70">Estimated Semester GPA</p>
                    <h4 className="text-6xl font-black">{calculateGPA()}</h4>
                    <div className="w-12 h-1 bg-white/20 my-6" />
                    <p className="text-xs font-bold opacity-80 leading-relaxed italic">"Excellence is not an act, but a habit, Mithila."</p>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'ask' && (
          <div className="flex-grow flex flex-col gap-6 animate-fade-in-up relative h-full max-h-full overflow-hidden">
            <div className="flex-grow overflow-y-auto no-scrollbar space-y-8 px-2 pb-6">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-10">
                  <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 rounded-[2.5rem] flex items-center justify-center text-rose-500 mb-8 shadow-inner"><Icons.Sparkles className="w-12 h-12" /></div>
                  <h4 className="font-black text-2xl mb-4 text-rose-600">Academic Concierge V2</h4>
                  <p className="text-slate-400 max-w-sm font-medium leading-relaxed italic">Powered by Gemini 3 Flash. Analyzes BBA case studies, solves BIS problems, and cheers for you! ✨</p>
                </div>
              ) : (
                chatMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] sm:max-w-[75%] rounded-[2rem] px-6 py-4 shadow-xl shadow-rose-500/5 border ${msg.role === 'user' ? 'bg-rose-500 text-white rounded-tr-none border-rose-400' : 'bg-white dark:bg-[#2D1217] border-rose-100 dark:border-rose-900/20 rounded-tl-none text-slate-700 dark:text-pink-50'}`}>
                      {msg.image && <img src={msg.image} alt="Ref" className="rounded-2xl mb-4 w-full object-cover max-h-80 shadow-md" />}
                      <div className={`text-sm leading-relaxed ${msg.role === 'assistant' ? 'prose dark:prose-invert prose-pink max-w-none' : 'font-bold'}`}>{msg.content}</div>
                      <p className={`text-[9px] mt-3 font-black opacity-40 uppercase tracking-widest ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>{msg.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))
              )}
              {isTyping && <div className="flex justify-start"><div className="bg-white dark:bg-[#2D1217] border border-rose-100 dark:border-rose-900/20 rounded-full px-6 py-3 flex items-center gap-2 shadow-sm"><div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" /><div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce [animation-delay:0.2s]" /><div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce [animation-delay:0.4s]" /></div></div>}
              <div ref={chatEndRef} />
            </div>
            
            <div className="bg-white/80 dark:bg-[#2D1217]/80 backdrop-blur-xl p-4 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/30 flex flex-col gap-4">
              {attachedImage && (
                <div className="flex items-center gap-4 p-2 bg-rose-50/50 dark:bg-rose-900/20 rounded-2xl w-fit relative">
                  <img src={attachedImage} className="w-16 h-16 rounded-xl object-cover" />
                  <button onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1.5 shadow-lg"><Icons.Trash className="w-3 h-3" /></button>
                </div>
              )}
              <div className="flex items-center gap-4">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setAttachedImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />
                <button onClick={() => fileInputRef.current?.click()} className="p-3 text-rose-300 hover:text-rose-600 transition-colors"><Icons.Paperclip className="w-6 h-6" /></button>
                <input 
                  type="text" 
                  value={currentQuery} 
                  onChange={(e) => setCurrentQuery(e.target.value)} 
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()} 
                  placeholder="Ask your concierge, Mithila..." 
                  className="flex-grow bg-transparent border-none focus:ring-0 text-sm py-3 text-slate-700 dark:text-pink-50 placeholder:text-rose-200 outline-none" 
                />
                <button 
                  onClick={sendMessage} 
                  disabled={isTyping || (!currentQuery.trim() && !attachedImage)} 
                  className={`p-4 rounded-[1.5rem] transition-all ${(currentQuery.trim() || attachedImage) && !isTyping ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/40 active:scale-95' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-200'}`}
                ><Icons.Send className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals remain similarly styled but with [2.5rem] rounding */}
      {showAddAssignment && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/50 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#2D1217] w-full max-w-md rounded-[3rem] p-10 border border-rose-100 shadow-2xl space-y-8">
            <div className="flex justify-between items-center"><h3 className="text-3xl font-black text-rose-600">Set Goal</h3><button onClick={() => setShowAddAssignment(false)} className="p-2 text-rose-200 hover:text-rose-500 transition-transform"><Icons.Clock className="w-6 h-6 rotate-45" /></button></div>
            <form onSubmit={(e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); setAssignments(prev => [...prev, { id: Date.now().toString(), title: formData.get('title') as string, courseCode: formData.get('course') as string, dueDate: formData.get('date') as string, type: 'Assignment', status: 'pending' }]); setShowAddAssignment(false); addNotification("Strategic goal logged.", "success"); }} className="space-y-6"><input name="title" required placeholder="Task Objective" className="w-full bg-rose-50/50 dark:bg-rose-900/20 border-none rounded-2xl p-5 text-sm dark:text-pink-50 outline-none" /><select name="course" className="w-full bg-rose-50/50 dark:bg-rose-900/20 border-none rounded-2xl p-5 text-sm dark:text-pink-50 outline-none">{Array.from(new Set(SCHEDULE.map(s => s.code))).map(c => <option key={c} value={c}>{c}</option>)}</select><input name="date" type="date" required className="w-full bg-rose-50/50 dark:bg-rose-900/20 border-none rounded-2xl p-5 text-sm dark:text-pink-50 outline-none" /><button type="submit" className="w-full bg-rose-500 text-white font-black py-5 rounded-[1.5rem] shadow-2xl hover:scale-[1.02] transition-transform uppercase tracking-widest text-sm">Deploy Task</button></form>
          </div>
        </div>
      )}

      {showAddGrade && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/50 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#2D1217] w-full max-w-md rounded-[3rem] p-10 border border-rose-100 shadow-2xl space-y-8">
            <div className="flex justify-between items-center"><h3 className="text-3xl font-black text-rose-600">Add Marks</h3><button onClick={() => setShowAddGrade(false)} className="p-2 text-rose-200 hover:text-rose-500 transition-transform"><Icons.Clock className="w-6 h-6 rotate-45" /></button></div>
            <form onSubmit={(e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); const type = formData.get('type') as AssessmentType; setGrades(prev => [...prev, { id: Date.now().toString(), courseCode: formData.get('course') as string, title: formData.get('title') as string, score: Number(formData.get('score')), weight: type === 'Continuous' ? 30 : type === 'Mid-term' ? 30 : 40, type }]); setShowAddGrade(false); addNotification("Academic performance updated.", "success"); }} className="space-y-6"><select name="course" className="w-full bg-rose-50/50 dark:bg-rose-900/20 border-none rounded-2xl p-5 text-sm dark:text-pink-50 outline-none">{Array.from(new Set(SCHEDULE.map(s => s.code))).map(c => <option key={c} value={c}>{c}</option>)}</select><select name="type" className="w-full bg-rose-50/50 dark:bg-rose-900/20 border-none rounded-2xl p-5 text-sm dark:text-pink-50 outline-none"><option value="Continuous">Continuous (Max 30)</option><option value="Mid-term">Mid-term (Max 30)</option><option value="Final">Final (Max 40)</option></select><input name="score" type="number" required placeholder="Marks Obtained" className="w-full bg-rose-50/50 dark:bg-rose-900/20 border-none rounded-2xl p-5 text-sm dark:text-pink-50 outline-none" /><button type="submit" className="w-full bg-pink-500 text-white font-black py-5 rounded-[1.5rem] shadow-2xl hover:scale-[1.02] transition-transform uppercase tracking-widest text-sm">Save Record</button></form>
          </div>
        </div>
      )}

      {isEditingNote && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/50 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-[#2D1217] w-full max-w-md rounded-[3rem] p-10 border border-rose-100 shadow-2xl space-y-8"><h3 className="text-3xl font-black text-rose-600">Daily Affirmation</h3><textarea value={personalNote} onChange={(e) => setPersonalNote(e.target.value)} rows={4} className="w-full bg-rose-50/50 dark:bg-rose-900/20 border-none rounded-3xl p-6 text-lg dark:text-pink-50 outline-none resize-none font-medium italic" /><button onClick={() => { setIsEditingNote(false); localStorage.setItem('personalNote', personalNote); }} className="w-full bg-rose-500 text-white font-black py-5 rounded-[1.5rem] shadow-2xl hover:scale-[1.02] transition-transform uppercase tracking-widest text-sm">Seal My Vision</button></div>
        </div>
      )}

      <footer className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/70 dark:bg-[#2D1217]/70 backdrop-blur-2xl border-t border-rose-100 dark:border-rose-900/20 px-8 py-6 flex justify-between items-center z-50">
        {[{ id: 'dashboard', icon: Icons.Dashboard }, { id: 'academic', icon: Icons.Calendar }, { id: 'progress', icon: Icons.CheckCircle }, { id: 'ask', icon: Icons.Message }].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`p-4 rounded-[1.25rem] transition-all ${activeTab === item.id ? 'bg-rose-500 text-white shadow-2xl shadow-rose-500/40' : 'text-rose-200 hover:text-rose-400'}`}><item.icon className="w-6 h-6" /></button>
        ))}
      </footer>

      <div className="hidden sm:block py-16 text-center border-t border-rose-100 dark:border-rose-900/10 mt-20 opacity-40"><p className="text-[10px] text-rose-300 font-black tracking-[0.4em] uppercase mb-1">Mithila Hub Enterprise Edition</p><p className="text-xs text-rose-400 flex items-center justify-center gap-2 font-black italic">Crafted with Unwavering Belief for Ishana <Icons.Heart className="w-3 h-3 fill-rose-400" /></p></div>
    </div>
  );
};

export default App;
