import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, Calendar, BarChart3, ChevronRight, ChevronLeft, ArrowUpRight, TrendingUp} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger,} from "@/components/ui/tabs";

export default function StudentProgress() {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch user progress
  const { data: progressData, isLoading } = useQuery({
    queryKey: ["/api/progress"],
    queryFn: async () => {
      const response = await fetch("/api/progress", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch progress");
      }
      
      return response.json();
    }
  });

  // Helper function to remove duplicates and keep latest progress per book
  const getUniqueProgress = (progressArray: any[]) => {
    if (!progressArray) return [];
    
    return progressArray.reduce((unique: any[], progress: any) => {
      const existingIndex = unique.findIndex(p => p.bookId === progress.bookId);
      if (existingIndex === -1) {
        // Book not in array yet, add it
        unique.push(progress);
      } else {
        // Book already exists, keep the one with more recent lastReadAt
        if (new Date(progress.lastReadAt) > new Date(unique[existingIndex].lastReadAt)) {
          unique[existingIndex] = progress;
        }
      }
      return unique;
    }, []);
  };

  // FIXED: Format reading time to handle seconds and display H:MM:SS format
  const formatReadingTime = (totalSeconds: number) => {
    if (!totalSeconds || totalSeconds === 0) return "0:00:00";
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate overview stats
  const getStats = () => {
    if (!progressData?.progress) {
      return {
        booksCompleted: 0,
        booksInProgress: 0,
        totalReadingTime: 0,
        completionRate: 0
      };
    }

    // Use unique progress data for stats calculation
    const uniqueProgress = getUniqueProgress(progressData.progress);
    
    const completed = uniqueProgress.filter((p: any) => p.percentComplete === 100).length;
    const inProgress = uniqueProgress.filter((p: any) => p.percentComplete > 0 && p.percentComplete < 100).length;
    
    // FIXED: Keep totalReadingTime in seconds for proper formatting
    const totalSeconds = uniqueProgress.reduce((sum: number, p: any) => sum + (p.totalReadingTime || 0), 0);
    
    // Calculate completion rate as percentage of started books that are completed
    const totalStarted = completed + inProgress;
    const completionRate = totalStarted > 0 ? Math.round((completed / totalStarted) * 100) : 0;

    return {
      booksCompleted: completed,
      booksInProgress: inProgress,
      totalReadingTime: totalSeconds, // FIXED: Keep in seconds
      completionRate
    };
  };

  const stats = getStats();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header variant="student" />
      
      <main className="flex-grow p-4 md:p-6">
        <div className="container mx-auto">
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold font-serif text-gray-900">My Reading Progress</h1>
                <p className="text-gray-600">Track your reading journey and accomplishments.</p>
              </div>
              <div className="mt-4 md:mt-0">
                <Link href="/student">
                  <Button variant="outline" className="flex items-center gap-2">
                    <ChevronLeft size={16} />
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="history">Reading History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Books Completed</p>
                        <h3 className="text-3xl font-semibold mt-1">{stats.booksCompleted}</h3>
                      </div>
                      <div className="bg-secondary-100 h-12 w-12 rounded-full flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-secondary-800" />
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                      <span className="text-green-500 flex items-center inline-flex">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        {stats.booksInProgress} books in progress
                      </span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Reading Time</p>
                        <h3 className="text-3xl font-semibold mt-1">{formatReadingTime(stats.totalReadingTime)}</h3>
                      </div>
                      <div className="bg-primary-100 h-12 w-12 rounded-full flex items-center justify-center">
                        <Clock className="h-6 w-6 text-primary-800" />
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                      <span className="text-green-500 flex items-center inline-flex">
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                        Average 30 min/day this week
                      </span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Completion Rate</p>
                        <h3 className="text-3xl font-semibold mt-1">{stats.completionRate}%</h3>
                      </div>
                      <div className="bg-green-100 h-12 w-12 rounded-full flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-green-800" />
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                      <span className="text-green-500 flex items-center inline-flex">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        Steadily improving
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Reading Progress Chart */}
              <div className="mb-6 border-2 border-brand-gold-200 hover:border-ilaw-gold transition-all duration-300 shadow-lg bg-white rounded-2xl">
                <div className="p-6 border-b border-brand-gold-200">
                  <h3 className="text-xl font-heading font-bold text-ilaw-navy">Reading Activity</h3>
                </div>
                <div className="p-6">
                  <div className="h-[300px] flex items-center justify-center">
                    {/* In a real app, this would be a chart showing reading activity over time */}
                    <div className="text-center">
                      <BarChart3 className="h-16 w-16 mx-auto text-brand-gold-300 mb-4" />
                      <h4 className="text-lg font-heading font-bold text-ilaw-navy mb-2">Your Reading Journey Awaits!</h4>
                      <p className="text-brand-gold-600 font-medium mb-1">Your reading activity chart will appear here</p>
                      <p className="text-sm text-brand-gold-500">Track your reading time and books completed over time</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Current Progress */}
              <div className="border-2 border-brand-gold-200 hover:border-ilaw-gold transition-all duration-300 shadow-lg bg-white rounded-2xl">
                <div className="p-6 border-b border-brand-gold-200">
                  <h3 className="text-xl font-heading font-bold text-ilaw-navy">Current Reading Progress</h3>
                </div>
                <div className="p-6">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-pulse">
                        <BookOpen className="h-12 w-12 mx-auto text-brand-gold-300 mb-4" />
                        <p className="text-brand-gold-600 font-medium">Loading your progress...</p>
                      </div>
                    </div>
                  ) : (() => {
                    // FIXED: Remove duplicates for current progress
                    const uniqueProgress = getUniqueProgress(progressData?.progress || []);
                    const inProgressBooks = uniqueProgress.filter((p: any) => p.percentComplete < 100);
                    
                    return inProgressBooks.length > 0 ? (
                      <div className="space-y-6">
                        {inProgressBooks
                          .sort((a: any, b: any) => new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime())
                          .slice(0, 3)
                          .map((progress: any) => (
                            <div key={progress.bookId} className="flex items-start p-4 bg-gradient-to-r from-brand-gold-50 to-ilaw-white rounded-xl border border-brand-gold-200 hover:shadow-md transition-all duration-300">
                              <div className="flex-shrink-0 w-16 h-24 bg-gradient-to-br from-brand-gold-100 to-brand-gold-200 rounded-lg flex items-center justify-center mr-4 shadow-sm">
                                {progress.book.coverImage ? (
                                  <img 
                                    src={progress.book.coverImage} 
                                    alt={progress.book.title}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <BookOpen className="h-6 w-6 text-ilaw-gold" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-heading font-bold text-ilaw-navy text-lg">{progress.book.title}</h4>
                                <p className="text-sm text-brand-gold-600 font-medium">
                                  {progress.currentChapter || "Chapter 1"} • Last read: {new Date(progress.lastReadAt).toLocaleDateString()}
                                </p>
                                <div className="mt-3">
                                  <div className="flex justify-between text-xs text-brand-gold-700 mb-2 font-medium">
                                    <span>Progress</span>
                                    <span>{progress.percentComplete}%</span>
                                  </div>
                                  <Progress value={progress.percentComplete} className="h-3" />
                                </div>
                                <div className="mt-3">
                                  <Button 
                                    variant="link" 
                                    className="p-0 h-auto text-ilaw-navy hover:text-ilaw-gold font-heading font-bold flex items-center transition-colors duration-200"
                                  >
                                    Continue Reading <ChevronRight className="h-4 w-4 ml-1" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BookOpen className="h-16 w-16 mx-auto text-brand-gold-300 mb-4" />
                        <h4 className="text-lg font-heading font-bold text-ilaw-navy mb-2">Ready to Start Your Learning Journey?</h4>
                        <p className="text-brand-gold-600 font-medium mb-1">No books in progress yet</p>
                        <p className="text-sm text-brand-gold-500">Choose a book from our collection to begin tracking your progress</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="history">
              <div className="border-2 border-brand-gold-200 hover:border-ilaw-gold transition-all duration-300 shadow-lg bg-white rounded-2xl">
                <div className="p-6 border-b border-brand-gold-200">
                  <h3 className="text-xl font-heading font-bold text-ilaw-navy">Reading History</h3>
                </div>
                <div className="p-6">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-pulse">
                        <BookOpen className="h-12 w-12 mx-auto text-brand-gold-300 mb-4" />
                        <p className="text-brand-gold-600 font-medium">Loading your history...</p>
                      </div>
                    </div>
                  ) : (() => {
                    // FIXED: Remove duplicates for reading history
                    const uniqueProgress = getUniqueProgress(progressData?.progress || []);
                    
                    return uniqueProgress.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-brand-gold-200">
                            <TableHead className="text-ilaw-navy font-heading font-bold">Book</TableHead>
                            <TableHead className="text-ilaw-navy font-heading font-bold">Type</TableHead>
                            <TableHead className="text-ilaw-navy font-heading font-bold">Progress</TableHead>
                            <TableHead className="text-ilaw-navy font-heading font-bold text-center w-28 whitespace-nowrap">Reading Time</TableHead>
                            <TableHead className="text-ilaw-navy font-heading font-bold">Last Read</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {uniqueProgress
                            .sort((a: any, b: any) => new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime())
                            .map((progress: any) => (
                              <TableRow key={progress.bookId} className="border-brand-gold-100 hover:bg-brand-gold-50 transition-colors duration-200">
                                <TableCell>
                                  <div className="flex items-center">
                                    <div className="w-10 h-14 bg-gradient-to-br from-brand-gold-100 to-brand-gold-200 rounded-lg flex items-center justify-center mr-3 shadow-sm">
                                      {progress.book.coverImage ? (
                                        <img 
                                          src={progress.book.coverImage} 
                                          alt={progress.book.title}
                                          className="w-full h-full object-cover rounded-lg"
                                        />
                                      ) : (
                                        <BookOpen className="h-4 w-4 text-ilaw-gold" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-heading font-bold text-ilaw-navy">{progress.book.title}</div>
                                      <div className="text-xs text-brand-gold-600 font-medium">{progress.currentChapter || "Chapter 1"}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    progress.book.type === 'storybook' 
                                      ? 'bg-brand-gold-100 text-ilaw-gold border border-brand-gold-200' 
                                      : 'bg-ilaw-navy-100 text-ilaw-navy border border-ilaw-navy-200'
                                  }`}>
                                    {progress.book.type === 'storybook' ? '📚 Storybook' : '🎓 Educational'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="w-full max-w-[100px]">
                                    <div className="text-xs text-brand-gold-700 mb-1 flex justify-between font-medium">
                                      <span>{progress.percentComplete}%</span>
                                      {progress.percentComplete === 100 && (
                                        <span className="text-green-600 font-bold">✓ Done</span>
                                      )}
                                    </div>
                                    <Progress value={progress.percentComplete} className="h-2" />
                                  </div>
                                </TableCell>
                                <TableCell className="text-brand-gold-700 font-medium text-center w-24">
                                  {formatReadingTime(progress.totalReadingTime || 0)}
                                </TableCell>
                                <TableCell className="text-brand-gold-600 font-medium">
                                  {new Date(progress.lastReadAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className={`font-heading font-bold transition-colors duration-200 ${
                                      progress.percentComplete === 100 
                                        ? 'text-green-600 hover:text-green-700' 
                                        : 'text-ilaw-navy hover:text-ilaw-gold hover:bg-brand-gold-50'
                                    }`}
                                    disabled={progress.percentComplete === 100}
                                  >
                                    {progress.percentComplete === 100 ? '✓ Completed' : 'Continue →'}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          }
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8">
                        <BookOpen className="h-16 w-16 mx-auto text-brand-gold-300 mb-4" />
                        <h4 className="text-lg font-heading font-bold text-ilaw-navy mb-2">Your Reading Adventure Begins Here!</h4>
                        <p className="text-brand-gold-600 font-medium mb-1">No reading history found yet</p>
                        <p className="text-sm text-brand-gold-500">Start reading to build your learning journey</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}