const { getUserByUid } = require("../../utilities/users");

const getUserController = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access"
      });
    }

    const { uid } = req.user;

    const user = await getUserByUid(uid);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: user
    });

  } catch (error) {
    console.error("Get user controller error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching user"
    });
  }
};

module.exports = {
  getUserController
};