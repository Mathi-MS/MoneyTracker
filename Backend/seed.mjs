import "dotenv/config";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI is required");

const UserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    email: { type: String, default: null },
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    profileImageUrl: { type: String, default: null },
  },
  { timestamps: true }
);

const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const existing = await UserModel.findOne({ id: "default-user" });
  if (existing) {
    console.log("User already exists, skipping seed.");
  } else {
    await UserModel.create({
      id: "default-user",
      email: "mathi@moneytracker.com",
      firstName: "mathi",
      lastName: "Gopal",
      profileImageUrl: null,
      username: "mathi",
      password: "Gopal@1002",
    });
    console.log("Dummy user created successfully!");
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
