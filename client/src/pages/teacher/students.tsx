import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Search, Filter, Eye, PenSquare,  ChevronLeft, Users, GraduationCap, BookOpen, Award, Target} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Book, BookOpenCheck } from "lucide-react";

//  FIXED: Format reading time to handle seconds and display H:MM:SS format
const formatTime = (totalSeconds: number) => {
  if (!totalSeconds || totalSeconds === 0) return "0:00:00";
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

function TeacherStudents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);

  //  Fetch approved students only
  const { data: studentsData, isLoading, error } = useQuery({
    queryKey: ["/api/students", "approved", gradeFilter, searchTerm],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        params.append("status", "approved");
        
        if (gradeFilter !== "all") {
          params.append("grade", gradeFilter);
        }
        
        if (searchTerm && searchTerm.trim() !== "") {
          params.append("search", searchTerm);
        }
        
        const queryString = params.toString();
        const url = `/api/students?${queryString}`;
        
        console.log("Fetching approved students from:", url);
        
        const token = localStorage.getItem("token");
        
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API error:", response.status, errorText);
          throw new Error(`API error: ${response.status} - ${errorText || "Unknown error"}`);
        }
        
        const data = await response.json();
        console.log("Students data received:", {
          count: data.students?.length || 0,
          sampleStudent: data.students?.[0] || "No students",
          studentIds: data.students?.map((s: any) => s.id) || []
        });
        
        return data;
      } catch (err) {
        console.error("Failed to fetch students:", err);
        throw err;
      }
    },
    retry: 1,
  });

  //  FIXED: Progress data fetching - matching admin exactly
  const { data: progressData } = useQuery({
    queryKey: ["/api/progress"],
    queryFn: async () => {
      const response = await fetch("/api/progress", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch progress data");
      }
      
      return response.json();
    }
  });

  // FIXED: Helper functions matching admin exactly
  const getUniqueStudentProgress = (studentId: number) => {
    if (!progressData?.progress) return [];
    
    const studentProgress = progressData.progress.filter((p: any) => p.userId === studentId);
    
    // Create a map to store only the latest progress for each book
    const latestProgressMap = new Map();
    
    studentProgress.forEach((progress: any) => {
      const existingProgress = latestProgressMap.get(progress.bookId);
      if (!existingProgress || new Date(progress.lastReadAt) > new Date(existingProgress.lastReadAt)) {
        latestProgressMap.set(progress.bookId, progress);
      }
    });
    
    // Return array of unique progress records with book titles
    return Array.from(latestProgressMap.values());
  };

  // FIXED: Calculate average progress for a student (using unique books)
  const calculateAverageProgress = (studentId: number) => {
    const uniqueProgress = getUniqueStudentProgress(studentId);
    
    if (uniqueProgress.length === 0) return 0;
   
    const sum = uniqueProgress.reduce((acc: number, curr: any) => {
      const percent = typeof curr.percentComplete === 'number' 
        ? curr.percentComplete 
        : parseFloat(curr.percentComplete || 0);
      return acc + (isNaN(percent) ? 0 : percent);
    }, 0);
    
    return Math.round(sum / uniqueProgress.length);
  };
  
  // FIXED: Count completed books for a student (using unique books)
  const getCompletedBooksCount = (studentId: number) => {
    const uniqueProgress = getUniqueStudentProgress(studentId);
    
    const completedBooks = uniqueProgress.filter((p: any) => {
      const percent = typeof p.percentComplete === 'number' 
        ? p.percentComplete 
        : parseFloat(p.percentComplete || 0);
      
      return percent >= 99.5;
    });
    
    return completedBooks.length;
  };

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // Filter students based on search and grade
  const filteredStudents = studentsData?.students?.filter((student: any) => {
    const matchesSearch = !searchTerm || 
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.username.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesGrade = gradeFilter === "all" || student.gradeLevel === gradeFilter;
    
    return matchesSearch && matchesGrade;
  }) || [];

  // Error display
  if (error) {
    console.error("Rendering error state:", error);
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-gold-50 to-ilaw-white">
        <Header variant="teacher" />
        <div className="container mx-auto p-6 text-center">
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-8 mb-6 shadow-lg">
            <h2 className="text-2xl font-heading font-bold text-red-700 mb-4">Error Loading Students</h2>
            <p className="text-red-600 font-medium">{error instanceof Error ? error.message : "Unknown error occurred"}</p>
          </div>
          <Link href="/teacher">
            <Button variant="outline" className="border-2 border-ilaw-gold text-ilaw-navy hover:bg-ilaw-gold">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-gold-50 to-ilaw-white">
      <Header variant="teacher" />
      
      <main className="flex-grow p-4 md:p-6">
        <div className="container mx-auto">
          {/* Page Header */}
          <div className="bg-gradient-to-r from-brand-amber to-ilaw-gold rounded-2xl p-8 mb-8 text-ilaw-navy shadow-ilaw">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center mb-2">
                  <Users className="h-8 w-8 mr-3" />
                  <span className="text-sm font-semibold uppercase tracking-wide opacity-80">
                    Student Management
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">Enrolled Students</h1>
                <p className="text-lg opacity-80">
                  Monitor and track your students' learning progress
                </p>
              </div>
              <div className="mt-6 md:mt-0">
                <Link href="/teacher">
                  <Button variant="outline" className="border-2 border-ilaw-navy text-ilaw-navy hover:bg-ilaw-navy hover:text-ilaw-gold font-semibold px-6 py-3">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          
          {/* Search and Filter Section */}
          <div className="bg-ilaw-white rounded-xl shadow-lg border-2 border-brand-gold-200 p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-6">
              <form onSubmit={handleSearch} className="w-full md:w-2/3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-brand-gold-400" size={20} />
                  <Input
                    placeholder="Search by name, email, or username..."
                    className="pl-12 h-12 text-lg border-2 border-brand-gold-200 focus:border-ilaw-gold rounded-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </form>
              
              <div className="w-full md:w-1/3">
                <Select 
                  value={gradeFilter} 
                  onValueChange={setGradeFilter}
                >
                  <SelectTrigger className="h-12 border-2 border-brand-gold-200 focus:border-ilaw-gold rounded-lg">
                    <SelectValue>
                      <div className="flex items-center">
                        <Filter className="w-5 h-5 mr-3 text-ilaw-gold" />
                        <span className="font-medium">
                          {gradeFilter === "all" ? "All Grades" : 
                            gradeFilter === "K" ? "Kindergarten" : `Grade ${gradeFilter}`}
                        </span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    <SelectItem value="K">Kindergarten</SelectItem>
                    <SelectItem value="1">Grade 1</SelectItem>
                    <SelectItem value="2">Grade 2</SelectItem>
                    <SelectItem value="3">Grade 3</SelectItem>
                    <SelectItem value="4">Grade 4</SelectItem>
                    <SelectItem value="5">Grade 5</SelectItem>
                    <SelectItem value="6">Grade 6</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Students Table */}
          <div className="bg-ilaw-white rounded-xl shadow-lg border-2 border-brand-gold-200 overflow-hidden">
            <div className="bg-gradient-to-r from-ilaw-navy to-brand-navy-800 p-4">
              <h2 className="text-xl font-heading font-bold text-ilaw-gold flex items-center">
                <GraduationCap className="h-6 w-6 mr-3" />
                Student Directory
              </h2>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow className="bg-brand-gold-50">
                  <TableHead className="font-heading font-bold text-ilaw-navy">STUDENT</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">EMAIL</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">GRADE LEVEL</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">JOIN DATE</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">PROGRESS</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">COMPLETED</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-ilaw-gold border-t-transparent mr-3"></div>
                        <span className="text-brand-gold-600 font-medium">Loading students...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length > 0 ? (
                  filteredStudents.map((student: any) => (
                    <TableRow key={student.id} className="hover:bg-brand-gold-50 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-ilaw-gold to-brand-amber flex items-center justify-center mr-4 text-ilaw-navy font-bold text-lg">
                            {student.firstName[0]}{student.lastName[0]}
                          </div>
                          <div>
                            <div className="font-heading font-semibold text-ilaw-navy">
                              {student.firstName} {student.lastName}
                            </div>
                            <div className="text-sm text-brand-gold-600">@{student.username}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-brand-gold-600">{student.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-ilaw-gold text-ilaw-navy font-semibold">
                          {student.gradeLevel ? 
                            (student.gradeLevel === 'K' ? 'Kindergarten' : `Grade ${student.gradeLevel}`) : 
                            'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-brand-gold-600">
                        {new Date(student.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Progress 
                            value={calculateAverageProgress(student.id)} 
                            className="h-3 w-24 bg-brand-gold-200" 
                          />
                          <span className="text-sm font-semibold text-ilaw-navy">
                            {calculateAverageProgress(student.id)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <BookOpenCheck className="h-4 w-4 text-ilaw-gold mr-2" />
                          <span className="font-semibold text-ilaw-navy">
                            {getCompletedBooksCount(student.id)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 w-9 p-0 border-ilaw-gold text-ilaw-gold hover:bg-ilaw-gold hover:text-ilaw-navy"
                            onClick={() => {
                              setSelectedStudent(student);
                              setShowProgressDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 w-9 p-0 border-brand-amber text-brand-amber hover:bg-brand-amber hover:text-ilaw-navy"
                          >
                            <PenSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <Users className="h-16 w-16 text-brand-gold-300 mb-4" />
                        <p className="text-xl font-heading font-semibold text-brand-gold-600 mb-2">
                          No approved students found
                        </p>
                        <p className="text-brand-gold-500">
                          Students need to be approved by an admin to appear here
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            <div className="px-6 py-4 border-t border-brand-gold-200 bg-brand-gold-50">
              <p className="text-sm font-medium text-brand-gold-600 flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Showing {filteredStudents.length} approved students
              </p>
            </div>
          </div>
          
          {/* Student Progress Dialog */}
          <Dialog 
            open={showProgressDialog} 
            onOpenChange={setShowProgressDialog}
          >
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto bg-ilaw-white border-2 border-ilaw-gold">
              <DialogHeader className="border-b border-brand-gold-200 pb-4">
                <DialogTitle className="text-xl font-heading font-bold text-ilaw-navy flex items-center">
                  <Award className="h-6 w-6 text-ilaw-gold mr-3" />
                  Student Progress Details
                </DialogTitle>
                <DialogDescription className="text-brand-gold-600 font-medium">
                  Detailed reading progress for {selectedStudent?.firstName} {selectedStudent?.lastName}
                </DialogDescription>
              </DialogHeader>
              
              {selectedStudent ? (
                <div className="space-y-6">
                  {/* Progress Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-2 border-ilaw-gold hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="bg-gradient-to-br from-ilaw-gold to-brand-amber p-3 rounded-full mb-3">
                          <BookOpen className="h-6 w-6 text-ilaw-navy" />
                        </div>
                        <div className="text-2xl font-heading font-bold text-ilaw-gold mb-1">
                          {calculateAverageProgress(selectedStudent.id)}%
                        </div>
                        <div className="text-xs font-semibold text-gray-600">📊 Average Progress</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-2 border-green-200 hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-3 rounded-full mb-3">
                          <BookOpenCheck className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-2xl font-heading font-bold text-green-600 mb-1">
                          {getCompletedBooksCount(selectedStudent.id)}
                        </div>
                        <div className="text-xs font-semibold text-gray-600">📚 Books Completed</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-2 border-blue-200 hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="bg-gradient-to-br from-blue-400 to-indigo-500 p-3 rounded-full mb-3">
                          <Book className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-2xl font-heading font-bold text-blue-600 mb-1">
                          {getUniqueStudentProgress(selectedStudent.id).length}
                        </div>
                        <div className="text-xs font-semibold text-gray-600">📖 Books Started</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Book Progress Details */}
                  <div>
                    <h4 className="text-lg font-heading font-bold text-ilaw-navy mb-3 flex items-center">
                      📚 Book Progress Details
                      <span className="text-xs text-brand-gold-500 ml-2">
                        ({getUniqueStudentProgress(selectedStudent.id).length} records)
                      </span>
                    </h4>
                    <div className="rounded-xl border-2 border-brand-gold-200 overflow-hidden max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-brand-gold-50 hover:bg-brand-gold-50">
                            <TableHead className="font-heading font-bold text-ilaw-navy">BOOK TITLE</TableHead>
                            <TableHead className="font-heading font-bold text-ilaw-navy">COMPLETION</TableHead>
                            <TableHead className="font-heading font-bold text-ilaw-navy">LAST READ</TableHead>
                            <TableHead className="font-heading font-bold text-ilaw-navy">TIME</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getUniqueStudentProgress(selectedStudent.id).length > 0 ? (
                            getUniqueStudentProgress(selectedStudent.id).map((progress: any, index: number) => {
                              const percentComplete = typeof progress.percentComplete === 'number' 
                                ? progress.percentComplete 
                                : parseFloat(progress.percentComplete || 0);
                              
                              const lastRead = progress.lastReadAt || progress.last_read_at || progress.updatedAt;
                              // FIXED: Convert totalReadingTime from seconds to h:mm:ss format
                              const readingTimeInSeconds = progress.totalReadingTime || progress.total_reading_time || 0;
                              const readingTime = formatTime(readingTimeInSeconds);
                              
                              return (
                                <TableRow key={`${progress.bookId}-${index}`} className="border-b border-brand-gold-100">
                                  <TableCell className="font-medium">
                                    <div className="flex items-center space-x-3">
                                      <div className="p-2 rounded-lg bg-gradient-to-br from-ilaw-gold to-brand-amber">
                                        <Book className="h-4 w-4 text-ilaw-navy" />
                                      </div>
                                      <span className="text-ilaw-navy font-semibold">
                                        {progress.book?.title || `Book #${progress.bookId}`}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-3">
                                      <Progress 
                                        value={percentComplete} 
                                        className="flex-1 h-3 bg-brand-gold-200" 
                                      />
                                      <span className="text-sm font-bold text-ilaw-navy w-12 text-right">
                                        {Math.round(percentComplete)}%
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-brand-gold-600">
                                    {lastRead ? (
                                      <div className="text-sm">
                                        <div className="font-semibold">
                                          {new Date(lastRead).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs text-brand-gold-500">
                                          {new Date(lastRead).toLocaleTimeString([], { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                          })}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-brand-gold-400 text-sm">Not read</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-2">
                                      <div className="p-1 rounded bg-blue-100">
                                        <svg className="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                        </svg>
                                      </div>
                                      <span className="text-sm font-semibold text-blue-700">
                                        {readingTime}
                                      </span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8">
                                <div className="flex flex-col items-center space-y-3">
                                  <div className="p-4 rounded-full bg-brand-gold-100">
                                    <Book className="h-8 w-8 text-brand-gold-400" />
                                  </div>
                                  <div>
                                    <p className="font-heading font-bold text-brand-gold-600 mb-1">
                                      📚 No reading progress yet
                                    </p>
                                    <p className="text-sm text-brand-gold-500">
                                      Student hasn't started reading any books
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-brand-gold-600">No student selected</p>
                </div>
              )}
              
              <DialogFooter className="border-t border-brand-gold-200 pt-4">
                <Button 
                  onClick={() => setShowProgressDialog(false)}
                  className="bg-ilaw-gold hover:bg-brand-amber text-ilaw-navy font-heading font-bold"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}

export default TeacherStudents;