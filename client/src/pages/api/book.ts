// == IMPORTS & DEPENDENCIES ==
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as schema from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { db } from '@db';

// == CONSTANTS ==
const JWT_SECRET = process.env.JWT_SECRET || "adonai_grace_school_secret";

// == UTILITY FUNCTIONS ==
const authenticate = (req: Request) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) throw new Error("Authentication required");
  
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};

// == GET HANDLER ==
export async function GET(req: Request, res: Response) {
  console.log("=== CLIENT API BOOKS GET ===");
  const { id } = req.query;
  
  try {
    if (id) {
      // == FETCH SINGLE BOOK ==
      const bookId = parseInt(id as string);
      const book = await db.query.books.findFirst({
        where: eq(schema.books.id, bookId)
      });
      
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      
      return res.status(200).json({ book });
    } else {
      // == FETCH ALL BOOKS ==
      const books = await db.select().from(schema.books).orderBy(desc(schema.books.createdAt));
      return res.status(200).json({ books });
    }
  } catch (error) {
    // == ERROR HANDLING ==
    console.error("Error fetching books:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// == PUT HANDLER ==
export async function PUT(req: Request, res: Response) {
  console.log("=== CLIENT API BOOKS PUT ===");
  
  try {
    // == AUTHENTICATION & AUTHORIZATION ==
    const user = authenticate(req);
    if (user.role !== 'admin' && user.role !== 'teacher') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // == INPUT VALIDATION ==
    const bookId = parseInt(req.query.id as string);
    const { title, description, type, grade, coverImage, musicUrl } = req.body;
    
    if (!title || !description || !type || !grade) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: "Title, description, type, and grade are required" 
      });
    }
    
    // == FIND EXISTING BOOK ==
    const book = await db.query.books.findFirst({
      where: eq(schema.books.id, bookId)
    });
    
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    
    // == UPDATE BOOK ==
    const [updatedBook] = await db.update(schema.books)
      .set({
        title,
        description,
        type,
        grade,
        coverImage: coverImage || null,
        musicUrl: musicUrl || null
      })
      .where(eq(schema.books.id, bookId))
      .returning();
    
    console.log("=== CLIENT API: Book updated successfully ===", updatedBook);
    
    // == SUCCESS RESPONSE ==
    return res.status(200).json({
      message: "Book updated successfully",
      book: updatedBook
    });
  } catch (error) {
    // == ERROR HANDLING ==
    console.error("=== CLIENT API: Error updating book ===", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage === "Authentication required" || errorMessage === "Invalid or expired token") {
      return res.status(401).json({ message: errorMessage });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

// == POST HANDLER ==
export async function POST(req: Request, res: Response) {
  try {
    // == AUTHENTICATION & AUTHORIZATION ==
    const user = authenticate(req);
    if (user.role !== 'admin' && user.role !== 'teacher') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // == INPUT VALIDATION ==
    const { title, description, type, grade, coverImage, musicUrl } = req.body;
    
    if (!title || !description || !type || !grade) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: "Title, description, type, and grade are required" 
      });
    }
    
    // == CREATE NEW BOOK ==
    const [newBook] = await db.insert(schema.books)
      .values({
        title,
        description,
        type,
        grade,
        coverImage: coverImage || null,
        musicUrl: musicUrl || null,
        addedById: user.id
      })
      .returning();
    
    // == SUCCESS RESPONSE ==
    return res.status(201).json({
      message: "Book created successfully",
      book: newBook
    });
  } catch (error) {
    // == ERROR HANDLING ==
    console.error("Error creating book:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage === "Authentication required" || errorMessage === "Invalid or expired token") {
      return res.status(401).json({ message: errorMessage });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

// == DELETE HANDLER ==
export async function DELETE(req: Request, res: Response) {
  try {
    // == AUTHENTICATION & AUTHORIZATION ==
    const user = authenticate(req);
    if (user.role !== 'admin' && user.role !== 'teacher') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // == INPUT VALIDATION ==
    const bookId = parseInt(req.query.id as string);
    
    // == FIND EXISTING BOOK ==
    const book = await db.query.books.findFirst({
      where: eq(schema.books.id, bookId)
    });
    
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    
    // == DELETE BOOK ==
    await db.delete(schema.books)
      .where(eq(schema.books.id, bookId));
    
    // == SUCCESS RESPONSE ==
    return res.status(200).json({ 
      message: "Book deleted successfully",
      id: bookId
    });
  } catch (error) {
    // == ERROR HANDLING ==
    console.error("Error deleting book:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage === "Authentication required" || errorMessage === "Invalid or expired token") {
      return res.status(401).json({ message: errorMessage });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}