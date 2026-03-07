const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* ---------------- Ensure Upload Folder Exists ---------------- */
const uploadDir = path.join(__dirname, "../uploads/images");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* ---------------- Storage ---------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    const ext = path.extname(file.originalname);

    cb(null, uniqueName + ext);
  },
});

/* ---------------- File Filter ---------------- */
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, WEBP images are allowed"), false);
  }
};

/* ---------------- Multer Instance ---------------- */
const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

/* ---------------- Smart Middleware ---------------- */
const upload = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";

  /* If request is not multipart/form-data, skip multer */
  if (!contentType.includes("multipart/form-data")) {
    return next();
  }

  /* Run multer only for form-data requests */
  return multerUpload.single("image")(req, res, next);
};

module.exports = upload;