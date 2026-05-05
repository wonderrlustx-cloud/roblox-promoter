import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ================= CONFIG =================
const GROUP_ID = 36059759;
const COOKIE = process.env.ROBLOX_COOKIE;

// ================= CHECK COOKIE =================
if (!COOKIE) {
  console.log("❌ Missing ROBLOX_COOKIE in environment variables");
}

// ================= GET CSRF TOKEN =================
async function getCSRF() {
  const res = await fetch("https://auth.roblox.com/v2/logout", {
    method: "POST",
    headers: {
      Cookie: `.ROBLOSECURITY=${COOKIE}`
    }
  });

  return res.headers.get("x-csrf-token");
}

// ================= PROMOTE USER =================
async function promoteUser(userId) {
  try {
    const csrf = await getCSRF();
    if (!csrf) return false;

    const res = await fetch(
      `https://groups.roblox.com/v1/groups/${GROUP_ID}/users/${userId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrf,
          Cookie: `.ROBLOSECURITY=${COOKIE}`
        },
        body: JSON.stringify({})
      }
    );

    return res.ok;
  } catch (err) {
    console.log("Error:", err);
    return false;
  }
}

// ================= ROUTE =================
app.post("/promote", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.json({ success: false, error: "No userId provided" });
  }

  const result = await promoteUser(userId);

  res.json({
    success: result
  });
});

// ================= START SERVER =================
app.listen(3000, () => {
  console.log("🚀 Promotion server running on port 3000");
});
