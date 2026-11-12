const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        username: {
            type: String,
            required: [true, "Username is required"],
            unique: true,
            trim: true,
            lowercase: true,
            minlength: [3, "Username must be at least 3 characters"],
            match: [/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters"],
        },
        profileImage: {
            type: String,
            default: "",
        },
        bio: {
            type: String,
            default: "",
            maxlength: [300, "Bio cannot exceed 300 characters"],
        },
    },
    { timestamps: true }
);

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function () {
    const { _id, name, username, email, profileImage, bio, createdAt, updatedAt } = this;
    return { _id, name, username, email, profileImage, bio, createdAt, updatedAt };
};

module.exports = mongoose.model("User", userSchema);
