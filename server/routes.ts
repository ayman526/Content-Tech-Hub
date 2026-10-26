import type { Express, Request, Response } from "express";
  import { db } from "./db";
  import { 
    users, translationOrders, orderDocuments, assignments, 
    linguistProfiles, glossaries, translationMemory, subscriptions,
    favoriteLinguists, organizations
  } from "@shared/schema";
  import { eq, and, or, desc, asc, sql, inArray } from "drizzle-orm";
  import { isAuthenticated } from "./replit_integrations/auth";
  import { openai } from "./replit_integrations/image/client";

  // ==================== HELPER FUNCTIONS ====================
  function getUserFromRequest(req: any): string {
    return req.user?.claims?.sub;
  }

  async function checkSubscriptionAccess(userId: string, feature: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    const tier = user?.subscriptionTier || 'basic';
    
    const tierAccess = {
      basic: ['basic_translation', 'glossary'],
      professional: ['basic_translation', 'glossary', 'translation_memory', 'favorites', 'priority_support'],
      enterprise: ['basic_translation', 'glossary', 'translation_memory', 'favorites', 'priority_support', 'api_access', 'custom_workflows']
    };
    
    return tierAccess[tier as keyof typeof tierAccess]?.includes(feature) || false;
  }

  // ==================== AI TRANSLATION ====================
  async function performAITranslation(text: string, sourceLang: string, targetLang: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the following text from ${sourceLang} to ${targetLang}. Maintain the tone, style, and formatting. Provide only the translation without explanations.`
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.3,
      });
      
      return response.choices[0]?.message?.content || text;
    } catch (error) {
      console.error('AI translation error:', error);
      throw new Error('Translation failed');
    }
  }

  // ==================== ROUTES ====================
  export function registerRoutes(app: Express) {
    
    // ==================== USER ROUTES ====================
    app.get("/api/user/profile", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = getUserFromRequest(req);
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
          with: {
            linguistProfile: true,
            subscription: true,
          }
        });
        
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        res.json(user);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: "Failed to fetch profile" });
      }
    });
    
    app.patch("/api/user/profile", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = getUserFromRequest(req);
        const { firstName, lastName, role } = req.body;
        
        const [updated] = await db.update(users)
          .set({ 
            firstName, 
            lastName, 
            role,
            updatedAt: new Date() 
          })
          .where(eq(users.id, userId))
          .returning();
        
        res.json(updated);
      } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: "Failed to update profile" });
      }
    });
    
    // ==================== TRANSLATION ORDER ROUTES ====================
    app.post("/api/orders", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = getUserFromRequest(req);
        const { title, description, sourceLang, targetLang, deadline, specialInstructions, priority } = req.body;
        
        const [order] = await db.insert(translationOrders)
          .values({
            clientId: userId,
            title,
            description,
            sourceLang,
            targetLang,
            deadline: deadline ? new Date(deadline) : null,
            specialInstructions,
            priority: priority || 'normal',
            status: 'submitted',
          })
          .returning();
        
        res.json(order);
      } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ message: "Failed to create order" });
      }
    });
    
    app.get("/api/orders", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = getUserFromRequest(req);
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId)
        });
        
        let orders;
        
        if (user?.role === 'admin') {
          orders = await db.query.translationOrders.findMany({
            with: {
              client: true,
              documents: true,
              assignments: {
                with: {
                  linguist: true
                }
              }
            },
            orderBy: desc(translationOrders.createdAt)
          });
        } else if (user?.role === 'linguist') {
          // Get orders assigned to this linguist
          const linguistAssignments = await db.query.assignments.findMany({
            where: eq(assignments.linguistId, userId),
            with: {
              order: {
                with: {
                  client: true,
                  documents: true,
                }
              }
            }
          });
          orders = linguistAssignments.map(a => a.order);
        } else {
          // Client - get their own orders
          orders = await db.query.translationOrders.findMany({
            where: eq(translationOrders.clientId, userId),
            with: {
              documents: true,
              assignments: {
                with: {
                  linguist: true
                }
              }
            },
            orderBy: desc(translationOrders.createdAt)
          });
        }
        
        res.json(orders);
      } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: "Failed to fetch orders" });
      }
    });
    
    app.get("/api/orders/:id", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = getUserFromRequest(req);
        const orderId = parseInt(req.params.id);
        
        const order = await db.query.translationOrders.findFirst({
          where: eq(translationOrders.id, orderId),
          with: {
            client: true,
            documents: true,
            assignments: {
              with: {
                linguist: {
                  with: {
                    linguistProfile: true
                  }
                }
              }
            }
          }
        });
        
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }
        
        // Check access permissions
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId)
        });
        
        const isAssignedLinguist = order.assignments.some(a => a.linguistId === userId);
        
        if (user?.role !== 'admin' && order.clientId !== userId && !isAssignedLinguist) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        res.json(order);
      } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: "Failed to fetch order" });
      }
    });
    
    app.patch("/api/orders/:id/status", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = getUserFromRequest(req);
        const orderId = parseInt(req.params.id);
        const { status } = req.body;
        
        const [updated] = await db.update(translationOrders)
          .set({ 
            status,
            updatedAt: new Date() 
          })
          .where(eq(translationOrders.id, orderId))
          .returning();
        
        res.json(updated);
      } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: "Failed to update order status" });
      }
    });
    
    app.post("/api/orders/:id/ai-translate", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = getUserFromRequest(req);
        const orderId = parseInt(req.params.id);
        const { text } = req.body;
        
        const order = await db.query.translationOrders.findFirst({
          where: eq(translationOrders.id, orderId)
        });
        
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }
        
        if (order.clientId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        const translatedText = await performAITranslation(text, order.sourceLang, order.targetLang);
        
        // Mark AI translation as completed
        await db.update(translationOrders)
          .set({ 
            aiTranslationCompleted: true,
            updatedAt: new Date() 
          })
          .where(eq(translationOrders.id, orderId));
        
        res.json({ translatedText });
      } catch (error) {
        console.error('Error performing AI translation:', error);
        res.status(500).json({ message: "Failed to translate" });
      }
    });
    
    // ==================== LINGUIST ROUTES ====================
    app.get("/api/linguists", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const { sourceLang, targetLang } = req.query;
        
        let linguists = await db.query.linguistProfiles.findMany({
          with: {
            user: true
          }
        });
        
        // Filter by language pair if provided
        if (sourceLang && targetLang) {
          linguists = linguists.filter(l => {
            const pairs = l.languagePairs as any[];
            return pairs.some((p: any) => 
              p.source === sourceLang && p.target === targetLang
            );
          });
        }
        
        res.json(linguists);
      } catch (error) {
        console.error('Error fetching linguists:', error);
        res.status(500).json({ message: "Failed to fetch linguists" });
      }
    });
    
    app.post("/api/linguist/profile", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = getUserFromRequest(req);
        const { bio, languagePairs, specializations, hourlyRate } = req.body;
        
        // Check if profile exists
        const existing = await db.query.linguistProfiles.findFirst({
          where: eq(linguistProfiles.userId, userId)
        });
        
        if (existing) {
          const [updated] = await db.update(linguistProfiles)
            .set({ bio, languagePairs, specializations, hourlyRate })
            .where(eq(linguistProfiles.userId, userId))
            .returning();
          return res.json(updated);
        }
        
        const [profile] = await db.insert(linguistProfiles)
          .values({
            userId,
            bio,
            languagePairs,
            specializations,
            hourlyRate,
          })
          .returning();
        
        res.json(profile);
      } catch (error) {
        console.error('Error creating linguist profile:', error);
        res.status(500).json({ message: "Failed to create profile" });
      }
    });
    
    app.get("/api/linguist/available-jobs", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = getUserFromRequest(req);
        
        const profile = await db.query.linguistProfiles.findFirst({
          where: eq(linguistProfiles.userId, userId)
        });
        
        if (!profile) {
          return res.json([]);
        }
        
        // Get unassigned orders matching linguist's language pairs
        const orders = await db.query.translationOrders.findMany({
          where: and(
            eq(translationOrders.status, 'submitted'),
          ),
          with: {
            client: true,
            documents: true,
          },
          orderBy: desc(translationOrders.createdAt)
        });
        
        // Filter by language pairs
        const languagePairs = profile.languagePairs as any[];
        const matchingOrders = orders.filter(order => 
          languagePairs.some((pair: any) => 
            pair.source === order.sourceLang && pair.target === order.targetLang
          )
        );
        
        res.json(matchingOrders);
      } catch (error) {
        console.error('Error fetching available jobs:', error);
        res.status(500).json({ message: "Failed to fetch jobs" });
      }
    });
    
    // ==================== ASSIGNMENT ROUTES ====================
    app.post("/api/assignments", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = getUserFromRequest(req);
        const { orderId, linguistId } = req.body;
        
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId)
        });
        
        // Only admins can assign orders, or linguists can self-assign
        if (user?.role !== 'admin' && userId !== linguistId) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        const [assignment] = await db.insert(assignments)
          .values({
            orderId,
            linguistId,
            status: 'assigned',
          })
          .returning();
        
        // Update order status
        await db.update(translationOrders)
          .set({ 
            status: 'assigned',
            updatedAt: new Date() 
          })
          .where(eq(translationOrders.id, orderId));
        
        res.json(assignment);
      } catch (error) {
        console.error('Error creating assignment:', error);
        res.status(500).json({ message: "Failed to create assignment" });
      }
    });
    
    app.patch("/api/assignments/:id/accept", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = getUserFromRequest(req);
        const assignmentId = parseInt(req.params.id);
        
        const [updated] = await db.update(assignments)
          .set({ 
            status: 'accepted',
            acceptedAt: new Date() 
          })
          .where(and(
            eq(assignments.id, assignmentId),
            eq(assignments.linguistId, userId)
          ))
          .returning();
        
        if (updated) {
          await db.update(translationOrders)
            .set({ 
              status: 'in_progress',
              updatedAt: new Date() 
            })
            .where(eq(translationOrders.id, updated.orderId));
        }
        
        res.json(updated);
      } catch (error) {
        console.error('Error accepting assignment:', error);
        res.status(500).json({ message: "Failed to accept assignment" });
      }
    });
    
    app.patch("/api/assignments/:id/complete", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = getUserFromRequest(req);
        const assignmentId = parseInt(req.params.id);
        
        const [updated] = await db.update(assignments)
          .set({ 
            status: 'completed',
            completedAt: new Date() 
          })
          .where(and(
            eq(assignments.id, assignmentId),
            eq(assignments.linguistId, userId)
          ))
          .returning();
        
        if (updated) {
          await db.update(translationOrders)
            .set({ 
              status: 'completed',
              updatedAt: new Date() 
            })
            .where(eq(translationOrders.id, updated.orderId));
            
          // Update linguist stats
          await db.execute(sql`
            UPDATE linguist_profiles 
            SET completed_jobs = completed_jobs + 1
            WHERE user_id = ${userId}
          `);
        }
        
        res.json(updated);
      } catch (error) {
        console.error('Error completing assignment:', error);
        res.status(500).json({ message: "Failed to complete assignment" });
      }
    });
    
    // ==================== GLOSSARY ROUTES ====================
    app.get("/api/glossaries", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = getUserFromRequest(req);
        
        const userGlossaries = await db.query.glossaries.findMany({
          where: eq(glossaries.clientId, userId),
          orderBy: desc(glossaries.createdAt)
        });
        
        res.json(userGlossaries);
      } catch (error) {
        console.error('Error fetching glossaries:', error);
        res.status(500).json({ message: "Failed to fetch glossaries" });
      }
    });
    
    app.post("/api/glossaries", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = getUserFromRequest(req);
        const hasAccess = await checkSubscriptionAccess(userId, 'glossary');
        
        if (!hasAccess) {
          return res.status(403).json({ message: "Upgrade subscription to use glossaries" });
        }
        
        const { term, translation, sourceLang, targetLang, context, category } = req.body;
        
        const [glossaryEntry] = await db.insert(glossaries)
          .values({
            clientId: userId,
            term,
            translation,
            sourceLang,
            targetLang,
            context,
            category,
          })
          .returning();
        
        res.json(glossaryEntry);
      } catch (error) {
        console.error('Error creating glossary entry:', error);
        res.status(500).json({ message: "Failed to create glossary entry" });
      }
    });
    
    app.delete("/api/glossaries/:id", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = getUserFromRequest(req);
        const glossaryId = parseInt(req.params.id);
        
        await db.delete(glossaries)
          .where(and(
            eq(glossaries.id, glossaryId),
            eq(glossaries.clientId, userId)
          ));
        
        res.json({ success: true });
      } catch (error) {
        console.error('Error deleting glossary:', error);
        res.status(500).json({ message: "Failed to delete glossary" });
      }
    });
    
    // ==================== FAVORITE LINGUISTS ====================
    app.get("/api/favorites", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = getUserFromRequest(req);
        
        const favorites = await db.query.favoriteLinguists.findMany({
          where: eq(favoriteLinguists.clientId, userId),
          with: {
            linguist: {
              with: {
                linguistProfile: true
              }
            }
          }
        });
        
        res.json(favorites);
      } catch (error) {
        console.error('Error fetching favorites:', error);
        res.status(500).json({ message: "Failed to fetch favorites" });
      }
    });
    
    app.post("/api/favorites", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = getUserFromRequest(req);
        const { linguistId } = req.body;
        
        const hasAccess = await checkSubscriptionAccess(userId, 'favorites');
        if (!hasAccess) {
          return res.status(403).json({ message: "Upgrade to Professional or Enterprise to use favorites" });
        }
        
        const [favorite] = await db.insert(favoriteLinguists)
          .values({
            clientId: userId,
            linguistId,
          })
          .returning();
        
        res.json(favorite);
      } catch (error) {
        console.error('Error adding favorite:', error);
        res.status(500).json({ message: "Failed to add favorite" });
      }
    });
    
    app.delete("/api/favorites/:linguistId", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = getUserFromRequest(req);
        const linguistId = req.params.linguistId;
        
        await db.delete(favoriteLinguists)
          .where(and(
            eq(favoriteLinguists.clientId, userId),
            eq(favoriteLinguists.linguistId, linguistId)
          ));
        
        res.json({ success: true });
      } catch (error) {
        console.error('Error removing favorite:', error);
        res.status(500).json({ message: "Failed to remove favorite" });
      }
    });
    
    // ==================== ADMIN ROUTES ====================
    app.get("/api/admin/stats", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = getUserFromRequest(req);
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId)
        });
        
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Admin access required" });
        }
        
        const [stats] = await db.execute(sql`
          SELECT 
            (SELECT COUNT(*) FROM users WHERE role = 'client') as total_clients,
            (SELECT COUNT(*) FROM users WHERE role = 'linguist') as total_linguists,
            (SELECT COUNT(*) FROM translation_orders) as total_orders,
            (SELECT COUNT(*) FROM translation_orders WHERE status = 'completed') as completed_orders,
            (SELECT COUNT(*) FROM translation_orders WHERE status = 'in_progress') as active_orders,
            (SELECT COALESCE(SUM(final_cost), 0) FROM translation_orders WHERE status = 'completed') as total_revenue
        `);
        
        res.json(stats);
      } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ message: "Failed to fetch stats" });
      }
    });
    
    app.get("/api/admin/users", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const userId = getUserFromRequest(req);
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId)
        });
        
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Admin access required" });
        }
        
        const allUsers = await db.query.users.findMany({
          with: {
            linguistProfile: true,
            subscription: true,
          },
          orderBy: desc(users.createdAt)
        });
        
        res.json(allUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: "Failed to fetch users" });
      }
    });
  }
  