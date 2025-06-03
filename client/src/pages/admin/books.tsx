// == IMPORTS & DEPENDENCIES ==
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Plus, ChevronLeft, ChevronRight, Edit, Eye, Trash2, BookOpen, Star, MoreVertical, GraduationCap, Library} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

// == ADMIN BOOKS COMPONENT ==
export default function AdminBooks() {
  
  // == STATE MANAGEMENT ==
  const [searchTerm, setSearchTerm] = useState("");
  const [bookType, setBookType] = useState("all");
  const [page, setPage] = useState(1);
  const [deleteBookId, setDeleteBookId] = useState<number | null>(null);
  const { toast } = useToast();

  // == DATA FETCHING ==
  const { data: booksData, isLoading } = useQuery({
    queryKey: ["/api/books", page, bookType, searchTerm],
    queryFn: async () => {
      let url = `/api/books?page=${page}`;
      if (bookType !== "all") url += `&type=${bookType}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch books");
      }
      
      return response.json();
    }
  });

  // == DELETE MUTATION ==
  const deleteMutation = useMutation({
    mutationFn: async (bookId: number) => {
      return apiRequest("DELETE", `/api/books/${bookId}`);
    },
    onSuccess: () => {
      toast({
        title: "Book deleted",
        description: "The book has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      setDeleteBookId(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete book",
      });
    }
  });

  // == EVENT HANDLERS ==
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    queryClient.invalidateQueries({ 
      queryKey: ["/api/books", page, bookType, searchTerm]
    });
    setPage(1);
  };

  const handleDelete = (bookId: number) => {
    deleteMutation.mutate(bookId);
  };

  // == UTILITY FUNCTIONS ==
  const getRatingStars = (rating: number) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i}
            className={`h-4 w-4 ${i < rating ? 'text-ilaw-gold fill-ilaw-gold' : 'text-gray-300'}`} 
          />
        ))}
      </div>
    );
  };

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
          <h1 className="text-3xl font-heading font-bold text-center mb-2">📚 Books Management</h1>
          <p className="text-lg text-blue-100 text-center">Manage your educational content library</p>
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
            <Link href="/admin/add-book">
              <Button className="mt-4 md:mt-0 bg-gradient-to-r from-ilaw-navy to-ilaw-navy-600 hover:from-ilaw-navy-600 hover:to-ilaw-navy-700 text-white font-heading font-bold flex items-center shadow-lg">
                <Plus className="mr-2 h-4 w-4" />
                ✨ Add New Book
              </Button>
            </Link>
          </div>
          
          {/* == Search & Filter Section == */}
          <div className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-lg mb-8">
            <div className="border-b border-brand-gold-200 p-6">
              <h3 className="text-xl font-heading font-bold text-ilaw-navy flex items-center">
                <Library className="h-6 w-6 text-ilaw-gold mr-2" />
                🔍 Search & Filter
              </h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <form onSubmit={handleSearch} className="w-full md:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gold-500" size={18} />
                    <Input
                      placeholder="Search books..."
                      className="pl-10 w-full md:w-[300px] border-2 border-brand-gold-200 focus:border-ilaw-gold"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </form>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Filter size={18} className="text-ilaw-gold" />
                  <Select value={bookType} onValueChange={setBookType}>
                    <SelectTrigger className="w-[180px] border-2 border-brand-gold-200 focus:border-ilaw-gold">
                      <SelectValue placeholder="Book Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">📚 All Books</SelectItem>
                      <SelectItem value="storybook">📖 Storybooks</SelectItem>
                      <SelectItem value="educational">🎓 Educational Books</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          
          {/* == Books Table Section == */}
          <div className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-lg">
            <div className="border-b border-brand-gold-200 p-6">
              <h3 className="text-xl font-heading font-bold text-ilaw-navy flex items-center">
                <BookOpen className="h-6 w-6 text-ilaw-gold mr-2" />
                📚 Books Library
              </h3>
            </div>
            <div className="p-0">
              <Table>
                
                {/* == Table Header == */}
                <TableHeader>
                  <TableRow className="border-b border-brand-gold-200">
                    <TableHead className="font-heading font-bold text-ilaw-navy">📖 Title</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">📚 Type</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">🎓 Grade Level</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">⭐ Rating</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">📅 Date Added</TableHead>
                    <TableHead className="text-right font-heading font-bold text-ilaw-navy">⚙️ Actions</TableHead>
                  </TableRow>
                </TableHeader>

                {/* == Table Body == */}
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-brand-gold-600 font-medium">
                        📚 Loading books...
                      </TableCell>
                    </TableRow>
                  ) : booksData?.books?.length > 0 ? (
                    booksData.books.map((book: any) => (
                      <TableRow key={book.id} className="border-b border-brand-gold-100 hover:bg-brand-gold-50 transition-colors">
                        
                        {/* == Book Title & Description == */}
                        <TableCell>
                          <div className="flex items-center">
                            <div className="h-12 w-12 bg-brand-gold-100 border-2 border-brand-gold-200 rounded-xl flex items-center justify-center mr-3">
                              <BookOpen className="h-6 w-6 text-ilaw-gold" />
                            </div>
                            <div>
                              <div className="font-heading font-bold text-ilaw-navy">{book.title}</div>
                              <div className="text-sm text-brand-gold-600 font-medium truncate max-w-[200px]">{book.description}</div>
                            </div>
                          </div>
                        </TableCell>

                        {/* == Book Type Badge == */}
                        <TableCell>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            book.type === 'storybook' 
                              ? 'bg-ilaw-navy text-white' 
                              : 'bg-brand-gold-200 text-ilaw-navy'
                          }`}>
                            {book.type === 'storybook' ? '📖 Storybook' : '🎓 Educational'}
                          </span>
                        </TableCell>

                        {/* == Grade Level == */}
                        <TableCell className="text-ilaw-navy font-bold">
                          {book.grade ? `Grade ${book.grade}` : 'All grades'}
                        </TableCell>

                        {/* == Rating Stars == */}
                        <TableCell>{getRatingStars(book.rating || 0)}</TableCell>

                        {/* == Date Added == */}
                        <TableCell className="text-brand-gold-600 font-medium">
                          {new Date(book.createdAt).toLocaleDateString()}
                        </TableCell>

                        {/* == Actions Dropdown == */}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 hover:bg-brand-gold-100 border-2 border-transparent hover:border-brand-gold-200"
                              >
                                <MoreVertical className="h-4 w-4 text-ilaw-navy" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="border-2 border-brand-gold-200">
                              <DropdownMenuLabel className="font-heading font-bold text-ilaw-navy">Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-brand-gold-200" />
                              <Link href={`/admin/books/${book.id}`}>
                                <DropdownMenuItem className="flex items-center font-medium text-ilaw-navy hover:bg-brand-gold-50">
                                  <Eye className="mr-2 h-4 w-4" /> 👁️ View Details
                                </DropdownMenuItem>
                              </Link>
                              <Link href={`/admin/edit-book/${book.id}`}>
                                <DropdownMenuItem className="flex items-center font-medium text-ilaw-navy hover:bg-brand-gold-50">
                                  <Edit className="mr-2 h-4 w-4" /> ✏️ Edit Book
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem 
                                className="flex items-center text-red-600 font-medium hover:bg-red-50"
                                onClick={() => setDeleteBookId(book.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> 🗑️ Delete Book
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-brand-gold-600 font-medium">
                        📚 No books found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {/* == Pagination Section == */}
              {booksData?.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t-2 border-brand-gold-200">
                  <div className="text-sm text-brand-gold-600 font-medium">
                    Showing {((page - 1) * 10) + 1}-{Math.min(page * 10, booksData?.totalBooks)} of {booksData?.totalBooks} books
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-bold"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(booksData?.totalPages, p + 1))}
                      disabled={page === booksData?.totalPages}
                      className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-bold"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* == Delete Confirmation Dialog == */}
      <AlertDialog open={deleteBookId !== null} onOpenChange={() => setDeleteBookId(null)}>
        <AlertDialogContent className="border-2 border-brand-gold-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ilaw-navy font-heading font-bold">🗑️ Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-brand-gold-600 font-medium">
              This action cannot be undone. This will permanently delete the book
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-gray-300 text-gray-600 hover:bg-gray-50 font-bold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteBookId && handleDelete(deleteBookId)}
              className="bg-red-600 hover:bg-red-700 font-bold"
            >
              🗑️ Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}