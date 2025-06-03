// == IMPORTS & DEPENDENCIES ==
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { ChevronLeft, Edit, BookOpen, Loader2, Sparkles, GraduationCap } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger,} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// == BOOK DETAILS COMPONENT ==
export default function BookDetails() {
  
  // == HOOKS & STATE ==
  const { id } = useParams<{ id: string }>();
  const bookId = parseInt(id);
  const [activeTab, setActiveTab] = useState('details');
  
  // == DATA FETCHING ==
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
  
  // == UTILITY FUNCTIONS ==
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
  
  // == LOADING STATE ==
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-ilaw-white via-brand-gold-50 to-brand-navy-50">
        <Header variant="admin" />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 bg-white rounded-2xl p-8 border-2 border-brand-gold-200 shadow-xl">
            <Loader2 className="h-12 w-12 animate-spin text-ilaw-gold" />
            <p className="text-lg font-heading font-bold text-ilaw-navy">Loading book data...</p>
          </div>
        </main>
      </div>
    );
  }

  // == ERROR STATE ==
  if (!bookData) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-ilaw-white via-brand-gold-50 to-brand-navy-50">
        <Header variant="admin" />
        <main className="flex-1 flex items-center justify-center">
          <div className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-xl max-w-md">
            <div className="border-b border-brand-gold-200 p-6">
              <h3 className="text-2xl font-heading font-bold text-ilaw-navy">📚 Book Not Found</h3>
              <p className="text-brand-gold-600 mt-1 font-medium">
                We couldn't find the book you're looking for.
              </p>
            </div>
            <div className="p-6">
              <Link href="/admin/books">
                <Button className="bg-gradient-to-r from-ilaw-navy to-ilaw-navy-600 hover:from-ilaw-navy-600 hover:to-ilaw-navy-700 text-white font-heading font-bold">
                  <ChevronLeft className="h-4 w-4 mr-2" /> Back to Books
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
          <h1 className="text-3xl font-heading font-bold text-center mb-2">📖 Book Details</h1>
          <p className="text-lg text-blue-100 text-center">Comprehensive view of learning material</p>
        </div>
      </div>
      
      <main className="flex-1 py-8 container mx-auto px-4">
        
        {/* == Navigation Section == */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Link href="/admin/books">
              <Button 
                variant="ghost" 
                className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-heading font-bold"
              >
                <ChevronLeft className="h-4 w-4 mr-2" /> Back to Books
              </Button>
            </Link>
            
            <Link href="/admin">
              <Button 
                variant="outline" 
                size="sm"
                className="border-2 border-gray-300 text-gray-600 hover:bg-gray-50 font-heading font-bold"
              >
                Back to Dashboard
              </Button>
            </Link>
          </div>
          
          <div className="flex gap-2">
            <Link href={`/admin/edit-book/${bookId}`}>
              <Button className="bg-gradient-to-r from-brand-gold-500 to-ilaw-gold hover:from-ilaw-gold hover:to-brand-gold-600 text-white font-heading font-bold">
                <Edit className="h-4 w-4 mr-2" /> ✏️ Edit Book
              </Button>
            </Link>
          </div>
        </div>
        
        {/* == Content Grid == */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* == Book Information == */}
          <div className="lg:col-span-1">
            <div className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-lg">
              <div className="border-b border-brand-gold-200 p-6">
                <h3 className="text-2xl font-heading font-bold text-ilaw-navy flex items-center">
                  <Sparkles className="h-6 w-6 text-ilaw-gold mr-2" />
                  📚 Book Information
                </h3>
              </div>
              <div className="p-6">
                
                {/* == Book Cover & Title == */}
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
                  
                  {/* == Book Badges == */}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge 
                      variant={bookData.type === 'storybook' ? 'default' : 'secondary'}
                      className={bookData.type === 'storybook' 
                        ? 'bg-ilaw-navy text-white font-bold' 
                        : 'bg-brand-gold-200 text-ilaw-navy font-bold'
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
                
                {/* == Book Details == */}
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
          
          {/* == Book Content Tabs == */}
          <div className="lg:col-span-2">
            <div className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-lg">
              <div className="border-b border-brand-gold-200 p-6">
                <h3 className="text-2xl font-heading font-bold text-ilaw-navy">📖 Book Content</h3>
                <p className="text-brand-gold-600 mt-1 font-medium">
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
                  
                  {/* == Pages Tab == */}
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
                  
                  {/* == Questions Tab == */}
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
                                    <div key={index} className="p-4 border-2 border-brand-gold-300 rounded-xl bg-white">
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
      </main>
    </div>
  );
}