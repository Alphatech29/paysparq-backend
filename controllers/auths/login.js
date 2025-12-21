const { getUserByEmail, getUser, getClient, saveToken } = require("../../utilities/oauthModel");

// Helper to format dates in Africa/Lagos timezone
function formatDate(date) {
  return new Date(date).toLocaleString("en-US", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ✅ Helper to safely mask tokens in logs
function maskToken(token) {
  if (!token) return null;
  return `${token.slice(0, 6)}...${token.slice(-6)}`;
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    console.log("Login attempt:", { email, password: password ? "******" : null });

    if (!email || !password) {
      console.log("Missing credentials");
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    const userByEmail = await getUserByEmail(email);
    if (!userByEmail) {
      console.log("User email not found:", email);
      return res.status(401).json({ success: false, error: "User doesn't exist" });
    }

    const user = await getUser(email, password);
    if (!user) {
      console.log("Invalid password for:", email);
      return res.status(401).json({ success: false, error: "Invalid password" });
    }

    const client = await getClient("default-client");
    if (!client) {
      console.log("OAuth client not found");
      return res.status(500).json({ success: false, error: "OAuth client not found" });
    }

    const savedToken = await saveToken(client, user);
    if (!savedToken.success) {
      console.log("Failed to save token:", savedToken.error);
      return res.status(500).json({
        success: false,
        error: savedToken.error || "Failed to generate tokens",
      });
    }

    // Format expiry dates
    savedToken.data.accessTokenExpiresAt = formatDate(savedToken.data.accessTokenExpiresAt);
    savedToken.data.refreshTokenExpiresAt = formatDate(savedToken.data.refreshTokenExpiresAt);

    // ✅ Log safely with masked tokens
    console.log("Login successful response:", {
      success: true,
      user: {
        uid: user.uid || user.id,
        email: user.email,
      },
      tokens: {
        accessToken: maskToken(savedToken.data.accessToken),
        accessTokenExpiresAt: savedToken.data.accessTokenExpiresAt,
        refreshToken: maskToken(savedToken.data.refreshToken),
        refreshTokenExpiresAt: savedToken.data.refreshTokenExpiresAt,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user,
      tokens: savedToken.data,
    });

  } catch (err) {
    console.error("Login controller error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}

module.exports = { login };
