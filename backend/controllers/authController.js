const jwt = require("jsonwebtoken");
const User = require("../models/User");

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
};

const register = async (req, res) => {
    try {
        const { name, username, email, password, confirmPassword } = req.body;

        if (!name || !username || !email || !password || !confirmPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const emailExists = await User.findOne({ email: email.toLowerCase() });
        if (emailExists) {
            return res.status(409).json({ message: "Email is already registered" });
        }

        const usernameExists = await User.findOne({ username: username.toLowerCase() });
        if (usernameExists) {
            return res.status(409).json({ message: "Username is already taken" });
        }

        const user = await User.create({ name, username, email, password });

        const token = generateToken(user._id);

        res.status(201).json({
            message: "Registration successful",
            token,
            user: user.toSafeObject(),
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ message: messages[0] });
        }
        console.error("Registration error:", error);
        res.status(500).json({ message: "Server error during registration", detail: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ message: "Identifier and password are required" });
        }

        const isEmail = identifier.includes("@");
        const query = isEmail
            ? { email: identifier.toLowerCase() }
            : { username: identifier.toLowerCase() };

        const user = await User.findOne(query);

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = generateToken(user._id);

        res.status(200).json({
            message: "Login successful",
            token,
            user: user.toSafeObject(),
        });
    } catch (error) {
        res.status(500).json({ message: "Server error during login" });
    }
};

const getMe = async (req, res) => {
    res.status(200).json({ user: req.user.toSafeObject() });
};

module.exports = { register, login, getMe };
