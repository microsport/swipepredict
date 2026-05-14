import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { cardRoutes, betRoutes, walletRoutes, profileRoutes } from './routes/index.js';
import { startCronJobs } from './jobs/index.js';
import { createClient } from '@supabase/supabase-js';

const app = Fastify({ logger: true });

// CORS
await app.register(cors, { origin: true });

// JWT
await app.register(jwt, { secret: process.env.JWT_SECRET! });

// Auth decorator
app.decorate('authenticate', async (req: any, reply: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new Error('No token');

    // Verify via Supabase (token is Supabase JWT)
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error('Invalid token');
    req.user = user;
  } catch {
    reply.status(401).send({ error: 'Unauthorized' });
  }
});

// Routes
await app.register(cardRoutes, { prefix: '/api' });
await app.register(betRoutes, { prefix: '/api' });
await app.register(walletRoutes, { prefix: '/api' });
await app.register(profileRoutes, { prefix: '/api' });

// Health check
app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

// Start
const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: '0.0.0.0' });
console.log(`API running on port ${port}`);

startCronJobs();
