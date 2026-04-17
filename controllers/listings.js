const Listing = require("../models/listing");
const Review = require("../models/review");
const ExpressError = require("../utils/ExpressError.js");
const { listingSchema } = require("../schema.js");

const randomUsernames = [
    "anonymous_traveler", "hidden_nomad", "mystery_guest", "ghost_wanderer", "silent_roamer",
    "unknown_backpacker", "masked_explorer", "incognito_tourist", "quiet_visitor", "private_tripster",
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
    "Beautiful place and super cozy at night.",
];

module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });  // keep the variable as "allListings"
}



module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
}

module.exports.showListing = async (req, res) => {
    let {id} = req.params;
    let listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author",
            },
        })
        .populate("owner");
        if (!listing) {
            req.flash("error", "Listing you requested for does not exist!");
            return res.redirect("/listings");
        }

        if (!listing.reviews || listing.reviews.length === 0) {
            const generatedReviewIds = [];
            for (let i = 0; i < 3; i++) {
                const randomUsername = randomUsernames[Math.floor(Math.random() * randomUsernames.length)];
                const randomComment = randomComments[Math.floor(Math.random() * randomComments.length)];
                const randomRating = Math.floor(Math.random() * 2) + 4;
                const seededReview = new Review({
                    anonymousName: `${randomUsername}_${Math.floor(Math.random() * 1000)}`,
                    comment: randomComment,
                    rating: randomRating,
                });
                await seededReview.save();
                generatedReviewIds.push(seededReview._id);
            }

            listing.reviews = generatedReviewIds;
            await listing.save();

            listing = await Listing.findById(id)
                .populate({
                    path: "reviews",
                    populate: {
                        path: "author",
                    },
                })
                .populate("owner");
        }
        
        res.render("listings/show.ejs", { listing, booked: req.query.booked === "1" });
}

module.exports.renderBookingPage = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    res.render("listings/book.ejs", { listing });
}

module.exports.confirmBooking = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    req.flash("success", "booked");
    res.redirect(`/listings/${id}?booked=1`);
}

module.exports.createListing = async (req, res, next) => {
    const newListing = new Listing(req.body.listing);
    if (req.user && req.user._id) {
        newListing.owner = req.user._id;
    }
    if (req.file) {
        let url = req.file.path;
        let filename = req.file.filename;
        newListing.image = { url, filename };
    } else {
        newListing.image = {
            url: "https://via.placeholder.com/600x400?text=No+Image",
            filename: "no-image",
        };
    }
    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
}

module.exports.renderEditForm = async (req, res) => {
    let {id} = req.params;
    const listing = await Listing.findById(id);
    if(!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        res.redirect("/listings");
    }
    
    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
    res.render("listings/edit.ejs", { listing, originalImageUrl });
}

module.exports.updateListing = async (req, res) => {
    let {id} = req.params;
    let listing = await Listing.findByIdAndUpdate(id, {...req.body.listing});

    if(typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename };
        await listing.save();
    }

    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
}

module.exports.destroyListing = async (req, res) => {
    let {id} = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
}