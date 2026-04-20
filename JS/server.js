// Terra Scenik - Backend Server (server.js)
// Student ID: M01049109 | CST3340 Coursework 2

import dotenv from 'dotenv'; // environment variables loader
import express from 'express'; // web framework
import { MongoClient, ObjectId } from 'mongodb'; // database client
import session from 'express-session'; // session management
import fs from 'fs'; // file system operations
import path from 'path'; // file path utilities
import multer from 'multer'; // file upload handling
import { fileURLToPath } from 'url'; // ES module path helper
import OpenAI from 'openai'; // OpenAI SDK for AI caption generation

const __filename = fileURLToPath(import.meta.url); // get current file path (ES modules)
const __dirname = path.dirname(__filename); // get directory path
const codeDir = path.join(__dirname, '..'); // Code directory
const rootDir = path.join(__dirname, '..', '..'); // project root directory (CourseW2)

// Load .env from Code directory
dotenv.config({ path: path.join(codeDir, '.env') });

const app = express(); // create Express app
const PORT = process.env.PORT || 3000; // server port (use environment variable in production)
const STUDENTID = "M01049109"; // used in all API endpoints

// === OPENAI CLIENT SETUP ===
// Initialize OpenAI client with API key from environment variables
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// === FILE UPLOAD CONFIGURATION ===

const uploadsDir = path.join(rootDir, 'Uploads', STUDENTID); // folder for uploaded files
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true }); // create if doesn't exist
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir); // save to M01049109/ folder
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); // unique filename
        cb(null, uniqueSuffix + path.extname(file.originalname)); // keep original extension
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB max file size
});

// === MIDDLEWARE ===

app.use(express.json({ limit: '20mb' })); // parse JSON bodies (20MB limit for base64 images)
app.use(express.urlencoded({ extended: true, limit: '20mb' })); // parse form data
app.use(express.static(codeDir)); // serve static files from Code directory (index.html)
app.use('/Style', express.static(path.join(codeDir, 'Style'))); // serve CSS files
app.use('/JS', express.static(path.join(codeDir, 'JS'))); // serve JS files
app.use(`/${STUDENTID}`, express.static(uploadsDir)); // serve uploaded files from Uploads/M01049109

app.use(session({
    secret: process.env.SESSION_SECRET || 'Terra Scenik-secret-key-2025', // signs session cookie
    resave: false, // don't save unmodified sessions
    saveUninitialized: false, // don't create empty sessions
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hour expiry
        httpOnly: true // prevents client-side JS access
    }
}));

// Request logging middleware - logs all incoming requests
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.url}`);
    next();
});

// === MONGODB SETUP ===

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kahmeddurrani_db_user:Itsmypassword%401@kad.ssma5p1.mongodb.net/travelconnect?retryWrites=true&w=majority';

let db; // database instance
let usersCollection; // users collection
let postsCollection; // posts collection
let followsCollection; // follow relationships
let likesCollection; // likes on posts

// connects to MongoDB Atlas and initializes collections
async function connectDB() {
    try {
        const client = new MongoClient(MONGODB_URI, {
            tls: true, // enable SSL encryption
            tlsAllowInvalidCertificates: true,
            serverSelectionTimeoutMS: 5000 // 5 second timeout
        });
        await client.connect();
        db = client.db('travelconnect');
        usersCollection = db.collection('users');
        postsCollection = db.collection('posts');
        followsCollection = db.collection('follows');
        likesCollection = db.collection('likes');
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.error('❌ Failed to connect to MongoDB:', err.message);
    }
}

// === AUTHENTICATION MIDDLEWARE ===

// checks if user is logged in, returns 401 if not
function requireLogin(req, res, next) {
    if (!req.session.userId) { // no session = not logged in
        return res.status(401).json({
            success: false,
            error: 'You must be logged in to access this resource'
        });
    }
    // User is authenticated, proceed to next middleware/route handler
    next();
}

// POST /M01049109/users - Register new user
app.post(`/${STUDENTID}/users`, async (req, res) => {
    if (!usersCollection) {
        return res.json({ success: false, error: 'Database not connected' });
    }

    const { name, email, password, bio } = req.body;

    if (!name || !email || !password) {
        return res.json({ success: false, error: 'Name, email, and password are required' });
    }

    try {
        const existing = await usersCollection.findOne({ email: email }); // check for duplicate
        if (existing) {
            return res.json({ success: false, error: 'Email already registered' });
        }

        const newUser = {
            name: name,
            email: email,
            password: password, // NOTE: should hash in production
            bio: bio || '',
            createdAt: new Date()
        };

        const result = await usersCollection.insertOne(newUser);

        // auto-login after registration
        req.session.userId = result.insertedId.toString();
        req.session.userName = newUser.name;
        req.session.userEmail = newUser.email;

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: result.insertedId,
                name: newUser.name,
                email: newUser.email,
                bio: newUser.bio
            }
        });

    } catch (err) {
        // Log error details for debugging
        console.error('Register error:', err);
        // Return generic error to client
        return res.status(500).json({ success: false, error: 'Server error' });
    }
    // Api route to fetch images from Unsplash      
});

// POST /M01049109/upload - Upload image file
app.post(`/${STUDENTID}/upload`, requireLogin, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        // Construct the URL path to the uploaded file
        const fileUrl = `/${STUDENTID}/${req.file.filename}`;

        return res.json({
            success: true,
            message: 'File uploaded successfully',
            filename: req.file.filename,
            path: fileUrl,
            size: req.file.size,
            mimetype: req.file.mimetype
        });
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({
            success: false,
            error: 'Error uploading file'
        });
    }
});

// GET /M01049109/unsplash - Proxy for Unsplash API (hides API key from client)
app.get(`/${STUDENTID}/unsplash`, async (req, res) => {
    try {
        const query = req.query.q || "nature";
        const apiUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&client_id=${process.env.UNSPLASH_KEY}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Unsplash error:", error);
        res.status(500).json({ success: false });
    }
});

// GET /M01049109/users?q=query - Search users by name or email
app.get(`/${STUDENTID}/users`, async (req, res) => {
    if (!usersCollection) {
        return res.json({ success: false, error: 'Database not connected' });
    }

    const searchQuery = req.query.q;

    if (!searchQuery) {
        return res.status(400).json({
            success: false,
            error: 'Search query parameter "q" is required'
        });
    }

    try {
        // Search users whose name or email contains the search term
        const results = await usersCollection.find({
            $or: [
                { name: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } }
            ]
        }).toArray();

        // Don't return passwords
        const users = results.map(user => ({
            id: user._id,
            name: user.name,
            email: user.email,
            bio: user.bio || ''
        }));

        return res.json({
            success: true,
            count: users.length,
            users: users
        });

    } catch (err) {
        console.error('Search users error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

// GET /M01049109/login - Check if user is logged in
app.get(`/${STUDENTID}/login`, async (req, res) => {
    if (req.session.userId) {
        try {
            // Fetch fresh user data from database
            const user = await usersCollection.findOne({ _id: new ObjectId(req.session.userId) });

            if (user) {
                return res.json({
                    success: true,
                    loggedIn: true,
                    user: {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        bio: user.bio || '',
                        profilePicture: user.profilePicture || ''
                    }
                });
            }
        } catch (err) {
            console.error('Check login error:', err);
        }

        // Fallback to session data if database fetch fails
        return res.json({
            success: true,
            loggedIn: true,
            user: {
                id: req.session.userId,
                name: req.session.userName,
                email: req.session.userEmail,
                bio: ''
            }
        });
    } else {
        return res.json({
            success: true,
            loggedIn: false,
            message: 'No user logged in'
        });
    }
});

// POST /M01049109/login - Authenticate user and create session
app.post(`/${STUDENTID}/login`, async (req, res) => {
    if (!usersCollection) {
        return res.json({ success: false, error: 'Database not connected' });
    }

    const { name, password } = req.body;

    if (!name || !password) {
        return res.json({ success: false, error: 'Username and password are required' });
    }

    try {
        // Find user by name
        const user = await usersCollection.findOne({ name: name });

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }

        // Check password
        if (user.password !== password) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }

        // Create session
        req.session.userId = user._id.toString();
        req.session.userName = user.name;
        req.session.userEmail = user.email;

        return res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                bio: user.bio || '',
                profilePicture: user.profilePicture || null
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

// DELETE /M01049109/login - Destroy session (logout)
app.delete(`/${STUDENTID}/login`, (req, res) => {
    if (req.session.userId) {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: 'Error logging out'
                });
            }
            return res.json({
                success: true,
                message: 'Logout successful'
            });
        });
    } else {
        return res.json({
            success: false,
            error: 'No user logged in'
        });
    }
});

// POST /M01049109/contents - Create new post
app.post(`/${STUDENTID}/contents`, requireLogin, async (req, res) => {
    if (!postsCollection) {
        return res.json({ success: false, error: 'Database not connected' });
    }

    const { caption, location, image_url } = req.body;

    // Validation
    if (!caption || !location) {
        return res.status(400).json({
            success: false,
            error: 'Caption and location are required'
        });
    }

    try {
        // Create new post
        const newPost = {
            userId: req.session.userId,
            userName: req.session.userName,
            userEmail: req.session.userEmail,
            caption: caption,
            location: location,
            image_url: image_url || '',
            createdAt: new Date()
        };

        const result = await postsCollection.insertOne(newPost);

        return res.status(201).json({
            success: true,
            message: 'Post created successfully',
            post: {
                id: result.insertedId,
                ...newPost
            }
        });

    } catch (err) {
        console.error('Create post error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

// GET /M01049109/contents?q=query - Search posts by caption/location
app.get(`/${STUDENTID}/contents`, async (req, res) => {
    if (!postsCollection) {
        return res.json({ success: false, error: 'Database not connected' });
    }

    const searchQuery = req.query.q;

    if (!searchQuery) {
        return res.status(400).json({
            success: false,
            error: 'Search query parameter "q" is required'
        });
    }

    try {
        // Search posts by caption or location
        const results = await postsCollection.find({
            $or: [
                { caption: { $regex: searchQuery, $options: 'i' } },
                { location: { $regex: searchQuery, $options: 'i' } }
            ]
        }).sort({ createdAt: -1 }).toArray();

        // Get profile pictures for all users in search results
        const posts = await Promise.all(
            results.map(async (post) => {
                const user = await usersCollection.findOne(
                    { email: post.userEmail },
                    { projection: { profilePicture: 1 } }
                );
                return {
                    id: post._id,
                    userId: post.userId,
                    userName: post.userName,
                    userEmail: post.userEmail,
                    caption: post.caption,
                    location: post.location,
                    image_url: post.image_url,
                    profilePicture: user?.profilePicture || null,
                    createdAt: post.createdAt
                };
            })
        );

        return res.json({
            success: true,
            count: posts.length,
            posts: posts
        });

    } catch (err) {
        console.error('Search posts error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

// POST /M01049109/follow - Follow a user
app.post(`/${STUDENTID}/follow`, requireLogin, async (req, res) => {
    if (!followsCollection || !usersCollection) {
        return res.json({ success: false, error: 'Database not connected' });
    }

    const { userEmail } = req.body;

    if (!userEmail) {
        return res.status(400).json({
            success: false,
            error: 'User email to follow is required'
        });
    }

    try {
        // Find user to follow
        const userToFollow = await usersCollection.findOne({ email: userEmail });

        if (!userToFollow) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Can't follow yourself
        if (userToFollow._id.toString() === req.session.userId) {
            return res.status(400).json({
                success: false,
                error: 'You cannot follow yourself'
            });
        }

        // Check if already following
        const existingFollow = await followsCollection.findOne({
            followerId: req.session.userId,
            followingId: userToFollow._id.toString()
        });

        if (existingFollow) {
            return res.status(409).json({
                success: false,
                error: 'You are already following this user'
            });
        }

        // Create follow relationship
        const newFollow = {
            followerId: req.session.userId,
            followerName: req.session.userName,
            followingId: userToFollow._id.toString(),
            followingName: userToFollow.name,
            followingEmail: userToFollow.email,
            createdAt: new Date()
        };

        await followsCollection.insertOne(newFollow);

        return res.status(201).json({
            success: true,
            message: `You are now following ${userToFollow.name}`,
            follow: newFollow
        });

    } catch (err) {
        console.error('Follow user error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

// DELETE /M01049109/follow - Unfollow a user
app.delete(`/${STUDENTID}/follow`, requireLogin, async (req, res) => {
    if (!followsCollection || !usersCollection) {
        return res.json({ success: false, error: 'Database not connected' });
    }

    const { userEmail } = req.body;

    if (!userEmail) {
        return res.status(400).json({
            success: false,
            error: 'User email to unfollow is required'
        });
    }

    try {
        // Find user to unfollow
        const userToUnfollow = await usersCollection.findOne({ email: userEmail });

        if (!userToUnfollow) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Check if currently following
        const existingFollow = await followsCollection.findOne({
            followerId: req.session.userId,
            followingId: userToUnfollow._id.toString()
        });

        if (!existingFollow) {
            return res.status(400).json({
                success: false,
                error: 'You are not following this user'
            });
        }

        // Remove follow relationship
        await followsCollection.deleteOne({
            followerId: req.session.userId,
            followingId: userToUnfollow._id.toString()
        });

        return res.json({
            success: true,
            message: `You have unfollowed ${userToUnfollow.name}`
        });

    } catch (err) {
        console.error('Unfollow user error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

// POST /M01049109/contents/:postId/like - Like a post
app.post(`/${STUDENTID}/contents/:postId/like`, requireLogin, async (req, res) => {
    if (!likesCollection || !postsCollection) {
        return res.json({ success: false, error: 'Database not connected' });
    }

    const { postId } = req.params;

    try {
        // Check if post exists
        const post = await postsCollection.findOne({ _id: new ObjectId(postId) });

        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        // Check if already liked
        const existingLike = await likesCollection.findOne({
            userId: req.session.userId,
            postId: postId
        });

        if (existingLike) {
            return res.status(400).json({
                success: false,
                error: 'You already liked this post'
            });
        }

        // Add like
        await likesCollection.insertOne({
            userId: req.session.userId,
            postId: postId,
            createdAt: new Date().toISOString()
        });

        // Get updated like count
        const likeCount = await likesCollection.countDocuments({ postId: postId });

        return res.json({
            success: true,
            message: 'Post liked successfully',
            likeCount: likeCount
        });

    } catch (err) {
        console.error('Like post error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

// DELETE /M01049109/contents/:postId/like - Unlike a post
app.delete(`/${STUDENTID}/contents/:postId/like`, requireLogin, async (req, res) => {
    if (!likesCollection) {
        return res.json({ success: false, error: 'Database not connected' });
    }

    const { postId } = req.params;

    try {
        // Check if like exists
        const existingLike = await likesCollection.findOne({
            userId: req.session.userId,
            postId: postId
        });

        if (!existingLike) {
            return res.status(400).json({
                success: false,
                error: 'You have not liked this post'
            });
        }

        // Remove like
        await likesCollection.deleteOne({
            userId: req.session.userId,
            postId: postId
        });

        // Get updated like count
        const likeCount = await likesCollection.countDocuments({ postId: postId });

        return res.json({
            success: true,
            message: 'Post unliked successfully',
            likeCount: likeCount
        });

    } catch (err) {
        console.error('Unlike post error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

// GET /M01049109/feed - Get posts from followed users
app.get(`/${STUDENTID}/feed`, requireLogin, async (req, res) => {
    if (!postsCollection || !followsCollection) {
        return res.json({ success: false, error: 'Database not connected' });
    }

    try {
        // Get all users that current user is following
        const following = await followsCollection.find({
            followerId: req.session.userId
        }).toArray();

        const followingIds = following.map(f => f.followingId);
        console.log(`👥 User is following ${followingIds.length} users:`, followingIds);

        if (followingIds.length === 0) {
            return res.json({
                success: true,
                count: 0,
                posts: [],
                message: 'You are not following anyone yet. Follow users to see their posts!'
            });
        }

        // Get posts only from followed users
        const feedPosts = await postsCollection.find({
            userId: { $in: followingIds }
        }).sort({ createdAt: -1 }).toArray();
        
        console.log(`📝 Found ${feedPosts.length} posts from followed users`);

        // Get profile pictures for all users in feed
        const posts = await Promise.all(
            feedPosts.map(async (post) => {
                const user = await usersCollection.findOne(
                    { email: post.userEmail },
                    { projection: { profilePicture: 1 } }
                );

                // Get like count and check if current user liked this post
                const likeCount = await likesCollection.countDocuments({ postId: post._id.toString() });
                const userLiked = await likesCollection.findOne({
                    userId: req.session.userId,
                    postId: post._id.toString()
                });

                const postData = {
                    id: post._id,
                    userId: post.userId,
                    userName: post.userName,
                    userEmail: post.userEmail,
                    caption: post.caption,
                    location: post.location,
                    image_url: post.image_url,
                    profilePicture: user?.profilePicture || null,
                    likeCount: likeCount,
                    isLiked: !!userLiked,
                    createdAt: post.createdAt
                };
                
                console.log(`  📄 Post by ${post.userName} (${post.userEmail}) - image_url: ${post.image_url || 'none'}`);
                
                return postData;
            })
        );

        console.log(`✅ Feed: Returning ${posts.length} posts from ${followingIds.length} followed users`);

        return res.json({
            success: true,
            count: posts.length,
            posts: posts
        });

    } catch (err) {
        console.error('Get feed error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

// GET /M01049109/following - Get list of users you follow
app.get(`/${STUDENTID}/following`, requireLogin, async (req, res) => {
    if (!followsCollection || !usersCollection) {
        return res.json({ success: false, error: 'Database not connected' });
    }

    try {
        const following = await followsCollection.find({
            followerId: req.session.userId
        }).toArray();

        // Get full user details including profile pictures
        const followingList = await Promise.all(
            following.map(async (f) => {
                const user = await usersCollection.findOne(
                    { email: f.followingEmail },
                    { projection: { profilePicture: 1 } }
                );
                return {
                    id: f.followingId,
                    name: f.followingName,
                    email: f.followingEmail,
                    profilePicture: user?.profilePicture || null,
                    followedAt: f.createdAt
                };
            })
        );

        return res.json({
            success: true,
            count: followingList.length,
            following: followingList
        });
    } catch (err) {
        console.error('Get following error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

// PUT /M01049109/users/profile - Update user profile (name, email, bio)
app.put(`/${STUDENTID}/users/profile`, requireLogin, async (req, res) => {
    if (!usersCollection) {
        return res.json({ success: false, error: 'Database not connected' });
    }

    const { name, email, bio } = req.body;

    // Validation
    if (!name || !email) {
        return res.status(400).json({
            success: false,
            error: 'Name and email are required'
        });
    }

    try {
        // Check if new email is already taken by another user
        if (email !== req.session.userEmail) {
            const existingUser = await usersCollection.findOne({
                email: email,
                _id: { $ne: new ObjectId(req.session.userId) }
            });

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    error: 'Email is already taken by another user'
                });
            }
        }

        // Update user profile
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(req.session.userId) },
            {
                $set: {
                    name: name,
                    email: email,
                    bio: bio || ''
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Update session with new data
        req.session.userName = name;
        req.session.userEmail = email;

        // Also update user info in posts collection
        await postsCollection.updateMany(
            { userId: req.session.userId },
            {
                $set: {
                    userName: name,
                    userEmail: email
                }
            }
        );

        // Update user info in follows collection
        await followsCollection.updateMany(
            { followerId: req.session.userId },
            {
                $set: {
                    followerName: name
                }
            }
        );

        await followsCollection.updateMany(
            { followingId: req.session.userId },
            {
                $set: {
                    followingName: name,
                    followingEmail: email
                }
            }
        );

        return res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: req.session.userId,
                name: name,
                email: email,
                bio: bio || ''
            }
        });

    } catch (err) {
        console.error('Update profile error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

// PUT /M01049109/users/profile-picture - Update profile picture
app.put(`/${STUDENTID}/users/profile-picture`, requireLogin, async (req, res) => {
    if (!usersCollection) {
        return res.json({ success: false, error: 'Database not connected' });
    }

    const { profilePicture } = req.body;

    if (!profilePicture) {
        return res.status(400).json({
            success: false,
            error: 'Profile picture is required'
        });
    }

    try {
        // Update user's profile picture
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(req.session.userId) },
            {
                $set: {
                    profilePicture: profilePicture
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        return res.json({
            success: true,
            message: 'Profile picture updated successfully',
            profilePicture: profilePicture
        });

    } catch (err) {
        console.error('Update profile picture error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

// GET /M01049109/users/:email/profile - Get user's public profile
app.get(`/${STUDENTID}/users/:email/profile`, requireLogin, async (req, res) => {
    if (!usersCollection || !postsCollection) {
        return res.json({ success: false, error: 'Database not connected' });
    }

    const userEmail = req.params.email;

    try {
        // Find user by email
        const user = await usersCollection.findOne({ email: userEmail });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Get user's posts
        const userPosts = await postsCollection.find({
            userId: user._id.toString()
        }).sort({ createdAt: -1 }).toArray();

        const posts = userPosts.map(post => ({
            id: post._id,
            userId: post.userId,
            userName: post.userName,
            userEmail: post.userEmail,
            caption: post.caption,
            location: post.location,
            image_url: post.image_url,
            profilePicture: user.profilePicture || null,
            createdAt: post.createdAt
        }));

        // Check if current user is following this user
        let isFollowing = false;
        if (followsCollection) {
            const followRecord = await followsCollection.findOne({
                followerId: req.session.userId,
                followingId: user._id.toString()
            });
            isFollowing = !!followRecord;
        }

        return res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                bio: user.bio || '',
                profilePicture: user.profilePicture || null
            },
            posts: posts,
            postsCount: posts.length,
            isFollowing: isFollowing
        });

    } catch (err) {
        console.error('Get user profile error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

// PUT /M01049109/contents/:postId - Update a post
app.put(`/${STUDENTID}/contents/:postId`, requireLogin, async (req, res) => {
    if (!postsCollection) {
        return res.json({ success: false, error: 'Database not connected' });
    }

    const { postId } = req.params;
    const { caption, location, image_url } = req.body;

    // Validation
    if (!caption || !location) {
        return res.status(400).json({
            success: false,
            error: 'Caption and location are required'
        });
    }

    try {
        // Find the post and verify ownership
        const post = await postsCollection.findOne({ _id: new ObjectId(postId) });

        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        // Check if user owns the post
        if (post.userId !== req.session.userId) {
            return res.status(403).json({
                success: false,
                error: 'You can only edit your own posts'
            });
        }

        // Update post
        const updateData = {
            caption: caption,
            location: location,
            updatedAt: new Date()
        };

        // Only update image if provided
        if (image_url !== undefined) {
            updateData.image_url = image_url;
        }

        const result = await postsCollection.updateOne(
            { _id: new ObjectId(postId) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        return res.json({
            success: true,
            message: 'Post updated successfully'
        });

    } catch (err) {
        console.error('Update post error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

// DELETE /M01049109/contents/:postId - Delete a post
app.delete(`/${STUDENTID}/contents/:postId`, requireLogin, async (req, res) => {
    if (!postsCollection) {
        return res.json({ success: false, error: 'Database not connected' });
    }

    const { postId } = req.params;

    try {
        // Find the post and verify ownership
        const post = await postsCollection.findOne({ _id: new ObjectId(postId) });

        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        // Check if user owns the post
        if (post.userId !== req.session.userId) {
            return res.status(403).json({
                success: false,
                error: 'You can only delete your own posts'
            });
        }

        // Delete post
        const result = await postsCollection.deleteOne({ _id: new ObjectId(postId) });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        return res.json({
            success: true,
            message: 'Post deleted successfully'
        });

    } catch (err) {
        console.error('Delete post error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

// GET /M01049109/contents/my - Get current user's posts
app.get(`/${STUDENTID}/contents/my`, requireLogin, async (req, res) => {
    if (!postsCollection) {
        return res.json({ success: false, error: 'Database not connected' });
    }

    try {
        const myPosts = await postsCollection.find({
            userId: req.session.userId
        }).sort({ createdAt: -1 }).toArray();

        const posts = myPosts.map(post => ({
            id: post._id,
            userId: post.userId,
            userName: post.userName,
            userEmail: post.userEmail,
            caption: post.caption,
            location: post.location,
            image_url: post.image_url,
            createdAt: post.createdAt
        }));

        return res.json({
            success: true,
            count: posts.length,
            posts: posts
        });

    } catch (err) {
        console.error('Get my posts error:', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ============================================
// AI CHATBOT ENDPOINT (PRESET RESPONSES)
// ============================================
// POST /M01049109/ai/chat - Terra Developer Assistant Chatbot
// Helps users navigate the app with smart preset responses
// No external API required - works 100% offline
// ============================================

app.post(`/${STUDENTID}/ai/chat`, async (req, res) => {
    const { message } = req.body;

    // Validate required fields
    if (!message || !message.trim()) {
        return res.status(400).json({
            success: false,
            error: 'Message is required'
        });
    }

    try {
        console.log(`💬 Chatbot request: "${message.substring(0, 50)}..."`);

        const userMessage = message.trim().toLowerCase();
        let reply = '';

        // Smart keyword-based responses
        if (userMessage.includes('hello') || userMessage.includes('hi') || userMessage.includes('hey')) {
            reply = "Hey there! 👋 I'm Teri, your friendly guide to Terra Scenik! I can help you with posting, finding friends, navigating the app, and more. What would you like to know? 🌿";
        }
        else if (userMessage.includes('help')) {
            reply = "I'm here to help! 🌿 You can ask me about:\n- How to create posts\n- How to find and follow users\n- How to navigate the app\n- Where to find images\n- Profile settings\n\nWhat would you like to know?";
        }
        else if (userMessage.includes('post') && (userMessage.includes('create') || userMessage.includes('make') || userMessage.includes('how'))) {
            reply = "To create a post: 📸\n1. Click 'Create' in the sidebar (hover over TS logo)\n2. Upload a photo or search Unsplash\n3. Add a caption and location\n4. Click 'Share Post'!\n\nYour nature moment will be shared with your followers! 🌲";
        }
        else if (userMessage.includes('find') && (userMessage.includes('friend') || userMessage.includes('user') || userMessage.includes('people'))) {
            reply = "To find friends: 🔍\n1. Click 'Search' in the sidebar\n2. Type a name or email\n3. Click on their profile\n4. Hit the 'Follow' button!\n\nYou'll see their posts in your feed once you follow them! 🌿";
        }
        else if (userMessage.includes('feed') && userMessage.includes('empty')) {
            reply = "Empty feed? No worries! 📭\nYour feed shows posts from people you follow. To see content:\n1. Use Search to find users\n2. Follow them\n3. Their posts will appear in your feed!\n\nStart building your nature photography community! 🌍";
        }
        else if (userMessage.includes('follow') || userMessage.includes('unfollow')) {
            reply = "Following users: 👥\n- Visit any user's profile\n- Click 'Follow' to see their posts\n- Click 'Unfollow' to stop seeing their posts\n\nYour feed updates based on who you follow! 🌿";
        }
        else if (userMessage.includes('image') || userMessage.includes('photo') || userMessage.includes('picture')) {
            reply = "Getting images: 📷\n- **Upload**: Click 'Choose File' to upload from your device\n- **Unsplash**: Search millions of free nature photos by keyword\n\nBoth options work great for sharing beautiful nature moments! 🌄";
        }
        else if (userMessage.includes('profile') || userMessage.includes('edit')) {
            reply = "Profile settings: ⚙️\n- Click your profile pic in the top-right\n- Click 'Edit Profile' to update name, bio, or profile picture\n- View all your posts in one place\n- See who you're following\n\nMake it yours! 🌟";
        }
        else if (userMessage.includes('search')) {
            reply = "Using Search: 🔍\n- Find users by name or email\n- Search posts by caption or location\n- Click results to view profiles or posts\n\nDiscover amazing nature photography! 🌿";
        }
        else if (userMessage.includes('like')) {
            reply = "Liking posts: ❤️\nClick the heart icon on any post to like it! You can unlike by clicking the heart again. Show love to fellow nature photographers! 🌸";
        }
        else if (userMessage.includes('sidebar') || userMessage.includes('navigate') || userMessage.includes('menu')) {
            reply = "Navigation: 🧭\n- Hover over the 'TS' logo on the left to show the sidebar\n- Access Feed, Create, Search, and Profile\n- Click 'TS' logo anytime to return to feed\n- Your profile pic in the top-right goes to your profile\n\nEasy navigation! ✨";
        }
        else if (userMessage.includes('logout') || userMessage.includes('log out')) {
            reply = "To logout: 🚪\nClick the 'Logout' button in the sidebar (hover over TS logo). See you soon! 👋";
        }
        else if (userMessage.includes('unsplash')) {
            reply = "Unsplash Integration: 🖼️\nIn Create Post, switch to the Unsplash tab to search millions of free, high-quality nature photos. Just type a keyword and select the perfect image! 🌄";
        }
        else if (userMessage.includes('location')) {
            reply = "Adding location: 📍\nWhen creating a post, the location field helps others discover where your photo was taken. It's searchable too! Share your favorite spots! 🗺️";
        }
        else if (userMessage.includes('caption')) {
            reply = "Writing captions: ✍️\nShare the story behind your photo! Describe the scene, your experience, or the feeling you want to convey. Captions help connect with your audience! 🌿";
        }
        else if (userMessage.includes('thank')) {
            reply = "You're very welcome! 😊 I'm always here to help you explore Terra Scenik. Happy nature photography! 🌿📸\n- Teri";
        }
        else {
            // Default helpful response
            reply = "I'm Teri, your Terra Scenik guide! 🌿 I can help you with:\n\n• Creating and sharing posts 📸\n• Finding and following users 👥\n• Navigating the app 🧭\n• Profile settings ⚙️\n• Search features 🔍\n\nWhat would you like to know? Feel free to ask specific questions!";
        }

        console.log(`✅ Chatbot response generated (preset)`);

        return res.json({
            success: true,
            reply: reply
        });

    } catch (err) {
        console.error('❌ Chatbot error:', err.message);

        return res.status(500).json({
            success: false,
            error: 'Sorry, I encountered an error. Please try again.'
        });
    }
});

// GET /M01049109/test - Test endpoint (shows available routes)
app.get(`/${STUDENTID}/test`, (req, res) => {
    res.json({
        message: 'TravelConnect API is running!',
        studentId: STUDENTID,
        endpoints: [
            'POST /M01049109/users - Register',
            'GET /M01049109/users?q=search - Search users',
            'GET /M01049109/login - Check login status',
            'POST /M01049109/login - Login',
            'DELETE /M01049109/login - Logout',
            'POST /M01049109/contents - Create post',
            'GET /M01049109/contents?q=search - Search posts',
            'POST /M01049109/follow - Follow user',
            'DELETE /M01049109/follow - Unfollow user',
            'GET /M01049109/feed - Get feed',
            'GET /M01049109/following - Get following list',
            'PUT /M01049109/users/profile - Update profile',
            'PUT /M01049109/users/profile-picture - Update profile picture',
            'GET /M01049109/users/:email/profile - Get user profile',
            'POST /M01049109/ai/chat - AI Developer Assistant Chatbot'
        ]
    });
});

// === START SERVER ===

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log('===========================================');
        console.log('TERRA SCENIK SERVER ACTIVATED!');
        console.log(`Server URL: http://localhost:${PORT}`);
        console.log(`Student ID: ${STUDENTID}`);
        console.log('===========================================');
        console.log('📡 Server is listening for requests...');
        console.log('💡 Logs will appear below when requests are made');
        console.log('===========================================');
    });
}).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});