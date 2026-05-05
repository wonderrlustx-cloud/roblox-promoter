import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ================= CONFIG =================
const GROUP_ID = 251509289; // change THIS only on server
const COOKIE = process.env.ROBLOX_COOKIE;

// ================= SAFETY =================
if (!COOKIE) {
  console.log("❌ Missing ROBLOX_COOKIE in Render environment");
}

// ================= CSRF =================
async function getCSRF() {
  const res = await fetch("https://auth.roblox.com/v2/logout", {
    method: "POST",
    headers: {
      Cookie: `.ROBLOSECURITY=${COOKIE}`
    }
  });

  return res.headers.get("x-csrf-token");
}

// ================= GET USER ROLE =================
async function getUserRole(userId) {
  const res = await fetch(
    `https://groups.roblox.com/v1/users/${userId}/groups/roles`
  );

  const data = await res.json();

  const group = data.data.find(g => g.group.id === GROUP_ID);
  return group ? group.role : null;
}

// ================= GET GROUP ROLES =================
async function getGroupRoles() {
  const res = await fetch(
    `https://groups.roblox.com/v1/groups/${GROUP_ID}/roles`
  );

  const data = await res.json();
  return data.roles;
}

// ================= NEXT ROLE =================
function getNextRole(currentRole, roles) {
  const sorted = roles.sort((a, b) => a.rank - b.rank);

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].id === currentRole.id) {
      return sorted[i + 1] || null;
    }
  }

  return null;
}

// ================= PROMOTE =================
async function promoteUser(userId) {
  try {
    const csrf = await getCSRF();
    if (!csrf) return false;

    const [roles, currentRole] = await Promise.all([
      getGroupRoles(),
      getUserRole(userId)
    ]);

    if (!currentRole) {
      console.log("User not in group");
      return false;
    }

    const nextRole = getNextRole(currentRole, roles);

    if (!nextRole) {
      console.log("Already max rank");
      return false;
    }

    const res = await fetch(
      `https://groups.roblox.com/v1/groups/${GROUP_ID}/users/${userId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrf,
          Cookie: `.ROBLOSECURITY=${COOKIE}`
        },
        body: JSON.stringify({
          roleId: nextRole.id
        })
      }
    );

    const text = await res.text();

    if (!res.ok) {
      console.log("ROBLOX ERROR:", text);
      return false;
    }

    return true;
  } catch (err) {
    console.log("ERROR:", err);
    return false;
  }
}

// ================= ROUTE =================
app.post("/promote", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.json({ success: false, error: "Missing userId" });
  }

  const result = await promoteUser(userId);

  res.json({
    success: result
  });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
