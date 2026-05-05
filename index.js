import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ================= CONFIG =================
const GROUP_ID = 251509289;
const COOKIE = process.env.ROBLOX_COOKIE;

// ================= SAFETY =================
if (!COOKIE) {
  console.log("❌ Missing ROBLOX_COOKIE");
}

// ================= CSRF (FIXED RELIABILITY) =================
async function getCSRF() {
  const res = await fetch("https://auth.roblox.com/v2/logout", {
    method: "POST",
    headers: {
      Cookie: `.ROBLOSECURITY=${COOKIE}`
    }
  });

  return res.headers.get("x-csrf-token");
}

// ================= GET USER ROLE (FIXED SAFETY) =================
async function getUserRole(userId) {
  const res = await fetch(
    `https://groups.roblox.com/v1/users/${userId}/groups/roles`,
    {
      headers: {
        Cookie: `.ROBLOSECURITY=${COOKIE}`
      }
    }
  );

  const data = await res.json();

  if (!data?.data) return null;

  const group = data.data.find(g => g?.group?.id === GROUP_ID);
  return group ? group.role : null;
}

// ================= GET ROLES (FIXED HEADERS) =================
async function getGroupRoles() {
  const res = await fetch(
    `https://groups.roblox.com/v1/groups/${GROUP_ID}/roles`,
    {
      headers: {
        Cookie: `.ROBLOSECURITY=${COOKIE}`
      }
    }
  );

  const data = await res.json();
  return data.roles || [];
}

// ================= NEXT ROLE =================
function getNextRole(currentRole, roles) {
  const sorted = [...roles].sort((a, b) => a.rank - b.rank);

  const index = sorted.findIndex(r => r.id === currentRole.id);
  if (index === -1) return null;

  return sorted[index + 1] || null;
}

// ================= PROMOTE (HARDENED) =================
async function promoteUser(userId) {
  try {
    const csrf = await getCSRF();
    if (!csrf) {
      console.log("❌ Failed to get CSRF");
      return false;
    }

    const roles = await getGroupRoles();
    const currentRole = await getUserRole(userId);

    if (!currentRole) {
      console.log("❌ User not in group");
      return false;
    }

    const nextRole = getNextRole(currentRole, roles);

    if (!nextRole) {
      console.log("❌ Already max rank");
      return false;
    }

    const res = await fetch(
      `https://groups.roblox.com/v1/groups/${GROUP_ID}/users/${userId}`,
      {
        method: "PATCH",
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
      console.log("❌ ROBLOX FAILED:");
      console.log(text);
      return false;
    }

    console.log("✅ PROMOTED:", userId);
    return true;

  } catch (err) {
    console.log("❌ SERVER ERROR:", err);
    return false;
  }
}

// ================= ROUTE =================
app.post("/promote", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.json({ success: false });
  }

  const result = await promoteUser(userId);

  res.json({ success: result });
});

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
