import axios from "../axios";
import { getAuth } from "firebase/auth";

export const addUserToDB = async () => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) return;

  try {
    await axios.post("/users", {
      uid: user.uid,
      email: user.email,
    });
    console.log("✅ User synced to backend");
  } catch (error) {
    console.error(
      "❌ Failed to sync user:",
      error.response?.data || error.message
    );
  }
};
