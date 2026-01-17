let cloudinary = null;
let storage = null;

try {
  cloudinary = require("cloudinary").v2;
  const { CloudinaryStorage } = require("multer-storage-cloudinary");

  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
  });

  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "wanderlust_DEV",
      allowed_formats: ["png", "jpg", "jpeg", "svg", "ico"],
    },
  });

  console.log("✅ Cloudinary connected successfully");
} catch (err) {
  console.log("❌ Cloudinary failed to load:", err.message);
}

module.exports = {
  cloudinary,
  storage,
};
