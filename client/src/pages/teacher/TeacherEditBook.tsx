import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useParams } from 'wouter';
import { PageForm, PageFormValues } from '@/components/admin/PageForm';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, ArrowLeft, Loader2, Edit3, BookOpen, Users } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '@/components/ui/select';
import Header from '@/components/layout/Header';

// Define the form schema - SIMPLIFIED
const editBookSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  coverImage: z.string().optional(),
  type: z.enum(['storybook', 'educational']),
  grade: z.string().optional(),
  musicUrl: z.string().optional(),
});

type EditBookFormValues = z.infer<typeof editBookSchema>;

function TeacherEditBook() {
  const { id } = useParams<{ id: string }>();
  const bookId = parseInt(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pages, setPages] = useState<PageFormValues[]>([]);

  // Fetch book data - UPDATED: Using /api/books instead of /api/teacher/books
  const { data: bookData, isLoading: isLoadingBook } = useQuery({
    queryKey: [`/api/books/${bookId}`],
    queryFn: async () => {
      try {
        console.log("=== FRONTEND: Fetching book data ===", bookId);
        const response = await apiRequest('GET', `/api/books/${bookId}`);
        console.log("=== FRONTEND: Book data received ===", response);
        
        if (response && response.book) {
          return response.book;
        }
        throw new Error('Failed to fetch book data');
      } catch (error) {
        console.error("=== FRONTEND: Error fetching book ===", error);
        throw error;
      }
    },
    enabled: !!bookId
  });

  // Fetch pages for this book
  const { data: pagesData, isLoading: isLoadingPages } = useQuery({
    queryKey: [`/api/books/${bookId}/pages`],
    queryFn: async () => {
      try {
        console.log("=== FRONTEND: Fetching pages data ===", bookId);
        const response = await apiRequest('GET', `/api/books/${bookId}/pages`);
        console.log("=== FRONTEND: Pages data received ===", response);
        
        if (response && response.pages) {
          return response.pages;
        }
        return [];
      } catch (error) {
        console.error("=== FRONTEND: Error fetching pages ===", error);
        return [];
      }
    },
    enabled: !!bookId
  });

  // Form setup
  const form = useForm<EditBookFormValues>({
    resolver: zodResolver(editBookSchema),
    defaultValues: {
      title: '',
      description: '',
      coverImage: '',
      type: 'storybook',
      grade: '',
      musicUrl: ''
    }
  });

  // Update form values when book data is loaded
  useEffect(() => {
    if (bookData) {
      console.log("=== FRONTEND: Setting form data ===", bookData);
      form.reset({
        title: bookData.title || '',
        description: bookData.description || '',
        coverImage: bookData.coverImage || '',
        type: bookData.type || 'storybook',
        grade: bookData.grade || '',
        musicUrl: bookData.musicUrl || ''
      });
    }
  }, [bookData, form]);

  // Update pages state when pages data is loaded
  useEffect(() => {
    if (pagesData && Array.isArray(pagesData)) {
      console.log("=== FRONTEND: Setting pages data ===", pagesData);
      
      const formattedPages = pagesData.map((page: any) => ({
        id: page.id,
        pageNumber: page.pageNumber,
        title: page.title || '',
        content: page.content || '',
        imageUrl: page.imageUrl || '',
        questions: page.questions || []
      }));
      
      setPages(formattedPages);
    }
  }, [pagesData]);

  // Book update mutation - UPDATED: Using /api/books instead of /api/teacher/books
  const updateBookMutation = useMutation({
    mutationFn: async (data: EditBookFormValues) => {
      try {
        console.log("=== FRONTEND: Sending book update ===");
        console.log("Book ID:", bookId);
        console.log("Data being sent:", JSON.stringify(data, null, 2));

        const cleanData = {
          title: data.title?.trim() || '',
          description: data.description?.trim() || '',
          type: data.type,
          grade: data.grade || '',
          coverImage: data.coverImage || '',
          musicUrl: data.musicUrl || ''
        };

        console.log("=== FRONTEND: Cleaned data ===", JSON.stringify(cleanData, null, 2));

        const response = await apiRequest('PUT', `/api/books/${bookId}`, cleanData);
        console.log("=== FRONTEND: Received response ===", response);
        return response;
      } catch (error) {
        console.error("=== FRONTEND: Error updating book ===", error);
        throw error;
      }
    },
    onSuccess: (response) => {
      console.log("=== FRONTEND: Update successful ===", response);
      toast({
        title: '✅ Book Updated',
        description: 'The book has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      queryClient.invalidateQueries({ queryKey: [`/api/books/${bookId}`] });
    },
    onError: (error: any) => {
      console.error('=== FRONTEND: Mutation error ===', error);
      
      let errorMessage = 'Failed to update book';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        variant: 'destructive',
        title: '❌ Error',
        description: errorMessage,
      });
    }
  });

  // Page mutations
  const updatePagesMutation = useMutation({
    mutationFn: async (pageData: PageFormValues) => {
      try {
        console.log("=== FRONTEND: Updating page ===", pageData);
        
        if (pageData.id) {
          const response = await apiRequest('PUT', `/api/pages/${pageData.id}`, pageData);
          console.log("=== FRONTEND: Page update response ===", response);
          return response;
        } else {
          const response = await apiRequest('POST', `/api/books/${bookId}/pages`, {
            ...pageData,
            bookId
          });
          console.log("=== FRONTEND: Page create response ===", response);
          return response;
        }
      } catch (error) {
        console.error('=== FRONTEND: Error updating/creating page ===', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: '✅ Page Updated',
        description: 'The page has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/books/${bookId}/pages`] });
    },
    onError: (error: any) => {
      console.error('=== FRONTEND: Page mutation error ===', error);
      toast({
        variant: 'destructive',
        title: '❌ Error',
        description: error?.message || 'Failed to update page',
      });
    }
  });

  const deletePageMutation = useMutation({
    mutationFn: async (pageId: number) => {
      console.log("=== FRONTEND: Deleting page ===", pageId);
      const response = await apiRequest('DELETE', `/api/pages/${pageId}`);
      console.log("=== FRONTEND: Page delete response ===", response);
      return response;
    },
    onSuccess: () => {
      toast({
        title: '✅ Page Deleted',
        description: 'The page has been deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/books/${bookId}/pages`] });
    },
    onError: (error: any) => {
      console.error('=== FRONTEND: Page delete error ===', error);
      toast({
        variant: 'destructive',
        title: '❌ Error',
        description: error?.message || 'Failed to delete page',
      });
    }
  });

  // Handle form submit
  const onSubmit = async (data: EditBookFormValues) => {
    try {
      console.log("=== FRONTEND: Form submit started ===");
      console.log("Form data:", data);
      console.log("Current pages:", pages);
      
      if (!data.title?.trim()) {
        toast({
          variant: 'destructive',
          title: '❌ Validation Error',
          description: 'Title is required',
        });
        return;
      }
      
      if (!data.description?.trim()) {
        toast({
          variant: 'destructive',
          title: '❌ Validation Error',
          description: 'Description is required',
        });
        return;
      }
      
      console.log("=== FRONTEND: Updating book ===");
      await updateBookMutation.mutateAsync(data);
      
      console.log("=== FRONTEND: Updating pages ===");
      for (const page of pages) {
        await updatePagesMutation.mutateAsync(page);
      }
      
      console.log("=== FRONTEND: All updates completed, navigating ===");
      
      // Navigate back to teacher books list
      setTimeout(() => {
        navigate('/teacher/books');
      }, 1000);
      
    } catch (error) {
      console.error('=== FRONTEND: Form submit error ===', error);
    }
  };

  // Handle adding a new page
  const handleAddPage = () => {
    const newPageNumber = pages.length > 0 
      ? Math.max(...pages.map(p => p.pageNumber)) + 1 
      : 1;
    
    const newPage: PageFormValues = {
      pageNumber: newPageNumber,
      title: '',
      content: '',
      imageUrl: '',
      questions: []
    };
    
    console.log("=== FRONTEND: Adding new page ===", newPage);
    setPages([...pages, newPage]);
  };

  // Handle page save
  const handlePageSave = (pageData: PageFormValues) => {
    console.log("=== FRONTEND: Saving page data ===", pageData);
    
    setPages(prevPages => 
      prevPages.map(p => 
        p.pageNumber === pageData.pageNumber ? pageData : p
      )
    );
    
    if (pageData.showNotification) {
      toast({
        title: '✅ Page Saved',
        description: 'Page changes saved locally. Click "Save Changes" to update the book.',
      });
    }
  };

  // Handle page removal
  const handleRemovePage = (pageNumber: number) => {
    const pageToRemove = pages.find(p => p.pageNumber === pageNumber);
    console.log("=== FRONTEND: Removing page ===", pageToRemove);
    
    if (pageToRemove && pageToRemove.id) {
      deletePageMutation.mutate(pageToRemove.id);
    }
    
    setPages(pages.filter(p => p.pageNumber !== pageNumber));
  };

  // Show loading state
  if (isLoadingBook || isLoadingPages) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-gold-50 to-ilaw-white">
        <Header variant="teacher" />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 bg-ilaw-white rounded-2xl p-8 border-2 border-brand-gold-200 shadow-xl">
            <Loader2 className="h-12 w-12 animate-spin text-ilaw-gold" />
            <p className="text-lg font-heading font-bold text-ilaw-navy">Loading book data...</p>
          </div>
        </main>
      </div>
    );
  }

  // Show error state if book not found
  if (!bookData && !isLoadingBook) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-gold-50 to-ilaw-white">
        <Header variant="teacher" />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 bg-ilaw-white rounded-2xl p-8 border-2 border-red-200 shadow-xl">
            <p className="text-lg font-heading font-bold text-red-600">❌ Book not found</p>
            <Button onClick={() => navigate('/teacher/books')} variant="outline">
              Back to Books
            </Button>
          </div>
        </main>
      </div>
    );
  }

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
                  <Edit3 className="h-8 w-8 mr-3" />
                  <span className="text-sm font-semibold uppercase tracking-wide opacity-80">
                    Book Management
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">Edit Book</h1>
                <p className="text-lg opacity-80">
                  Update your educational content
                </p>
              </div>
              <div className="mt-6 md:mt-0">
                <Button
                  variant="outline"
                  className="border-2 border-ilaw-navy text-ilaw-navy hover:bg-ilaw-navy hover:text-ilaw-gold font-semibold px-6 py-3"
                  onClick={() => navigate('/teacher/books')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Books
                </Button>
              </div>
            </div>
          </div>
          
          <div className="bg-ilaw-white rounded-xl shadow-lg border-2 border-brand-gold-200 mb-8">
            <div className="bg-gradient-to-r from-ilaw-navy to-brand-navy-800 p-4">
              <h2 className="text-xl font-heading font-bold text-ilaw-gold flex items-center">
                <BookOpen className="h-6 w-6 mr-3" />
                Book Details
              </h2>
            </div>
            <div className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-heading font-bold text-ilaw-navy">📖 Title</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Book title" 
                              className="border-2 border-brand-gold-200 focus:border-ilaw-gold" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-heading font-bold text-ilaw-navy">📚 Book Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="border-2 border-brand-gold-200 focus:border-ilaw-gold">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="border-2 border-brand-gold-200">
                              <SelectItem value="storybook">📖 Storybook</SelectItem>
                              <SelectItem value="educational">🎓 Educational</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="coverImage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-heading font-bold text-ilaw-navy">🖼️ Cover Image URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://example.com/image.jpg" 
                              className="border-2 border-brand-gold-200 focus:border-ilaw-gold" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="grade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-heading font-bold text-ilaw-navy">🎓 Grade Level</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="border-2 border-brand-gold-200 focus:border-ilaw-gold">
                                <SelectValue placeholder="Select grade" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="border-2 border-brand-gold-200">
                              <SelectItem value="K">🌟 Kindergarten</SelectItem>
                              <SelectItem value="1">1️⃣ Grade 1</SelectItem>
                              <SelectItem value="2">2️⃣ Grade 2</SelectItem>
                              <SelectItem value="3">3️⃣ Grade 3</SelectItem>
                              <SelectItem value="4">4️⃣ Grade 4</SelectItem>
                              <SelectItem value="5">5️⃣ Grade 5</SelectItem>
                              <SelectItem value="6">6️⃣ Grade 6</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="musicUrl"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="font-heading font-bold text-ilaw-navy">🎵 Background Music URL (optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://example.com/music.mp3" 
                              className="border-2 border-brand-gold-200 focus:border-ilaw-gold" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-heading font-bold text-ilaw-navy">📝 Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter book description"
                            className="min-h-[120px] border-2 border-brand-gold-200 focus:border-ilaw-gold"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="border-2 border-brand-gold-200 bg-brand-gold-50 rounded-xl p-6">
                    <h3 className="text-xl font-heading font-bold mb-4 text-ilaw-navy flex items-center">
                      <BookOpen className="h-6 w-6 text-ilaw-gold mr-2" />
                      📄 Book Pages
                    </h3>
                    
                    {pages.length === 0 ? (
                      <div className="bg-ilaw-white p-8 rounded-xl text-center border-2 border-brand-gold-200">
                        <p className="text-brand-gold-600 font-medium mb-4">📝 No pages added yet</p>
                        <Button 
                          type="button" 
                          onClick={handleAddPage}
                          className="bg-ilaw-gold hover:bg-brand-amber text-ilaw-navy font-heading font-bold"
                        >
                          <Plus className="h-4 w-4 mr-2" /> ✨ Add First Page
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {pages
                          .sort((a, b) => a.pageNumber - b.pageNumber)
                          .map((page) => (
                            <PageForm
                              key={page.pageNumber}
                              initialValues={page}
                              pageNumber={page.pageNumber}
                              onSave={handlePageSave}
                              onRemove={() => handleRemovePage(page.pageNumber)}
                              showRemoveButton={pages.length > 1}
                            />
                          ))}
                          
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddPage}
                          className="w-full py-6 border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-100 font-heading font-bold"
                        >
                          <Plus className="h-4 w-4 mr-2" /> ✨ Add Another Page
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-6">
                    <Button 
                      type="submit"
                      disabled={updateBookMutation.isPending || updatePagesMutation.isPending}
                      className="min-w-[140px] bg-ilaw-gold hover:bg-brand-amber text-ilaw-navy font-heading font-bold"
                    >
                      {(updateBookMutation.isPending || updatePagesMutation.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      💾 Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default TeacherEditBook;