// == IMPORTS & DEPENDENCIES ==
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Search, Filter, Eye, Edit, Download, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle, Book, BookOpen, BookOpenCheck, GraduationCap, Users} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// == ADMIN STUDENTS COMPONENT ==
export default function AdminStudents() {
  
  // == STATE MANAGEMENT ==
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("approved");
  const [rejectReason, setRejectReason] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // == DATA FETCHING ==
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ["/api/students", activeTab, page, filter, searchTerm],
    queryFn: async () => {
      let url = `/api/students?status=${activeTab}`;
      if (page > 1) url += `&page=${page}`;
      if (filter !== "all") url += `&grade=${filter}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch students");
      }
   
      return response.json();
    }
  });

  const { data: pendingStudentsData } = useQuery({
    queryKey: ["/api/students", "pending"],
    queryFn: async () => {
      const response = await fetch("/api/students?status=pending", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch pending students");
      }
    
      return response.json();
    }
  });

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
  
  // == MUTATIONS ==
  const approveMutation = useMutation({
    mutationFn: (studentId: number) => {
      return apiRequest("POST", `/api/students/${studentId}/approve`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Student account has been approved",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to approve student account",
        variant: "destructive",
      });
      console.error("Error approving student:", error);
    }
  });
  
  const rejectMutation = useMutation({
    mutationFn: ({ studentId, reason }: { studentId: number; reason: string }) => {
      return apiRequest("POST", `/api/students/${studentId}/reject`, { reason });
    },
    onSuccess: () => {
      setRejectDialogOpen(false);
      setRejectReason("");
      toast({
        title: "Success",
        description: "Student account has been rejected",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reject student account",
        variant: "destructive",
      });
      console.error("Error rejecting student:", error);
    }
  });

  // == UTILITY FUNCTIONS ==
  const getUniqueStudentProgress = (studentId: number) => {
    if (!progressData?.progress) return [];
    
    const studentProgress = progressData.progress.filter((p: any) => p.userId === studentId);
    
    const latestProgressMap = new Map();
    
    studentProgress.forEach((progress: any) => {
      const existingProgress = latestProgressMap.get(progress.bookId);
      if (!existingProgress || new Date(progress.lastReadAt) > new Date(existingProgress.lastReadAt)) {
        latestProgressMap.set(progress.bookId, progress);
      }
    });
    
    return Array.from(latestProgressMap.values());
  };

  const getStudentProgress = (studentId: number) => {
    if (!progressData?.progress) return [];
    return progressData.progress.filter((p: any) => p.userId === studentId);
  };

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

  const formatTime = (seconds: number) => {
    if (seconds === 0) return '0:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // == EVENT HANDLERS ==
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    queryClient.invalidateQueries({ 
      queryKey: ["/api/students", activeTab, page, filter, searchTerm] 
    });
  };
  
  const handleApproveStudent = (student: any) => {
    approveMutation.mutate(student.id);
  };
  
  const handleRejectStudent = (student: any) => {
    setSelectedStudent(student);
    setRejectDialogOpen(true);
  };
  
  const confirmRejectStudent = () => {
    if (selectedStudent) {
      rejectMutation.mutate({
        studentId: selectedStudent.id,
        reason: rejectReason
      });
    }
  };
  
  // == COMPUTED VALUES ==
  const pendingCount = pendingStudentsData?.students?.length || 0;

  // == RENDER COMPONENT ==
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-ilaw-white via-brand-gold-50 to-brand-navy-50">
      <Header variant="admin" />
      
      {/* == Header Section == */}
      <div className="bg-ilaw-navy text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center mb-4">
            <GraduationCap className="h-8 w-8 text-ilaw-gold mr-3" />
            <span className="text-lg font-heading font-bold text-ilaw-gold">ILAW NG BAYAN LEARNING INSTITUTE</span>
          </div>
          <h1 className="text-3xl font-heading font-bold text-center mb-2">👥 Student Management</h1>
          <p className="text-lg text-blue-100 text-center">Manage learner accounts and track progress</p>
        </div>
      </div>
      
      <main className="flex-grow p-4 md:p-6">
        <div className="container mx-auto">
          
          {/* == Navigation Section == */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <Link href="/admin">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-heading font-bold mt-2 md:mt-0"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
          
          {/* == Search & Filter Section == */}
          <div className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-lg mb-8">
            <div className="border-b border-brand-gold-200 p-6">
              <h3 className="text-xl font-heading font-bold text-ilaw-navy flex items-center">
                <Users className="h-6 w-6 text-ilaw-gold mr-2" />
                🔍 Search & Filter Students
              </h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <form onSubmit={handleSearch} className="w-full md:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gold-500" size={18} />
                   <Input
                      placeholder="Search students..."
                      className="pl-10 w-full md:w-[300px] border-2 border-brand-gold-200 focus:border-ilaw-gold"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </form>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                  <div className="flex items-center gap-2">
                    <Filter size={18} className="text-ilaw-gold" />
                    <Select 
                      value={filter} 
                      onValueChange={(value) => {
                        setFilter(value);
                        setPage(1);
                        queryClient.invalidateQueries({ 
                          queryKey: ["/api/students", activeTab, 1, value, searchTerm] 
                        });
                      }}
                    >
                      <SelectTrigger className="w-[180px] border-2 border-brand-gold-200 focus:border-ilaw-gold">
                        <SelectValue placeholder="Select Grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">🎓 All Grades</SelectItem>
                        <SelectItem value="K">🌟 Kindergarten</SelectItem>
                        <SelectItem value="1">1️⃣ Grade 1</SelectItem>
                        <SelectItem value="2">2️⃣ Grade 2</SelectItem>
                        <SelectItem value="3">3️⃣ Grade 3</SelectItem>
                        <SelectItem value="4">4️⃣ Grade 4</SelectItem>
                        <SelectItem value="5">5️⃣ Grade 5</SelectItem>
                        <SelectItem value="6">6️⃣ Grade 6</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-heading font-bold"
                  >
                    <Download size={18} />
                    📊 Export
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* == Student Directory Section == */}
          <div className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-lg">
            <div className="border-b border-brand-gold-200 p-6">
              <h3 className="text-xl font-heading font-bold text-ilaw-navy flex items-center">
                <Users className="h-6 w-6 text-ilaw-gold mr-2" />
                👥 Student Directory
              </h3>
            </div>
            <div className="pt-6 px-6 pb-0">
              <Tabs 
                defaultValue="approved" 
                value={activeTab}
                onValueChange={(value) => {
                  setActiveTab(value);
                  setPage(1);
                  setFilter("all");
                  queryClient.invalidateQueries({ 
                    queryKey: ["/api/students", value, 1, "all", searchTerm] 
                  });
                }}
                className="space-y-4"
              >
                
                {/* == Tab Navigation == */}
                <TabsList className="grid grid-cols-3 bg-brand-gold-100 rounded-xl">
                  <TabsTrigger 
                    value="approved"
                    className="font-heading font-bold data-[state=active]:bg-ilaw-navy data-[state=active]:text-white"
                  >
                    ✅ Approved Students
                  </TabsTrigger>
                  <TabsTrigger 
                    value="pending" 
                    className="relative font-heading font-bold data-[state=active]:bg-ilaw-navy data-[state=active]:text-white"
                  >
                    ⏳ Pending Approval
                    {pendingCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="ml-2 absolute -top-2 -right-2"
                      >
                        {pendingCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="rejected"
                    className="font-heading font-bold data-[state=active]:bg-ilaw-navy data-[state=active]:text-white"
                  >
                    ❌ Rejected
                  </TabsTrigger>
                </TabsList>
                
                {/* == Approved Students Tab == */}
               <TabsContent value="approved" className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-brand-gold-200">
                        <TableHead className="font-heading font-bold text-ilaw-navy">👤 Name</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">📧 Email</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">🎓 Grade Level</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">📅 Join Date</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">📊 Overall Progress</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">📚 Books Completed</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">⚙️ Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-brand-gold-600 font-medium">
                            👥 Loading students...
                          </TableCell>
                        </TableRow>
                      ) : studentsData?.students?.length > 0 ? (
                        studentsData.students.map((student: any) => (
                          <TableRow key={student.id} className="border-b border-brand-gold-100 hover:bg-brand-gold-50 transition-colors">
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-brand-gold-100 border-2 border-brand-gold-200 flex items-center justify-center mr-3 text-ilaw-navy font-bold">
                                  {student.firstName[0]}{student.lastName[0]}
                                </div>
                                <div>
                                  <div className="font-heading font-bold text-ilaw-navy">{student.firstName} {student.lastName}</div>
                                  <div className="text-sm text-brand-gold-600 font-medium">@{student.username}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-brand-gold-600 font-medium">{student.email}</TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline"
                                className="border-2 border-brand-gold-300 text-brand-gold-600 font-bold"
                              >
                                {student.gradeLevel ? 
                                  (student.gradeLevel === 'K' ? '🌟 Kindergarten' : `${student.gradeLevel}️⃣ Grade ${student.gradeLevel}`) : 
                                  'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-brand-gold-600 font-medium">
                              {new Date(student.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="w-full">
                                <div className="flex justify-between text-xs text-ilaw-navy font-bold mb-1">
                                  <span>Progress</span>
                                  <span>{calculateAverageProgress(student.id)}%</span>
                                </div>
                                <Progress value={calculateAverageProgress(student.id)} className="h-2" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="default"
                                className="bg-ilaw-navy text-white font-bold"
                              >
                                📚 {getCompletedBooksCount(student.id)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 hover:bg-brand-gold-100 border-2 border-transparent hover:border-brand-gold-200"
                                  onClick={() => {
                                    setSelectedStudent(student);
                                    setShowProgressDialog(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 text-ilaw-navy" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 hover:bg-brand-gold-100 border-2 border-transparent hover:border-brand-gold-200"
                                >
                                  <Edit className="h-4 w-4 text-ilaw-navy" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-brand-gold-600 font-medium">
                            👥 No approved students found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
                
                {/* == Pending Students Tab == */}
               <TabsContent value="pending" className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-brand-gold-200">
                        <TableHead className="font-heading font-bold text-ilaw-navy">👤 Name</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">📧 Email</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">🎓 Grade Level</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">📅 Join Date</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">⚙️ Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-brand-gold-600 font-medium">
                            ⏳ Loading pending students...
                          </TableCell>
                        </TableRow>
                      ) : studentsData?.students?.length > 0 ? (
                        studentsData.students.map((student: any) => (
                          <TableRow key={student.id} className="border-b border-brand-gold-100 hover:bg-brand-gold-50 transition-colors">
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-brand-gold-100 border-2 border-brand-gold-200 flex items-center justify-center mr-3 text-ilaw-navy font-bold">
                                  {student.firstName[0]}{student.lastName[0]}
                                </div>
                                <div>
                                  <div className="font-heading font-bold text-ilaw-navy">{student.firstName} {student.lastName}</div>
                                  <div className="text-sm text-brand-gold-600 font-medium">@{student.username}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-brand-gold-600 font-medium">{student.email}</TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline"
                                className="border-2 border-brand-gold-300 text-brand-gold-600 font-bold"
                              >
                                {student.gradeLevel ? 
                                  (student.gradeLevel === 'K' ? '🌟 Kindergarten' : `${student.gradeLevel}️⃣ Grade ${student.gradeLevel}`) : 
                                  'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-brand-gold-600 font-medium">
                              {new Date(student.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="flex items-center text-green-600 border-green-600 hover:bg-green-50 font-bold"
                                  onClick={() => handleApproveStudent(student)}
                                  disabled={approveMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  ✅ Approve
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="flex items-center text-red-600 border-red-600 hover:bg-red-50 font-bold"
                                  onClick={() => handleRejectStudent(student)}
                                  disabled={rejectMutation.isPending}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  ❌ Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-brand-gold-600 font-medium">
                            ⏳ No pending students found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
                
                {/* == Rejected Students Tab == */}
                <TabsContent value="rejected" className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-brand-gold-200">
                        <TableHead className="font-heading font-bold text-ilaw-navy">👤 Name</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">📧 Email</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">🎓 Grade Level</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">📅 Join Date</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">❌ Rejection Reason</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">⚙️ Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-brand-gold-600 font-medium">
                            ❌ Loading rejected students...
                         </TableCell>
                        </TableRow>
                      ) : studentsData?.students?.length > 0 ? (
                        studentsData.students.map((student: any) => (
                          <TableRow key={student.id} className="border-b border-brand-gold-100 hover:bg-brand-gold-50 transition-colors">
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-brand-gold-100 border-2 border-brand-gold-200 flex items-center justify-center mr-3 text-ilaw-navy font-bold">
                                  {student.firstName[0]}{student.lastName[0]}
                                </div>
                                <div>
                                  <div className="font-heading font-bold text-ilaw-navy">{student.firstName} {student.lastName}</div>
                                  <div className="text-sm text-brand-gold-600 font-medium">@{student.username}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-brand-gold-600 font-medium">{student.email}</TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline"
                                className="border-2 border-brand-gold-300 text-brand-gold-600 font-bold"
                              >
                                {student.gradeLevel ? 
                                  (student.gradeLevel === 'K' ? '🌟 Kindergarten' : `${student.gradeLevel}️⃣ Grade ${student.gradeLevel}`) : 
                                  'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-brand-gold-600 font-medium">
                              {new Date(student.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-red-600 font-medium">
                              {student.rejectionReason || "No reason provided"}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="flex items-center text-green-600 border-green-600 hover:bg-green-50 font-bold"
                                onClick={() => handleApproveStudent(student)}
                                disabled={approveMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                ✅ Re-approve
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-brand-gold-600 font-medium">
                            ❌ No rejected students found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>

              {/* == Pagination Section == */}
              {studentsData?.totalPages > 1 && (
                <div className="flex items-center justify-between py-4">
                  <div className="text-sm text-brand-gold-600 font-medium">
                    Showing page {page} of {studentsData.totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-heading font-bold"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(studentsData.totalPages, page + 1))}
                      disabled={page === studentsData.totalPages}
                      className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-heading font-bold"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* == Progress Dialog == */}
      <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto bg-ilaw-white border-2 border-ilaw-gold">
          <DialogHeader className="border-b border-brand-gold-200 pb-4">
            <DialogTitle className="text-xl font-heading font-bold text-ilaw-navy flex items-center">
              <GraduationCap className="h-6 w-6 text-ilaw-gold mr-3" />
             Student Progress Details
            </DialogTitle>
            <DialogDescription className="text-brand-gold-600 font-medium">
              Detailed reading progress for {selectedStudent?.firstName} {selectedStudent?.lastName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedStudent && (
            <div className="space-y-6">
              
              {/* == Progress Statistics == */}
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

              {/* == Book Progress Table == */}
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

      {/* == Reject Dialog == */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ilaw-navy font-heading font-bold">❌ Reject Student Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject {selectedStudent?.firstName} {selectedStudent?.lastName}'s account? 
              Please provide a reason for rejection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-heading font-bold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRejectStudent}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-heading font-bold"
            >
              ❌ Reject Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}