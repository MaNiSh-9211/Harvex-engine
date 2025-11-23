const { z } = require('zod');

// Zod schema for user validation
const UserSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().min(18).max(120),
  role: z.enum(['user', 'admin', 'moderator']),
  createdAt: z.date().default(() => new Date())
});

// Sample data storage
let users = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    age: 25,
    role: 'user',
    createdAt: new Date('2024-01-01')
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@example.com',
    age: 30,
    role: 'admin',
    createdAt: new Date('2024-01-02')
  }
];

// Business logic functions
class UserModel {
  static getAllUsers() {
    // Simulate some calculation
    const averageAge = users.reduce((sum, user) => sum + user.age, 0) / users.length;
    
    return {
      users,
      stats: {
        totalUsers: users.length,
        averageAge: Math.round(averageAge * 100) / 100,
        lastUpdated: new Date()
      },
      schema: UserSchema
    };
  }

  static getUserById(id) {
    const user = users.find(u => u.id === parseInt(id));
    if (!user) return null;

    // Calculate user score based on age and role
    let score = user.age * 10;
    if (user.role === 'admin') score += 50;
    if (user.role === 'moderator') score += 25;

    return {
      user,
      calculatedScore: score,
      performance: score > 300 ? 'excellent' : score > 200 ? 'good' : 'average',
      schema: UserSchema
    };
  }

  static createUser(userData) {
    try {
      // Validate with Zod
      const validatedData = UserSchema.parse({
        ...userData,
        id: users.length + 1,
        createdAt: new Date()
      });

      users.push(validatedData);
      
      // Calculate new stats
      const totalAge = users.reduce((sum, user) => sum + user.age, 0);
      
      return {
        success: true,
        user: validatedData,
        newStats: {
          totalUsers: users.length,
          averageAge: Math.round((totalAge / users.length) * 100) / 100
        },
        schema: UserSchema
      };
    } catch (error) {
      return {
        success: false,
        error: error.errors,
        schema: UserSchema
      };
    }
  }
}

module.exports = UserModel;
