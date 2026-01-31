
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Icons, SCHEDULE, COLOR_MAP, PAST_TRANSCRIPT } from './constants.tsx';
import { ScheduleItem, CurrentStatus, AttendanceRecord, ChatMessage, Assignment, Grade, AssessmentType, TranscriptCourse } from './types.ts';
import ProgressCircle from './components/ProgressCircle.tsx';
import { askStudyQuestion } from './services/geminiService.ts';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'academic' | 'progress' | 'ask'>('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  
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

  const [currentStatus, setCurrentStatus] = useState<CurrentStatus>({ type: 'free' });
  const [personalNote, setPersonalNote] = useState(() => localStorage.getItem('personalNote') || "You're doing amazing, Mithila! Keep shining! 💖");
  const [isEditingNote, setIsEditingNote] = useState(false);

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

  useEffect(() => { localStorage.setItem('assignments', JSON.stringify(assignments)); }, [assignments]);
  useEffect(() => { localStorage.setItem('grades', JSON.stringify(grades)); }, [grades]);
  useEffect(() => { localStorage.setItem('attendance', JSON.stringify(attendance)); }, [attendance]);
  useEffect(() => { localStorage.setItem('chatHistory', JSON.stringify(chatMessages)); }, [chatMessages]);

  const calculateGPA = () => {
    const pastCredits = PAST_TRANSCRIPT.reduce((acc, c) => acc + c.credits, 0);
    const pastTGP = PAST_TRANSCRIPT.reduce((acc, c) => acc + c.tgp, 0);
    const totalCredits = pastCredits || 1;
    return (pastTGP / totalCredits).toFixed(3);
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    // 12:31 AM is hour 0.
    if (hour < 5) return "Still awake, Ishana? 🌙";
    if (hour < 12) return "Good morning, Ishana! ☀️";
    if (hour < 17) return "Good afternoon, Ishana! ✨";
    if (hour < 21) return "Good evening, Ishana! 🌇";
    return "Good night, Ishana! 💤";
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
    if (active) setCurrentStatus({ type: 'active', class: active });
    else setCurrentStatus({ type: 'free' });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      calculateStatus();
    }, 10000);
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  return (
    <div className="min-h-screen bg-[#FFF5F7] dark:bg-[#1A0B0E] text-slate-900 dark:text-pink-50 pb-20 sm:pb-0 transition-colors duration-300">
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-[#2D1217]/70 backdrop-blur-xl border-b border-rose-100 dark:border-rose-900/30 h-16 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-rose-500 rounded-lg text-white shadow-lg"><Icons.Heart className="w-5 h-5" /></div>
          <h1 className="font-bold text-rose-600 dark:text-rose-400">Mithila Hub 💖</h1>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20">{darkMode ? <Icons.Sun className="w-5 h-5 text-amber-400" /> : <Icons.Moon className="w-5 h-5 text-rose-600" />}</button>
      </header>

      <main className={`max-w-5xl mx-auto px-4 py-8 ${activeTab === 'ask' ? 'h-[calc(100vh-130px)] flex flex-col' : ''}`}>
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="space-y-1">
                  <h2 className="text-4xl font-extrabold text-rose-600 dark:text-rose-400">{getGreeting()}</h2>
                  <p className="text-slate-500 dark:text-pink-300/60 font-medium">Your academic empire is waiting.</p>
                </div>
                <div className="bg-white dark:bg-[#2D1217] rounded-[2.5rem] p-8 border border-rose-100 dark:border-rose-900/30 shadow-2xl relative overflow-hidden group">
                  <Icons.Sparkles className="absolute -bottom-6 -right-6 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform" />
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-4">{currentStatus.class ? currentStatus.class.title : 'No classes right now.'}</h3>
                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-pink-200/50">
                      <div className="flex items-center gap-2"><Icons.Clock className="w-4 h-4" /> <span>{currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div>
                      {currentStatus.class && <div className="flex items-center gap-2"><Icons.MapPin className="w-4 h-4" /> <span>Room {currentStatus.class.room}</span></div>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-[2rem] p-6 text-white shadow-xl h-fit">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Icons.Shield className="w-5 h-5" /> Vision Statement</h3>
                <p className="text-sm italic font-medium leading-relaxed">"{personalNote}"</p>
                <button onClick={() => setIsEditingNote(true)} className="mt-4 text-[10px] uppercase font-bold text-white/60 hover:text-white transition-colors">Refine Vision</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ask' && (
          <div className="flex-grow flex flex-col gap-4 animate-fade-in-up relative h-full overflow-hidden">
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
                      {msg.image && <img src={msg.image} className="rounded-2xl mb-3 w-full object-cover max-h-72" />}
                      <div className="text-sm leading-relaxed">{msg.content}</div>
                      <p className="text-[10px] mt-2 font-bold opacity-40 text-right">{msg.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))
              )}
              {isTyping && <div className="flex justify-start"><div className="bg-white dark:bg-[#2D1217] border border-rose-100 dark:border-rose-900/20 rounded-2xl px-5 py-3 flex items-center gap-1 shadow-sm"><div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce [animation-delay:200ms]" /><div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce [animation-delay:400ms]" /></div></div>}
              <div ref={chatEndRef} />
            </div>
            <div className="pt-4 bg-[#FFF5F7] dark:bg-[#1A0B0E]">
              {attachedImage && <div className="flex items-center gap-3 mb-3 p-2 bg-white dark:bg-[#2D1217] rounded-2xl relative w-fit"><img src={attachedImage} className="w-14 h-14 rounded-xl object-cover" /><button onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1"><Icons.Clock className="w-3 h-3 rotate-45" /></button></div>}
              <div className="flex items-center gap-2 bg-white dark:bg-[#2D1217] p-2.5 rounded-3xl border border-rose-100 dark:border-rose-900/30 shadow-sm transition-all focus-within:ring-2 focus-within:ring-rose-500/20">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setAttachedImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-rose-300 hover:text-rose-500 transition-colors"><Icons.Paperclip className="w-5 h-5" /></button>
                <input type="text" value={currentQuery} onChange={(e) => setCurrentQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Ask anything, Mithila..." className="flex-grow bg-transparent border-none focus:ring-0 text-sm py-2 px-1 text-slate-700 dark:text-pink-50 placeholder:text-rose-200 outline-none" />
                <button onClick={sendMessage} disabled={isTyping || (!currentQuery.trim() && !attachedImage)} className={`p-3 rounded-2xl transition-all ${(currentQuery.trim() || attachedImage) && !isTyping ? 'bg-rose-500 text-white shadow-xl active:scale-95' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-200'}`}><Icons.Send className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-[#2D1217]/80 backdrop-blur-xl border-t border-rose-100 dark:border-rose-900/20 px-6 py-4 flex justify-between items-center z-50">
        <button onClick={() => setActiveTab('dashboard')} className={`p-3 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-rose-500 text-white shadow-xl' : 'text-rose-200 hover:text-rose-400'}`}><Icons.Dashboard className="w-6 h-6" /></button>
        <button onClick={() => setActiveTab('ask')} className={`p-3 rounded-2xl transition-all ${activeTab === 'ask' ? 'bg-rose-500 text-white shadow-xl' : 'text-rose-200 hover:text-rose-400'}`}><Icons.Message className="w-6 h-6" /></button>
      </footer>

      {isEditingNote && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#2D1217] w-full max-w-md rounded-[2.5rem] p-8 border border-rose-100 shadow-2xl space-y-6">
            <h3 className="text-2xl font-black text-rose-600">Daily Affirmation</h3>
            <textarea value={personalNote} onChange={(e) => setPersonalNote(e.target.value)} rows={4} className="w-full bg-rose-50/50 dark:bg-rose-900/20 border-none rounded-2xl p-4 text-sm dark:text-pink-50 outline-none resize-none" />
            <button onClick={() => { setIsEditingNote(false); localStorage.setItem('personalNote', personalNote); }} className="w-full bg-rose-500 text-white font-black py-4 rounded-2xl shadow-xl hover:scale-105 transition-transform">SAVE AFFIRMATION</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
