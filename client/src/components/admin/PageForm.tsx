// == IMPORTS & DEPENDENCIES ==
import React, { useState, useRef, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Upload, X, Image, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';

// == TYPE DEFINITIONS ==
export interface Question {
  questionText: string;
  answerType: string;
  correctAnswer?: string;
  options?: string;
}

const pageSchema = z.object({
  pageNumber: z.coerce.number().min(1, 'Page number is required'),
  title: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  imageUrl: z.string().optional(),
});

export interface PageFormValues extends z.infer<typeof pageSchema> {
  id?: number;
  questions?: Question[];
  showNotification?: boolean;
}

interface PageFormProps {
  initialValues?: PageFormValues;
  pageNumber: number;
  onSave: (values: PageFormValues) => void;
  onRemove: () => void;
  showRemoveButton?: boolean;
}

// == PAGE FORM COMPONENT ==
export function PageForm({
  initialValues, 
  pageNumber,
  onSave, 
  onRemove,
  showRemoveButton = true
}: PageFormProps) {
  
  // == State & Refs ==
  const { toast } = useToast();
  const [hasQuestions, setHasQuestions] = useState(false);
  const [questions, setQuestions] = useState<Question[]>(initialValues?.questions || []);
  const [imagePreview, setImagePreview] = useState<string | null>(initialValues?.imageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastQuestionsChange, setLastQuestionsChange] = useState(0);
  const [lastImageChange, setLastImageChange] = useState(0);
  
  // == Effects ==
  useEffect(() => {
    if (initialValues?.questions && initialValues.questions.length > 0) {
      setQuestions(initialValues.questions);
      setHasQuestions(true);
    }
    setTimeout(() => setIsInitialLoad(false), 1000);
  }, [initialValues?.questions]);
  
  // == Form Initialization ==
  const form = useForm<PageFormValues>({
    resolver: zodResolver(pageSchema),
    defaultValues: initialValues || {
      pageNumber,
      title: '',
      content: '',
      imageUrl: '',
    },
  });
  
  // == Auto-Save: Content Changes ==
  useEffect(() => {
    const subscription = form.watch((values, { name, type }) => {
      if (isInitialLoad) return;
      
      if (values.content && values.content.trim() && (type === 'change')) {
        setHasUnsavedChanges(true);
        
        const pageData = {
          ...values,
          pageNumber,
          questions: questions.length > 0 ? questions : undefined,
          showNotification: false
        };
        
        const timeoutId = setTimeout(() => {
          console.log("=== PAGEFORM: Auto-saving content (silent) ===", pageData);
          onSave(pageData as PageFormValues);
          setHasUnsavedChanges(false);
        }, 2000);
        
        return () => clearTimeout(timeoutId);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, pageNumber, questions, onSave, isInitialLoad, hasUnsavedChanges]);

  // == Auto-Save: Question Changes ==
  useEffect(() => {
    if (isInitialLoad) return;
    
    const formValues = form.getValues();
    if (formValues.content && formValues.content.trim()) {
      setHasUnsavedChanges(true);
      
      const now = Date.now();
      const shouldShowNotification = now - lastQuestionsChange < 500;
      
      const pageData = {
        ...formValues,
        pageNumber,
        questions: questions.length > 0 ? questions : undefined,
        showNotification: shouldShowNotification
      };
      
      const timeoutId = setTimeout(() => {
        console.log("=== PAGEFORM: Auto-saving questions ===", pageData);
        onSave(pageData as PageFormValues);
        setHasUnsavedChanges(false);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [questions, form, pageNumber, onSave, isInitialLoad, hasUnsavedChanges, lastQuestionsChange]);
  
  // == Image Handling ==
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size should be less than 5MB",
        variant: "destructive"
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      form.setValue("imageUrl", dataUrl);
      setHasUnsavedChanges(true);
      setLastImageChange(Date.now());
      
      const formValues = form.getValues();
      const pageData = {
        ...formValues,
        imageUrl: dataUrl,
        pageNumber,
        questions: questions.length > 0 ? questions : undefined,
        showNotification: true
      };
      
      setTimeout(() => {
        console.log("=== PAGEFORM: Auto-saving image change ===", pageData);
        onSave(pageData as PageFormValues);
        setHasUnsavedChanges(false);
      }, 500);
    };
    reader.readAsDataURL(file);
  };
  
  const clearImage = () => {
    setImagePreview(null);
    form.setValue("imageUrl", "");
    setHasUnsavedChanges(true);
    setLastImageChange(Date.now());
    
    const formValues = form.getValues();
    const pageData = {
      ...formValues,
      imageUrl: "",
      pageNumber,
      questions: questions.length > 0 ? questions : undefined,
      showNotification: true
    };
    
    setTimeout(() => {
      console.log("=== PAGEFORM: Auto-saving image removal ===", pageData);
      onSave(pageData as PageFormValues);
      setHasUnsavedChanges(false);
    }, 500);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // == Question Utilities ==
  const getOptionsList = (optionsString?: string): string[] => {
    if (!optionsString) return [];
    
    return optionsString.includes('\n') 
      ? optionsString.split('\n').filter(opt => opt.trim() !== '')
      : optionsString.split(',').map(opt => opt.trim()).filter(opt => opt !== '');
  };

  // == Question Management ==
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: '',
        answerType: 'text',
        correctAnswer: '',
        options: '',
      }
    ]);
    setHasQuestions(true);
    setHasUnsavedChanges(true);
    setLastQuestionsChange(Date.now());
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions.splice(index, 1);
    setQuestions(updatedQuestions);
    setHasUnsavedChanges(true);
    setLastQuestionsChange(Date.now());
    if (updatedQuestions.length === 0) {
      setHasQuestions(false);
    }
  };

  const updateQuestion = (index: number, field: keyof Question, value: string) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value
    };
    
    if (field === 'answerType' && value === 'multiple_choice') {
      const currentQuestion = updatedQuestions[index];
      const currentOptions = getOptionsList(currentQuestion.options);
      
      if (currentOptions.length === 0) {
        currentQuestion.options = "Option 1\nOption 2\nOption 3";
      }
    }
    
    setQuestions(updatedQuestions);
    setHasUnsavedChanges(true);
    setLastQuestionsChange(Date.now());
  };
  
  // == Option Management ==
  const addOption = (questionIndex: number) => {
    const question = questions[questionIndex];
    const currentOptions = getOptionsList(question.options || '');
    
    const nextOptionNumber = currentOptions.length + 1;
    const newOptions = [...currentOptions, `Option ${nextOptionNumber}`];
    const optionsString = newOptions.join('\n');
    
    updateQuestion(questionIndex, 'options', optionsString);
  };
  
  const removeOption = (questionIndex: number, optionIndex: number) => {
    const question = questions[questionIndex];
    const currentOptions = getOptionsList(question.options);
    
    if (question.correctAnswer === currentOptions[optionIndex]) {
      updateQuestion(questionIndex, 'correctAnswer', '');
    }
    
    const newOptions = [...currentOptions];
    newOptions.splice(optionIndex, 1);
    
    const optionsString = newOptions.join('\n');
    updateQuestion(questionIndex, 'options', optionsString);
  };
  
  const updateOptionText = (questionIndex: number, optionIndex: number, newText: string) => {
    const question = questions[questionIndex];
    const currentOptions = getOptionsList(question.options);
    
    if (question.correctAnswer === currentOptions[optionIndex]) {
      updateQuestion(questionIndex, 'correctAnswer', newText);
    }
    
    const newOptions = [...currentOptions];
    newOptions[optionIndex] = newText;
    
    const optionsString = newOptions.join('\n');
    updateQuestion(questionIndex, 'options', optionsString);
  };

  // == Render Component ==
  return (
    <div className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-lg mb-6">
      
      {/* == Page Header == */}
      <div className="border-b border-brand-gold-200 p-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-heading font-bold text-ilaw-navy flex items-center">
            <Sparkles className="h-6 w-6 text-ilaw-gold mr-2" />
            📄 Page {pageNumber}
            {hasUnsavedChanges && !isInitialLoad && (
              <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
                • Unsaved
              </span>
            )}
          </h3>
          {showRemoveButton && (
            <Button 
              type="button" 
              variant="destructive" 
              size="sm" 
              onClick={onRemove}
              className="bg-red-500 hover:bg-red-600 text-white font-heading font-bold"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove Page
            </Button>
          )}
        </div>
      </div>

      {/* == Form Content == */}
      <div className="p-6">
        <Form {...form}>
          <div className="space-y-6">
            
            {/* == Page Title Field == */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-ilaw-navy font-heading font-bold">Page Title (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter a title for this page" 
                      {...field} 
                      value={field.value || ''}
                      className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* == Page Content Field == */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-ilaw-navy font-heading font-bold">Page Content</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter the content for this page..." 
                      rows={5}
                      {...field} 
                      className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* == Image Upload Section == */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-ilaw-navy font-heading font-bold">🖼️ Page Image</FormLabel>
                    <div className="space-y-3">
                      
                      {/* == Image Preview == */}
                      {imagePreview && (
                        <div className="relative w-full max-w-md mx-auto">
                          <div className="relative aspect-video bg-brand-gold-50 rounded-xl overflow-hidden border-2 border-brand-gold-200">
                            <img 
                              src={imagePreview} 
                              alt="Page image preview" 
                              className="w-full h-full object-contain"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-red-500 hover:bg-red-600"
                              onClick={clearImage}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* == Image Upload Button == */}
                      {!imagePreview && (
                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-brand-gold-300 rounded-xl bg-brand-gold-50">
                          <Image className="h-8 w-8 text-brand-gold-600 mb-2" />
                          <p className="text-sm text-brand-gold-600 font-medium mb-2">Upload an image for this page</p>
                          <div className="flex items-center space-x-2">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageUpload}
                              id={`image-upload-${pageNumber}`}
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-100 font-heading font-bold"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="h-4 w-4 mr-1" />
                              Choose Image
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* == Image URL Input == */}
                      <div className="relative">
                        <FormControl>
                          <Input 
                            placeholder="Or enter image URL" 
                            {...field} 
                            value={field.value || ''}
                            className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
                            onChange={(e) => {
                              field.onChange(e);
                              setLastImageChange(Date.now());
                            }}
                          />
                        </FormControl>
                        <FormDescription className="text-brand-gold-600 font-medium">
                          You can either upload an image or provide a URL to an existing image
                        </FormDescription>
                        <FormMessage />
                      </div>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* == Questions Section == */}
            <div className="pt-6 border-t-2 border-brand-gold-200">
              
              {/* == Questions Header == */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-heading font-bold text-ilaw-navy flex items-center">
                  ❓ Questions
                </h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addQuestion}
                  className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-100 font-heading font-bold"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Question
                </Button>
              </div>

              {/* == Questions List == */}
              {questions.map((question, index) => (
                <div key={index} className="p-4 border-2 border-brand-gold-200 rounded-xl mb-4 bg-brand-gold-50">
                  
                  {/* == Question Header == */}
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-lg font-heading font-bold text-ilaw-navy">❓ Question {index + 1}</h4>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeQuestion(index)}
                      className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50 font-bold"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* == Question Fields == */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-ilaw-navy font-heading font-bold">Question Text</Label>
                      <Textarea 
                        value={question.questionText}
                        onChange={(e) => updateQuestion(index, 'questionText', e.target.value)}
                        placeholder="Enter your question here..."
                        className="mt-1 border-2 border-brand-gold-200 focus:border-ilaw-gold"
                      />
                    </div>

                    <div>
                      <Label className="text-ilaw-navy font-heading font-bold">Answer Type</Label>
                      <select 
                        value={question.answerType}
                        onChange={(e) => updateQuestion(index, 'answerType', e.target.value)}
                        className="w-full mt-1 p-2 border-2 border-brand-gold-200 rounded-lg focus:border-ilaw-gold font-medium"
                      >
                        <option value="text">✍️ Text</option>
                        <option value="multiple_choice">🔘 Multiple Choice</option>
                      </select>
                    </div>

                    {/* == Text Answer == */}
                    {question.answerType === 'text' && (
                      <div>
                        <Label className="text-ilaw-navy font-heading font-bold">Correct Answer</Label>
                        <Input 
                          value={question.correctAnswer || ''}
                          onChange={(e) => updateQuestion(index, 'correctAnswer', e.target.value)}
                          placeholder="Enter the correct answer"
                          className="mt-1 border-2 border-brand-gold-200 focus:border-ilaw-gold"
                        />
                      </div>
                    )}

                    {/* == Multiple Choice Options == */}
                    {question.answerType === 'multiple_choice' && (
                      <>
                        <div>
                          <Label className="text-ilaw-navy font-heading font-bold">Options</Label>
                          <div className="border-2 border-brand-gold-200 rounded-xl mt-1 bg-white">
                            {getOptionsList(question.options).map((option, optionIdx) => (
                              <div key={optionIdx} className="flex items-center p-3 border-b border-brand-gold-200 last:border-b-0">
                                <input 
                                  type="radio"
                                  id={`question-${index}-option-${optionIdx}`}
                                  name={`question-${index}-correct`}
                                  className="mr-3 h-4 w-4 text-ilaw-gold"
                                  checked={question.correctAnswer === option}
                                  onChange={() => updateQuestion(index, 'correctAnswer', option)}
                                />
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => updateOptionText(index, optionIdx, e.target.value)}
                                  className="flex-1 border-0 focus:ring-0 p-1 font-medium text-ilaw-navy"
                                  placeholder={`Option ${optionIdx + 1}`}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => removeOption(index, optionIdx)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            
                            <div className="p-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => addOption(index)}
                                className="w-full justify-center border-2 border-dashed border-brand-gold-300 text-brand-gold-600 hover:bg-brand-gold-100 font-bold"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Option
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-brand-gold-600 mt-1 font-medium">
                            Select the radio button next to the correct answer
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* == No Questions Message == */}
              {questions.length === 0 && (
                <p className="text-sm text-brand-gold-600 italic font-medium text-center p-4 bg-brand-gold-50 rounded-xl border-2 border-brand-gold-200">
                  No questions added yet. Click 'Add Question' to add interactive questions to this page.
                </p>
              )}
            </div>

            {/* == Auto-Save Status == */}
            <div className="pt-6 border-t-2 border-brand-gold-200">
              <div className="bg-gradient-to-r from-brand-gold-50 to-ilaw-navy-50 border-2 border-brand-gold-200 rounded-xl p-4 text-center">
                <p className="text-sm text-ilaw-navy font-medium flex items-center justify-center">
                  <Sparkles className="h-4 w-4 mr-2 text-ilaw-gold" />
                  ✨ Changes save automatically. Click "Save Changes" at the bottom to update the book.
                </p>
              </div>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}