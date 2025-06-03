import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import Header from "@/components/layout/Header";
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Home, Volume2, VolumeX, Check, X, Maximize, Minimize, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
// Import your resized 800x450 GIF
import test2Gif from '@/assets/bookanimation/test2.gif';
//  Import the 2D animated storybook CSS
import '@/pages/student/stories/2danimatedstorybook.css';

export default function NecklaceCombStory() {
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState('');
  const [showQuestion, setShowQuestion] = useState(false);
  const [questionAnswered, setQuestionAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStoryComplete, setIsStoryComplete] = useState(false);
  const [showFloatingElements, setShowFloatingElements] = useState(false);
  
  const bookRef = useRef(null);
  
  // Story pages data with questions and floating illustration data
  const storyPages = [
    {
      id: 'page1',
      title: "Birthday Girl Inday",
      narration: "In a little village lived a kind girl named Inday. It was her birthday!",
      character: "Inday: \"Wow! A necklace and a pretty comb!\"",
      illustration: test2Gif,
      floatingElements: {
        scene: { type: 'scene-illustration', image: test2Gif, position: 'center' }
      },
      question: "What do you get on your birthday?",
      options: [
        { id: "A", text: "Toys", correct: true },
        { id: "B", text: "Homework", correct: false },
        { id: "C", text: "Vegetables", correct: false }
      ]
    },
    {
      id: 'page2',
      title: "A Low Sky!",
      narration: "Back then, the sky was very low. You could reach up and touch it!",
      character: "Inday: \"I'll keep my gifts on this fluffy cloud while I work.\"",
      illustration: test2Gif,
      floatingElements: {
        scene: { type: 'scene-illustration', image: test2Gif, position: 'center' }
      },
      question: "Where did Inday put her gifts?",
      options: [
        { id: "A", text: "In a box", correct: false },
        { id: "B", text: "On a cloud", correct: true },
        { id: "C", text: "In her pocket", correct: false }
      ]
    },
    {
      id: 'page3',
      title: "The Big Bump",
      narration: "As she worked, her pestle bumped the sky!",
      character: "\"Oh no! What will happen now?\"",
      illustration: test2Gif,
      floatingElements: {
        scene: { type: 'scene-illustration', image: test2Gif, position: 'center' }
      },
      question: "What will happen to the sky?",
      options: [
        { id: "A", text: "It jumps up", correct: true },
        { id: "B", text: "It gets sleepy", correct: false },
        { id: "C", text: "It sings a song", correct: false }
      ]
    },
    {
      id: 'page4',
      title: "Sky Flies Up!",
      narration: "The sky got scared and flew high, taking the cloud and her gifts!",
      character: "Inday: \"Oh no! My necklace and comb!\"",
      illustration: test2Gif,
      floatingElements: {
        scene: { type: 'scene-illustration', image: test2Gif, position: 'center' }
      },
      question: "Would you be sad too if you lost your gifts?",
      options: [
        { id: "A", text: "Yes", correct: true },
        { id: "B", text: "No", correct: false }
      ]
    },
    {
      id: 'page5',
      title: "A Beautiful Night",
      narration: "That night, Inday looked up and saw something magical.",
      character: "Inday: \"My comb is the moon, and my necklace is the stars!\"",
      illustration: test2Gif,
      floatingElements: {
        scene: { type: 'scene-illustration', image: test2Gif, position: 'center' }
      },
      question: "Where are Inday's gifts now?",
      options: [
        { id: "A", text: "In the water", correct: false },
        { id: "B", text: "In the sky", correct: true },
        { id: "C", text: "On the floor", correct: false }
      ]
    },
    {
      id: 'page6',
      title: "The Sparkly Lesson",
      narration: "Even when we lose something, something beautiful can happen.",
      character: "\"And they lived happily ever after, looking at the beautiful night sky.\"",
      illustration: test2Gif,
      floatingElements: {
        scene: { type: 'scene-illustration', image: test2Gif, position: 'center' }
      },
      question: "What is the lesson of the story?",
      options: [
        { id: "A", text: "Losing things can still lead to happy endings", correct: true },
        { id: "B", text: "Don't work hard", correct: false },
        { id: "C", text: "Hide gifts on clouds", correct: false }
      ]
    }
  ];
  
  // ADDED: useEffect TO LOCK POSITIONING ON COMPONENT MOUNT
  useEffect(() => {
    // Force consistent positioning on component mount
    const forceConsistentPositioning = () => {
      // Remove any conflicting classes
      document.body.classList.remove('book-fullscreen-mode');
      
      // CORRECTED VERSION WITH PROPER TYPE CASTING
      const dialogContainer = document.querySelector('.popup-floating-dialog-container') as HTMLElement;
      if (dialogContainer) {
        // Force the positioning we want regardless of any other factors
        (dialogContainer as any).style.position = 'absolute';
        (dialogContainer as any).style.bottom = '8%';
        (dialogContainer as any).style.left = '50%';
        (dialogContainer as any).style.transform = 'translateX(-50%)';
        (dialogContainer as any).style.width = '70%';
        (dialogContainer as any).style.maxWidth = '800px';
      }
      
      // Ensure book container has consistent positioning
      const bookContainer = document.querySelector('.popup-flip-book-container') as HTMLElement;
      if (bookContainer) {
        bookContainer.classList.remove('book-fullscreen-mode');
      }
    };
    
    // Apply immediately
    forceConsistentPositioning();
    
    // Also apply after a small delay to catch any late-loading elements
    setTimeout(forceConsistentPositioning, 100);
    setTimeout(forceConsistentPositioning, 500);
    
  }, []); // Empty dependency array means this runs once on mount
  
  // Reset questionAnswered when currentPage changes
  useEffect(() => {
    setQuestionAnswered(false);
  }, [currentPage]);
  
  // UPDATED: useEffect FOR isLoaded WITH PROPER TYPE CASTING
  useEffect(() => {
    setIsLoaded(true);
    
    // Ensure positioning is locked after component is loaded
    setTimeout(() => {
      // CORRECTED VERSION WITH PROPER TYPE CASTING
      const dialogContainer = document.querySelector('.popup-floating-dialog-container') as HTMLElement;
      if (dialogContainer) {
        (dialogContainer as any).style.position = 'absolute';
        (dialogContainer as any).style.bottom = '8%';
        (dialogContainer as any).style.left = '50%';
        (dialogContainer as any).style.transform = 'translateX(-50%)';
      }
    }, 200);
  }, []);

  // Show floating elements after a delay when page loads
  useEffect(() => {
    setShowFloatingElements(false);
    const timer = setTimeout(() => {
      setShowFloatingElements(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [currentPage]);
  
  // Add event listener for ESC key and ARROW KEYS
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC key for fullscreen exit
      if (event.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
        return;
      }
      
      // Prevent arrow key navigation if dialog is open or currently flipping
      if (showQuestion || isFlipping) {
        return;
      }
      
      // Left arrow key - Previous page
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (currentPage > 0) {
          prevPage();
        }
      }
      
      // Right arrow key - Next page
      if (event.key === "ArrowRight") {
        event.preventDefault();
        nextPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, showQuestion, isFlipping, currentPage, questionAnswered]);
  
  // UPDATED: toggleFullscreen with positioning fixes
  const toggleFullscreen = () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    
    if (newFullscreenState) {
      document.body.classList.add('book-fullscreen-mode');
    } else {
      document.body.classList.remove('book-fullscreen-mode');
      
      // CORRECTED POSITIONING RESET WITH PROPER TYPE CASTING
      setTimeout(() => {
        // CORRECTED VERSION WITH PROPER TYPE CASTING
        const dialogContainer = document.querySelector('.popup-floating-dialog-container') as HTMLElement;
        if (dialogContainer) {
          (dialogContainer as any).style.position = 'absolute';
          (dialogContainer as any).style.bottom = '8%';
          (dialogContainer as any).style.left = '50%';
          (dialogContainer as any).style.transform = 'translateX(-50%)';
          (dialogContainer as any).style.width = '70%';
          (dialogContainer as any).style.maxWidth = '800px'; // FIXED: Changed from '600px' to '800px'
        }
      }, 100);
    }
  };
  
  // ================== NEW ANIMATION LOGIC ==================
  const nextPage = () => {
    if (currentPage < storyPages.length - 1) {
      if (!questionAnswered) {
        setShowQuestion(true);
        return;
      }
      
      // Add animation class to hide floating elements
      const bookContainer = document.querySelector('.popup-flip-book-container');
      bookContainer?.classList.add('popup-book-animating');
      
      setFlipDirection('forward');
      setIsFlipping(true);
      setShowFloatingElements(false);
      
      // Trigger right page flip animation
      const rightPage = document.querySelector('.popup-page-right');
      rightPage?.classList.add('flipped');
      
      setTimeout(() => {
        setCurrentPage(prev => prev + 1);
        setIsFlipping(false);
        setSelectedAnswer('');
        setHasAnswered(false);
        setFeedback('');
        setIsCorrect(false);
        
        // Reset page flip state
        rightPage?.classList.remove('flipped');
        
        // Remove animation class after animation completes
        bookContainer?.classList.remove('popup-book-animating');
      }, 1000); // Match your CSS transition duration
    } else {
      if (!questionAnswered) {
        setShowQuestion(true);
      } else {
        setIsStoryComplete(true);
      }
    }
  };
  
  const prevPage = () => {
    if (currentPage > 0) {
      // Add animation class to hide floating elements
      const bookContainer = document.querySelector('.popup-flip-book-container');
      bookContainer?.classList.add('popup-book-animating');
      
      setFlipDirection('backward');
      setIsFlipping(true);
      setShowFloatingElements(false);
      
      // Trigger right page flip animation (reverse)
      const rightPage = document.querySelector('.popup-page-right');
      rightPage?.classList.add('flipped');
      
      setTimeout(() => {
        setCurrentPage(prev => prev - 1);
        setIsFlipping(false);
        
        // Reset page flip state
        rightPage?.classList.remove('flipped');
        
        // Remove animation class after animation completes
        bookContainer?.classList.remove('popup-book-animating');
      }, 1000); // Match your CSS transition duration
    }
  };
  // ================== END NEW ANIMATION LOGIC ==================
  
  const handleAnswerSubmit = () => {
    const correct = storyPages[currentPage].options.find(o => o.id === selectedAnswer)?.correct;
    setIsCorrect(!!correct);
    setHasAnswered(true);
    setFeedback(correct ? "Correct! You're ready to continue the story." : "That's not right. Try again!");
  };
  
  const continueStory = () => {
    if (isCorrect) {
      setQuestionAnswered(true);
      setShowQuestion(false);
      setSelectedAnswer('');
      setHasAnswered(false);
      setFeedback('');
      
      if (currentPage === storyPages.length - 1) {
        setTimeout(() => {
          setIsStoryComplete(true);
        }, 300);
      }
    }
  };
  
  const restartStory = () => {
    setCurrentPage(0);
    setIsStoryComplete(false);
    setSelectedAnswer('');
    setHasAnswered(false);
    setFeedback('');
    setQuestionAnswered(false);
  };
  
  const toggleMute = () => setIsMuted(!isMuted);
  
  const tryAgain = () => {
    setSelectedAnswer('');
    setHasAnswered(false);
    setFeedback('');
  };
  
  const handleDialogClose = (open: boolean) => {
    setShowQuestion(open);
    if (!open) {
      setSelectedAnswer('');
      setHasAnswered(false);
      setFeedback('');
    }
  };
  
  // Get current page floating elements
  const currentFloatingElements = storyPages[currentPage]?.floatingElements;
  
  return (
    <div className={`min-h-screen flex flex-col bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 ${isFullscreen ? 'book-fullscreen-mode' : ''}`}>
      {!isFullscreen && <Header variant="student" />}
      
      <main className={`flex-grow flex flex-col items-center justify-center ${isFullscreen ? 'p-0' : 'p-4 md:p-6'}`}>
        {!isFullscreen && (
          <div className="w-full max-w-7xl">
            <div className="flex justify-between items-center mb-6">
              <Link href="/student/twodanimation">
                <Button variant="outline" className="bg-transparent border-blue-400 text-blue-300 hover:bg-blue-900/70 flex items-center gap-2">
                  <ChevronLeft size={16} /> Back to Stories
                </Button>
              </Link>
              <div className="text-center">
                <h1 className="text-2xl font-serif font-bold text-blue-100">The Necklace and the Comb</h1>
                <div className="text-blue-300 text-sm">Page {currentPage + 1} of {storyPages.length}</div>
              </div>
              <div className="flex gap-2">
                <Button onClick={toggleFullscreen} className="bg-transparent border-blue-400 text-blue-300 hover:bg-blue-900/70">
                  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </Button>
                <Button onClick={toggleMute} className="bg-transparent border-blue-400 text-blue-300 hover:bg-blue-900/70">
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* UPDATED BOOK CONTAINER WITH POPUP 2D ANIMATED STORYBOOK STRUCTURE */}
        <div 
          ref={bookRef}
          className={`popup-open-book-wrapper relative mx-auto transition-all duration-700 ease-in-out ${
            isFullscreen 
              ? 'fixed inset-0 z-50 w-screen h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center' 
              : 'w-full max-w-7xl h-[75vh]'
          }`}
        >
          {/* Fullscreen controls */}
          {isFullscreen && (
            <div className="absolute top-4 right-4 z-10 flex space-x-2">
              <Button onClick={toggleFullscreen} className="bg-blue-900/50 hover:bg-blue-900/80 text-white rounded-full w-10 h-10 p-0 flex items-center justify-center">
                <Minimize size={16} />
              </Button>
              <Button onClick={toggleMute} className="bg-blue-900/50 hover:bg-blue-900/80 text-white rounded-full w-10 h-10 p-0 flex items-center justify-center">
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </Button>
            </div>
          )}
          
          {/* POPUP BOOK CONTAINER WITH 3D EFFECTS */}
          <div className="popup-book-container">
            <div className={`popup-flip-book-container ${isFullscreen ? 'w-[80vw] h-[75vh] max-w-none' : 'w-full h-full max-w-6xl'}`}>
              
              {/* LEFT NAVIGATION BUTTON */}
              <button
                className="popup-page-nav-left"
                onClick={prevPage}
                disabled={currentPage === 0 || isFlipping}
              >
                <ChevronLeft size={24} />
              </button>

              {/* RIGHT NAVIGATION BUTTON */}
              <button
                className="popup-page-nav-right"
                onClick={nextPage}
                disabled={isFlipping}
              >
                <ChevronRight size={24} />
              </button>
              
              {/* Book Base/Table Surface */}
              <div className="popup-book-surface"></div>
              
              {/* NEW POPUP BOOK STRUCTURE - Left/Right Pages */}
              <div className="popup-book-wrapper">
                
                {/* Book Spine (Center Binding) */}
                <div className="popup-book-fold"></div>
               
                {/* LEFT PAGE - Static (never animates) */}
                <div className="popup-page-left">
                  <div className="story-content">
                    {/* Left page content */}
                    <div className="absolute left-8 top-8 bottom-8 w-px bg-blue-200/40"></div>
                    <div className="absolute left-12 top-8 bottom-8 w-px bg-blue-100/30"></div>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
                      {(currentPage * 2) + 1}
                    </div>
                  </div>
                </div>

                {/* RIGHT PAGE - Animating page (flips on navigation) */}
                <div className="popup-page-right">
                  <div className="story-content">
                    {/* Right page content */}
                    <div className="absolute right-8 top-8 bottom-8 w-px bg-blue-200/40"></div>
                    <div className="absolute right-12 top-8 bottom-8 w-px bg-blue-100/30"></div>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
                      {(currentPage * 2) + 2}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* POPUP FLOATING ILLUSTRATIONS - MOVED OUTSIDE popup-flip-book-container */}
            <div className="popup-floating-illustrations">
              {currentFloatingElements?.scene && showFloatingElements && (
                <div 
                  className={`popup-floating-illustration scene-illustration ${showFloatingElements ? 'active' : ''} popup-entrance-center`}
                  style={{ 
                    backgroundImage: `url(${currentFloatingElements.scene.image})`,
                    animationDelay: '0.4s'
                  }}
                ></div>
              )}
            </div>
          </div>
        </div>

        {/* POPUP FLOATING DIALOG RECTANGLE - POSITIONED BY CSS */}
        <div className={`popup-floating-dialog-container ${showQuestion ? 'hidden' : ''}`}>
          <div className="story-content-wrapper">
            {/* Story Title */}
            <div className="story-title-section">
              <h2 className="story-title">{storyPages[currentPage].title}</h2>
            </div>
            
            {/* Story Narration */}
            <div className="narration-section">
              <p className="narration-text">{storyPages[currentPage].narration}</p>
            </div>
            
            {/* Character Dialog */}
            {storyPages[currentPage].character && (
              <div className="dialog-section">
                <p className="dialog-text">{storyPages[currentPage].character}</p>
              </div>
            )}
          </div>
        </div>

        {/* Question Dialog */}
        <Dialog open={showQuestion} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-md bg-blue-50 z-[10001]">
            <DialogHeader>
              <DialogTitle className="text-blue-800 font-serif">Question</DialogTitle>
              <DialogDescription className="text-blue-700">
                {storyPages[currentPage].question}
              </DialogDescription>
            </DialogHeader>
            <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
              {storyPages[currentPage].options.map((option) => (
                <div key={option.id} className="flex items-center space-x-2 my-2">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id} className="text-blue-800">{option.text}</Label>
                </div>
              ))}
            </RadioGroup>
            {hasAnswered && (
              <div className={`mt-4 p-2 rounded text-sm font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {feedback}
              </div>
            )}
            <DialogFooter className="mt-4 gap-2">
              {hasAnswered ? (
                <>
                  {isCorrect ? (
                    <Button onClick={continueStory} className="bg-green-600 hover:bg-green-700 text-white">
                      <Check size={16} className="mr-2" /> Continue
                    </Button>
                  ) : (
                    <Button onClick={tryAgain} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <RefreshCw size={16} className="mr-2" /> Try Again
                    </Button>
                  )}
                </>
              ) : (
                <Button 
                  onClick={handleAnswerSubmit} 
                  disabled={!selectedAnswer} 
                  className="bg-blue-700 hover:bg-blue-600 text-white"
                >
                  Submit
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Story Complete Dialog */}
        <Dialog open={isStoryComplete} onOpenChange={setIsStoryComplete}>
          <DialogContent className="max-w-md bg-blue-50 z-[10001]">
            <DialogHeader>
              <DialogTitle className="text-blue-800 font-serif">Story Complete!</DialogTitle>
              <DialogDescription className="text-blue-700">
                You've reached the end of "The Necklace and the Comb" story.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-between mt-4">
              <Button onClick={restartStory} className="bg-blue-700 hover:bg-blue-600 text-white">
                <RefreshCw size={16} className="mr-2" /> Read Again
              </Button>
              <Link href="/student/twodanimation">
                <Button className="bg-blue-700 hover:bg-blue-600 text-white">
                  <Home size={16} className="mr-2" /> Back to Stories
                </Button>
              </Link>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}