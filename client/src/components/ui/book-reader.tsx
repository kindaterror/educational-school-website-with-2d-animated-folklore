// --- SECTION: Imports ---
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Home, Music, Volume2,  VolumeX,  Maximize, Minimize, BookOpen, Star, Award, Sparkles, Heart} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import '@/Book-reader.css';

// --- SECTION: Interface Definitions ---
interface Question {
  id?: number;
  questionText: string;
  answerType: string;
  correctAnswer?: string;
  options?: string;
}

interface Page {
  id: number;
  pageNumber: number;
  content: string;
  title?: string;
  imageUrl?: string;
  questions?: Question[];
}

interface BookReaderProps {
  title: string;
  pages: Page[];
  returnPath: string;
  musicUrl?: string;
  bookId: number;
  onExit?: () => void;
}

// --- SECTION: Component Definition: BookReader ---
export function BookReader({ title, pages, returnPath, musicUrl, bookId, onExit }: BookReaderProps) {
  // --- SUB-SECTION: State and Refs ---
  // --- Core Book State ---
  const [currentPage, setCurrentPage] = useState(0);
  const [showQuestions, setShowQuestions] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showAnswerFeedback, setShowAnswerFeedback] = useState<Record<string, boolean>>({});
  const [answersCorrect, setAnswersCorrect] = useState<Record<string, boolean>>({});
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [nextPageReady, setNextPageReady] = useState(false);
  const [bookCompleted, setBookCompleted] = useState(false);
  const [visitedPages, setVisitedPages] = useState<Record<number, boolean>>({0: true});
  
  // --- Session Tracking State ---
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  
  // ✅ NEW: Live timer state
  // --- Live Timer State ---
  const [currentReadingTime, setCurrentReadingTime] = useState(0); // seconds
  const [liveTimerActive, setLiveTimerActive] = useState(false);
  
  // Touch gesture support
  // --- Touch Gesture State ---
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const minSwipeDistance = 50;

  // --- SUB-SECTION: API Mutations ---
  // --- Start Reading Session ---
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      console.log("🚀 STARTING READING SESSION for book:", bookId);
      const response = await fetch('/api/reading-sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ bookId: parseInt(bookId.toString()) })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Start session error:', errorData);
        throw new Error(errorData.message || 'Failed to start reading session');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log("✅ READING SESSION STARTED SUCCESSFULLY:", data);
      setSessionStarted(true);
      const now = new Date();
      setSessionStartTime(now);
      // ✅ NEW: Start live timer
      setCurrentReadingTime(0);
      setLiveTimerActive(true);
    },
    onError: (error) => {
      console.error("❌ ERROR STARTING READING SESSION:", error);
    }
  });

  // ✅ FIXED: End reading session mutation with proper error handling
  // --- End Reading Session ---
  const endSessionMutation = useMutation({
    mutationFn: async () => {
      console.log("🛑 ENDING READING SESSION for book:", bookId);
      const response = await fetch('/api/reading-sessions/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ bookId: parseInt(bookId.toString()) })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.warn("⚠️ Session end failed:", errorData.message);
        return { success: false, message: errorData.message };
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        console.log("✅ READING SESSION ENDED SUCCESSFULLY:", data);
        if (data.totalMinutes > 0) {
          console.log(`📖 Total reading time: ${data.totalMinutes} minutes`);
        }
      }
      setSessionStarted(false);
      setSessionStartTime(null);
      // ✅ NEW: Stop live timer
      setLiveTimerActive(false);
    },
    onError: (error) => {
      console.error("❌ ERROR ENDING READING SESSION:", error);
      setSessionStarted(false);
      setSessionStartTime(null);
      setLiveTimerActive(false);
    }
  });

  // ✅ NEW: Live timer that updates every second
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (liveTimerActive && sessionStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000); // seconds
        setCurrentReadingTime(elapsed);
      }, 1000); // Update every 1 second
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [liveTimerActive, sessionStartTime]);

  // Create mutation for updating progress
  // --- Update Progress ---
  const updateProgressMutation = useMutation({
    mutationFn: async (progressData: { bookId: number; currentPage: number; percentComplete: number }) => {
      const token = localStorage.getItem('token');
      
      console.log("Sending progress update:", progressData);
      
      return fetch('/api/progress', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          bookId: progressData.bookId,
          percentComplete: progressData.percentComplete
        }),
        credentials: 'include'
      }).then(res => {
        if (!res.ok) {
          return res.json().then(errorData => {
            console.error('Progress update error:', errorData);
            throw new Error('Failed to update progress: ' + JSON.stringify(errorData));
          });
        }
        return res.json();
      });
    }
  });
  
  // Refs (re-declared here for clarity, ensure no conflicts if declared above)
  const bookContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Touch gesture handlers
  // --- SUB-SECTION: Event Handlers & Utility Functions ---
  // --- Touch Gesture Handlers ---
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentPage < pages.length - 1) {
      nextPage();
    } else if (isRightSwipe && currentPage > 0) {
      prevPage();
    }
  };

  // Start session when component mounts
  // --- SUB-SECTION: Effects ---
  // --- Start Session on Mount ---
  useEffect(() => {
    if (bookId && !sessionStarted) {
      console.log("📖 BookReader mounted - starting session");
      startSessionMutation.mutate();
    }
  }, [bookId]);

  // ✅ FIXED: Better session cleanup
  // --- Session Cleanup (Unload/Popstate) ---
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionStarted) {
        const token = localStorage.getItem('token');
        if (token) {
          const data = JSON.stringify({ bookId: parseInt(bookId.toString()) });
          navigator.sendBeacon('/api/reading-sessions/end', data);
        }
      }
    };

    const handlePopState = () => {
      if (sessionStarted) {
        endSessionMutation.mutate();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      
      if (sessionStarted) {
        endSessionMutation.mutate();
      }
    };
  }, [sessionStarted, bookId]);

  // Custom exit handler that ends session
  // --- Custom Exit Handler ---
  const handleExit = () => {
    if (sessionStarted) {
      endSessionMutation.mutate();
    }
    if (onExit) {
      onExit();
    } else {
      window.history.back();
    }
  };
  
  // --- Audio Control ---
  const toggleAudio = () => {
    if (audioRef.current) {
      if (audioPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
        });
      }
      setAudioPlaying(!audioPlaying);
    }
  };
  
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioMuted;
      setAudioMuted(!audioMuted);
    }
  };

  // --- Fullscreen Control ---
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      bookContainerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // --- Reset Answer ---
  const resetAnswer = (qId: string) => {
    const newAnswers = {...answers};
    delete newAnswers[qId];
    
    const newShowAnswerFeedback = {...showAnswerFeedback};
    delete newShowAnswerFeedback[qId];
    
    const newAnswersCorrect = {...answersCorrect};
    delete newAnswersCorrect[qId];
    
    setAnswers(newAnswers);
    setShowAnswerFeedback(newShowAnswerFeedback);
    setAnswersCorrect(newAnswersCorrect);
  };

  // --- Fullscreen Change Handler ---
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const currentPageHasQuestions = pages[currentPage]?.questions && 
                               pages[currentPage]?.questions?.length > 0;

  // --- Page Navigation (Next/Prev) ---
  const nextPage = () => {
    if (showQuestions && currentPageHasQuestions) {
      const allQuestionsAnsweredCorrectly = pages[currentPage].questions?.every(question => {
        const qId = typeof question.id !== 'undefined' 
          ? question.id.toString() 
          : `page${currentPage}-q${pages[currentPage].questions?.indexOf(question)}`;
        
        return showAnswerFeedback[qId] && answersCorrect[qId] === true;
      });
      
      if (!allQuestionsAnsweredCorrectly) {
        return;
      }
    }

    if (currentPageHasQuestions && !showQuestions) {
      setShowQuestions(true);
      return;
    }
    
    if (isFlipping) return;
    
    if (currentPage < pages.length - 1) {
      setNextPageReady(true);
      
      setTimeout(() => {
        setIsFlipping(true);
        setFlipDirection('next');
        
        setTimeout(() => {
          const nextPageNumber = currentPage + 1;
          setVisitedPages(prev => ({...prev, [nextPageNumber]: true}));
          setCurrentPage(nextPageNumber);
          
          setTimeout(() => {
            setIsFlipping(false);
            setFlipDirection(null);
            setNextPageReady(false);
          }, 200);
        }, 1000);
      }, 50);
    }
  };

  const prevPage = () => {
    if (showQuestions) {
      setShowQuestions(false);
      return;
    }
    
    if (isFlipping) return;
    
    if (bookCompleted && currentPage === pages.length - 1) {
      setBookCompleted(false);
      setCurrentPage(currentPage - 1);
      return;
    }
    
    if (currentPage > 0) {
      setIsFlipping(true);
      setFlipDirection('prev');
      
      setTimeout(() => {
        setCurrentPage(currentPage - 1);
        
        setTimeout(() => {
          setIsFlipping(false);
          setFlipDirection(null);
        }, 200);
      }, 1000);
    }
  };

  // Reset questions when changing pages
  // --- Question Reset on Page Change ---
  useEffect(() => {
    setShowQuestions(false);
    setShowAnswerFeedback({});
    setAnswersCorrect({});
  }, [currentPage]);
  
  // ✅ FIXED: Book completion mutation with timer stop
  // --- Mark Book Completed ---
  const markBookCompletedMutation = useMutation({
    mutationFn: async (bookId: number) => {
      const token = localStorage.getItem('token');
      
      console.log("📚 Marking book as completed:", bookId);
      
      const response = await fetch(`/api/books/${bookId}/complete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({}),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Book completion error response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || 'Failed to mark book as completed');
        } catch (parseError) {
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      }
      
      const data = await response.json();
      console.log("✅ Book completion success:", data);
      return data;
    },
    onSuccess: (data) => {
      console.log("📚 Book marked as completed successfully");
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      // ✅ NEW: Stop timer when book completion is successful
      setLiveTimerActive(false);
    },
    onError: (error) => {
      console.error("❌ Error marking book as completed:", error);
    }
  });

  // 🎯 FIXED: Enhanced useEffect - removed premature 100% completion
  // --- Progress Update on Page/Visit Change ---
  useEffect(() => {
    if (bookId && pages.length > 0) {
      const visitedPagesCount = Object.keys(visitedPages).length;
      const percentComplete = Math.min(
        Math.round((visitedPagesCount / pages.length) * 100), 
        100
      );
      
      console.log(`Book progress: ${visitedPagesCount}/${pages.length} pages (${percentComplete}%)`);
      
      updateProgressMutation.mutate({
        bookId,
        currentPage,
        percentComplete: percentComplete  // ✅ FIXED: Removed premature 100% assignment
      });
    }
  }, [currentPage, visitedPages, bookId, pages.length]);

  // Improved keyboard navigation
  // --- Keyboard Navigation ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextPage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevPage();
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen();
        } else if (showQuestions) {
          setShowQuestions(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, showQuestions, currentPageHasQuestions, isFullscreen]);

  // ✅ NEW: Live timer formatting function
  // --- Live Timer Formatting ---
  const formatLiveTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- SUB-SECTION: Render Logic ---
  return (
    <div className="flex flex-col items-center w-full">
      {/* --- Render: Main Container & Enhanced Title --- */}
      {/* Enhanced Book title */}
      {!isFullscreen && (
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <BookOpen className="h-8 w-8 text-ilaw-gold mr-3" />
            <h1 className="text-3xl font-heading font-bold text-ilaw-navy">{title}</h1>
            {sessionStarted && liveTimerActive && (
              <div className="ml-4 flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 border border-green-300">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                📖 Reading: {formatLiveTime(currentReadingTime)}
              </div>
            )}
          </div>
          <p className="text-brand-gold-600 font-medium italic">
            An Ilaw ng Bayan Learning Experience ✨
          </p>
        </div>
      )}
      
      {/* Book container with touch support */}
      {/* --- Render: Book Container (with Touch Support) --- */}
     <div
        ref={bookContainerRef}
        className={`relative bg-gradient-to-br from-ilaw-navy via-brand-navy-700 to-brand-navy-800 w-full rounded-2xl shadow-2xl border-4 border-ilaw-gold ${
          isFullscreen 
            ? 'fixed inset-0 z-50 rounded-none border-0 p-8'
            : 'max-w-4xl p-6 mb-6 h-[550px]'
        }`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Fullscreen exit instruction */}
        {/* --- Render: Fullscreen Exit Instruction --- */}
        {isFullscreen && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-black/80 text-white px-4 py-2 rounded-lg text-sm">
            Press <kbd className="bg-white/20 px-2 py-1 rounded">ESC</kbd> to exit fullscreen
          </div>
        )}

        {bookCompleted && currentPage === pages.length - 1 ? (
          // ✅ IMPROVED: Better reading time display in completion screen
          <div className="bg-gradient-to-br from-ilaw-white via-brand-gold-50 to-ilaw-gold rounded-2xl shadow-2xl overflow-hidden mx-auto text-center flex flex-col items-center justify-center h-full border-4 border-ilaw-gold">
            <div className="p-12">
              <div className="mb-8">
                <div className="relative inline-block">
                  <span className="inline-block rounded-full bg-gradient-to-br from-ilaw-gold to-brand-amber p-6 shadow-ilaw">
                    <Award className="h-16 w-16 text-ilaw-navy" />
                  </span>
                  <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-brand-amber animate-pulse" />
                </div>
              </div>
              
              <h2 className="text-4xl font-heading font-bold text-ilaw-navy mb-4">Congratulations, Young Scholar!</h2>
              <p className="text-xl text-brand-gold-700 mb-2">
                You've completed <span className="font-bold text-ilaw-navy">"{title}"</span>
              </p>
              <p className="text-lg text-brand-gold-600 mb-8 italic">
                Another step in your journey of enlightenment! ✨
              </p>
              
              <div className="mb-6 py-4 px-8 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-2xl inline-block border-2 border-blue-200 shadow-lg">
                <div className="flex items-center justify-center mb-2">
                  <BookOpen className="h-6 w-6 text-blue-600 mr-2" />
                  <span className="font-heading font-bold text-blue-800 text-lg">Reading Time: {formatLiveTime(currentReadingTime)}</span>
                </div>
                <p className="text-blue-700 font-medium text-sm">Time well spent learning!</p>
              </div>
              
              <div className="mb-10 py-6 px-10 bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl inline-block border-2 border-green-200 shadow-lg">
                <div className="flex items-center justify-center mb-3">
                  <Star className="h-8 w-8 text-yellow-500 mr-3 animate-pulse" />
                  <span className="font-heading font-bold text-green-800 text-xl">100% Complete!</span>
                  <Star className="h-8 w-8 text-yellow-500 ml-3 animate-pulse" />
                </div>
                <p className="text-green-700 font-medium">This achievement has been added to your learning journey.</p>
              </div>
              
              <div className="flex flex-col md:flex-row gap-6 justify-center">
                <Button 
                  onClick={() => {
                    setBookCompleted(false);
                    setCurrentPage(0);
                    if (sessionStarted) {
                      endSessionMutation.mutate();
                    }
                    setTimeout(() => {
                      startSessionMutation.mutate();
                    }, 500);
                  }} 
                  className="bg-ilaw-gold hover:bg-brand-amber text-ilaw-navy font-semibold px-8 py-4 text-lg shadow-ilaw border-2 border-ilaw-navy"
                >
                  <BookOpen className="mr-2 h-5 w-5" />
                  Read Again
                </Button>
                
                <Button 
                  onClick={handleExit}
                  variant="outline" 
                  className="border-2 border-ilaw-navy text-ilaw-navy hover:bg-ilaw-navy hover:text-ilaw-white font-semibold px-8 py-4 text-lg"
                >
                  <Home className="mr-2 h-5 w-5" />
                  Back to Collection
                </Button>
              </div>
              
              <div className="mt-8 p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl border border-purple-200">
                <p className="text-purple-700 font-medium italic text-lg">
                  "Liwanag, Kaalaman, Paglilingkod" - Keep shining bright! 🌟
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Book layout
          <div className={`flat-book-container h-full ${isFullscreen ? 'max-w-6xl mx-auto' : ''}`}>
            <div className="flat-book-content h-full flex">
              
              {/* LEFT SIDE - Image (STATIC) */}
              {/* --- Render: Left Side (Static Image) --- */}
              <div className={`bg-gradient-to-br from-brand-gold-50 to-ilaw-white p-6 border-r-2 border-brand-gold-200 ${
                isFullscreen ? 'w-1/2' : 'w-1/2'
              }`}>
                {pages[currentPage]?.imageUrl ? (
                  <div className="w-full h-full flex items-center justify-center bg-ilaw-white rounded-lg shadow-inner border border-brand-gold-200">
                    <img 
                      src={pages[currentPage].imageUrl} 
                      alt={`Illustration for page ${currentPage + 1}`}
                      className="max-w-full max-h-full object-contain rounded-lg"
                      style={{ transition: 'none' }}
                    />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center bg-gradient-to-br from-brand-gold-100 to-ilaw-gold rounded-lg border-2 border-brand-gold-300">
                    <div className="text-center">
                      <BookOpen className="h-16 w-16 text-brand-gold-500 mx-auto mb-4" />
                      <p className="text-brand-gold-600 font-medium italic">Illustration coming soon</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* RIGHT SIDE - Content (FLIPS) */}
              {/* --- Render: Right Side (Flipping Content) --- */}
              <div className={`flat-page-right-container relative ${
                isFullscreen ? 'w-1/2' : 'w-1/2'
              } ${isFlipping ? (flipDirection === 'next' ? 'flat-flipping' : 'flat-flipping-reverse') : ''}`}>
                
                {/* Current page content */}
                {/* --- Render: Current Page Content (with Enhanced Questions) --- */}
                <div className="flat-page-content absolute inset-0 p-8 overflow-y-auto bg-ilaw-white">
                  <div className="flex items-center mb-6">
                    <Star className="h-6 w-6 text-ilaw-gold mr-3" />
                    <h2 className={`font-heading font-bold text-ilaw-navy ${
                      isFullscreen ? 'text-3xl' : 'text-2xl'
                    }`}>
                      {pages[currentPage]?.title || `Page ${currentPage + 1}`}
                    </h2>
                  </div>
                  
                  <div className="prose max-w-none">
                    <p className={`text-gray-700 leading-relaxed font-medium ${
                      isFullscreen ? 'text-xl' : 'text-lg'
                    }`}>
                      {pages[currentPage]?.content}
                    </p>
                  </div>
                  
                  {/* Show finish reading button if this is the last content page */}
                  {currentPage === pages.length - 1 && !bookCompleted && (
                    <div className="mt-8 text-center bg-gradient-to-r from-ilaw-gold to-brand-amber p-6 rounded-xl border-2 border-ilaw-navy">
                      {Array.from({ length: pages.length }).every((_, i) => visitedPages[i]) ? (
                        <div>
                          <h3 className="text-xl font-heading font-bold text-ilaw-navy mb-4">
                            🎉 You've reached the end!
                          </h3>
                          <Button 
                            onClick={() => {
                              // ✅ NEW: Stop timer when finishing reading
                              setLiveTimerActive(false);
                              
                              if (bookId) {
                                updateProgressMutation.mutate({
                                  bookId,
                                  currentPage,
                                  percentComplete: 100
                                });
                                markBookCompletedMutation.mutate(bookId);
                              }
                              setBookCompleted(true);
                            }} 
                            className="bg-ilaw-navy hover:bg-brand-navy-800 text-ilaw-gold font-semibold px-8 py-3 text-lg shadow-navy border-2 border-ilaw-white"
                          >
                            <Award className="mr-2 h-5 w-5" />
                            Finish Reading
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <Button 
                            disabled
                            className="bg-gray-300 text-gray-700 cursor-not-allowed mb-3 px-8 py-3"
                          >
                            <Award className="mr-2 h-5 w-5" />
                            Finish Reading
                          </Button>
                          <p className="text-sm text-ilaw-navy font-medium italic">
                            📚 Please read all pages to complete your journey!
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Enhanced Questions Section */}
                  {showQuestions && currentPageHasQuestions && (
                    <div className="mt-8 p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 shadow-lg">
                      <div className="flex items-center mb-6">
                        <Sparkles className="h-6 w-6 text-purple-600 mr-3" />
                        <h3 className="text-xl font-heading font-bold text-purple-800">Learning Questions</h3>
                      </div>
                      
                      {pages[currentPage].questions?.map((question, idx) => {
                        const qId = typeof question.id !== 'undefined' 
                          ? question.id.toString() 
                          : `page${currentPage}-q${idx}`;
                        
                        return (
                         <div key={qId} className="mb-6 p-4 bg-white rounded-lg shadow border border-purple-200">
                            <p className="font-semibold mb-4 text-gray-800 text-lg">
                              {idx + 1}. {question.questionText}
                            </p>
                            
                            {question.answerType === 'text' ? (
                              <div>
                                <input 
                                  type="text"
                                  className="w-full border-2 border-purple-200 rounded-lg p-3 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 font-medium"
                                  value={answers[qId] || ''}
                                  onChange={(e) => setAnswers({...answers, [qId]: e.target.value})}
                                  placeholder="Type your answer here..."
                                />
                                
                                {showAnswerFeedback[qId] && (
                                  <div className={`mt-3 p-3 text-sm rounded-lg border-2 ${answersCorrect[qId] ? 
                                    'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
                                    {answersCorrect[qId] ? 
                                      <div className="flex items-center">
                                        <Star className="h-4 w-4 mr-2" />
                                        Excellent! You got it right! 🌟
                                      </div> : 
                                      <div>
                                        <p className="mb-3">Not quite right, but keep trying! Learning is a journey. 💪</p>
                                        <Button 
                                          className="bg-ilaw-gold hover:bg-brand-amber text-ilaw-navy font-semibold"
                                          size="sm"
                                          onClick={() => resetAnswer(qId)}
                                        >
                                          Try Again
                                        </Button>
                                      </div>
                                    }
                                  </div>
                                )}
                                
                                {!showAnswerFeedback[qId] && (
                                  <Button 
                                    className="mt-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                                    size="sm"
                                    onClick={() => {
                                      const isCorrect = answers[qId]?.toLowerCase() === 
                                                        question.correctAnswer?.toLowerCase();
                                      
                                      setAnswersCorrect({...answersCorrect, [qId]: isCorrect});
                                      setShowAnswerFeedback({...showAnswerFeedback, [qId]: true});
                                    }}
                                  >
                                    Check Answer
                                  </Button>
                                )}
                              </div>
                            ) : question.answerType === 'multiple_choice' && (
                              <div className="space-y-2">
                                {(question.options?.includes('\n') 
                                  ? question.options.split('\n') 
                                  : question.options?.split(',') || []
                                ).map((option, optionIdx) => {
                                  const cleanedOption = option.trim();
                                  return cleanedOption ? (
                                    <div key={optionIdx} className="flex items-center p-2 hover:bg-gray-50 rounded">
                                      <input 
                                        type="radio"
                                        id={`question-${qId}-option-${optionIdx}`}
                                        name={`question-${qId}`}
                                        className="mr-3 h-4 w-4"
                                        checked={answers[qId] === cleanedOption}
                                        onChange={() => setAnswers({...answers, [qId]: cleanedOption})}
                                      />
                                      <label 
                                        htmlFor={`question-${qId}-option-${optionIdx}`}
                                        className="text-sm cursor-pointer w-full"
                                      >
                                        {cleanedOption}
                                      </label>
                                    </div>
                                  ) : null;
                                })}
                                
                                {showAnswerFeedback[qId] && (
                                  <div className={`mt-2 p-2 text-sm rounded ${answersCorrect[qId] ? 
                                    'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {answersCorrect[qId] ? 
                                      'Correct! Great job!' : 
                                      <div>
                                        <p>Not quite. Try again!</p>
                                        <Button 
                                          className="mt-2 bg-ilaw-gold hover:bg-brand-amber text-ilaw-navy font-semibold"
                                          size="sm"
                                          onClick={() => resetAnswer(qId)}
                                        >
                                          Try Again
                                        </Button>
                                      </div>
                                    }
                                  </div>
                                )}
                                
                                {!showAnswerFeedback[qId] && answers[qId] && (
                                  <Button 
                                    className="mt-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                                    size="sm"
                                    onClick={() => {
                                      const isCorrect = answers[qId].trim().toLowerCase() === 
                                                        question.correctAnswer?.trim().toLowerCase();
                                      
                                      setAnswersCorrect({...answersCorrect, [qId]: isCorrect});
                                      setShowAnswerFeedback({...showAnswerFeedback, [qId]: true});
                                    }}
                                  >
                                    Check Answer
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <div className="flat-page-curl"></div>
                </div>
                
                {/* Next page content (for forward flip) */}
                {/* --- Render: Next Page Content (for Forward Flip) --- */}
                {nextPageReady && currentPage < pages.length - 1 && flipDirection === 'next' && (
                  <div className="flat-page-content-next absolute inset-0 p-8 overflow-y-auto bg-ilaw-white">
                    <div className="flex items-center mb-6">
                      <Star className="h-6 w-6 text-ilaw-gold mr-3" />
                      <h2 className={`font-heading font-bold text-ilaw-navy ${
                        isFullscreen ? 'text-3xl' : 'text-2xl'
                      }`}>
                        {pages[currentPage + 1]?.title || `Page ${currentPage + 2}`}
                      </h2>
                    </div>
                    
                    <div className="prose max-w-none">
                      <p className={`text-gray-700 leading-relaxed font-medium ${
                        isFullscreen ? 'text-xl' : 'text-lg'
                      }`}>
                        {pages[currentPage + 1]?.content}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Previous page content (for backward flip) */}
                {/* --- Render: Previous Page Content (for Backward Flip) --- */}
                {flipDirection === 'prev' && currentPage > 0 && (
                  <div className="flat-page-content-prev absolute inset-0 p-8 overflow-y-auto bg-ilaw-white">
                    <div className="flex items-center mb-6">
                      <Star className="h-6 w-6 text-ilaw-gold mr-3" />
                      <h2 className={`font-heading font-bold text-ilaw-navy ${
                        isFullscreen ? 'text-3xl' : 'text-2xl'
                      }`}>
                        {pages[currentPage - 1]?.title || `Page ${currentPage}`}
                      </h2>
                    </div>
                    
                    <div className="prose max-w-none">
                      <p className={`text-gray-700 leading-relaxed font-medium ${
                        isFullscreen ? 'text-xl' : 'text-lg'
                      }`}>
                        {pages[currentPage - 1]?.content}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flat-page-spine-shadow"></div>
              </div>
            </div>
          </div>
        )}
        
        {/* --- Render: Navigation Buttons (Prev/Next) --- */}
        {/* Navigation buttons */}
        {currentPage < pages.length - 1 && !bookCompleted && (
          <div className={`absolute top-1/2 transform -translate-y-1/2 z-50 ${
            isFullscreen ? 'right-8' : 'right-4'
          }`}>
            <Button 
              onClick={nextPage} 
              variant="ghost" 
              size="icon" 
              className={`text-ilaw-gold bg-ilaw-navy/80 hover:bg-ilaw-navy rounded-full shadow-2xl border-2 border-ilaw-gold ${
                isFullscreen ? 'w-16 h-16' : 'w-14 h-14'
              }`}
            >
              <ChevronRight className={isFullscreen ? 'h-10 w-10' : 'h-8 w-8'} />
            </Button>
          </div>
        )}
        
        {currentPage > 0 && !bookCompleted && (
          <div className={`absolute top-1/2 transform -translate-y-1/2 ${
            isFullscreen ? 'left-8' : 'left-4'
          }`}>
            <Button 
              onClick={prevPage} 
              variant="ghost" 
              size="icon" 
              className={`text-ilaw-gold bg-ilaw-navy/80 hover:bg-ilaw-navy rounded-full shadow-2xl border-2 border-ilaw-gold ${
                isFullscreen ? 'w-16 h-16' : 'w-14 h-14'
              }`}
            >
              <ChevronLeft className={isFullscreen ? 'h-10 w-10' : 'h-8 w-8'} />
            </Button>
          </div>
        )}
        
        {/* --- Render: Fullscreen Button --- */}
        {/* Fullscreen button */}
        <div className={`absolute z-50 ${isFullscreen ? 'top-8 right-8' : 'top-4 right-4'}`}>
          <Button
            onClick={toggleFullscreen}
            variant="ghost"
            size="icon"
            className={`text-ilaw-gold bg-ilaw-navy/60 hover:bg-ilaw-navy/80 rounded-full border border-ilaw-gold ${
              isFullscreen ? 'w-12 h-12' : 'w-10 h-10'
            }`}
          >
            {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
        
        {/* --- Render: Page Indicator (with Live Timer Status) --- */}
        {/* Page indicator */}
        <div className={`absolute left-1/2 transform -translate-x-1/2 bg-ilaw-navy/80 text-ilaw-gold px-6 py-2 rounded-full text-sm font-semibold border border-ilaw-gold z-50 ${
          isFullscreen ? 'bottom-8' : 'bottom-4'
        }`}>
          Page {currentPage + 1} of {pages.length}
          {liveTimerActive && (
            <span className="ml-2 text-green-400">● Live</span>
          )}
        </div>
      </div>

      {/* Enhanced bottom navigation and controls */}
      {!isFullscreen && (
        <div className="flex items-center justify-center gap-8 mb-4">
          <Button 
            onClick={handleExit}
            variant="outline" 
            className="flex items-center gap-2 border-2 border-ilaw-gold text-ilaw-navy hover:bg-ilaw-gold font-semibold px-6 py-3"
          >
            <Home size={18} />
            Return to Collection
          </Button>
          
          {musicUrl && (
            <>
              <audio ref={audioRef} src={musicUrl} loop={true} />
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAudio}
                  className="flex items-center gap-2 border-2 border-purple-400 text-purple-700 hover:bg-purple-100 font-semibold"
                >
                  {audioPlaying ? <VolumeX className="h-4 w-4" /> : <Music className="h-4 w-4" />}
                  {audioPlaying ? "Stop Music" : "Play Music"}
                </Button>
                
                {audioPlaying && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleMute}
                    className="flex items-center gap-2 border-2 border-purple-400 text-purple-700 hover:bg-purple-100 font-semibold"
                  >
                    {audioMuted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    {audioMuted ? "Unmute" : "Mute"}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}