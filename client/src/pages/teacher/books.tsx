import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Plus, ChevronLeft, ChevronRight, Edit, Eye, Trash2, BookOpen, Star, MoreVertical, Library, Users} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function TeacherBooks() {
  const [searchTerm, setSearchTerm] = useState("");
  const [bookType, setBookType] = useState("all");
  const [page, setPage] = useState(1);
  const [deleteBookId, setDeleteBookId] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch books
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-gold-50 to-ilaw-white">
      <Header variant="teacher" />
      
      <main className="flex-grow p-4 md:p-6">
        <div className="container mx-auto">
          {/* Page Header - Same style as other teacher pages */}
          <div className="bg-gradient-to-r from-brand-amber to-ilaw-gold rounded-2xl p-8 mb-8 text-ilaw-navy shadow-ilaw">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center mb-2">
                  <Library className="h-8 w-8 mr-3" />
                  <span className="text-sm font-semibold uppercase tracking-wide opacity-80">
                    Book Management
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">Books Library</h1>
                <p className="text-lg opacity-80">
                  Manage your educational content collection
                </p>
              </div>
              <div className="mt-6 md:mt-0 flex gap-3">
                <Link href="/teacher">
                  <Button variant="outline" className="border-2 border-ilaw-navy text-ilaw-navy hover:bg-ilaw-navy hover:text-ilaw-gold font-semibold px-6 py-3">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </Button>
                </Link>
                <Link href="/teacher/add-book">
                  <Button className="bg-ilaw-navy hover:bg-brand-navy-800 text-ilaw-gold font-heading font-bold px-6 py-3 shadow-lg">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Book
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
                    placeholder="Search by title, author, or description..."
                    className="pl-12 h-12 text-lg border-2 border-brand-gold-200 focus:border-ilaw-gold rounded-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </form>
              
              <div className="w-full md:w-1/3">
                <Select 
                  value={bookType} 
                  onValueChange={setBookType}
                >
                  <SelectTrigger className="h-12 border-2 border-brand-gold-200 focus:border-ilaw-gold rounded-lg">
                    <SelectValue>
                      <div className="flex items-center">
                        <Filter className="w-5 h-5 mr-3 text-ilaw-gold" />
                        <span className="font-medium">
                          {bookType === "all" ? "All Books" : 
                            bookType === "storybook" ? "Storybooks" : "Educational Books"}
                        </span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Books</SelectItem>
                    <SelectItem value="storybook">Storybooks</SelectItem>
                    <SelectItem value="educational">Educational Books</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Books Table */}
          <div className="bg-ilaw-white rounded-xl shadow-lg border-2 border-brand-gold-200 overflow-hidden">
            <div className="bg-gradient-to-r from-ilaw-navy to-brand-navy-800 p-4">
              <h2 className="text-xl font-heading font-bold text-ilaw-gold flex items-center">
                <BookOpen className="h-6 w-6 mr-3" />
                Books Collection
              </h2>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow className="bg-brand-gold-50">
                  <TableHead className="font-heading font-bold text-ilaw-navy">BOOK TITLE</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">TYPE</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">GRADE LEVEL</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">RATING</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">DATE ADDED</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-ilaw-gold border-t-transparent mr-3"></div>
                        <span className="text-brand-gold-600 font-medium">Loading books...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : booksData?.books?.length > 0 ? (
                  booksData.books.map((book: any) => (
                    <TableRow key={book.id} className="hover:bg-brand-gold-50 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-ilaw-gold to-brand-amber flex items-center justify-center mr-4 text-ilaw-navy font-bold text-lg">
                            <BookOpen className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="font-heading font-semibold text-ilaw-navy">
                              {book.title}
                            </div>
                            <div className="text-sm text-brand-gold-600 truncate max-w-[200px]">
                              {book.description}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          book.type === 'storybook' 
                            ? 'bg-ilaw-navy text-white' 
                            : 'bg-brand-amber text-ilaw-navy'
                        }`}>
                          {book.type === 'storybook' ? 'Storybook' : 'Educational'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-ilaw-navy">
                          {book.grade ? `Grade ${book.grade}` : 'All Grades'}
                        </span>
                      </TableCell>
                      <TableCell>{getRatingStars(book.rating || 0)}</TableCell>
                      <TableCell className="text-brand-gold-600">
                        {new Date(book.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9 w-9 p-0 border-ilaw-gold text-ilaw-gold hover:bg-ilaw-gold hover:text-ilaw-navy"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="border-2 border-brand-gold-200">
                              <DropdownMenuLabel className="font-heading font-bold text-ilaw-navy">Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-brand-gold-200" />
                              <Link href={`/teacher/books/${book.id}`}>
                                <DropdownMenuItem className="flex items-center font-medium text-ilaw-navy hover:bg-brand-gold-50">
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                              </Link>
                              <Link href={`/teacher/edit-book/${book.id}`}>
                                <DropdownMenuItem className="flex items-center font-medium text-ilaw-navy hover:bg-brand-gold-50">
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Book
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem 
                                className="flex items-center text-red-600 font-medium hover:bg-red-50"
                                onClick={() => setDeleteBookId(book.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Book
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <BookOpen className="h-16 w-16 text-brand-gold-300 mb-4" />
                        <p className="text-xl font-heading font-semibold text-brand-gold-600 mb-2">
                          No books found
                        </p>
                        <p className="text-brand-gold-500">
                          Add your first book to get started
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {booksData?.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-brand-gold-200 bg-brand-gold-50">
                <div className="text-sm font-medium text-brand-gold-600">
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
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteBookId !== null} onOpenChange={() => setDeleteBookId(null)}>
        <AlertDialogContent className="border-2 border-brand-gold-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ilaw-navy font-heading font-bold">Are you sure?</AlertDialogTitle>
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
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}