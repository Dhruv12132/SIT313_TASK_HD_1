
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
            plan: "Free"
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
                plan: user.plan || "Free"
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
            plan: user.plan || "Free"
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

// Get posts according to the user's subscription plan
app.get("/posts", optionalToken, async (req, res) => {
    try {

        let userPlan = "Visitor";

        // Check the actual subscription from Firestore
        if (req.userId) {

            const userDoc = await db.collection("users")
                .doc(req.userId)
                .get();

            if (!userDoc.exists) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            const user = userDoc.data();

            userPlan = user.plan || "Free";
        }

        // Fetch posts inside the backend
        const snapshot = await db.collection("posts").get();

        const allPosts = snapshot.docs.map((doc) => {
            const postData = doc.data();

            return {
                ...postData,
                id: doc.id,
                plan: postData.plan || "Free"
            };
        });

        // Decide which posts the user is allowed to see
        let visiblePosts;

        if (userPlan === "Paid") {

            visiblePosts = allPosts;

        } else {

            visiblePosts = allPosts.filter(
                (post) => post.plan === "Free"
            );
        }

        // Display newest posts first
        visiblePosts.sort((a, b) => {
            return new Date(b.createdAt).getTime() -
                   new Date(a.createdAt).getTime();
        });

        res.json({
            userPlan: userPlan,
            posts: visiblePosts
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
