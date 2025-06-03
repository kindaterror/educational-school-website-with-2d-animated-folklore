import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as schema from "@shared/schema";
import { ZodError } from "zod";
import { eq, and, desc, asc, or, like, inArray, isNull, isNotNull } from "drizzle-orm";
import { db } from "@db";

// JWT Secret - should ideally be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  throw new Error('JWT_SECRET environment variable is required');
})();

// Authentication middleware
const authenticate = (req: Request, res: Response, next: Function) => {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Authorization middleware
const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: Function) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    if (!roles.includes(user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    next();
  };
};

// ✅ FIXED: Stats handler function - only count approved students
const statsHandler = async (req: Request, res: Response) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log("=== FETCHING DASHBOARD STATS ===");
    
    // Get all reading sessions with completion data
    const allSessions = await db.select()
      .from(schema.readingSessions)
      .where(isNotNull(schema.readingSessions.endTime));
    
    // Calculate average reading time from actual sessions
    const completedSessions = allSessions.filter(session => 
      session.totalMinutes && session.totalMinutes > 0
    );
    
    const avgReadingTime = completedSessions.length > 0 
      ? Math.round(
          completedSessions.reduce((sum, session) => sum + (session.totalMinutes || 0), 0) 
          / completedSessions.length
        )
      : 25; // fallback to 25 minutes
    
    // ✅ FIXED: Include user role and approval status in query
    const allProgress = await db.select({
      id: schema.progress.id,
      userId: schema.progress.userId,
      bookId: schema.progress.bookId,
      percentComplete: schema.progress.percentComplete,
      userFirstName: schema.users.firstName,
      userLastName: schema.users.lastName,
      userRole: schema.users.role,
      userApprovalStatus: schema.users.approvalStatus,
      bookTitle: schema.books.title
    })
    .from(schema.progress)
    .leftJoin(schema.users, eq(schema.progress.userId, schema.users.id))
    .leftJoin(schema.books, eq(schema.progress.bookId, schema.books.id));
    
    console.log("📊 Total progress records found:", allProgress.length);
    
    // ✅ FIXED: Filter for APPROVED STUDENTS ONLY
    const approvedStudentProgress = allProgress.filter(p => 
      p.userRole === 'student' && p.userApprovalStatus === 'approved'
    );
    
    console.log("📊 Approved student progress records:", approvedStudentProgress.length);
    
    // ✅ FIXED: Only check completion for approved students
    const completedBooks = approvedStudentProgress.filter((p) => {
      const isComplete = (p.percentComplete || 0) >= 100;
      if (isComplete) {
        const userName = (p.userFirstName && p.userLastName) 
          ? `${p.userFirstName} ${p.userLastName}` 
          : "Unknown User";
        const bookTitle = p.bookTitle || "Unknown Book";
        console.log(`✅ Found completed book: Approved student ${userName} completed ${bookTitle} (${p.percentComplete}%)`);
      }
      return isComplete;
    });
    
    // ✅ FIXED: Calculate completion rate for approved students only
    const approvedUserIds = approvedStudentProgress.map(p => p.userId);
    const completedApprovedUserIds = completedBooks.map(p => p.userId);
    const uniqueApprovedUsers = Array.from(new Set(approvedUserIds));
    const approvedUsersWithCompletedBooks = Array.from(new Set(completedApprovedUserIds));
    
    const userBasedCompletionRate = uniqueApprovedUsers.length > 0 
      ? Math.round((approvedUsersWithCompletedBooks.length / uniqueApprovedUsers.length) * 100)
      : 0;
    
    // Also calculate book-based completion rate for approved students
    const bookCompletionRate = approvedStudentProgress.length > 0 
      ? Math.round((completedBooks.length / approvedStudentProgress.length) * 100)
      : 0;
    
    const stats = {
      avgReadingTime: avgReadingTime,
      completionRate: bookCompletionRate, // ✅ CHANGED: Now uses book-based completion rate
      totalSessions: allSessions.length,
      totalReadingMinutes: completedSessions.reduce((sum, session) => 
        sum + (session.totalMinutes || 0), 0
      ),
      // ✅ DEBUGGING INFO - Remove in production
      debug: {
        totalProgressRecords: allProgress.length,
        approvedStudentProgressRecords: approvedStudentProgress.length,
        completedBooksCount: completedBooks.length,
        uniqueApprovedUsersCount: uniqueApprovedUsers.length,
        approvedUsersWithCompletedBooksCount: approvedUsersWithCompletedBooks.length,
        userBasedCompletionRate: userBasedCompletionRate,
        bookBasedCompletionRate: bookCompletionRate,
        sampleApprovedProgress: approvedStudentProgress.slice(0, 3).map(p => ({
          userId: p.userId,
          bookId: p.bookId,
          percentComplete: p.percentComplete,
          bookTitle: p.bookTitle || "Unknown",
          userName: (p.userFirstName && p.userLastName) 
            ? `${p.userFirstName} ${p.userLastName}` 
            : "Unknown",
          approvalStatus: p.userApprovalStatus
        }))
      }
    };
    
    console.log("=== DASHBOARD STATS CALCULATED ===");
    console.log(`📈 User-based Completion Rate: ${userBasedCompletionRate}% (${approvedUsersWithCompletedBooks.length}/${uniqueApprovedUsers.length} approved students)`);
    console.log(`📚 Book-based Completion Rate: ${bookCompletionRate}% (${completedBooks.length}/${approvedStudentProgress.length} progress records)`);
    console.log(`⏱️ Average Reading Time: ${avgReadingTime} minutes`);
    
    return res.status(200).json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // ✅ ADDED: Stats route
  app.get("/api/stats", authenticate, statsHandler);

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Check for missing or malformed body
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ message: "Invalid request format, expecting JSON object" });
      }
      
      // Validate user data
      let userData;
      try {
        userData = schema.insertUserSchema.parse(req.body);
      } catch (validationError) {
        if (validationError instanceof ZodError) {
          return res.status(400).json({ 
            message: "Validation error", 
            errors: validationError.errors 
          });
        }
        throw validationError;
      }
      
      // Check if email already exists
      const existingUser = await db.query.users.findFirst({
        where: or(
          eq(schema.users.email, userData.email),
          eq(schema.users.username, userData.username)
        )
      });
      
      if (existingUser) {
        return res.status(400).json({ message: "Email or username already in use" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Insert user
      const [newUser] = await db.insert(schema.users)
        .values({
          ...userData,
          password: hashedPassword
        })
        .returning({
          id: schema.users.id,
          username: schema.users.username,
          email: schema.users.email,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          role: schema.users.role,
          gradeLevel: schema.users.gradeLevel
        });

      // Generate token
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      
      return res.status(201).json({
        message: "User registered successfully",
        user: newUser,
        token
      });
    } catch (error) {
      console.error("Error registering user:", error);
      return res.status(500).json({ 
        message: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log("Login attempt:", req.body.email);
      const loginData = schema.loginSchema.parse(req.body);
      
      // Find user
      const user = await db.query.users.findFirst({
        where: eq(schema.users.email, loginData.email)
      });
      
      if (!user) {
        console.log("User not found with email:", loginData.email);
        return res.status(400).json({ message: "Invalid email or password" });
      }
      
      console.log("User found:", user.email, user.username);
      
      // Check password
      const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
      console.log("Password valid:", isPasswordValid);
      
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid email or password" });
      }
      
      // For student accounts, check approval status
      if (user.role === 'student' && user.approvalStatus !== 'approved') {
        if (user.approvalStatus === 'pending') {
          return res.status(403).json({ 
            message: "Your account is pending approval from an administrator. Please check back later." 
          });
        } else if (user.approvalStatus === 'rejected') {
          return res.status(403).json({ 
            message: "Your account application has been rejected.", 
            reason: user.rejectionReason || "No reason provided." 
          });
        }
      }
      
      // For teacher accounts, check approval status
      if (user.role === 'teacher' && user.approvalStatus !== 'approved') {
        if (user.approvalStatus === 'pending') {
          return res.status(403).json({ 
            message: "Your teacher account is pending approval from an administrator. Please check back later." 
          });
        } else if (user.approvalStatus === 'rejected') {
          return res.status(403).json({ 
            message: "Your teacher account application has been rejected.", 
            reason: user.rejectionReason || "No reason provided." 
          });
        }
      }
      
      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      
      return res.status(200).json({
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          gradeLevel: user.gradeLevel
        },
        token
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error logging in:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/auth/user", authenticate, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
        columns: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          gradeLevel: true,
          createdAt: true
        }
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.status(200).json({ user });
    } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Book routes
  app.get("/api/books", authenticate, authorize(["admin", "teacher", "student"]), async (req, res) => {
    try {
      const type = req.query.type as string;
      const search = req.query.search as string;
      const grade = req.query.grade as string;
      
      console.log("Book filter params:", { type, search, grade });
      
      // Start with a base query
      let query = db.select().from(schema.books);
      
      // Build WHERE conditions
      const conditions = [];
      
      // Add type filter
      if (type && type !== 'all') {
        conditions.push(eq(schema.books.type, type as any));
      }
      
      // Add grade filter
      if (grade && grade !== 'all') {
        conditions.push(eq(schema.books.grade, grade));
      }
      
      // Add search filter
      if (search) {
        conditions.push(
          or(
            like(schema.books.title, `%${search}%`),
            like(schema.books.description, `%${search}%`)
          )
        );
      }
      
      // Apply all conditions with AND logic
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const books = await query.orderBy(desc(schema.books.createdAt));
      
      return res.status(200).json({ books });
    } catch (error) {
      console.error("Error fetching books:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/books/:id", authenticate, authorize(["admin", "teacher", "student"]), async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);
      
      const book = await db.query.books.findFirst({
        where: eq(schema.books.id, bookId),
        with: {
          chapters: {
            orderBy: asc(schema.chapters.orderIndex)
          }
        }
      });
      
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      
      return res.status(200).json({ book });
    } catch (error) {
      console.error("Error fetching book:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Delete a book
  app.delete("/api/books/:id", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
  try {
    const bookId = parseInt(req.params.id);
    
    // Check if book exists
    const book = await db.query.books.findFirst({
      where: eq(schema.books.id, bookId)
    });
    
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    
    // Get all pages for this book
    const pages = await db.query.pages.findMany({
      where: eq(schema.pages.bookId, bookId),
      with: {
        questions: true
      }
    });
    
    // Start a transaction to handle cascading deletes
    await db.transaction(async (tx) => {
      // 1. Delete all reading sessions for this book
      await tx.delete(schema.readingSessions)
        .where(eq(schema.readingSessions.bookId, bookId));
      
      // 2. Delete all questions for all pages in this book
      for (const page of pages) {
        if (page.questions && page.questions.length > 0) {
          await tx.delete(schema.questions)
            .where(inArray(schema.questions.id, page.questions.map(q => q.id)));
        }
      }
      
      // 3. Delete all pages
      if (pages.length > 0) {
        await tx.delete(schema.pages)
          .where(eq(schema.pages.bookId, bookId));
      }
      
      // 4. Delete all progress records
      await tx.delete(schema.progress)
        .where(eq(schema.progress.bookId, bookId));
      
      // 5. Finally delete the book
      await tx.delete(schema.books)
        .where(eq(schema.books.id, bookId));
    });
    
    return res.status(200).json({ 
      message: "Book deleted successfully",
      id: bookId
    });
  } catch (error) {
    console.error("Error deleting book:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
  
  // FIXED: Update a book - NO ZOD VALIDATION
  app.put("/api/books/:id", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    console.log("=== FIXED SERVER ROUTE: Edit book API called ===");
    console.log("Book ID:", req.params.id);
    console.log("Request body:", req.body);
    console.log("User:", (req as any).user);
    
    try {
      const bookId = parseInt(req.params.id);
      console.log("Parsed book ID:", bookId);
      
      // SIMPLE VALIDATION - NO ZOD
      const { title, description, type, grade, coverImage, musicUrl } = req.body;
      
      if (!title || !description || !type || !grade) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: "Title, description, type, and grade are required" 
        });
      }
      
      const bookData = { 
        title: title.trim(), 
        description: description.trim(), 
        type, 
        grade, 
        coverImage: coverImage || null, 
        musicUrl: musicUrl || null 
      };
      console.log("Validated book data:", bookData);
      
      // Check if book exists
      const book = await db.query.books.findFirst({
        where: eq(schema.books.id, bookId)
      });
      
      if (!book) {
        console.log("Book not found for ID:", bookId);
        return res.status(404).json({ message: "Book not found" });
      }
      
      console.log("Found existing book:", book);
      
      // Update the book
      const [updatedBook] = await db.update(schema.books)
        .set(bookData)
        .where(eq(schema.books.id, bookId))
        .returning();
      
      console.log("Book updated successfully:", updatedBook);
      
      return res.status(200).json({
        message: "Book updated successfully",
        book: updatedBook
      });
    } catch (error) {
      console.error("=== FIXED SERVER ROUTE: Error in edit book ===", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/books", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    try {
      const bookData = schema.insertBookSchema.parse(req.body);
      const userId = (req as any).user.id;
      
      const [newBook] = await db.insert(schema.books)
        .values({
          ...bookData,
          addedById: userId
        })
        .returning();
      
      return res.status(201).json({
        message: "Book added successfully",
        book: newBook
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error adding book:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/books/:bookId/chapters", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const chapterData = schema.insertChapterSchema.parse(req.body);
      
      // Check if book exists
      const book = await db.query.books.findFirst({
        where: eq(schema.books.id, bookId)
      });
      
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      
      // Get the highest order index
      const chapters = await db.query.chapters.findMany({
        where: eq(schema.chapters.bookId, bookId),
        orderBy: desc(schema.chapters.orderIndex),
        limit: 1
      });
      
      const orderIndex = chapters.length > 0 ? chapters[0].orderIndex + 1 : 0;
      
      const [newChapter] = await db.insert(schema.chapters)
        .values({
          ...chapterData,
          bookId,
          orderIndex
        })
        .returning();
      
      return res.status(201).json({
        message: "Chapter added successfully",
        chapter: newChapter
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error adding chapter:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ✅ NEW: Teacher book management routes
  app.get("/api/teacher/books", authenticate, authorize(["teacher"]), async (req, res) => {
    try {
      const type = req.query.type as string;
      const search = req.query.search as string;
      const grade = req.query.grade as string;
      
      console.log("Teacher book filter params:", { type, search, grade });
      
      // Start with a base query
      let query = db.select().from(schema.books);
      
      // Build WHERE conditions
      const conditions = [];
      
      // Add type filter
      if (type && type !== 'all') {
        conditions.push(eq(schema.books.type, type as any));
      }
      
      // Add grade filter
      if (grade && grade !== 'all') {
        conditions.push(eq(schema.books.grade, grade));
      }
      
      // Add search filter
      if (search) {
        conditions.push(
          or(
            like(schema.books.title, `%${search}%`),
            like(schema.books.description, `%${search}%`)
          )
        );
      }
      
      // Apply all conditions with AND logic
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const books = await query.orderBy(desc(schema.books.createdAt));
      
      return res.status(200).json({ books });
    } catch (error) {
      console.error("Error fetching books for teacher:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/teacher/books/:id", authenticate, authorize(["teacher"]), async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);
      
      const book = await db.query.books.findFirst({
        where: eq(schema.books.id, bookId),
        with: {
          chapters: {
            orderBy: asc(schema.chapters.orderIndex)
          }
        }
      });
      
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      
      return res.status(200).json({ book });
    } catch (error) {
      console.error("Error fetching book for teacher:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Teacher can create books
  app.post("/api/teacher/books", authenticate, authorize(["teacher"]), async (req, res) => {
    try {
      const bookData = schema.insertBookSchema.parse(req.body);
      const userId = (req as any).user.id;
      
      const [newBook] = await db.insert(schema.books)
        .values({
          ...bookData,
          addedById: userId
        })
        .returning();
      
      return res.status(201).json({
        message: "Book added successfully",
        book: newBook
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error adding book for teacher:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Teacher can edit books
  app.put("/api/teacher/books/:id", authenticate, authorize(["teacher"]), async (req, res) => {
    console.log("=== TEACHER ROUTE: Edit book API called ===");
    console.log("Book ID:", req.params.id);
    console.log("Request body:", req.body);
    console.log("User:", (req as any).user);
    
    try {
      const bookId = parseInt(req.params.id);
      console.log("Parsed book ID:", bookId);
      
      // SIMPLE VALIDATION - NO ZOD
      const { title, description, type, grade, coverImage, musicUrl } = req.body;
      
      if (!title || !description || !type || !grade) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: "Title, description, type, and grade are required" 
        });
      }
      
      const bookData = { 
        title: title.trim(), 
        description: description.trim(), 
        type, 
        grade, 
        coverImage: coverImage || null, 
        musicUrl: musicUrl || null 
      };
      console.log("Validated book data:", bookData);
      
      // Check if book exists
      const book = await db.query.books.findFirst({
        where: eq(schema.books.id, bookId)
      });
      
      if (!book) {
        console.log("Book not found for ID:", bookId);
        return res.status(404).json({ message: "Book not found" });
      }
      
      console.log("Found existing book:", book);
      
      // Update the book
      const [updatedBook] = await db.update(schema.books)
        .set(bookData)
        .where(eq(schema.books.id, bookId))
        .returning();
      
      console.log("Book updated successfully by teacher:", updatedBook);
      
      return res.status(200).json({
        message: "Book updated successfully",
        book: updatedBook
      });
    } catch (error) {
      console.error("=== TEACHER ROUTE: Error in edit book ===", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Teacher can delete books
  app.delete("/api/teacher/books/:id", authenticate, authorize(["teacher"]), async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);
      
      // Check if book exists
      const book = await db.query.books.findFirst({
        where: eq(schema.books.id, bookId)
      });
      
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      
      // First, get all questions for pages in this book
      const pages = await db.query.pages.findMany({
        where: eq(schema.pages.bookId, bookId),
        with: {
          questions: true
        }
      });
      
      // Start a transaction to handle cascading deletes
      await db.transaction(async (tx) => {
        // 1. Delete all questions for all pages in this book
        for (const page of pages) {
          if (page.questions && page.questions.length > 0) {
            await tx.delete(schema.questions)
              .where(inArray(schema.questions.id, page.questions.map(q => q.id)));
          }
        }
        
        // 2. Delete all pages
        if (pages.length > 0) {
          await tx.delete(schema.pages)
            .where(eq(schema.pages.bookId, bookId));
        }
        
        // 3. Delete all progress records
        await tx.delete(schema.progress)
          .where(eq(schema.progress.bookId, bookId));
        
        // 4. Finally delete the book
        await tx.delete(schema.books)
          .where(eq(schema.books.id, bookId));
      });
      
      return res.status(200).json({ 
        message: "Book deleted successfully by teacher",
        id: bookId
      });
    } catch (error) {
      console.error("Error deleting book for teacher:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // ✅ FIXED: Progress routes with TEACHER support
  app.get("/api/progress", authenticate, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const role = (req as any).user.role;
      
      console.log(`Progress API called - User: ${userId}, Role: ${role}`);
     
      // For admin, show specific student progress if studentId is provided
      if (role === 'admin' && req.query.studentId) {
        const studentId = parseInt(req.query.studentId as string);
        
        const progressData = await db.query.progress.findMany({
          where: eq(schema.progress.userId, studentId),
          with: {
            book: true,
            user: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                username: true
              }
            }
          },
          orderBy: desc(schema.progress.lastReadAt)
        });
        
        console.log(`Admin progress for student ${studentId}:`, progressData.length, "records");
        return res.status(200).json({ progress: progressData });
      } 
      
      // For admin, show all students progress
      if (role === 'admin' && !req.query.studentId) {
        const progressData = await db.query.progress.findMany({
          with: {
            book: true,
            user: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                username: true
              }
            }
          },
          orderBy: desc(schema.progress.lastReadAt)
        });
        
        console.log(`Admin progress for all students:`, progressData.length, "records");
        return res.status(200).json({ progress: progressData });
      }
      
      // ✅ NEW: For teachers, show all progress for approved students
      if (role === 'teacher') {
        const progressData = await db.query.progress.findMany({
          with: {
            book: true,
            user: {
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                approvalStatus: true,
                role: true
              }
            }
          },
          orderBy: desc(schema.progress.lastReadAt)
        });
        
        // Filter to only show progress for approved students
        const approvedStudentProgress = progressData.filter(p => 
          p.user.role === 'student' && p.user.approvalStatus === 'approved'
        );
        
        console.log(`Teacher progress for approved students:`, approvedStudentProgress.length, "records");
        return res.status(200).json({ progress: approvedStudentProgress });
      }
      
      // For students, only show their own progress
      const progressData = await db.query.progress.findMany({
        where: eq(schema.progress.userId, userId),
        with: {
          book: true
        },
        orderBy: desc(schema.progress.lastReadAt)
      });
      
      console.log(`Student progress:`, progressData.length, "records");
      return res.status(200).json({ progress: progressData });
    } catch (error) {
      console.error("Error fetching progress:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/progress", authenticate, async (req, res) => {
    try {
      // Client can send userId directly, or we use the authenticated user id as backup
      const userIdFromAuth = (req as any).user?.id;
      
      // Get data from request
      let data = req.body;
      
      // Ensure there's a userId - prioritize the one sent from client or fallback to auth
      const userId = data.userId || userIdFromAuth;
      
      console.log("Progress update - userId from request:", data.userId);
      console.log("Progress update - userId from auth:", userIdFromAuth);
      console.log("Progress update - final userId:", userId);
      
      if (!userId) {
        return res.status(400).json({ 
          message: "Missing userId in request and authentication", 
          sentUserId: data.userId,
          authUserId: userIdFromAuth
        });
      }
      
      // Create a complete data object with all required fields
      const progressData = {
        userId: userId,
        bookId: data.bookId,
        percentComplete: data.percentComplete,
        lastReadAt: new Date()
      };
      
      // Log the data being processed
      console.log("Processing progress data:", progressData);
      
      // Check if book exists
      const book = await db.query.books.findFirst({
        where: eq(schema.books.id, progressData.bookId)
      });
      
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
    
      // Check if progress already exists for this user and book
      const existingProgress = await db.query.progress.findFirst({
        where: and(
          eq(schema.progress.userId, userId),
          eq(schema.progress.bookId, progressData.bookId)
        )
      });
      
      if (existingProgress) {
        console.log("Updating existing progress:", existingProgress.id);
        // Update existing progress
        const [updatedProgress] = await db.update(schema.progress)
          .set({
            percentComplete: progressData.percentComplete,
            lastReadAt: progressData.lastReadAt
          })
          .where(eq(schema.progress.id, existingProgress.id))
          .returning();
        
        return res.status(200).json({
          message: "Progress updated successfully",
          progress: updatedProgress
        });
      }
      
      console.log("Creating new progress record");
      // Create new progress - bypass schema validation for direct insertion
      const [newProgress] = await db.insert(schema.progress)
        .values(progressData)
        .returning();
      
      return res.status(201).json({
        message: "Progress created successfully",
        progress: newProgress
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating progress:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // ✅ NEW: Reading session start endpoint
  app.post("/api/reading-sessions/start", authenticate, async (req, res) => {
    console.log("🚀 Express: Starting reading session");
    try {
      const { bookId } = req.body;
      const userId = (req as any).user?.id;
      
      if (!userId || !bookId) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing userId or bookId" 
        });
      }
      
      console.log(`Starting session for user ${userId}, book ${bookId}`);
      
      // Check for existing active session
      const activeSession = await db.query.readingSessions.findFirst({
        where: and(
          eq(schema.readingSessions.userId, userId),
          eq(schema.readingSessions.bookId, bookId),
          isNull(schema.readingSessions.endTime)
        )
      });

      if (activeSession) {
        console.log("Active session already exists:", activeSession.id);
        return res.status(200).json({ 
          success: true, 
          message: 'Active session already exists',
          sessionId: activeSession.id,
          startTime: activeSession.startTime
        });
      }
      
      // Create new session
      const [newSession] = await db.insert(schema.readingSessions).values({
        userId,
        bookId,
        startTime: new Date(),
        endTime: null,
        totalMinutes: null
      }).returning();

      console.log("✅ Express: Reading session started:", newSession.id);
      return res.status(200).json({ 
        success: true, 
        sessionId: newSession.id,
        startTime: newSession.startTime,
        message: 'Reading session started successfully'
      });
    } catch (error) {
      console.error("❌ Express: Error starting session:", error);
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 🔧 FIXED: Reading session end endpoint  
  app.post("/api/reading-sessions/end", authenticate, async (req, res) => {
    console.log("🛑 Express: Ending reading session");
    try {
      const { bookId } = req.body;
      const userId = (req as any).user?.id;
      
      if (!userId || !bookId) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing userId or bookId" 
        });
      }
      
      console.log(`Ending session for user ${userId}, book ${bookId}`);
      
      // Find active session
      const activeSession = await db.query.readingSessions.findFirst({
        where: and(
          eq(schema.readingSessions.userId, userId),
          eq(schema.readingSessions.bookId, bookId),
          isNull(schema.readingSessions.endTime)
        )
      });

      if (!activeSession) {
        console.log("No active session found");
        return res.status(404).json({ 
          success: false, 
          message: 'No active reading session found'
        });
      }
     
      const endTime = new Date();
      const startTime = new Date(activeSession.startTime);
      // 🔧 FIXED: Calculate seconds instead of minutes
      const totalSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      console.log(`Session duration: ${totalSeconds} seconds`);
      
      // 🔧 FIXED: Update session with totalSeconds (stored in totalMinutes field for now)
      await db.update(schema.readingSessions)
        .set({ 
          endTime, 
          totalMinutes: totalSeconds // Store seconds in this field (we'll rename later if needed)
        })
        .where(eq(schema.readingSessions.id, activeSession.id));
      
      // Update progress totalReadingTime
      const existingProgress = await db.query.progress.findFirst({
        where: and(
          eq(schema.progress.userId, userId),
          eq(schema.progress.bookId, bookId)
        )
      });
      
      if (existingProgress) {
        // 🔧 FIXED: Add seconds to existing total (convert existing minutes to seconds if needed)
        const existingTimeInSeconds = (existingProgress.totalReadingTime || 0);
        const newTotalTime = existingTimeInSeconds + totalSeconds;
        console.log(`Updating total reading time from ${existingProgress.totalReadingTime} to ${newTotalTime} seconds`);
        
        await db.update(schema.progress)
          .set({ 
            totalReadingTime: newTotalTime,
            lastReadAt: endTime 
          })
          .where(eq(schema.progress.id, existingProgress.id));
      } else {
        console.log("Creating new progress record with reading time");
        await db.insert(schema.progress).values({
          userId,
          bookId,
          percentComplete: 0,
          totalReadingTime: totalSeconds, // 🔧 FIXED: Store seconds
          lastReadAt: endTime
        });
      }

      console.log(`✅ Express: Session ended, ${totalSeconds} seconds recorded`);
      return res.status(200).json({ 
        success: true, 
        totalSeconds, // 🔧 FIXED: Return seconds
        sessionId: activeSession.id,
        startTime: activeSession.startTime,
        endTime,
        message: 'Reading session ended successfully'
      });
    } catch (error) {
      console.error("❌ Express: Error ending session:", error);
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Student routes for admin and teacher
  app.get("/api/students", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    try {
      const approvalStatus = req.query.status as string;
      const gradeLevel = req.query.grade as string;
      const search = req.query.search as string;
      const userRole = (req as any).user.role;
      
      console.log("Student filter params:", { approvalStatus, gradeLevel, search, userRole });
      
      // Build conditions array for better handling of multiple filters
      const conditions = [eq(schema.users.role, 'student')];
      
      // For teachers, only show approved students
      if (userRole === 'teacher') {
        conditions.push(eq(schema.users.approvalStatus, 'approved'));
      } else {
        // For admin, filter by approval status if provided
        if (approvalStatus && ['pending', 'approved', 'rejected'].includes(approvalStatus)) {
          conditions.push(eq(schema.users.approvalStatus, approvalStatus as any));
        }
      }
     
      // Filter by grade level if provided
      if (gradeLevel && gradeLevel !== 'all') {
        conditions.push(eq(schema.users.gradeLevel, gradeLevel as any));
      }
      
      // Search by name, email or username
      if (search && search.trim() !== '') {
        conditions.push(
          or(
            like(schema.users.firstName, `%${search}%`),
            like(schema.users.lastName, `%${search}%`),
            like(schema.users.email, `%${search}%`),
            like(schema.users.username, `%${search}%`)
          )
        );
      }
      
      // Combine all conditions with AND logic
      const students = await db
        .select()
        .from(schema.users)
        .where(and(...conditions))
        .orderBy(asc(schema.users.lastName));
      
      return res.status(200).json({ students });
    } catch (error) {
      console.error("Error fetching students:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get pending student accounts
  app.get("/api/students/pending", authenticate, authorize(["admin"]), async (req, res) => {
    try {
      const pendingStudents = await storage.getPendingStudents();
      return res.status(200).json({ students: pendingStudents });
    } catch (error) {
      console.error("Error fetching pending students:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Approve a student account
  app.post("/api/students/:id/approve", authenticate, authorize(["admin"]), async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      
      // Check if student exists and is pending
      const student = await db.query.users.findFirst({
        where: and(
          eq(schema.users.id, studentId),
          eq(schema.users.role, 'student'),
          eq(schema.users.approvalStatus, 'pending')
        )
      });
      
      if (!student) {
        return res.status(404).json({ message: "Student not found or not pending approval" });
      }
    
      const approvedStudent = await storage.approveStudent(studentId);
      
      return res.status(200).json({
        message: "Student account approved successfully",
        student: approvedStudent
      });
    } catch (error) {
      console.error("Error approving student:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Reject a student account
  app.post("/api/students/:id/reject", authenticate, authorize(["admin"]), async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      const { reason } = req.body;
      
      // Check if student exists and is pending
      const student = await db.query.users.findFirst({
        where: and(
          eq(schema.users.id, studentId),
          eq(schema.users.role, 'student'),
          eq(schema.users.approvalStatus, 'pending')
        )
      });
      
      if (!student) {
        return res.status(404).json({ message: "Student not found or not pending approval" });
      }
      
      const rejectedStudent = await storage.rejectStudent(studentId, reason || "");
      
      return res.status(200).json({
        message: "Student account rejected",
        student: rejectedStudent
      });
    } catch (error) {
      console.error("Error rejecting student:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Teacher routes for admin
  app.get("/api/teachers", authenticate, authorize(["admin"]), async (req, res) => {
    try {
      const approvalStatus = req.query.status as string;
      const search = req.query.search as string;
      
      console.log("Teacher filter params:", { approvalStatus, search });
      
      // Build conditions array for better handling of multiple filters
      const conditions = [eq(schema.users.role, 'teacher')];
      
      // Filter by approval status if provided
      if (approvalStatus && ['pending', 'approved', 'rejected'].includes(approvalStatus)) {
        conditions.push(eq(schema.users.approvalStatus, approvalStatus as any));
      }
      
      // Search by name, email or username
      if (search && search.trim() !== '') {
        conditions.push(
          or(
            like(schema.users.firstName, `%${search}%`),
            like(schema.users.lastName, `%${search}%`),
            like(schema.users.email, `%${search}%`),
            like(schema.users.username, `%${search}%`)
          )
        );
      }
      
      // Combine all conditions with AND logic
      const teachers = await db
        .select()
        .from(schema.users)
        .where(and(...conditions))
        .orderBy(asc(schema.users.lastName));
      
      return res.status(200).json({ teachers });
    } catch (error) {
      console.error("Error fetching teachers:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Approve a teacher account
  app.post("/api/teachers/:id/approve", authenticate, authorize(["admin"]), async (req, res) => {
    try {
      const teacherId = parseInt(req.params.id);
      
      // Check if teacher exists and is pending
      const teacher = await db.query.users.findFirst({
        where: and(
          eq(schema.users.id, teacherId),
          eq(schema.users.role, 'teacher')
        )
      });
      
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      
      // Update teacher status to approved
      const [updatedTeacher] = await db.update(schema.users)
        .set({ approvalStatus: 'approved' })
        .where(eq(schema.users.id, teacherId))
        .returning();
      
      return res.status(200).json({
        message: "Teacher account approved successfully",
        teacher: updatedTeacher
      });
    } catch (error) {
      console.error("Error approving teacher:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reject a teacher account
  app.post("/api/teachers/:id/reject", authenticate, authorize(["admin"]), async (req, res) => {
    try {
      const teacherId = parseInt(req.params.id);
      const { reason } = req.body;
      
      // Check if teacher exists
      const teacher = await db.query.users.findFirst({
        where: and(
          eq(schema.users.id, teacherId),
          eq(schema.users.role, 'teacher')
        )
      });
      
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }
      
      // Update teacher status to rejected
      const [updatedTeacher] = await db.update(schema.users)
        .set({ 
         approvalStatus: 'rejected',
          rejectionReason: reason || null
        })
        .where(eq(schema.users.id, teacherId))
        .returning();
      
      return res.status(200).json({
        message: "Teacher account rejected",
        teacher: updatedTeacher
      });
    } catch (error) {
      console.error("Error rejecting teacher:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Page routes
  app.get("/api/books/:bookId/pages", authenticate, authorize(["admin", "teacher", "student"]), async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      
      const pages = await db.query.pages.findMany({
        where: eq(schema.pages.bookId, bookId),
        orderBy: asc(schema.pages.pageNumber),
        with: {
          questions: true
        }
      });
      
      return res.status(200).json({ pages });
    } catch (error) {
      console.error("Error fetching pages:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/pages/:id", authenticate, authorize(["admin", "teacher", "student"]), async (req, res) => {
    try {
      const pageId = parseInt(req.params.id);
      
      const page = await db.query.pages.findFirst({
        where: eq(schema.pages.id, pageId),
        with: {
          questions: true
        }
      });
     
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      return res.status(200).json({ page });
    } catch (error) {
      console.error("Error fetching page:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
 app.post("/api/pages", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    try {
      const pageData = schema.insertPageSchema.parse(req.body);
      
      // Check if book exists
      const book = await db.query.books.findFirst({
        where: eq(schema.books.id, pageData.bookId)
      });
      
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      
      const [newPage] = await db.insert(schema.pages)
        .values(pageData)
        .returning();
      
      return res.status(201).json({
        id: newPage.id,
        message: "Page added successfully",
        page: newPage
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error adding page:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ✅ FIXED: Page update route with QUESTIONS handling
  app.put("/api/pages/:id", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    console.log("=== FIXED SERVER ROUTE: Update page API called ===");
    console.log("Page ID:", req.params.id);
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    try {
      const pageId = parseInt(req.params.id);
      
      // SIMPLE VALIDATION - NO ZOD
      const { title, content, imageUrl, pageNumber, questions } = req.body; // ✅ Added questions
     
      if (!content || pageNumber === undefined || pageNumber === null) {
        return res.status(400).json({ 
          message: "Content and page number are required" 
        });
      }
      
      const pageData = { 
        title: title || '', 
        content: content.trim(), 
        imageUrl: imageUrl || '', 
        pageNumber: pageNumber 
      };
  
      // Check if page exists
      const page = await db.query.pages.findFirst({
        where: eq(schema.pages.id, pageId)
      });
      
      if (!page) {
        console.log("Page not found for ID:", pageId);
        return res.status(404).json({ message: "Page not found" });
      }
      
      console.log("Found existing page:", page);
      
      // Update the page
      const [updatedPage] = await db.update(schema.pages)
        .set(pageData)
        .where(eq(schema.pages.id, pageId))
        .returning();
      
      console.log("Page updated successfully:", updatedPage);
      
      // ✅ Handle questions - THIS WAS MISSING!
      if (questions && Array.isArray(questions)) {
        console.log("=== FIXED SERVER ROUTE: Updating questions ===", questions);
        
        // Delete existing questions for this page
        await db.delete(schema.questions)
          .where(eq(schema.questions.pageId, pageId));
        
        console.log("=== FIXED SERVER ROUTE: Deleted existing questions ===");
        
        // Create new questions
        for (const question of questions) {
          if (question.questionText && question.questionText.trim()) {
            const newQuestion = await db.insert(schema.questions)
              .values({
                pageId: pageId,
                questionText: question.questionText.trim(),
                answerType: question.answerType || 'text',
                correctAnswer: question.correctAnswer || '',
                options: question.options || ''
              })
              .returning();
            
            console.log("=== FIXED SERVER ROUTE: Created question ===", newQuestion[0]);
          }
        }
        
        console.log("=== FIXED SERVER ROUTE: Questions updated successfully ===");
      } else {
        console.log("=== FIXED SERVER ROUTE: No questions to update ===");
      }
      
      return res.status(200).json({
        message: "Page updated successfully",
        page: updatedPage
      });
    } catch (error) {
      console.error("=== FIXED SERVER ROUTE: Error updating page ===", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/pages/:id", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    console.log("=== SERVER ROUTE: Delete page API called ===");
    console.log("Page ID:", req.params.id);
    
    try {
      const pageId = parseInt(req.params.id);
      
      // Check if page exists
      const page = await db.query.pages.findFirst({
        where: eq(schema.pages.id, pageId),
        with: {
          questions: true
        }
      });
      
      if (!page) {
        console.log("Page not found for ID:", pageId);
        return res.status(404).json({ message: "Page not found" });
      }
      
      console.log("Found page to delete:", page);
      
      // Delete all questions for this page first
      if (page.questions && page.questions.length > 0) {
        await db.delete(schema.questions)
          .where(inArray(schema.questions.id, page.questions.map(q => q.id)));
        console.log("Deleted page questions");
      }
      
      // Delete the page
      const [deletedPage] = await db.delete(schema.pages)
        .where(eq(schema.pages.id, pageId))
        .returning();
      
      console.log("Page deleted successfully:", deletedPage);
      
      return res.status(200).json({
        message: "Page deleted successfully",
        page: deletedPage
      });
    } catch (error) {
      console.error("=== SERVER ROUTE: Error deleting page ===", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add pages creation for specific book
  app.post("/api/books/:bookId/pages", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    console.log("=== SERVER ROUTE: Create page for book API called ===");
    console.log("Book ID:", req.params.bookId);
    console.log("Request body:", req.body);
    
    try {
      const bookId = parseInt(req.params.bookId);
      const { title, content, imageUrl, pageNumber, questions } = req.body; // ✅ Added questions
      
      const pageData = { 
        title: title || '',
        content: content || '',
        imageUrl: imageUrl || '',
        pageNumber: pageNumber || 1,
        bookId 
      };
      
      console.log("Page data with bookId:", pageData);
      
      const validatedPageData = schema.insertPageSchema.parse(pageData);
     
      // Check if book exists
      const book = await db.query.books.findFirst({
        where: eq(schema.books.id, bookId)
      });
      
      if (!book) {
        console.log("Book not found for ID:", bookId);
        return res.status(404).json({ message: "Book not found" });
      }
      
      console.log("Found book:", book);
      
      const [newPage] = await db.insert(schema.pages)
        .values(validatedPageData)
        .returning();
      
      console.log("Page created successfully:", newPage);
      
      // ✅ Handle questions for new page
      if (questions && Array.isArray(questions) && newPage.id) {
        console.log("=== SERVER ROUTE: Creating questions for new page ===", questions);
        
        for (const question of questions) {
          if (question.questionText && question.questionText.trim()) {
            const newQuestion = await db.insert(schema.questions)
              .values({
                pageId: newPage.id,
                questionText: question.questionText.trim(),
                answerType: question.answerType || 'text',
                correctAnswer: question.correctAnswer || '',
                options: question.options || ''
              })
              .returning();
            
            console.log("=== SERVER ROUTE: Created question for new page ===", newQuestion[0]);
          }
        }
      }
      
      return res.status(201).json({
        message: "Page created successfully",
        page: newPage
      });
    } catch (error) {
      console.error("=== SERVER ROUTE: Error creating page ===", error);
      
      if (error instanceof ZodError) {
        console.log("Page creation validation error details:", error.errors);
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Question routes
  app.get("/api/pages/:pageId/questions", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    try {
      const pageId = parseInt(req.params.pageId);
      
      const questions = await db.query.questions.findMany({
        where: eq(schema.questions.pageId, pageId)
      });
      
      return res.status(200).json({ questions });
    } catch (error) {
      console.error("Error fetching questions:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/questions", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    try {
      const questionData = schema.insertQuestionSchema.parse(req.body);
      
      // Check if page exists
      const page = await db.query.pages.findFirst({
        where: eq(schema.pages.id, questionData.pageId)
      });
      
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      const [newQuestion] = await db.insert(schema.questions)
        .values(questionData)
        .returning();
      
      return res.status(201).json({
        message: "Question added successfully",
        question: newQuestion
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error adding question:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.put("/api/questions/:id", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const questionData = schema.insertQuestionSchema.parse(req.body);
      
      // Check if question exists
      const question = await db.query.questions.findFirst({
        where: eq(schema.questions.id, questionId)
      });
      
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      const [updatedQuestion] = await db.update(schema.questions)
        .set(questionData)
        .where(eq(schema.questions.id, questionId))
        .returning();
      
      return res.status(200).json({
        message: "Question updated successfully",
        question: updatedQuestion
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating question:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.delete("/api/questions/:id", authenticate, authorize(["admin", "teacher"]), async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      
      // Check if question exists
      const question = await db.query.questions.findFirst({
        where: eq(schema.questions.id, questionId)
      });
      
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      const [deletedQuestion] = await db.delete(schema.questions)
        .where(eq(schema.questions.id, questionId))
        .returning();
      
      return res.status(200).json({
        message: "Question deleted successfully",
        question: deletedQuestion
      });
    } catch (error) {
      console.error("Error deleting question:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Simple endpoint to mark a book as completed for a user
  app.post("/api/books/:bookId/complete", authenticate, async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const userId = (req as any).user?.id;
      
      console.log(`Marking book ${bookId} as completed for user ${userId}`);
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: "User not authenticated properly" 
        });
      }
      
      // Check if the book exists
      const book = await db.query.books.findFirst({
        where: eq(schema.books.id, bookId)
      });
      
      if (!book) {
        return res.status(404).json({ 
          success: false,
          message: "Book not found" 
        });
      }
      
      // Check if progress already exists
      const existingProgress = await db.query.progress.findFirst({
        where: and(
          eq(schema.progress.userId, userId),
          eq(schema.progress.bookId, bookId)
        )
      });
      
      if (existingProgress) {
        // Update existing progress to 100%
        const [updatedProgress] = await db.update(schema.progress)
          .set({
            percentComplete: 100,
            lastReadAt: new Date()
          })
          .where(eq(schema.progress.id, existingProgress.id))
          .returning();
          
        console.log("Book completion: Updated existing progress to 100%");
        return res.status(200).json({ 
          success: true,
          message: "Book marked as completed",
          progress: updatedProgress
        });
      } else {
        // Create new progress entry at 100%
        const [newProgress] = await db.insert(schema.progress)
          .values({
            userId: userId,
            bookId: bookId,
            percentComplete: 100,
            lastReadAt: new Date()
          })
          .returning();
          
        console.log("Book completion: Created new progress entry at 100%");
        return res.status(201).json({
          success: true,
          message: "Book marked as completed",
          progress: newProgress
        });
      }
    } catch (error) {
      console.error("Error marking book as completed:", error);
      return res.status(500).json({ 
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Password reset endpoints
  app.post("/api/auth/forgot-password/check-username", async (req, res) => {
    try {
      // Parse and validate username data
      const data = schema.checkUsernameSchema.parse(req.body);
      
      // Check if user exists
      const user = await db.query.users.findFirst({
        where: eq(schema.users.username, data.username),
        columns: {
          id: true,
          username: true,
          securityQuestion: true
        }
      });
      
      if (!user || !user.securityQuestion) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found or no security question set"
        });
      }
      
      return res.status(200).json({
        success: true,
        securityQuestion: user.securityQuestion
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          success: false,
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error checking username:", error);
      return res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  });

  app.post("/api/auth/forgot-password/verify-security", async (req, res) => {
    try {
      // Parse and validate security answer data
      const data = schema.verifySecuritySchema.parse(req.body);
      
      // Find the user
      const user = await db.query.users.findFirst({
        where: eq(schema.users.username, data.username),
        columns: {
          id: true,
          username: true,
          securityQuestion: true,
          securityAnswer: true
        }
      });
      
      if (!user || !user.securityAnswer) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found or no security answer set"
        });
      }
      
      // Verify the security answer
      // Note: In production, you should hash security answers like passwords
      if (data.securityAnswer.toLowerCase() !== user.securityAnswer.toLowerCase()) {
        return res.status(400).json({ 
          success: false, 
          message: "Incorrect security answer"
        });
      }
      
      // Generate a temporary reset token
      const resetToken = jwt.sign(
        { id: user.id, username: user.username, purpose: 'password-reset' },
        JWT_SECRET,
        { expiresIn: "15m" } // Short expiration time for security
      );
      
      return res.status(200).json({
        success: true,
        message: "Security question verified successfully",
        resetToken
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          success: false,
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error verifying security answer:", error);
      return res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  });

  app.post("/api/auth/forgot-password/reset", async (req, res) => {
    try {
      // Parse and validate reset password data
      const data = schema.resetPasswordSchema.parse(req.body);
      const resetToken = req.body.resetToken;
      
      if (!resetToken) {
        return res.status(400).json({ 
          success: false, 
          message: "Reset token is required" 
        });
      }
      
      // Verify the reset token
      let decoded;
      try {
        decoded = jwt.verify(resetToken, JWT_SECRET) as { id: number, username: string, purpose: string };
      } catch (error) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid or expired reset token" 
        });
      }
      
      // Check if token is intended for password reset
      if (decoded.purpose !== 'password-reset' || decoded.username !== data.username) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid reset token" 
        });
      }
      
      // Find the user
      const user = await db.query.users.findFirst({
        where: eq(schema.users.username, data.username)
      });
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(data.newPassword, 10);
      
      // Update the user's password
      await db.update(schema.users)
        .set({ password: hashedPassword })
        .where(eq(schema.users.id, user.id));
      
      return res.status(200).json({
        success: true,
        message: "Password reset successful"
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          success: false,
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error resetting password:", error);
      return res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
