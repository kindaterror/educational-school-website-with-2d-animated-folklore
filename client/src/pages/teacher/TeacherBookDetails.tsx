import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { ChevronLeft, Edit, BookOpen, Loader2, Sparkles, Users } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger,} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

function TeacherBookDetails() {
  const { id } = useParams<{ id: string }>();
  const bookId = parseInt(id);
  const [activeTab, setActiveTab] = useState('details');
  
  // Fetch book data
  const { data: bookData, isLoading } = useQuery({
    queryKey: [`/api/books/${bookId}`],
    queryFn: async () => {
      interface BookResponse { book: any }
      const response = await apiRequest<BookResponse>('GET', `/api/books/${bookId}`);
      if (response && response.book) {
        return response.book;
      }
      throw new Error('Failed to fetch book data');
    },
    enabled: !!bookId
  });
  
  // Fetch pages for this book
  const { data: pagesData } = useQuery({
    queryKey: [`/api/books/${bookId}/pages`],
    queryFn: async () => {
      interface PagesResponse { pages: any[] }
      const response = await apiRequest<PagesResponse>('GET', `/api/books/${bookId}/pages`);
      if (response && response.pages) {
        return response.pages;
      }
      return [];
    },
    enabled: !!bookId
  });
  
  // Format timestamp
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Show loading state
  if (isLoading) {
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

  // Ensure we have book data
  if (!bookData) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-gold-50 to-ilaw-white">
        <Header variant="teacher" />
        <main className="flex-1 flex items-center justify-center">
          <div className="border-2 border-brand-gold-200 bg-ilaw-white rounded-2xl shadow-xl max-w-md">
            <div className="border-b border-brand-gold-200 p-6">
              <h3 className="text-2xl font-heading font-bold text-ilaw-navy">📚 Book Not Found</h3>
              <p className="text-brand-gold-600 mt-1 font-medium">
                We couldn't find the book you're looking for.
              </p>
            </div>
            <div className="p-6">
              <Link href="/teacher/books">
                <Button className="bg-ilaw-gold hover:bg-brand-amber text-ilaw-navy font-heading font-bold">
                  <ChevronLeft className="h-4 w-4 mr-2" /> Back to Books
                </Button>
              </Link>
            </div>
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
                  <BookOpen className="h-8 w-8 mr-3" />
                  <span className="text-sm font-semibold uppercase tracking-wide opacity-80">
                    Book Details
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">{bookData.title}</h1>
                <p className="text-lg opacity-80">
                  Comprehensive view of learning material
                </p>
              </div>
              <div className="mt-6 md:mt-0 flex gap-3">
                <Link href="/teacher/books">
                  <Button variant="outline" className="border-2 border-ilaw-navy text-ilaw-navy hover:bg-ilaw-navy hover:text-ilaw-gold font-semibold px-6 py-3">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Books
                  </Button>
                </Link>
                <Link href={`/teacher/edit-book/${bookId}`}>
                  <Button className="bg-ilaw-navy hover:bg-brand-navy-800 text-ilaw-gold font-heading font-bold px-6 py-3 shadow-lg">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Book
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column - Book info */}
            <div className="lg:col-span-1">
              <div className="bg-ilaw-white rounded-xl shadow-lg border-2 border-brand-gold-200">
                <div className="bg-gradient-to-r from-ilaw-navy to-brand-navy-800 p-4">
                  <h2 className="text-xl font-heading font-bold text-ilaw-gold flex items-center">
                    <Sparkles className="h-6 w-6 mr-3" />
                    Book Information
                  </h2>
                </div>
                <div className="p-6">
                  <div className="flex flex-col items-center mb-6">
                    {bookData.coverImage ? (
                      <img 
                        src={bookData.coverImage} 
                        alt={bookData.title} 
                        className="rounded-xl w-full max-w-[250px] object-cover aspect-[3/4] mb-4 shadow-lg border-2 border-brand-gold-200" 
                      />
                    ) : (
                      <div className="bg-brand-gold-50 border-2 border-brand-gold-200 rounded-xl w-full max-w-[250px] aspect-[3/4] mb-4 flex items-center justify-center">
                        <BookOpen className="h-16 w-16 text-brand-gold-400" />
                      </div>
                    )}
                    
                    <h2 className="text-2xl font-heading font-bold text-center mt-2 text-ilaw-navy">{bookData.title}</h2>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Badge 
                        variant={bookData.type === 'storybook' ? 'default' : 'secondary'}
                        className={bookData.type === 'storybook' 
                          ? 'bg-ilaw-navy text-white font-bold' 
                          : 'bg-brand-amber text-ilaw-navy font-bold'
                        }
                      >
                        {bookData.type === 'storybook' ? '📖 Storybook' : '🎓 Educational'}
                      </Badge>
                      {bookData.grade && (
                        <Badge 
                          variant="outline"
                          className="border-2 border-brand-gold-300 text-brand-gold-600 font-bold"
                        >
                          Grade {bookData.grade === 'K' ? 'K' : bookData.grade}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Separator className="my-4 bg-brand-gold-200" />
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-heading font-bold text-ilaw-navy">📝 Description</h3>
                      <p className="mt-1 text-brand-gold-600 font-medium">{bookData.description}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-heading font-bold text-ilaw-navy">📄 Pages</h3>
                      <p className="mt-1 text-brand-gold-600 font-medium">{pagesData?.length || 0} pages</p>
                    </div>
                    
                    {bookData.createdAt && (
                      <div>
                        <h3 className="text-sm font-heading font-bold text-ilaw-navy">📅 Added On</h3>
                        <p className="mt-1 text-brand-gold-600 font-medium">{formatDate(bookData.createdAt)}</p>
                      </div>
                    )}
                    
                    {bookData.musicUrl && (
                      <div>
                        <h3 className="text-sm font-heading font-bold text-ilaw-navy">🎵 Background Music</h3>
                        <div className="mt-1">
                          <audio controls className="w-full" src={bookData.musicUrl}>
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right column - Content tabs */}
            <div className="lg:col-span-2">
              <div className="bg-ilaw-white rounded-xl shadow-lg border-2 border-brand-gold-200">
                <div className="bg-gradient-to-r from-ilaw-navy to-brand-navy-800 p-4">
                  <h2 className="text-xl font-heading font-bold text-ilaw-gold">📖 Book Content</h2>
                  <p className="text-blue-100 mt-1 font-medium">
                    View pages and questions for this book
                  </p>
                </div>
                <div className="p-6">
                  <Tabs defaultValue="pages" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-brand-gold-100 rounded-xl">
                      <TabsTrigger 
                        value="pages" 
                        className="font-heading font-bold data-[state=active]:bg-ilaw-navy data-[state=active]:text-white"
                      >
                        📄 Pages
                      </TabsTrigger>
                      <TabsTrigger 
                        value="questions"
                        className="font-heading font-bold data-[state=active]:bg-ilaw-navy data-[state=active]:text-white"
                      >
                        ❓ Questions
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="pages" className="pt-6">
                      {pagesData && pagesData.length > 0 ? (
                        <div className="space-y-6">
                          {pagesData.map((page: any) => (
                            <div key={page.id} className="border-2 border-brand-gold-200 bg-brand-gold-50 rounded-xl">
                              <div className="border-b border-brand-gold-200 p-4">
                                <h4 className="text-lg font-heading font-bold text-ilaw-navy">
                                  📄 Page {page.pageNumber}
                                  {page.title && `: ${page.title}`}
                                </h4>
                              </div>
                              <div className="p-4">
                                <div className="flex flex-col md:flex-row gap-4">
                                  {page.imageUrl && (
                                    <div className="w-full md:w-1/3">
                                      <img 
                                        src={page.imageUrl}
                                        alt={`Page ${page.pageNumber}`}
                                        className="rounded-xl w-full object-cover aspect-video border-2 border-brand-gold-200"
                                      />
                                    </div>
                                  )}
                                  
                                  <div className={`w-full ${page.imageUrl ? 'md:w-2/3' : ''}`}>
                                    <p className="whitespace-pre-line text-ilaw-navy font-medium">{page.content}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center bg-brand-gold-50 rounded-xl border-2 border-brand-gold-200">
                          <p className="text-brand-gold-600 font-medium italic">📚 No pages found for this book.</p>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="questions" className="pt-6">
                      {pagesData && pagesData.some((page: any) => page.questions && page.questions.length > 0) ? (
                        <div className="space-y-6">
                          {pagesData
                            .filter((page: any) => page.questions && page.questions.length > 0)
                            .map((page: any) => (
                              <div key={`questions-${page.id}`} className="border-2 border-brand-gold-200 bg-brand-gold-50 rounded-xl">
                                <div className="border-b border-brand-gold-200 p-4">
                                  <h4 className="text-lg font-heading font-bold text-ilaw-navy">
                                    ❓ Page {page.pageNumber} Questions
                                    {page.title && ` - ${page.title}`}
                                  </h4>
                                </div>
                                <div className="p-4">
                                  <div className="space-y-4">
                                    {page.questions.map((question: any, index: number) => (
                                      <div key={index} className="p-4 border-2 border-brand-gold-300 rounded-xl bg-ilaw-white">
                                        <h4 className="font-heading font-bold mb-2 text-ilaw-navy">
                                          ❓ Question {index + 1}: {question.questionText}
                                        </h4>
                                        
                                        <div className="ml-4">
                                          <p className="text-sm text-brand-gold-600 font-bold mb-1">
                                            Type: {question.answerType === 'text' ? '✍️ Text Answer' : '🔘 Multiple Choice'}
                                          </p>
                                          
                                          {question.answerType === 'multiple_choice' && question.options && (
                                            <div className="mt-2">
                                              <p className="text-sm text-brand-gold-600 font-bold mb-1">Options:</p>
                                              <ul className="list-disc pl-5">
                                                {question.options.split('\n').map((option: string, optIdx: number) => (
                                                  <li key={optIdx} className={option === question.correctAnswer ? 'font-bold text-green-600' : 'text-ilaw-navy font-medium'}>
                                                    {option}
                                                    {option === question.correctAnswer && ' ✅ (correct)'}
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                          
                                          {question.answerType === 'text' && question.correctAnswer && (
                                            <p className="text-sm mt-2">
                                              <span className="text-brand-gold-600 font-bold">Correct answer:</span>{' '}
                                              <span className="font-bold text-green-600">{question.correctAnswer}</span>
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center bg-brand-gold-50 rounded-xl border-2 border-brand-gold-200">
                          <p className="text-brand-gold-600 font-medium italic">❓ No questions found for this book.</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default TeacherBookDetails;