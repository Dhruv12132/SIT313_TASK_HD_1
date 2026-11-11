const express = require("express");
const cors = require("cors");
require("dotenv").config();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { Resend } = require("resend");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

const serviceAccount = require("./Service.json");

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

// Check if the backend is working
app.get("/", (req, res) => {
    res.send("Backend is working");
});

// Check the login token
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Please log in first"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Your login has expired. Please log in again"
        });
    }
}

function optionalToken(req, res, next) {
    const authHeader = req.headers.authorization;

    // Allow visitors without a token
    if (!authHeader) {
        req.userId = null;
        return next();
    }

    if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Invalid login token"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.userId = decoded.userId;

        next();

    } catch (error) {
        return res.status(401).json({
            message: "Please log in again"
        });
    }
}

// Register a new user
app.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Please fill in all fields"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }

        const userEmail = email.trim().toLowerCase();

        const users = await db.collection("users")
            .where("email", "==", userEmail)
            .limit(1)
            .get();

        if (!users.empty) {
            return res.status(400).json({
                message: "Email is already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await db.collection("users").add({
            name: name.trim(),
            email: userEmail,
            password: hashedPassword,
            plan: "Free",
            role: "user"
        });

        res.status(201).json({
            message: "Signup successful",
            userId: user.id
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Something went wrong during signup"
        });
    }
});

// Log in a user
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Please enter email and password"
            });
        }

        const userEmail = email.trim().toLowerCase();

        const users = await db.collection("users")
            .where("email", "==", userEmail)
            .limit(1)
            .get();

        if (users.empty) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const userDoc = users.docs[0];
        const user = userDoc.data();

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            { userId: userDoc.id },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        );

        res.json({
            message: "Login successful",
            token: token,
            user: {
                id: userDoc.id,
                name: user.name,
                email: user.email,
                plan: user.plan || "Free",
                role: user.role || "user"
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Something went wrong during login"
        });
    }
});

// Get details of the logged-in user
app.get("/me", verifyToken, async (req, res) => {
    try {
        const userDoc = await db.collection("users")
            .doc(req.userId)
            .get();

        if (!userDoc.exists) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const user = userDoc.data();

       res.json({
            id: userDoc.id,
            name: user.name,
            email: user.email,
            plan: user.plan || "Free",
            role: user.role || "user"
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Could not get user details"
        });
    }
});


 // Upgrade the logged-in user's plan
app.post("/upgrade", verifyToken, async (req, res) => {
    try {
        const userRef = db.collection("users").doc(req.userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const user = userDoc.data();

        if (user.plan === "Paid") {
            return res.status(400).json({
                message: "You already have the Paid plan"
            });
        }

        await userRef.update({
            plan: "Paid"
        });

        res.json({
            message: "Your plan has been upgraded successfully",
            plan: "Paid"
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Could not upgrade your plan"
        });
    }
});


app.post("/posts", verifyToken, async (req, res) => {
    try {
        const { type, plan, title, description, abstract, articleText, tags } = req.body;

        if (!title || !title.trim() || !Array.isArray(tags)) {
            return res.status(400).json({
                message: "Please enter a title and tags"
            });
        }

        if (!["Free", "Paid"].includes(plan)) {
            return res.status(400).json({
                message: "Please select a valid post plan"
            });
}

        if (!["Question", "Article"].includes(type)) {
            return res.status(400).json({
                message: "Choose a valid post type"
            });
        }

        if (tags.length > 3 || tags.some((tag) => typeof tag !== "string" || !tag.trim())) {
            return res.status(400).json({
                message: "Please enter up to 3 valid tags"
            });
        }

        if (type === "Question" && (!description || !description.trim())) {
            return res.status(400).json({
                message: "Please describe your question"
            });
        }

        if (type === "Article" && (!abstract || !abstract.trim() || !articleText || !articleText.trim())) {
            return res.status(400).json({
                message: "Please complete the article"
            });
        }

        const userDoc = await db.collection("users").doc(req.userId).get();

        if (!userDoc.exists) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const user = userDoc.data();

        const newPost = {
            type: type,
            plan: plan,
            title: title.trim(),

            description: type === "Question" ? description.trim() : "",

            abstract: type === "Article" ? abstract.trim() : "",

            articleText: type === "Article" ? articleText.trim() : "",

            tags: tags.map((tag) => tag.trim()),

            author: user.name,
            authorId: req.userId,
            createdAt: new Date().toISOString()
        };

        const post = await db.collection("posts").add(newPost);

        res.status(201).json({
            message: "Post saved successfully",
            postId: post.id
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Could not save the post"
        });
    }
});

// Check whether the logged-in user is an admin
async function verifyAdmin(req, res, next) {
    try {
        const userDoc = await db.collection("users")
            .doc(req.userId)
            .get();

        if (!userDoc.exists) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const user = userDoc.data();

        if (user.role !== "admin") {
            return res.status(403).json({
                message: "Access denied. Admin only."
            });
        }

        next();

    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Could not verify admin access"
        });
    }
}

app.get("/admin-test", verifyToken, verifyAdmin, (req, res) => {
    res.json({
        message: "Welcome Admin! Access granted."
    });
});


// Get dashboard statistics for administrators

 // Get dashboard statistics
app.get("/admin/stats", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const snapshot = await db.collection("users").get();

        // Convert Firestore documents into user objects
        let users = snapshot.docs.map((doc) => {
            const user = doc.data();

            return {
                id: doc.id,
                role: (user.role || "user").toLowerCase(),
                plan: user.plan === "Paid" ? "Paid" : "Free"
            };
        });

        // Exclude admin accounts
        users = users.filter((user) => user.role !== "admin");

        // Calculate user statistics
        const totalUsers = users.length;

        const freeUsers = users.filter(
            (user) => user.plan === "Free"
        ).length;

        const paidUsers = users.filter(
            (user) => user.plan === "Paid"
        ).length;

        // Count all posts
        const postsSnapshot = await db.collection("posts").get();
        const totalPosts = postsSnapshot.size;

        res.json({
            totalUsers,
            totalPosts,
            freeUsers,
            paidUsers
        });

    } catch (error) {
        console.log("Admin stats error:", error);

        res.status(500).json({
            message: "Could not load dashboard statistics"
        });
    }
});


 // Get all posts for the admin dashboard
app.get("/admin/posts", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const search = (req.query.search || "").toLowerCase();
        const planFilter = req.query.plan || "All";

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 10;

        // Get all posts from Firestore
        const snapshot = await db.collection("posts").get();

        let posts = snapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
            plan: doc.data().plan || "Free"
        }));

        // Filter posts according to Free or Paid plan
        if (planFilter !== "All") {
            posts = posts.filter(
                (post) => post.plan === planFilter
            );
        }

        // Search posts by title
        if (search) {
            posts = posts.filter((post) =>
                String(post.title || "")
                    .toLowerCase()
                    .includes(search)
            );
        }

        // Show newest posts first
        posts.sort((a, b) => {
            return new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime();
        });

        const totalPosts = posts.length;
        const totalPages = Math.ceil(totalPosts / limit);

        // Get posts for the selected page
        const startIndex = (page - 1) * limit;

        const paginatedPosts = posts.slice(
            startIndex,
            startIndex + limit
        );

        res.json({
            posts: paginatedPosts,
            totalPosts: totalPosts,
            currentPage: page,
            totalPages: totalPages,
            limit: limit
        });

    } catch (error) {
        console.log("Admin posts error:", error);

        res.status(500).json({
            message: "Could not fetch admin posts"
        });
    }
});


// Delete a post from the admin dashboard
app.delete("/admin/posts/:postId", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const postId = req.params.postId;

        const postRef = db.collection("posts").doc(postId);
        const postDoc = await postRef.get();

        if (!postDoc.exists) {
            return res.status(404).json({
                message: "Post not found"
            });
        }

        await postRef.delete();

        res.json({
            message: "Post deleted successfully",
            postId: postId
        });

    } catch (error) {
        console.log("Delete post error:", error);

        res.status(500).json({
            message: "Could not delete post"
        });
    }
});


// Get all users for the admin dashboard

// Get all registered users for the admin dashboard
app.get("/admin/users", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const search = (req.query.search || "").toLowerCase();
        const planFilter = req.query.plan || "All";

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 10;

        const snapshot = await db.collection("users").get();

        let users = snapshot.docs.map((doc) => {
            const user = doc.data();

            return {
                id: doc.id,
                name: user.name || "Unknown",
                email: user.email || "",
                plan: user.plan || "Free",
                role: (user.role || "user").toLowerCase()
            };
        });

        // Exclude admin accounts from the users list
        users = users.filter((user) => user.role !== "admin");

        // Filter users by subscription plan
        if (planFilter !== "All") {
            users = users.filter((user) => user.plan === planFilter);
        }

        // Search users by name or email
        if (search) {
            users = users.filter((user) =>
                user.name.toLowerCase().includes(search) ||
                user.email.toLowerCase().includes(search)
            );
        }

        // Sort users alphabetically
        users.sort((a, b) => a.name.localeCompare(b.name));

        // Calculate pagination after filtering
        const totalUsers = users.length;
        const totalPages = Math.ceil(totalUsers / limit);

        const startIndex = (page - 1) * limit;
        const paginatedUsers = users.slice(startIndex, startIndex + limit);

        res.json({
            users: paginatedUsers,
            totalUsers,
            currentPage: page,
            totalPages,
            limit
        });

    } catch (error) {
        console.log("Admin users error:", error);
        res.status(500).json({
            message: "Could not fetch users"
        });
    }
});


// Get posts according to the user's subscription plan
app.get("/posts", optionalToken, async (req, res) => {
    try {
        let userPlan = "Visitor";
        let userRole = "visitor";
// Get the logged-in user's subscription plan and role
if (req.userId) {
    const userDoc = await db.collection("users")
        .doc(req.userId)
        .get();

    if (!userDoc.exists) {
        return res.status(404).json({
            message: "User not found"
        });
    }

    const userData = userDoc.data();

    userPlan = userData.plan || "Free";
    userRole = userData.role || "user";
}

        // Get pagination and filter values
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 5;

        const search = (req.query.search || "").toLowerCase();
        const typeFilter = req.query.type || "All";
        const planFilter = req.query.plan || "All";
        const tagFilter = (req.query.tag || "").toLowerCase();
        const dateFilter = req.query.date || "";
        const sortOrder = req.query.sort || "newest";

        const postsRef = db.collection("posts");

        // Check whether the user is using any filters
        const hasFilters =
            search ||
            typeFilter !== "All" ||
            planFilter !== "All" ||
            tagFilter ||
            dateFilter;

        // NORMAL BROWSING: Use Firestore cursor pagination
        if (!hasFilters) {
            let postsQuery = postsRef;

            // Visitors and Free users can only see Free posts
            if (userRole !== "admin" && userPlan !== "Paid") {
                postsQuery = postsQuery.where("plan", "==", "Free");
            }

            // Choose the order of posts
            const direction = sortOrder === "oldest" ? "asc" : "desc";

            postsQuery = postsQuery.orderBy("createdAt", direction);

            // Count the total number of posts
            const countResult = await postsQuery.count().get();
            const totalPosts = countResult.data().count;
            const totalPages = Math.ceil(totalPosts / limit);

            // Find the last post from the previous page
            const cursorId = req.query.cursor;

            if (cursorId) {
                const cursorDoc = await postsRef.doc(cursorId).get();

                if (!cursorDoc.exists) {
                    return res.status(400).json({
                        message: "Invalid pagination cursor"
                    });
                }

                postsQuery = postsQuery.startAfter(cursorDoc);
            }

            // Get five posts, plus one extra to check if another page exists
            const snapshot = await postsQuery.limit(limit + 1).get();

            const hasMore = snapshot.docs.length > limit;
            const pageDocs = snapshot.docs.slice(0, limit);

            const posts = pageDocs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
                plan: doc.data().plan || "Free"
            }));

            res.json({
                userPlan: userRole === "admin" ? "Admin" : userPlan,
                posts: posts,
                currentPage: page,
                totalPages: totalPages,
                totalPosts: totalPosts,
                limit: limit,
                hasMore: hasMore,
                nextCursorId: pageDocs.length
                    ? pageDocs[pageDocs.length - 1].id
                    : null,
                paginationMode: "cursor"
            });

            return;
        }

        // FILTERED SEARCH: Check the full eligible collection
        const snapshot = await postsRef.get();

        let visiblePosts = snapshot.docs.map((doc) => {
            const postData = doc.data();

            return {
                ...postData,
                id: doc.id,
                plan: postData.plan || "Free"
            };
        });

        // Apply subscription access
        if (userRole !== "admin" && userPlan !== "Paid") {
            visiblePosts = visiblePosts.filter(
                (post) => post.plan === "Free"
            );
        }

        // Apply all selected filters
        visiblePosts = visiblePosts.filter((post) => {

            if (
                search &&
                !String(post.title || "").toLowerCase().includes(search)
            ) {
                return false;
            }

            if (
                typeFilter !== "All" &&
                post.type !== typeFilter
            ) {
                return false;
            }

            if (
                planFilter !== "All" &&
                post.plan !== planFilter
            ) {
                return false;
            }

            if (tagFilter) {
                const tags = Array.isArray(post.tags) ? post.tags : [];

                const hasTag = tags.some((tag) =>
                    String(tag).toLowerCase().includes(tagFilter)
                );

                if (!hasTag) {
                    return false;
                }
            }

            if (
                dateFilter &&
                String(post.createdAt || "").slice(0, 10) !== dateFilter
            ) {
                return false;
            }

            return true;
        });

        // Sort the matching posts
        visiblePosts.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime() || 0;
            const dateB = new Date(b.createdAt).getTime() || 0;

            if (sortOrder === "oldest") {
                return dateA - dateB;
            }

            return dateB - dateA;
        });

        // Calculate the filtered page results
        const totalPosts = visiblePosts.length;
        const totalPages = Math.ceil(totalPosts / limit);

        const currentPage = Math.min(page, Math.max(totalPages, 1));
        const startIndex = (currentPage - 1) * limit;

        const paginatedPosts = visiblePosts.slice(
            startIndex,
            startIndex + limit
        );

        res.json({
            userPlan: userRole === "admin" ? "Admin" : userPlan,
            posts: paginatedPosts,
            currentPage: currentPage,
            totalPages: totalPages,
            totalPosts: totalPosts,
            limit: limit,
            paginationMode: "filtered"
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Could not fetch posts"
        });
    }
});


// Newsletter subscription
app.post("/subscribe", async (req, res) => {
    try {
        const email = req.body.email;

        if (!email) {
            return res.status(400).send("Email is required");
        }

        const { error } = await resend.emails.send({
            from: "onboarding@resend.dev",
            to: email,
            subject: "Welcome to DEV@Deakin!",
            html: "<h1>Welcome to DEV@Deakin!</h1>"
        });

        if (error) {
            console.log(error);
            return res.status(500).send("Failed to send email");
        }

        res.send("Email sent successfully");
    } catch (error) {
        console.log(error);
        res.status(500).send("Failed to send email");
    }
});

app.listen(port, () => {
    console.log("Server is running on port " + port);
});
