import 'fastify';
import '@fastify/jwt';
import { FastifyRequest, FastifyReply } from 'fastify';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: { id: string; email?: string; [key: string]: unknown };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate(req: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}
