import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Clock, TrendingUp,  TrendingDown, BarChart3, Plus, GraduationCap, Award, Target, ChevronRight} from "lucide-react";

function TeacherDashboard() {
  // MATCH ADMIN: Fetch APPROVED students only (same as admin)
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

  // MATCH ADMIN: Fetch dashboard statistics (same endpoint and structure)
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-gold-50 to-ilaw-white">
      <Header variant="teacher" />
      
      <main className="flex-grow p-4 md:p-6">
        <div className="container mx-auto">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-brand-amber to-ilaw-gold rounded-2xl p-8 mb-8 text-ilaw-navy shadow-ilaw">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center mb-2">
                  <GraduationCap className="h-8 w-8 mr-3" />
                  <span className="text-sm font-semibold uppercase tracking-wide opacity-80">
                    Ilaw ng Bayan Learning Institute
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">Teacher Dashboard</h1>
                <p className="text-lg opacity-80">
                  Empowering young minds through dedicated teaching. Welcome back, educator!
                </p>
              </div>
              <div className="mt-6 md:mt-0">
                <Link href="/teacher/add-book">
                  <Button className="bg-ilaw-navy hover:bg-brand-navy-800 text-ilaw-gold border-2 border-ilaw-navy hover:border-brand-navy-800 px-6 py-3 text-lg font-semibold flex items-center group transition-all duration-300 hover:scale-105 shadow-navy">
                    <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                    Add New Book
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* MATCH ADMIN: Stats Cards with identical structure */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* MATCH ADMIN: Total APPROVED Students Only */}
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
            
            {/* MATCH ADMIN: Average Reading Time - Dynamic */}
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
            
            {/* MATCH ADMIN: Completion Rate - Dynamic */}
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

          {/* Action Button Cards - Seamless connected layout */}
          <div className="border-2 border-brand-gold-200 rounded-2xl overflow-hidden">
            <div className="flex flex-col lg:flex-row">
              <div className="flex-1">
                <Link href="/teacher/books">
                  <div className="h-full hover:shadow-ilaw transition-all duration-300 cursor-pointer group bg-gradient-to-br from-ilaw-white to-brand-gold-50 hover:bg-gradient-to-br hover:from-brand-gold-100 hover:to-brand-gold-200 border-r border-brand-gold-200">
                    <div className="p-8 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          <BookOpen className="h-6 w-6 text-ilaw-gold mr-3" />
                          <h3 className="text-xl font-heading font-bold text-ilaw-navy">Manage Books</h3>
                        </div>
                        <p className="text-brand-gold-600 font-medium">
                          View, edit and add new educational resources for your students
                        </p>
                        <div className="mt-4 flex items-center text-ilaw-gold font-semibold">
                          <span>Explore Library</span>
                          <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                      <div className="ml-6">
                        <div className="bg-gradient-to-br from-ilaw-gold to-brand-amber p-4 rounded-xl group-hover:scale-110 transition-transform duration-300">
                          <BookOpen className="h-8 w-8 text-ilaw-navy" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
              
              <div className="flex-1">
                <Link href="/teacher/students">
                  <div className="h-full hover:shadow-ilaw transition-all duration-300 cursor-pointer group bg-gradient-to-br from-ilaw-white to-brand-navy-50 hover:bg-gradient-to-br hover:from-brand-navy-100 hover:to-brand-navy-200">
                    <div className="p-8 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          <Users className="h-6 w-6 text-ilaw-navy mr-3" />
                          <h3 className="text-xl font-heading font-bold text-ilaw-navy">Manage Students</h3>
                        </div>
                        <p className="text-brand-gold-600 font-medium">
                          Monitor student progress, activities, and academic achievements
                        </p>
                        <div className="mt-4 flex items-center text-ilaw-navy font-semibold">
                          <span>View Students</span>
                          <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                      <div className="ml-6">
                        <div className="bg-gradient-to-br from-ilaw-navy to-brand-navy-800 p-4 rounded-xl group-hover:scale-110 transition-transform duration-300">
                          <Users className="h-8 w-8 text-ilaw-gold" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
          
          {/* Inspirational Quote Section */}
          <div className="mt-12 bg-gradient-to-r from-ilaw-navy to-brand-navy-800 rounded-2xl p-8 text-center">
            <Award className="h-12 w-12 text-ilaw-gold mx-auto mb-4" />
            <blockquote className="text-xl md:text-2xl font-heading font-medium text-ilaw-white mb-4">
              "A teacher affects eternity; they can never tell where their influence stops."
            </blockquote>
            <p className="text-brand-gold-200 font-medium">
              — Henry Adams
            </p>
            <div className="mt-6 text-ilaw-gold font-heading italic">
              Liwanag, Kaalaman, Paglilingkod
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default TeacherDashboard;