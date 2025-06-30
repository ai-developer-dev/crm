import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secure-jwt-secret-key";
const JWT_EXPIRES_IN = "7d";

interface AuthenticatedRequest extends Express.Request {
  user?: {
    id: number;
    email: string;
    userType: string;
    fullName: string;
  };
}

// Middleware to verify JWT token
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const session = await storage.getValidSession(decoded.sessionId);
    
    if (!session) {
      return res.status(401).json({ message: 'Invalid or expired session' });
    }

    const user = await storage.getUser(session.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      userType: user.userType,
      fullName: user.fullName,
    };
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Middleware to check if user has required role
const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.userType)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(validatedData.password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Create session
      const sessionToken = jwt.sign({ userId: user.id }, JWT_SECRET);
      const sessionHash = await bcrypt.hash(sessionToken, 10);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const session = await storage.createSession(user.id, sessionHash, expiresAt);
      
      // Create JWT with session ID
      const token = jwt.sign(
        { 
          userId: user.id, 
          sessionId: session.id,
          userType: user.userType 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          userType: user.userType,
          extension: user.extension,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", authenticateToken, async (req: any, res) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        await storage.deleteSession(decoded.sessionId);
      }
      
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user
  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      userType: user.userType,
      extension: user.extension,
      phone: user.phone,
    });
  });

  // Create admin user (temporary endpoint for initial setup)
  app.post("/api/auth/create-admin", async (req, res) => {
    try {
      // Check if any admin already exists
      const existingUsers = await storage.getAllUsers();
      const hasAdmin = existingUsers.some(user => user.userType === 'admin');
      
      if (hasAdmin) {
        return res.status(403).json({ message: "Admin user already exists" });
      }

      const userData = insertUserSchema.parse(req.body);
      
      // Check if email or extension already exists
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const existingExtension = await storage.getUserByExtension(userData.extension);
      if (existingExtension) {
        return res.status(400).json({ message: "Extension already exists" });
      }

      const passwordHash = await bcrypt.hash(userData.password, 12);
      
      const user = await storage.createUser({
        ...userData,
        userType: 'admin',
        passwordHash,
      });

      res.status(201).json({
        message: "Admin user created successfully",
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          userType: user.userType,
          extension: user.extension,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      console.error("Create admin error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all users (admin and manager only)
  app.get("/api/users", authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        extension: user.extension,
        userType: user.userType,
        isActive: user.isActive,
        createdAt: user.createdAt,
      }));
      
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new user (admin only)
  app.post("/api/users", authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if email or extension already exists
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const existingExtension = await storage.getUserByExtension(userData.extension);
      if (existingExtension) {
        return res.status(400).json({ message: "Extension already exists" });
      }

      const passwordHash = await bcrypt.hash(userData.password, 12);
      
      const user = await storage.createUser({
        ...userData,
        passwordHash,
      });

      res.status(201).json({
        message: "User created successfully",
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          userType: user.userType,
          extension: user.extension,
          phone: user.phone,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      console.error("Create user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user (admin only)
  app.put("/api/users/:id", authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updateData = req.body;

      // Remove sensitive fields from update
      delete updateData.passwordHash;
      delete updateData.id;

      const user = await storage.updateUser(userId, updateData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        message: "User updated successfully",
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          userType: user.userType,
          extension: user.extension,
          phone: user.phone,
        },
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/users/:id", authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Prevent admin from deleting themselves
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }

      // Delete all user sessions
      await storage.deleteUserSessions(userId);

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
