const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");
const listingController = require("../controllers/listings.js");

const multer = require("multer");
const { storage } = require("../cloudConfig");

// ✅ Setup multer upload (Cloudinary if available, otherwise fallback)
let upload;

if (storage) {
  upload = multer({ storage });
} else {
  console.log("⚠️ Cloudinary storage not initialized, continuing without uploads.");
  upload = multer(); // fallback (no cloudinary)
}

router
  .route("/")
  .get(wrapAsync(listingController.index))
  .post(isLoggedIn, upload.single("listing[image]"), wrapAsync(listingController.createListing));

router.get("/new", isLoggedIn, listingController.renderNewForm);

router
  .route("/:id")
  .get(wrapAsync(listingController.showListing))
  .put(
    isLoggedIn,
    isOwner,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.updateListing)
  )
  .delete(isLoggedIn, isOwner, wrapAsync(listingController.destroyListing));

router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));

module.exports = router;
