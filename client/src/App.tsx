import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import VisitorHome from "@/pages/visitor/home";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import ForgotPassword from "@/pages/auth/forgot-password";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminStudents from "@/pages/admin/students";
import AdminBooks from "@/pages/admin/books";
import AdminTeacher from "@/pages/admin/teacher";  
import AddTeacher from "@/pages/admin/add-teacher";
import AddBook from "@/pages/admin/add-book";
import EditBook from "@/pages/admin/edit-book";
import BookDetails from "@/pages/admin/book-details";
import TeacherDashboard from "@/pages/teacher/dashboard";
import TeacherStudents from "@/pages/teacher/students"; 
import TeacherBooks from "@/pages/teacher/books";
import TeacherEditBook from "@/pages/teacher/TeacherEditBook";
import TeacherBookDetails from "@/pages/teacher/TeacherBookDetails";
import StudentDashboard from "@/pages/student/dashboard";
import Storybooks from "@/pages/student/storybooks";
import TwoDAnimation from "@/pages/student/twodanimation";
import SunMoonStory from "@/pages/student/stories/sun-moon";
import NecklaceCombStory from  "@/pages/student/stories/necklace-comb";
import CoconutManStory from "@/pages/student/stories/coconut-man";
import EducationalBooks from "@/pages/student/educational-books";
import ReadStorybook from "@/pages/student/read-storybook";
import ReadEducationalBook from "@/pages/student/read-educational-book";
import Progress from "@/pages/student/progress";
import ProtectedRoute from "@/components/layout/ProtectedRoute";

function Router() {
  return (
    <Switch>
      {/* Visitor pages */}
      <Route path="/" component={VisitorHome} />
      
      {/* Auth pages */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/auth/login" component={Login} />
      <Route path="/auth/register" component={Register} />
      <Route path="/auth/forgot-password" component={ForgotPassword} />
      
      {/* Admin routes */}
      <Route path="/admin">
        <ProtectedRoute role="admin">
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/students">
        <ProtectedRoute role="admin">
          <AdminStudents />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/books">
        <ProtectedRoute role="admin">
          <AdminBooks />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/teacher">
        <ProtectedRoute role="admin">
          <AdminTeacher />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/add-teacher">
        <ProtectedRoute role="admin">
          <AddTeacher />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/add-book">
        <ProtectedRoute role="admin">
          <AddBook />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/edit-book/:id">
        <ProtectedRoute role="admin">
          <EditBook />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/books/:id">
        <ProtectedRoute role="admin">
          <BookDetails />
        </ProtectedRoute>
      </Route>

      {/* Teacher routes */}
      <Route path="/teacher">
        <ProtectedRoute role="teacher">
          <TeacherDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/teacher/books">
        <ProtectedRoute role="teacher">
          <TeacherBooks />  
        </ProtectedRoute>
      </Route>
      <Route path="/teacher/students">
        <ProtectedRoute role="teacher">
          <TeacherStudents />
        </ProtectedRoute>
      </Route>
      <Route path="/teacher/add-book">
        <ProtectedRoute role="teacher">
          <AddBook />  
        </ProtectedRoute>
      </Route>
      <Route path="/teacher/edit-book/:id">
        <ProtectedRoute role="teacher">
          <TeacherEditBook />
        </ProtectedRoute>
      </Route>
      <Route path="/teacher/books/:id">
        <ProtectedRoute role="teacher">
          <TeacherBookDetails />
        </ProtectedRoute>
      </Route>
      
      {/* Student routes */}
      <Route path="/student">
        <ProtectedRoute role="student">
          <StudentDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/student/storybooks">
        <ProtectedRoute role="student">
          <Storybooks />
        </ProtectedRoute>
      </Route>
      <Route path="/student/twodanimation">
        <ProtectedRoute role="student">
          <TwoDAnimation />
        </ProtectedRoute>
      </Route>
      <Route path="/student/read-twodanimation/sun-moon">
        <ProtectedRoute role="student">
          <SunMoonStory />
        </ProtectedRoute>
      </Route> 
      <Route path="/student/read-twodanimation/necklace-comb">
        <ProtectedRoute role="student">
          <NecklaceCombStory />
        </ProtectedRoute>
      </Route>
      <Route path="/student/read-twodanimation/coconut-man">
        <ProtectedRoute role="student">
          <CoconutManStory />
        </ProtectedRoute>
      </Route>

      <Route path="/student/educational-books">
        <ProtectedRoute role="student">
          <EducationalBooks />
        </ProtectedRoute>
      </Route>
      <Route path="/student/progress">
        <ProtectedRoute role="student">
          <Progress />
        </ProtectedRoute>
      </Route>
      
      {/* Book reader routes */}
      <Route path="/student/storybooks/:id">
        <ProtectedRoute role="student">
          <ReadStorybook />
        </ProtectedRoute>
      </Route>
      
      <Route path="/student/educational-books/:id">
        <ProtectedRoute role="student">
          <ReadEducationalBook />
        </ProtectedRoute>
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;