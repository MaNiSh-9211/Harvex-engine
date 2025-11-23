const { z } = require('zod');

// Additional validation schemas
const UserUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
  age: z.number().min(18).max(120).optional(),
  role: z.enum(['user', 'admin', 'moderator']).optional()
});

const QueryParamsSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('10'),
  sort: z.enum(['name', 'email', 'age', 'createdAt']).default('name')
});

module.exports = {
  UserUpdateSchema,
  QueryParamsSchema
};
