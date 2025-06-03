import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Menu, ChevronLeft, Search, GraduationCap, BookOpen, Filter, Star, Target, Lightbulb} from "lucide-react";
import type { Book } from "@shared/schema";

export default function EducationalBooks() {
  // State for filter
  const [gradeFilter, setGradeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch books from the database
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/books", "educational", gradeFilter, searchTerm],
    queryFn: async () => {
      let url = `/api/books?type=educational`;
      if (gradeFilter !== "all") {
        url += `&grade=${gradeFilter}`;
      }
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      
      // FIXED: Add Authorization header
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch books");
      }
      return response.json();
    }
  });

  // Use the fetched books or fallback to empty array
  const books = data?.books || [];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-navy-50 to-ilaw-white">
      {/* Header */}
      <header className="bg-ilaw-white shadow-lg border-b-2 border-brand-gold-200">
        <div className="container mx-auto py-4 px-6 flex justify-between items-center">
          <div className="flex items-center">
            <Logo className="h-16 w-auto" variant="student" />
          </div>
          <div className="flex items-center text-ilaw-gold">
            <Lightbulb className="h-6 w-6 mr-2" />
            <span className="font-heading font-semibold">Student Portal</span>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-grow p-4 md:p-8">
        <div className="container mx-auto max-w-6xl">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-ilaw-navy to-brand-navy-800 rounded-2xl p-8 mb-8 text-ilaw-white shadow-navy">
            <div className="flex items-center mb-4">
              <GraduationCap className="h-10 w-10 text-ilaw-gold mr-4" />
              <div>
                <span className="text-sm font-semibold uppercase tracking-wide text-brand-gold-200">
                  Ilaw ng Bayan Learning Institute
                </span>
              </div>
            </div>
            <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4">Educational Books</h2>
            <p className="text-xl text-brand-gold-100 leading-relaxed">
              Expand your knowledge with our comprehensive collection of educational materials designed to illuminate your path to learning excellence.
            </p>
            <div className="mt-6 flex items-center text-ilaw-gold">
              <Star className="h-5 w-5 mr-2" />
              <span className="font-medium italic">Liwanag, Kaalaman, Paglilingkod</span>
            </div>
          </div>
          
          {/* Back button */}
          <div className="mb-8">
            <Link href="/student">
              <Button variant="outline" className="flex items-center gap-2 border-2 border-ilaw-gold text-ilaw-navy hover:bg-ilaw-gold font-semibold px-6 py-3">
                <ChevronLeft size={18} />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          
          {/* Main content card */}
          <div className="bg-ilaw-white rounded-2xl shadow-lg border-2 border-brand-gold-200 p-8">
            <div className="flex items-center mb-6">
              <Target className="h-7 w-7 text-ilaw-gold mr-3" />
              <h3 className="text-2xl font-heading font-bold text-ilaw-navy">Discover Educational Resources</h3>
            </div>
            
            {/* Enhanced filters */}
            <div className="bg-gradient-to-br from-brand-gold-50 to-ilaw-white p-6 rounded-xl border border-brand-gold-200 mb-8">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-brand-gold-600 mb-2">Filter by Grade Level</label>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gold-400" size={18} />
                    <select 
                      value={gradeFilter} 
                      onChange={(e) => setGradeFilter(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-brand-gold-200 focus:border-ilaw-gold focus:ring-2 focus:ring-ilaw-gold/20 bg-ilaw-white font-medium text-ilaw-navy"
                    >
                      <option value="all">All Grades</option>
                      <option value="K">Kindergarten</option>
                      <option value="1">Grade 1</option>
                      <option value="2">Grade 2</option>
                      <option value="3">Grade 3</option>
                      <option value="4">Grade 4</option>
                      <option value="5">Grade 5</option>
                      <option value="6">Grade 6</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex-2">
                  <label className="block text-sm font-semibold text-brand-gold-600 mb-2">Search Books</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gold-400" size={18} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by title, subject, or keyword..."
                      className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-brand-gold-200 focus:border-ilaw-gold focus:ring-2 focus:ring-ilaw-gold/20 bg-ilaw-white font-medium text-ilaw-navy placeholder-brand-gold-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="flex items-center justify-center mb-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-ilaw-gold border-t-transparent"></div>
                </div>
                <p className="text-brand-gold-600 font-medium">Loading educational books...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 max-w-md mx-auto">
                  <h4 className="text-red-700 font-semibold mb-2">Error Loading Books</h4>
                  <p className="text-red-600">Please try refreshing the page or contact support.</p>
                </div>
              </div>
            )}

            {/* Book list */}
            {!isLoading && !error && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {books.map((book: Book) => (
                  <Link key={book.id} href={`/student/educational-books/${book.id}`}>
                    <div className="group flex flex-col items-center p-6 bg-gradient-to-br from-ilaw-white to-brand-gold-50 rounded-xl border-2 border-brand-gold-200 hover:border-ilaw-gold hover:shadow-ilaw transition-all duration-300 cursor-pointer hover:scale-105">
                      {book.coverImage ? (
                        <img 
                          src={book.coverImage} 
                          alt={book.title}
                          className="w-40 h-40 object-contain mb-6 group-hover:scale-110 transition-transform duration-300 rounded-lg"
                        />
                      ) : (
                        <div className="w-40 h-40 flex items-center justify-center bg-gradient-to-br from-ilaw-gold to-brand-amber rounded-lg mb-6 group-hover:scale-110 transition-transform duration-300">
                          <BookOpen className="w-16 h-16 text-ilaw-navy" />
                        </div>
                      )}
                      <h4 className="font-heading font-bold text-center text-ilaw-navy text-lg mb-4 line-clamp-2">{book.title}</h4>
                      <Button className="bg-ilaw-navy hover:bg-brand-navy-800 text-ilaw-gold font-semibold px-6 py-3 group-hover:scale-105 transition-all duration-300 shadow-navy">
                        <GraduationCap className="mr-2 h-4 w-4" />
                        Learn Now
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && books.length === 0 && (
              <div className="text-center py-16">
                <BookOpen className="h-20 w-20 text-brand-gold-300 mx-auto mb-6" />
                <h4 className="text-2xl font-heading font-bold text-brand-gold-600 mb-4">No Books Found</h4>
                <p className="text-brand-gold-500 mb-6 max-w-md mx-auto">
                  {searchTerm || gradeFilter !== "all" 
                    ? "Try adjusting your search criteria or browse all books." 
                    : "Educational books are being added to our collection. Check back soon!"}
                </p>
                {(searchTerm || gradeFilter !== "all") && (
                  <Button 
                    onClick={() => {
                      setSearchTerm("");
                      setGradeFilter("all");
                    }}
                    variant="outline"
                    className="border-2 border-ilaw-gold text-ilaw-navy hover:bg-ilaw-gold font-semibold"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Motivational Section */}
          <div className="mt-8 bg-gradient-to-r from-brand-amber to-ilaw-gold rounded-2xl p-8 text-center text-ilaw-navy">
            <GraduationCap className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-2xl font-heading font-bold mb-4">Keep Learning, Keep Growing!</h3>
            <p className="text-lg font-medium mb-4">
              Every book you read is a step towards becoming the brilliant learner you're meant to be.
            </p>
            <div className="text-lg font-heading italic">
              Knowledge is the light that guides your future! ✨
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}