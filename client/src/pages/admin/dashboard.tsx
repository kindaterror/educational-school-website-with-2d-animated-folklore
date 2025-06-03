// == IMPORTS & DEPENDENCIES ==
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Clock, TrendingUp, TrendingDown, BarChart3, Plus, GraduationCap, Shield} from "lucide-react";

// == ADMIN DASHBOARD COMPONENT ==
export default function AdminDashboard() {
  
  // == DATA FETCHING ==
  const { data: studentsData, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["/api/students", "approved"],
    queryFn: async () => {
      const response = await fetch("/api/students?status=approved", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch approved students data");
      }
      
      return response.json();
    }
  });

  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const response = await fetch("/api/stats", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard stats");
      }
      
      return response.json();
    }
  });

  const { data: teachersData } = useQuery({
    queryKey: ["/api/teachers", "pending"],
    queryFn: async () => {
      const response = await fetch("/api/teachers?status=pending", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch pending teachers");
      }
      
      return response.json();
    }
  });

  // == COMPUTED VALUES ==
  const pendingTeachersCount = teachersData?.teachers?.length || 0;

  // == RENDER COMPONENT ==
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-ilaw-white via-brand-gold-50 to-brand-navy-50">
      <Header variant="admin" />
      
      <main className="flex-grow p-4 md:p-6">
        <div className="container mx-auto">
          
          {/* == Welcome Section == */}
          <div className="bg-ilaw-navy rounded-2xl p-8 mb-8 text-white shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-3">
                  <Shield className="h-8 w-8 text-ilaw-gold mr-3" />
                  <span className="text-lg font-heading font-bold text-ilaw-gold">ILAW NG BAYAN LEARNING INSTITUTE</span>
                </div>
                <h1 className="text-3xl font-heading font-bold mb-3">Welcome back, Administrator! ⭐</h1>
                <p className="text-lg text-blue-100 mb-4">
                  Grade A+ Leadership • Continue your amazing management journey and guide the light of knowledge through leadership!
                </p>
                <p className="text-brand-gold-300 font-medium flex items-center">
                  <span className="mr-2">🎯</span>
                  Liwanag, Kaalaman, Paglilingkod
                </p>
              </div>
            </div>
          </div>

          {/* == Header Section == */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-2xl font-heading font-bold text-ilaw-navy">Management Overview</h2>
              <p className="text-brand-gold-600 font-medium">Monitor your educational institution's performance</p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link href="/admin/add-book">
                <Button className="bg-gradient-to-r from-ilaw-navy to-ilaw-navy-600 hover:from-ilaw-navy-600 hover:to-ilaw-navy-700 text-white font-heading font-bold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Book
                </Button>
              </Link>
            </div>
          </div>

          {/* == Statistics Cards == */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            
            {/* == Total Students Card == */}
            <div className="border-2 border-brand-gold-200 hover:border-ilaw-gold transition-all duration-300 shadow-lg bg-white rounded-2xl">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-brand-gold-600 text-sm font-medium">Total Students</p>
                    <h3 className="text-3xl font-heading font-bold mt-1 text-ilaw-navy">
                      {isLoadingStudents ? "..." : studentsData?.students?.length || 0}
                    </h3>
                  </div>
                  <div className="bg-gradient-to-br from-ilaw-navy-100 to-ilaw-navy-200 p-3 rounded-xl">
                    <Users className="h-6 w-6 text-ilaw-navy" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-sm">
                  <span className="text-green-600 flex items-center font-medium">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    12%
                  </span>
                  <span className="text-brand-gold-600 ml-2">approved students</span>
                </div>
              </div>
            </div>
            
            {/* == Average Reading Time Card == */}
            <div className="border-2 border-brand-gold-200 hover:border-ilaw-gold transition-all duration-300 shadow-lg bg-white rounded-2xl">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-brand-gold-600 text-sm font-medium">Avg. Reading Time</p>
                    <h3 className="text-3xl font-heading font-bold mt-1 text-ilaw-navy">
                      {isLoadingStats ? "..." : `${statsData?.stats?.avgReadingTime || 25} min`}
                    </h3>
                  </div>
                  <div className="bg-gradient-to-br from-brand-gold-100 to-brand-gold-200 p-3 rounded-xl">
                    <Clock className="h-6 w-6 text-ilaw-gold" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-sm">
                  <span className="text-green-600 flex items-center font-medium">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    5%
                  </span>
                  <span className="text-brand-gold-600 ml-2">from last month</span>
                </div>
              </div>
            </div>
            
            {/* == Completion Rate Card == */}
            <div className="border-2 border-brand-gold-200 hover:border-ilaw-gold transition-all duration-300 shadow-lg bg-white rounded-2xl">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-brand-gold-600 text-sm font-medium">Completion Rate</p>
                    <h3 className="text-3xl font-heading font-bold mt-1 text-ilaw-navy">
                      {isLoadingStats ? "..." : `${statsData?.stats?.completionRate || 0}%`}
                    </h3>
                  </div>
                  <div className="bg-gradient-to-br from-ilaw-navy-100 to-ilaw-navy-200 p-3 rounded-xl">
                    <BarChart3 className="h-6 w-6 text-ilaw-navy" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-sm">
                  <span className="text-red-500 flex items-center font-medium">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    2%
                  </span>
                  <span className="text-brand-gold-600 ml-2">from last month</span>
                </div>
              </div>
            </div>
          </div>

          {/* == Action Cards == */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            
            {/* == Manage Books Card == */}
            <Link href="/admin/books">
              <div className="border-2 border-brand-gold-200 hover:border-ilaw-gold transition-all duration-300 shadow-lg bg-white rounded-2xl p-6 cursor-pointer hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-heading font-bold text-ilaw-navy">Manage Books</h3>
                    <p className="text-brand-gold-600 mt-1 font-medium">View, edit and add new books</p>
                  </div>
                  <div className="bg-gradient-to-br from-brand-gold-100 to-brand-gold-200 p-4 rounded-xl">
                    <BookOpen className="h-6 w-6 text-ilaw-gold" />
                  </div>
                </div>
              </div>
            </Link>
            
            {/* == Manage Students Card == */}
            <Link href="/admin/students">
              <div className="border-2 border-brand-gold-200 hover:border-ilaw-gold transition-all duration-300 shadow-lg bg-white rounded-2xl p-6 cursor-pointer hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-heading font-bold text-ilaw-navy">Manage Students</h3>
                    <p className="text-brand-gold-600 mt-1 font-medium">View student progress and activities</p>
                  </div>
                  <div className="bg-gradient-to-br from-ilaw-navy-100 to-ilaw-navy-200 p-4 rounded-xl">
                    <Users className="h-6 w-6 text-ilaw-navy" />
                  </div>
                </div>
              </div>
            </Link>

            {/* == Manage Teachers Card == */}
            <Link href="/admin/teacher">
              <div className="border-2 border-brand-gold-200 hover:border-ilaw-gold transition-all duration-300 shadow-lg bg-white rounded-2xl p-6 cursor-pointer hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-heading font-bold text-ilaw-navy">Manage Teachers</h3>
                    <p className="text-brand-gold-600 mt-1 font-medium">Approve and monitor teacher accounts
                      {pendingTeachersCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full font-bold">
                          {pendingTeachersCount} pending
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-brand-gold-100 to-brand-gold-200 p-4 rounded-xl">
                    <GraduationCap className="h-6 w-6 text-ilaw-gold" />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}