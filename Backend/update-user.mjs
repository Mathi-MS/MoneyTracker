import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI is required");

async function update() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const hashedPassword = await bcrypt.hash("Gopal@1002", 10);

  const result = await mongoose.connection.collection("users").updateOne(
    { id: "default-user" },
    { $set: { username: "mathi", password: hashedPassword } }
  );

  console.log("Updated:", result.modifiedCount, "document(s)");
  await mongoose.disconnect();
  process.exit(0);
}

update().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
