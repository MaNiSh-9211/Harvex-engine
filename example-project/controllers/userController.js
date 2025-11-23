const UserModel = require('../models/userModel');

class UserController {
  static getAllUsers(req, res, next) {
    try {
      console.log('📋 Fetching all users with calculations...');
      
      const result = UserModel.getAllUsers();
      
      // Additional calculation in controller
      const adminCount = result.users.filter(u => u.role === 'admin').length;
      const userCount = result.users.filter(u => u.role === 'user').length;
      
      res.json({
        success: true,
        data: result,
        roleDistribution: {
          admins: adminCount,
          users: userCount,
          moderators: result.users.length - adminCount - userCount
        },
        schemaDefinition: result.schema._def
      });
    } catch (error) {
      next(error);
    }
  }

  static getUserById(req, res, next) {
    try {
      const { id } = req.params;
      console.log(`👤 Fetching user ${id} with score calculation...`);
      
      const result = UserModel.getUserById(id);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          schema: UserModel.schema
        });
      }

      res.json({
        success: true,
        data: result,
        schemaShape: result.schema.shape
      });
    } catch (error) {
      next(error);
    }
  }

  static createUser(req, res, next) {
    try {
      console.log('➕ Creating new user with validation...');
      
      const result = UserModel.createUser(req.body);
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: result,
        validationSchema: result.schema._def
      });
    } catch (error) {
      next(error);
    }
  }

  static calculateUserStats(req, res, next) {
    try {
      const { id } = req.params;
      console.log(`📊 Calculating advanced stats for user ${id}...`);
      
      const user = UserModel.getUserById(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Complex calculations
      const daysSinceCreation = Math.floor(
        (new Date() - new Date(user.user.createdAt)) / (1000 * 60 * 60 * 24)
      );
      
      const nameComplexity = user.user.name.length * 5;
      const emailComplexity = user.user.email.split('@')[0].length * 3;
      const totalComplexity = nameComplexity + emailComplexity + user.calculatedScore;

      res.json({
        success: true,
        user: user.user,
        advancedStats: {
          daysSinceCreation,
          nameComplexity,
          emailComplexity,
          totalComplexity,
          complexityLevel: totalComplexity > 500 ? 'high' : totalComplexity > 300 ? 'medium' : 'low'
        },
        calculations: [
          `Name: ${user.user.name} (${nameComplexity} points)`,
          `Email: ${user.user.email} (${emailComplexity} points)`,
          `Base Score: ${user.calculatedScore} points`,
          `Total: ${totalComplexity} points`
        ],
        schema: user.schema
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;
