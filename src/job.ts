// keepAlive.ts
import axios from "axios";

const URL = "https://playground-c9lc.onrender.com/health";

export const keepAlive = async () => {
  try {
    const res = await axios.get(URL);
    console.log("✅ Keep-alive success:", res.status);
  } catch (err: any) {
    console.error("❌ Keep-alive failed:", err.message);
  }
};