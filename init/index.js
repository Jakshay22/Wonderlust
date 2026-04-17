// 3 initialize Database

if(process.env.NODE_ENV != "production") {
  require('dotenv').config();
}

const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const Review = require("../models/review.js");

const dbUrl = process.env.ATLASDB_URL;

main().then(() => {
  console.log("connected to DB");
}).catch((err) => {
  console.log(err);
});

async function main() {
  await mongoose.connect(dbUrl);
}

const initDB = async () => {
  await Review.deleteMany({});
  await Listing.deleteMany({});
  const listingsWithOwner = initData.data.map((obj) => ({ ...obj, owner: "65f498de938bbbafdcf350b8" }));
  const insertedListings = await Listing.insertMany(listingsWithOwner);

  const randomUsernames = [
    "anonymous_traveler", "hidden_nomad", "mystery_guest", "ghost_wanderer", "silent_roamer",
    "unknown_backpacker", "masked_explorer", "incognito_tourist", "quiet_visitor", "private_tripster"
  ];

  const randomComments = [
    "Very smooth stay and great host communication.",
    "Location was perfect and easy to access.",
    "Loved the vibe, exactly as shown in photos.",
    "Clean room and peaceful surroundings.",
    "Would happily book this place again.",
    "Comfortable stay with all basic amenities.",
    "Great value for money for this location.",
    "Had a great weekend here, recommended.",
    "Check-in was simple and stress-free.",
    "Beautiful place and super cozy at night."
  ];

  for (let listing of insertedListings) {
    const numberOfReviews = Math.floor(Math.random() * 3) + 2; // 2 to 4 reviews
    const reviewIds = [];

    for (let i = 0; i < numberOfReviews; i++) {
      const randomUsername = randomUsernames[Math.floor(Math.random() * randomUsernames.length)];
      const randomComment = randomComments[Math.floor(Math.random() * randomComments.length)];
      const randomRating = Math.floor(Math.random() * 2) + 4; // 4 to 5

      const anonymousReview = new Review({
        anonymousName: `${randomUsername}_${Math.floor(Math.random() * 1000)}`,
        comment: randomComment,
        rating: randomRating,
      });

      await anonymousReview.save();
      reviewIds.push(anonymousReview._id);
    }

    listing.reviews = reviewIds;
    await listing.save();
  }

  console.log("data was initialized");
}

// initDB();