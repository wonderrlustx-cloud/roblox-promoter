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
