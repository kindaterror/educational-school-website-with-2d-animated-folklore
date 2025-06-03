// == IMPORTS & DEPENDENCIES ==
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {  Search, ChevronLeft, CheckCircle, XCircle, GraduationCap, Users, UserCheck} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// == ADMIN TEACHER COMPONENT ==
export default function AdminTeacher() {
  
  // == HOOKS & STATE ==
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("approved");

  // == DATA FETCHING ==
  const {
    data: teachersData,
    isLoading
  } = useQuery({
    queryKey: ["teachers", activeTab, searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/teachers?status=${activeTab}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch teachers");
      }
      
      return response.json();
    }
  });

  const { data: pendingTeachersData } = useQuery({
    queryKey: ["teachers", "pending"],
    queryFn: async () => {
      const response = await fetch("/api/teachers?status=pending", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch pending teachers");
      }
      
      return response.json();
    }
  });

  // == MUTATIONS ==
  const approveMutation = useMutation({
    mutationFn: async (teacherId: number) => {
      console.log("Approving teacher with ID:", teacherId);
      
      try {
        const response = await fetch(`/api/teachers/${teacherId}/approve`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify({})
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Server response:", errorText);
          throw new Error(`Failed to approve teacher: ${response.status} ${response.statusText}`);
        }
        
        let data;
        const text = await response.text();
        try {
          data = text ? JSON.parse(text) : {};
        } catch (e) {
          console.warn("Could not parse JSON response:", text);
          data = {};
        }
        
        return data;
      } catch (error) {
        console.error("Error in approve mutation:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Success: Teacher approved successfully", data);
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      
      toast({
        title: "Success",
        description: "Teacher account has been approved",
        variant: "default",
      });
    },
    onError: (err) => {
      console.error("Error approving teacher:", err);
      toast({
        title: "Error",
        description: "Failed to approve teacher account",
        variant: "destructive",
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ teacherId, reason }: { teacherId: number; reason: string }) => {
      console.log("Rejecting teacher with ID:", teacherId, "Reason:", reason);
      
      try {
        const response = await fetch(`/api/teachers/${teacherId}/reject`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify({ reason })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Server response:", errorText);
          throw new Error(`Failed to reject teacher: ${response.status} ${response.statusText}`);
        }
        
        let data;
        const text = await response.text();
        try {
          data = text ? JSON.parse(text) : {};
        } catch (e) {
          console.warn("Could not parse JSON response:", text);
          data = {};
        }
        
        return data;
      } catch (error) {
        console.error("Error in reject mutation:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Success: Teacher rejected successfully", data);
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setIsRejectDialogOpen(false);
      setRejectionReason("");
      
      toast({
        title: "Success",
        description: "Teacher account has been rejected",
        variant: "default",
      });
    },
    onError: (err) => {
      console.error("Error rejecting teacher:", err);
      toast({
        title: "Error",
        description: "Failed to reject teacher account",
        variant: "destructive",
      });
    }
  });

  // == EVENT HANDLERS ==
  const handleApproveTeacher = (teacherId: number) => {
    console.log("Approve button clicked for teacher ID:", teacherId);
    approveMutation.mutate(teacherId);
  };

  const handleRejectTeacher = (teacherId: number) => {
    setSelectedTeacherId(teacherId);
    setIsRejectDialogOpen(true);
  };

  const handleRejectSubmit = () => {
    if (selectedTeacherId !== null) {
      rejectMutation.mutate({
        teacherId: selectedTeacherId,
        reason: rejectionReason
      });
    }
  };

  // == COMPUTED VALUES ==
  const pendingCount = pendingTeachersData?.teachers?.length || 0;

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
          <h1 className="text-3xl font-heading font-bold text-center mb-2">👨‍🏫 Teacher Management</h1>
          <p className="text-lg text-blue-100 text-center">Manage educator accounts and approvals</p>
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

          {/* == Search Section == */}
          <div className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-lg mb-8">
            <div className="border-b border-brand-gold-200 p-6">
              <h3 className="text-xl font-heading font-bold text-ilaw-navy flex items-center">
                <Users className="h-6 w-6 text-ilaw-gold mr-2" />
                🔍 Search Teachers
              </h3>
            </div>
            <div className="p-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gold-500" size={18} />
                <Input
                  placeholder="Search teachers..."
                  className="pl-10 border-2 border-brand-gold-200 focus:border-ilaw-gold"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* == Teachers Directory Section == */}
          <div className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-lg">
            <div className="border-b border-brand-gold-200 p-6">
              <h3 className="text-xl font-heading font-bold text-ilaw-navy flex items-center">
                <UserCheck className="h-6 w-6 text-ilaw-gold mr-2" />
                👨‍🏫 Teacher Directory
              </h3>
            </div>
            <div className="pt-6 px-6 pb-0">
              <Tabs 
                defaultValue="approved" 
                value={activeTab} 
                onValueChange={setActiveTab}
                className="space-y-4"
              >
                
                {/* == Tab Navigation == */}
                <TabsList className="grid grid-cols-3 bg-brand-gold-100 rounded-xl">
                  <TabsTrigger 
                    value="approved" 
                    className="font-heading font-bold data-[state=active]:bg-ilaw-navy data-[state=active]:text-white"
                  >
                    ✅ Approved Teachers
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
                
                {/* == Approved Teachers Tab == */}
                <TabsContent value="approved" className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-brand-gold-200">
                        <TableHead className="font-heading font-bold text-ilaw-navy">👤 Name</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">📧 Email</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">👤 Username</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">📅 Join Date</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">⚙️ Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && activeTab === "approved" ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-brand-gold-600 font-medium">
                            👨‍🏫 Loading teachers...
                          </TableCell>
                        </TableRow>
                      ) : activeTab === "approved" && !teachersData?.teachers?.length ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-brand-gold-600 font-medium">
                            👨‍🏫 No approved teachers found
                          </TableCell>
                        </TableRow>
                      ) : activeTab === "approved" && (
                        teachersData.teachers.map((teacher: any) => (
                          <TableRow key={teacher.id} className="border-b border-brand-gold-100 hover:bg-brand-gold-50 transition-colors">
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-brand-gold-100 border-2 border-brand-gold-200 flex items-center justify-center mr-3 text-ilaw-navy font-bold">
                                  {teacher.firstName?.[0]}{teacher.lastName?.[0]}
                                </div>
                                <div>
                                  <div className="font-heading font-bold text-ilaw-navy">{teacher.firstName} {teacher.lastName}</div>
                                  <div className="text-sm text-brand-gold-600 font-medium">@{teacher.username}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-brand-gold-600 font-medium">{teacher.email}</TableCell>
                            <TableCell className="text-brand-gold-600 font-medium">{teacher.username}</TableCell>
                            <TableCell className="text-brand-gold-600 font-medium">
                              {teacher.createdAt 
                                ? new Date(teacher.createdAt).toLocaleDateString() 
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-600 hover:bg-red-50 font-bold"
                                  onClick={() => handleRejectTeacher(teacher.id)}
                                  disabled={rejectMutation.isPending}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  ❌ Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
                
                {/* == Pending Teachers Tab == */}
                <TabsContent value="pending" className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-brand-gold-200">
                        <TableHead className="font-heading font-bold text-ilaw-navy">👤 Name</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">📧 Email</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">👤 Username</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">📅 Join Date</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">⚙️ Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && activeTab === "pending" ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-brand-gold-600 font-medium">
                            ⏳ Loading pending teachers...
                          </TableCell>
                        </TableRow>
                      ) : activeTab === "pending" && !teachersData?.teachers?.length ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-brand-gold-600 font-medium">
                            ⏳ No pending teachers found
                          </TableCell>
                        </TableRow>
                      ) : activeTab === "pending" && (
                        teachersData.teachers.map((teacher: any) => (
                          <TableRow key={teacher.id} className="border-b border-brand-gold-100 hover:bg-brand-gold-50 transition-colors">
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-brand-gold-100 border-2 border-brand-gold-200 flex items-center justify-center mr-3 text-ilaw-navy font-bold">
                                  {teacher.firstName?.[0]}{teacher.lastName?.[0]}
                                </div>
                                <div>
                                  <div className="font-heading font-bold text-ilaw-navy">{teacher.firstName} {teacher.lastName}</div>
                                  <div className="text-sm text-brand-gold-600 font-medium">@{teacher.username}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-brand-gold-600 font-medium">{teacher.email}</TableCell>
                            <TableCell className="text-brand-gold-600 font-medium">{teacher.username}</TableCell>
                            <TableCell className="text-brand-gold-600 font-medium">
                              {teacher.createdAt 
                                ? new Date(teacher.createdAt).toLocaleDateString() 
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline" 
                                  size="sm"
                                  className="flex items-center text-green-600 border-green-600 hover:bg-green-50 font-bold"
                                  onClick={() => handleApproveTeacher(teacher.id)}
                                  disabled={approveMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  {approveMutation.isPending ? "Approving..." : "✅ Approve"}
                                </Button>
                                <Button
                                  variant="outline" 
                                  size="sm"
                                  className="flex items-center text-red-600 border-red-600 hover:bg-red-50 font-bold"
                                  onClick={() => handleRejectTeacher(teacher.id)}
                                  disabled={rejectMutation.isPending}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  ❌ Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
                
                {/* == Rejected Teachers Tab == */}
                <TabsContent value="rejected" className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-brand-gold-200">
                        <TableHead className="font-heading font-bold text-ilaw-navy">👤 Name</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">📧 Email</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">👤 Username</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">❌ Rejection Reason</TableHead>
                        <TableHead className="font-heading font-bold text-ilaw-navy">⚙️ Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && activeTab === "rejected" ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-brand-gold-600 font-medium">
                            ❌ Loading rejected teachers...
                          </TableCell>
                        </TableRow>
                      ) : activeTab === "rejected" && !teachersData?.teachers?.length ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-brand-gold-600 font-medium">
                            ❌ No rejected teachers found
                          </TableCell>
                        </TableRow>
                      ) : activeTab === "rejected" && (
                        teachersData.teachers.map((teacher: any) => (
                          <TableRow key={teacher.id} className="border-b border-brand-gold-100 hover:bg-brand-gold-50 transition-colors">
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-brand-gold-100 border-2 border-brand-gold-200 flex items-center justify-center mr-3 text-ilaw-navy font-bold">
                                  {teacher.firstName?.[0]}{teacher.lastName?.[0]}
                               </div>
                                <div>
                                  <div className="font-heading font-bold text-ilaw-navy">{teacher.firstName} {teacher.lastName}</div>
                                  <div className="text-sm text-brand-gold-600 font-medium">@{teacher.username}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-brand-gold-600 font-medium">{teacher.email}</TableCell>
                            <TableCell className="text-brand-gold-600 font-medium">{teacher.username}</TableCell>
                            <TableCell>
                              <span className="text-red-600 font-medium">
                                {teacher.rejectionReason || "No reason provided"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline" 
                                  size="sm"
                                  className="flex items-center text-green-600 border-green-600 hover:bg-green-50 font-bold"
                                  onClick={() => handleApproveTeacher(teacher.id)}
                                  disabled={approveMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  {approveMutation.isPending ? "Approving..." : "✅ Approve"}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>

      {/* == Reject Dialog == */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="border-2 border-brand-gold-200">
          <DialogHeader>
            <DialogTitle className="text-ilaw-navy font-heading font-bold">❌ Reject Teacher Account</DialogTitle>
            <DialogDescription className="text-brand-gold-600">
              Please provide a reason for rejecting this teacher account. This will be visible to the teacher.
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            placeholder="Rejection reason (optional)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="min-h-[100px] border-2 border-brand-gold-200 focus:border-ilaw-gold"
          />
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRejectDialogOpen(false)}
              className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-bold"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectSubmit}
              disabled={rejectMutation.isPending}
              className="bg-red-600 hover:bg-red-700 font-bold"
            >
              {rejectMutation.isPending ? "Rejecting..." : "❌ Reject Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}