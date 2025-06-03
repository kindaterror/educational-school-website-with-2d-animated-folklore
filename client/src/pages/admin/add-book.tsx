// == IMPORTS & DEPENDENCIES ==
import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { bookTypeEnum } from '@shared/schema';
import { PageFormAddBook, PageFormValues, Question } from '@/components/admin/pageformaddbook';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, ArrowLeft, BookOpen, Sparkles } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '@/components/ui/select';

// == TYPE DEFINITIONS ==
const addBookSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  coverImage: z.string().optional(),
  type: z.enum(['storybook', 'educational']),
  grade: z.string().optional(),
  musicUrl: z.string().optional(),
});

type AddBookFormValues = z.infer<typeof addBookSchema>;

// == ADD BOOK COMPONENT ==
export default function AddBook() {
  
  // == Hooks & State ==
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pages, setPages] = useState<PageFormValues[]>([
    { pageNumber: 1, content: '', title: '', imageUrl: '', questions: [] }
  ]);
  const [activePageIndex, setActivePageIndex] = useState<number | null>(null);

  // == Form Initialization ==
  const form = useForm<AddBookFormValues>({
    resolver: zodResolver(addBookSchema),
    defaultValues: {
      title: '',
      description: '',
      coverImage: '',
      type: 'storybook',
      grade: '',
      musicUrl: '',
    },
  });

  // == Book Creation Mutation ==
  const mutation = useMutation({
    mutationFn: async (data: AddBookFormValues) => {
      try {
        const bookResponse = await apiRequest("POST", '/api/books', data);
        
        if (!bookResponse || !bookResponse.book || !bookResponse.book.id) {
          throw new Error('Invalid book response from server');
        }
        
        const bookId = bookResponse.book.id;
        
        const pagePromises = pages.map(async (page) => {
          try {
            const pageResponse = await apiRequest("POST", '/api/pages', {
              title: page.title || '',
              content: page.content,
              imageUrl: page.imageUrl || '',
              pageNumber: page.pageNumber,
              bookId
            });
            
            if (!pageResponse || !pageResponse.page || !pageResponse.page.id) {
              throw new Error(`Failed to create page ${page.pageNumber}`);
            }
            
            const pageId = pageResponse.page.id;
            
            if (page.questions && page.questions.length > 0) {
              const validQuestions = page.questions.filter(question => {
                if (!question.questionText || question.questionText.trim().length < 5) {
                  console.warn(`Skipping invalid question: "${question.questionText}" (too short)`);
                  return false;
                }
                return true;
              });
              
              if (validQuestions.length < page.questions.length) {
                console.warn(`Some questions were skipped due to validation issues`);
              }
              
              const questionPromises = validQuestions.map(question =>
                apiRequest("POST", '/api/questions', {
                  pageId,
                  questionText: question.questionText,
                  answerType: question.answerType,
                  correctAnswer: question.correctAnswer || '',
                  options: question.options || ''
                })
              );
              
              try {
                await Promise.all(questionPromises);
              } catch (questionError: any) {
                console.error('Error adding questions:', questionError);
                throw new Error(`Error adding questions to page ${page.pageNumber}: ${questionError.message || 'Unknown error'}`);
              }
            }
            
            return pageResponse;
          } catch (error) {
            console.error(`Error creating page ${page.pageNumber}:`, error);
            throw error;
          }
        });

        try {
          await Promise.all(pagePromises);
        } catch (pageError) {
          console.error('Error creating pages:', pageError);
          return { book: bookResponse.book, hasErrors: true };
        }

        return { book: bookResponse.book };
      } catch (error) {
        console.error('Error in book creation process:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      
      if (data.hasErrors) {
        toast({
          title: 'Warning: Partial Success',
          description: 'Book was created but some pages or questions could not be added.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Success!',
          description: 'Book has been added successfully.',
        });
      }
      
      navigate('/admin/books');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add book. Please try again.',
        variant: 'destructive',
      });
      console.error('Error adding book:', error);
    },
  });

  // == Form Submission ==
  const onSubmit = (data: AddBookFormValues) => {
    if (pages.length === 0) {
      toast({
        title: 'Error',
        description: 'At least one page is required.',
        variant: 'destructive',
      });
      return;
    }

    const invalidPages = pages.filter(page => !page.content);
    if (invalidPages.length > 0) {
      toast({
        title: 'Error',
        description: `Page ${invalidPages[0].pageNumber} is missing content.`,
        variant: 'destructive',
      });
      return;
    }
    
    let hasInvalidQuestions = false;
    pages.forEach((page, pageIndex) => {
      if (page.questions && page.questions.length > 0) {
        page.questions.forEach((question, qIndex) => {
          if (!question.questionText || question.questionText.trim().length < 5) {
            hasInvalidQuestions = true;
            toast({
              title: 'Invalid Question',
              description: `Question ${qIndex + 1} on page ${page.pageNumber} must be at least 5 characters.`,
              variant: 'destructive',
            });
            setActivePageIndex(pageIndex);
          }
        });
      }
    });
    
    if (hasInvalidQuestions) {
      return;
    }

    mutation.mutate(data);
  };

  // == Page Management ==
  const addNewPage = () => {
    const newPageNumber = pages.length + 1;
    setPages([...pages, { pageNumber: newPageNumber, content: '', title: '', imageUrl: '', questions: [] }]);
  };

  const removePage = (index: number) => {
    if (pages.length <= 1) {
      toast({
        title: 'Error',
        description: 'Books must have at least one page.',
        variant: 'destructive',
      });
      return;
    }

    const updatedPages = [...pages];
    updatedPages.splice(index, 1);
    
    const renumberedPages = updatedPages.map((page, idx) => ({
      ...page,
      pageNumber: idx + 1
    }));
    
    setPages(renumberedPages);
    
    if (activePageIndex === index) {
      setActivePageIndex(null);
    } 
    else if (activePageIndex !== null && index < activePageIndex) {
      setActivePageIndex(activePageIndex - 1);
    }
  };

  const savePage = (values: PageFormValues, index: number) => {
    if (values.questions && values.questions.length > 0) {
      const invalidQuestions = values.questions.filter(q => 
        !q.questionText || q.questionText.trim().length < 5
      );
      
      if (invalidQuestions.length > 0) {
        toast({
          title: 'Invalid Question',
          description: 'Questions must be at least 5 characters long.',
          variant: 'destructive',
        });
        return;
      }
    }
    
    const updatedPages = [...pages];
    updatedPages[index] = values;
    setPages(updatedPages);
    setActivePageIndex(null);
    
    toast({
      title: 'Page Saved',
      description: `Page ${values.pageNumber} content has been saved.`,
    });
  };

  // == Render Component ==
  return (
    <div className="min-h-screen bg-gradient-to-br from-ilaw-white via-brand-gold-50 to-brand-navy-50 py-6">
      <div className="container mx-auto px-4">
        
        {/* == Header Section == */}
        <div className="text-center mb-8">
          <div className="bg-ilaw-navy rounded-2xl p-6 text-white shadow-xl mb-6">
            <div className="flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-ilaw-gold mr-3" />
              <span className="text-lg font-heading font-bold text-ilaw-gold">ILAW NG BAYAN LEARNING INSTITUTE</span>
            </div>
            <h1 className="text-3xl font-heading font-bold mb-2">Create New Learning Material ✨</h1>
            <p className="text-lg text-blue-100">Build engaging educational content for our students</p>
          </div>
          
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin')}
              className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-heading font-bold flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
        
        {/* == Main Content Grid == */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* == Book Details Form == */}
          <div className="lg:col-span-1">
            <div className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-lg">
              <div className="border-b border-brand-gold-200 p-6">
                <h3 className="text-2xl font-heading font-bold text-ilaw-navy flex items-center">
                  <Sparkles className="h-6 w-6 text-ilaw-gold mr-2" />
                  Book Details
                </h3>
                <p className="text-brand-gold-600 mt-1 font-medium">Enter the basic information about the book.</p>
              </div>
              <div className="p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} id="book-form" className="space-y-6">
                    
                    {/* == Title Field == */}
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-ilaw-navy font-heading font-bold">Title</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter book title" 
                              {...field} 
                              className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* == Description Field == */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-ilaw-navy font-heading font-bold">Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter book description" 
                              rows={4}
                              {...field} 
                              className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* == Cover Image Field == */}
                    <FormField
                      control={form.control}
                      name="coverImage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-ilaw-navy font-heading font-bold">Cover Image URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter URL for cover image" 
                              {...field} 
                              value={field.value || ''}
                              className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* == Book Type Field == */}
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-ilaw-navy font-heading font-bold">Book Type</FormLabel>
                          <FormControl>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <SelectTrigger className="border-2 border-brand-gold-200 focus:border-ilaw-gold">
                                <SelectValue placeholder="Select book type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="storybook">📖 Storybook</SelectItem>
                                <SelectItem value="educational">🎓 Educational</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* == Grade Level Field == */}
                    <FormField
                      control={form.control}
                      name="grade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-ilaw-navy font-heading font-bold">Grade Level</FormLabel>
                          <FormControl>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <SelectTrigger className="border-2 border-brand-gold-200 focus:border-ilaw-gold">
                                <SelectValue placeholder="Select grade level" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="K">🌟 Kindergarten</SelectItem>
                                <SelectItem value="1">1️⃣ Grade 1</SelectItem>
                                <SelectItem value="2">2️⃣ Grade 2</SelectItem>
                                <SelectItem value="3">3️⃣ Grade 3</SelectItem>
                                <SelectItem value="4">4️⃣ Grade 4</SelectItem>
                                <SelectItem value="5">5️⃣ Grade 5</SelectItem>
                                <SelectItem value="6">6️⃣ Grade 6</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* == Music Upload Field == */}
                    <FormField
                      control={form.control}
                      name="musicUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-ilaw-navy font-heading font-bold">🎵 Background Music</FormLabel>
                          <FormControl>
                            <div className="flex flex-col gap-2">
                              <Input
                                type="file"
                                accept="audio/*"
                                className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const fileName = `audio/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
                                    field.onChange(fileName);
                                    
                                    const formData = new FormData();
                                    formData.append('file', file);

                                    fetch(`/api/upload?path=${encodeURIComponent(fileName)}`, {
                                      method: 'POST',
                                      body: formData
                                    })
                                    .then(response => response.json())
                                    .then(data => {
                                      console.log('File uploaded successfully:', data);
                                      toast({
                                        title: 'Success',
                                        description: 'Music file uploaded successfully',
                                      });
                                    })
                                    .catch(error => {
                                      console.error('Error uploading file:', error);
                                      toast({
                                        title: 'Error',
                                        description: 'Failed to upload music file',
                                        variant: 'destructive',
                                      });
                                    });
                                  }
                                }}
                              />
                              {field.value && (
                                <div className="flex items-center gap-2 text-sm text-brand-gold-600 bg-brand-gold-50 p-2 rounded-lg">
                                  <span>🎵 Selected audio: {field.value.split('/').pop()}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => field.onChange('')}
                                    className="h-auto p-1 text-red-500 hover:text-red-700"
                                  >
                                    Clear
                                  </Button>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-brand-gold-600 mt-1 font-medium">
                            Upload an audio file (MP3) for background music during book reading.
                          </p>
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </div>

              {/* == Form Actions == */}
              <div className="border-t border-brand-gold-200 p-6 flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/admin/books')}
                  className="border-2 border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  form="book-form" 
                  disabled={mutation.isPending}
                  className="bg-gradient-to-r from-ilaw-navy to-ilaw-navy-600 hover:from-ilaw-navy-600 hover:to-ilaw-navy-700 text-white font-heading font-bold"
                >
                  {mutation.isPending ? '⏳ Adding...' : '✨ Add Book'}
                </Button>
              </div>
            </div>
          </div>
          
          {/* == Pages Section == */}
          <div className="lg:col-span-2">
            
            {/* == Pages Header == */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-heading font-bold text-ilaw-navy flex items-center">
                📄 Pages
              </h2>
              <Button 
                onClick={addNewPage}
                className="bg-gradient-to-r from-brand-gold-500 to-ilaw-gold hover:from-ilaw-gold hover:to-brand-gold-600 text-white font-heading font-bold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Page
              </Button>
            </div>
            
            {/* == Pages List == */}
            <div className="space-y-6">
              {pages.map((page, index) => (
                <div key={index}>
                  {activePageIndex === index ? (
                    <PageFormAddBook
                      initialValues={page}
                      pageNumber={page.pageNumber}
                      onSave={(values) => savePage(values, index)}
                      onRemove={() => removePage(index)}
                      showRemoveButton={pages.length > 1}
                    />
                  ) : (
                    <div className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                      
                      {/* == Page Preview Header == */}
                      <div className="border-b border-brand-gold-200 p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xl font-heading font-bold text-ilaw-navy">
                            📄 Page {page.pageNumber}
                            {page.title && `: ${page.title}`}
                          </span>
                          {page.questions && page.questions.length > 0 && (
                            <span className="text-sm bg-ilaw-navy text-white px-3 py-1 rounded-full font-bold">
                              ❓ {page.questions.length} Question{page.questions.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* == Page Preview Content == */}
                      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {page.imageUrl && (
                          <div className="md:col-span-1">
                            <div className="aspect-video rounded-xl overflow-hidden bg-brand-gold-50 border-2 border-brand-gold-200">
                              <img 
                                src={page.imageUrl} 
                                alt={page.title || `Page ${page.pageNumber}`}
                                className="w-full h-full object-contain" 
                              />
                            </div>
                          </div>
                        )}
                        <div className={`${page.imageUrl ? 'md:col-span-2' : 'md:col-span-3'}`}>
                          <p className="text-brand-gold-600 font-medium line-clamp-3">
                            {page.content || <em className="text-gray-400">No content yet</em>}
                          </p>
                        </div>
                      </div>

                      {/* == Page Preview Actions == */}
                      <div className="border-t border-brand-gold-200 p-4">
                        <Button 
                          variant="secondary" 
                          className="w-full bg-gradient-to-r from-brand-gold-100 to-brand-gold-200 hover:from-brand-gold-200 hover:to-brand-gold-300 text-ilaw-navy font-heading font-bold border-2 border-brand-gold-300" 
                          onClick={() => setActivePageIndex(index)}
                        >
                          ✏️ Edit Page
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}