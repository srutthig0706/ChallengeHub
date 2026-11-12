const mongoose = require("mongoose");

const communitySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Community name is required"],
            trim: true,
            minlength: [3, "Name must be at least 3 characters"],
            maxlength: [80, "Name cannot exceed 80 characters"],
        },
        description: {
            type: String,
            default: "",
            maxlength: [500, "Description cannot exceed 500 characters"],
        },
        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    },
    { timestamps: true }
);

module.exports = mongoose.model("Community", communitySchema);
