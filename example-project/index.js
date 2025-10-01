// Example Node.js application for debugging with Neovim DAP
// This file demonstrates various debugging scenarios

const express = require('express');
const _ = require('lodash');

console.log('Starting debug demo application...');

// Sample data processing functions
function processUserData(users) {
    console.log('Processing user data...');
    
    // Filter active users
    const activeUsers = users.filter(user => user.active);
    console.log(`Found ${activeUsers.length} active users`);
    
    // Transform user data
    const processedUsers = activeUsers.map(user => ({
        id: user.id,
        name: user.name.toUpperCase(),
        email: user.email,
        lastLogin: new Date(user.lastLogin)
    }));
    
    return processedUsers;
}

// Multiple assignments
let a, b, c;

[a, b, c] = [5, 10, 15];
console.log("a =", a, "b =", b, "c =", c);
// debugger
// Array operations
let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Filter even numbers
let evenNumbers = numbers.filter(n => n % 2 === 0);
console.log("Even numbers:", evenNumbers);

// Double each number
let doubled = numbers.map(n => n * 2);
console.log("Doubled numbers:", doubled);

// Sum of numbers
let sum = numbers.reduce((acc, n) => acc + n, 0);
console.log("Sum of numbers:", sum);

// Complex operations
let processed = numbers
  .filter(n => n % 2 !== 0)    // odd numbers
  .map(n => n * n)             // square each
  .reduce((acc, n) => acc + n, 0); // sum of squares
console.log("Sum of squares of odd numbers:", processed);

// Object array with math operations
let users = [
  { name: "Alice", age: 23 },
  { name: "Bob", age: 30 },
  { name: "Charlie", age: 27 }
];

// Increment age by 1 and calculate average age
users.forEach(u => u.age += 1);
let avgAge = users.reduce((sum, u) => sum + u.age, 0) / users.length;
console.log("Users after incrementing age:", users);
console.log("Average age:", avgAge);


// Sample async function for debugging
async function fetchUserData(userId) {
    console.log(`Fetching data for user: ${userId}`);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const userData = {
        id: userId,
        name: `User ${userId}`,
        email: `user${userId}@example.com`,
        active: true,
        lastLogin: Date.now() - Math.random() * 86400000 // Random time within last day
    };
    
    console.log('User data fetched:', userData);
    return userData;
}

// Sample class for object-oriented debugging
class UserManager {
    constructor() {
        this.users = [];
        this.cache = new Map();
    }
    
    async addUser(userData) {
        console.log('Adding user:', userData);
        
        // Validate user data
        if (!userData.name || !userData.email) {
            throw new Error('Invalid user data: name and email are required');
        }
        
        // Add to collection
        this.users.push({
            ...userData,
            id: this.users.length + 1,
            createdAt: new Date()
        });
        
        // Update cache
        this.cache.set(userData.email, userData);
        
        console.log(`User added successfully. Total users: ${this.users.length}`);
        return this.users[this.users.length - 1];
    }
    
    findUserByEmail(email) {
        console.log(`Searching for user with email: ${email}`);
        
        const user = this.users.find(u => u.email === email);
        if (user) {
            console.log('User found:', user);
        } else {
            console.log('User not found');
        }
        
        return user;
    }
    
    getActiveUsers() {
        const activeUsers = this.users.filter(user => user.active);
        console.log(`Retrieved ${activeUsers.length} active users`);
        return activeUsers;
    }
}

// Sample Express.js setup for web debugging
function setupExpressApp() {
    const app = express();
    
    app.use(express.json());
    
    const userManager = new UserManager();
    
    // Sample routes
    app.get('/api/users', (req, res) => {
        console.log('GET /api/users - Fetching all users');
        const users = userManager.getActiveUsers();
        res.json(users);
    });
    
    app.post('/api/users', async (req, res) => {
        try {
            console.log('POST /api/users - Creating new user');
            const userData = req.body;
            const newUser = await userManager.addUser(userData);
            res.status(201).json(newUser);
        } catch (error) {
            console.error('Error creating user:', error.message);
            res.status(400).json({ error: error.message });
        }
    });
    
    app.get('/api/users/:email', (req, res) => {
        const email = req.params.email;
        console.log(`GET /api/users/${email} - Finding user`);
        const user = userManager.findUserByEmail(email);
        
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    });
    
    return app;
}

// Main execution function
async function main() {
    console.log('=== Debug Demo Application Started ===');
    
    // Initialize user manager
    const userManager = new UserManager();
    
    // Add some sample users
    console.log('\n--- Adding Sample Users ---');
    await userManager.addUser({
        name: 'John Doe',
        email: 'john@example.com',
        active: true
    });
    
    await userManager.addUser({
        name: 'Jane Smith',
        email: 'jane@example.com',
        active: true
    });
    
    await userManager.addUser({
        name: 'Bob Johnson',
        email: 'bob@example.com',
        active: false
    });
    
    // Process user data
    console.log('\n--- Processing User Data ---');
    const allUsers = userManager.users;
    const processedUsers = processUserData(allUsers);
    console.log('Processed users:', processedUsers);
    
    // Demonstrate async operations
    console.log('\n--- Async Operations ---');
    const userData1 = await fetchUserData(1);
    const userData2 = await fetchUserData(2);
    console.log('Fetched user data:', { userData1, userData2 });
    
    // Demonstrate error handling
    console.log('\n--- Error Handling ---');
    try {
        await userManager.addUser({
            name: 'Invalid User'
            // Missing email - should throw error
        });
    } catch (error) {
        console.error('Caught expected error:', error.message);
    }
    
    // Demonstrate array operations
    console.log('\n--- Array Operations ---');
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const evenNumbers = numbers.filter(n => n % 2 === 0);
    const doubledNumbers = evenNumbers.map(n => n * 2);
    const sum = doubledNumbers.reduce((acc, n) => acc + n, 0);
    
    console.log('Original numbers:', numbers);
    console.log('Even numbers:', evenNumbers);
    console.log('Doubled numbers:', doubledNumbers);
    console.log('Sum of doubled even numbers:', sum);
    
    // Demonstrate object operations with lodash
    console.log('\n--- Object Operations ---');
    const complexData = {
        users: userManager.users,
        metadata: {
            totalCount: userManager.users.length,
            activeCount: userManager.getActiveUsers().length,
            timestamp: new Date()
        }
    };
    
    const flattened = _.flattenDeep(complexData);
    const grouped = _.groupBy(userManager.users, 'active');
    
    console.log('Complex data:', complexData);
    console.log('Flattened data:', flattened);
    console.log('Grouped by active status:', grouped);
    
    // Set up Express app (but don't start server in this demo)
    console.log('\n--- Express App Setup ---');
    const app = setupExpressApp();
    console.log('Express app configured with routes');
    
    console.log('\n=== Debug Demo Application Completed ===');
    console.log('Application is ready for debugging!');
    console.log('Use breakpoints to inspect variables and step through code.');
}

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the application
if (require.main === module) {
    main().catch(error => {
        console.error('Application error:', error);
        process.exit(1);
    });
}

console.log("---------------Program finished------------");

module.exports = {
    UserManager,
    processUserData,
    fetchUserData,
    setupExpressApp
};


