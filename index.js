const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("lapti-server");
    const collection = db.collection("users");
    const laptopsCollection = db.collection("laptops");

    // User Registration
    app.post("/api/v1/register", async (req, res) => {
      const { name, email, password } = req.body;

      // Check if email already exists
      const existingUser = await collection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await collection.insertOne({ name, email, password: hashedPassword });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/v1/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await collection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.EXPIRES_IN,
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
      });
    });

    // ==============================================================
    // WRITE YOUR CODE HERE

    app.get("/api/v1/laptops", async (req, res) => {
      const cursor = laptopsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/api/v1/laptops/:id", async (req, res) => {
      const id = req.params.id;
      const result = await laptopsCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // ==============================================================
    // Query Backend Is Start

    app.get("/api/v1/brand", async (req, res) => {
      const { brand, minPrice, maxPrice, rating } = req.query;
      let query = {};

      if (brand && brand !== "all-laptops") {
        query.brandName = { $regex: brand, $options: "i" };
      }

      if (minPrice || maxPrice) {
        query.regularPrice = {};
        if (minPrice) query.regularPrice.$gte = parseFloat(minPrice);
        if (maxPrice) query.regularPrice.$lte = parseFloat(maxPrice);
      }

      if (rating) {
        query.ratings = { $gte: parseFloat(rating) };
      }

      const brands = await laptopsCollection.find(query).toArray();

      res.send(brands);
    });

    // ==============================================================
    // Query Backend Is End

    app.post("/api/v1/laptop", async (req, res) => {
      const newLaptop = req.body;
      const result = await laptopsCollection.insertOne(newLaptop);
      res.send(result);
    });
    // ==============================================================

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
