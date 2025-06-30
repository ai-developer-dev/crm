import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertTwilioCredentialsSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import twilio from "twilio";

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
    
    // Get user from database to ensure they still exist and are active
    const user = await storage.getUser(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or expired session' });
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

      // Create JWT token
      const token = jwt.sign(
        { 
          userId: user.id,
          userType: user.userType,
          email: user.email
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Create session with token hash for tracking
      const tokenHash = await bcrypt.hash(token, 10);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await storage.createSession(user.id, tokenHash, expiresAt);

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
      // Delete all user sessions for complete logout
      await storage.deleteUserSessions(req.user.id);
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

      const userResponse = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        userType: user.userType,
        extension: user.extension,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt,
      };

      // Broadcast to all admin/manager users about new user creation
      if ((app as any).broadcast) {
        (app as any).broadcast.toRole({
          type: 'user_created',
          user: userResponse,
          message: `New user ${user.fullName} has been created`
        }, ['admin', 'manager']);
      }

      res.status(201).json({
        message: "User created successfully",
        user: userResponse,
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

      const userResponse = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        userType: user.userType,
        extension: user.extension,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt,
      };

      // Broadcast to all admin/manager users about user update
      if ((app as any).broadcast) {
        (app as any).broadcast.toRole({
          type: 'user_updated',
          user: userResponse,
          message: `User ${user.fullName} has been updated`
        }, ['admin', 'manager']);
      }

      res.json({
        message: "User updated successfully",
        user: userResponse,
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

      // Broadcast to all admin/manager users about user deletion
      if ((app as any).broadcast) {
        (app as any).broadcast.toRole({
          type: 'user_deleted',
          userId: userId,
          message: `User has been deleted`
        }, ['admin', 'manager']);
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get Twilio credentials (admin only)
  app.get("/api/twilio/credentials", authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const credentials = await storage.getTwilioCredentials();
      if (!credentials) {
        return res.json({ credentials: null });
      }
      
      // Don't send sensitive data to frontend
      const safeCredentials = {
        id: credentials.id,
        accountSid: credentials.accountSid,
        apiKey: credentials.apiKey,
        apiSecret: '***masked***', // Don't send secret to frontend
        twimlAppSid: credentials.twimlAppSid,
        phoneNumber: credentials.phoneNumber,
        createdAt: credentials.createdAt,
        updatedAt: credentials.updatedAt,
      };
      
      res.json({ credentials: safeCredentials });
    } catch (error) {
      console.error("Get Twilio credentials error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Save/Update Twilio credentials (admin only)
  app.post("/api/twilio/credentials", authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
      const validatedData = insertTwilioCredentialsSchema.parse(req.body);
      
      const existingCredentials = await storage.getTwilioCredentials();
      let credentials;
      
      if (existingCredentials) {
        credentials = await storage.updateTwilioCredentials(existingCredentials.id, validatedData);
      } else {
        credentials = await storage.createTwilioCredentials(validatedData);
      }
      
      if (!credentials) {
        return res.status(500).json({ message: "Failed to save credentials" });
      }
      
      // Don't send sensitive data to frontend
      const safeCredentials = {
        id: credentials.id,
        accountSid: credentials.accountSid,
        apiKey: credentials.apiKey,
        apiSecret: '***masked***',
        twimlAppSid: credentials.twimlAppSid,
        phoneNumber: credentials.phoneNumber,
        createdAt: credentials.createdAt,
        updatedAt: credentials.updatedAt,
      };
      
      res.json({ 
        message: "Twilio credentials saved successfully",
        credentials: safeCredentials 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Save Twilio credentials error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Generate Twilio access token for VoIP client
  app.post("/api/twilio/token", authenticateToken, async (req, res) => {
    try {
      const { identity } = req.body;
      
      if (!identity) {
        return res.status(400).json({ message: "Identity is required" });
      }

      // Get Twilio credentials from database
      const credentials = await storage.getTwilioCredentials();
      if (!credentials) {
        return res.status(404).json({ message: "Twilio credentials not configured" });
      }

      // Initialize Twilio client
      const AccessToken = twilio.jwt.AccessToken;
      const VoiceGrant = AccessToken.VoiceGrant;

      // Create access token
      const accessToken = new AccessToken(
        credentials.accountSid,
        credentials.apiKey,
        credentials.apiSecret,
        { identity }
      );

      // Create voice grant
      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: credentials.twimlAppSid,
        incomingAllow: true,
      });

      accessToken.addGrant(voiceGrant);

      res.json({
        token: accessToken.toJwt(),
        identity,
      });
    } catch (error) {
      console.error("Generate Twilio token error:", error);
      res.status(500).json({ message: "Failed to generate access token" });
    }
  });

  // TwiML endpoint for handling incoming calls
  app.post("/api/twilio/voice", async (req, res) => {
    try {
      const twiml = new twilio.twiml.VoiceResponse();
      
      // Dial to the appropriate user based on the incoming number
      const dial = twiml.dial({
        answerOnBridge: true,
        timeLimit: 3600,
      });
      
      // This will ring all connected clients
      dial.client('incoming-call');
      
      res.type('text/xml');
      res.send(twiml.toString());
    } catch (error) {
      console.error("TwiML voice error:", error);
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Sorry, we are unable to complete your call at this time.');
      res.type('text/xml');
      res.send(twiml.toString());
    }
  });

  // Log call events
  app.post("/api/calls/log", authenticateToken, async (req, res) => {
    try {
      const { callSid, from, to, direction, status, duration } = req.body;
      
      // For now, just log the call event - in a real implementation,
      // you would save this to the call_logs table
      console.log('Call logged:', { callSid, from, to, direction, status, duration });
      
      res.json({ message: "Call logged successfully" });
    } catch (error) {
      console.error("Call logging error:", error);
      res.status(500).json({ message: "Failed to log call" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time features
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws'
  });

  // Store connected clients with user info
  const connectedClients = new Map<WebSocket, { userId: number; userType: string }>();

  wss.on('connection', async (ws, req) => {
    console.log('WebSocket connection established');

    // Handle authentication
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth') {
          // Authenticate user via JWT token
          const token = message.token;
          if (!token) {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Token required' }));
            return;
          }

          try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            const user = await storage.getUser(decoded.userId);
            
            if (!user || !user.isActive) {
              ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid user' }));
              return;
            }

            // Store client info
            connectedClients.set(ws, { 
              userId: user.id, 
              userType: user.userType 
            });

            ws.send(JSON.stringify({ 
              type: 'auth_success', 
              userId: user.id,
              userType: user.userType
            }));

            console.log(`User ${user.fullName} connected via WebSocket`);
          } catch (error) {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      const clientInfo = connectedClients.get(ws);
      if (clientInfo) {
        console.log(`User ${clientInfo.userId} disconnected from WebSocket`);
        connectedClients.delete(ws);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      connectedClients.delete(ws);
    });
  });

  // Helper function to broadcast to all authenticated clients
  const broadcastToAll = (message: any) => {
    connectedClients.forEach((clientInfo, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  };

  // Helper function to broadcast to specific user types
  const broadcastToRole = (message: any, roles: string[]) => {
    connectedClients.forEach((clientInfo, ws) => {
      if (ws.readyState === WebSocket.OPEN && roles.includes(clientInfo.userType)) {
        ws.send(JSON.stringify(message));
      }
    });
  };

  // Store broadcast functions on the app for use in other routes
  (app as any).broadcast = {
    toAll: broadcastToAll,
    toRole: broadcastToRole,
    connectedClients
  };

  return httpServer;
}
