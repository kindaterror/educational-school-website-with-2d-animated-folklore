import { pgTable, text, serial, integer, boolean, timestamp, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'student', 'teacher']);
export const bookTypeEnum = pgEnum('book_type', ['storybook', 'educational']);
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected']);

// Grade level enum
export const gradeLevelEnum = pgEnum('grade_level', ['K', '1', '2', '3', '4', '5', '6']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: userRoleEnum("role").notNull().default('student'),
  gradeLevel: gradeLevelEnum("grade_level"),
  approvalStatus: approvalStatusEnum("approval_status").default('pending'),
  rejectionReason: text("rejection_reason"),
  // Add these two new fields for security questions
  securityQuestion: text("security_question"),
  securityAnswer: text("security_answer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Books table
export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  coverImage: text("cover_image"),
  type: bookTypeEnum("type").notNull(),
  grade: text("grade"),
  rating: integer("rating").default(0),
  ratingCount: integer("rating_count").default(0),
  musicUrl: text("music_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  addedById: integer("added_by_id").references(() => users.id),
});

// Reading progress table
export const progress = pgTable("progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  bookId: integer("book_id").references(() => books.id).notNull(),
  currentChapter: text("current_chapter"),
  percentComplete: integer("percent_complete").default(0),
  totalReadingTime: integer("total_reading_time").default(0), // in minutes
  lastReadAt: timestamp("last_read_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Pages table for books
export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").references(() => books.id).notNull(),
  pageNumber: integer("page_number").notNull(),
  title: text("title"),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Questions table for interactive reading
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").references(() => pages.id).notNull(),
  questionText: text("question_text").notNull(),
  answerType: text("answer_type").default("text").notNull(), // text, multiple-choice, etc.
  correctAnswer: text("correct_answer"),
  options: text("options"), // JSON string for multiple-choice options
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reading sessions table for tracking actual reading time
export const readingSessions = pgTable("reading_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  bookId: integer("book_id").references(() => books.id).notNull(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  totalMinutes: integer("total_minutes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chapter table for books (keeping for backward compatibility)
export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").references(() => books.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  progress: many(progress),
  books: many(books, { relationName: "addedBooks" }),
  readingSessions: many(readingSessions), 
}));

export const booksRelations = relations(books, ({ many, one }) => ({
  chapters: many(chapters),
  pages: many(pages),
  progress: many(progress),
  readingSessions: many(readingSessions), 
  addedBy: one(users, {
    fields: [books.addedById],
    references: [users.id],
    relationName: "addedBooks"
  }),
}));

export const progressRelations = relations(progress, ({ one }) => ({
  user: one(users, {
    fields: [progress.userId],
    references: [users.id]
  }),
  book: one(books, {
    fields: [progress.bookId],
    references: [books.id]
  }),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  book: one(books, {
    fields: [pages.bookId],
    references: [books.id]
  }),
  questions: many(questions)
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  page: one(pages, {
    fields: [questions.pageId],
    references: [pages.id]
  })
}));

export const chaptersRelations = relations(chapters, ({ one }) => ({
  book: one(books, {
    fields: [chapters.bookId],
    references: [books.id]
  }),
}));

// Reading sessions relations
export const readingSessionsRelations = relations(readingSessions, ({ one }) => ({
  user: one(users, {
    fields: [readingSessions.userId],
    references: [users.id],
  }),
  book: one(books, {
    fields: [readingSessions.bookId],
    references: [books.id],
  }),
}));

// Define schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Username must be at least 3 characters"),
  email: (schema) => schema.email("Please provide a valid email"),
  password: (schema) => schema.min(6, "Password must be at least 6 characters"),
  firstName: (schema) => schema.min(2, "First name must be at least 2 characters"),
  lastName: (schema) => schema.min(2, "Last name must be at least 2 characters"),
  // Add validation for security question fields
  securityQuestion: (schema) => schema.optional(),
  securityAnswer: (schema) => schema.optional(),
})
.omit({ id: true, createdAt: true });

export const insertBookSchema = createInsertSchema(books, {
  title: (schema) => schema.min(2, "Title must be at least 2 characters"),
  description: (schema) => schema.min(10, "Description must be at least 10 characters"),
})
.omit({ id: true, createdAt: true, rating: true, ratingCount: true });

export const insertProgressSchema = createInsertSchema(progress, {
  percentComplete: (schema) => schema.min(0).max(100),
})
.omit({ id: true, createdAt: true });

export const insertChapterSchema = createInsertSchema(chapters, {
  title: (schema) => schema.min(2, "Title must be at least 2 characters"),
  content: (schema) => schema.min(10, "Content must be at least 10 characters"),
})
.omit({ id: true, createdAt: true });

export const insertPageSchema = createInsertSchema(pages, {
  content: (schema) => schema.min(1, "Content cannot be empty"),
  pageNumber: (schema) => schema.min(1, "Page number must be at least 1"),
})
.omit({ id: true, createdAt: true });

export const insertQuestionSchema = createInsertSchema(questions, {
  questionText: (schema) => schema.min(5, "Question must be at least 5 characters"),
})
.omit({ id: true, createdAt: true });

// Reading sessions schema
export const insertReadingSessionSchema = createInsertSchema(readingSessions)
  .omit({ id: true, createdAt: true });

export const loginSchema = z.object({
  email: z.string().email("Please provide a valid email"),
  password: z.string().min(1, "Password is required"),
});

// schemas for password reset
export const checkUsernameSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
});

export const verifySecuritySchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  securityAnswer: z.string().min(1, "Security answer is required"),
});

export const resetPasswordSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Book = typeof books.$inferSelect;
export type InsertBook = z.infer<typeof insertBookSchema>;
export type Progress = typeof progress.$inferSelect;
export type InsertProgress = z.infer<typeof insertProgressSchema>;
export type Chapter = typeof chapters.$inferSelect;
export type InsertChapter = z.infer<typeof insertChapterSchema>;
export type Page = typeof pages.$inferSelect;
export type InsertPage = z.infer<typeof insertPageSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Login = z.infer<typeof loginSchema>;
export type CheckUsername = z.infer<typeof checkUsernameSchema>;
export type VerifySecurity = z.infer<typeof verifySecuritySchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type ReadingSession = typeof readingSessions.$inferSelect;
export type InsertReadingSession = z.infer<typeof insertReadingSessionSchema>;