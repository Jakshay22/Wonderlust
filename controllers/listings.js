const Listing = require("../models/listing");
const Review = require("../models/review");

const CATEGORY_KEYWORDS = {
    trending: ["trending", "popular", "modern", "luxury", "featured", "hot", "famous"],
    rooms: ["room", "suite", "studio", "apartment", "stay", "loft", "villa", "home"],
    cities: ["city", "downtown", "metro", "urban", "tokyo", "mumbai", "paris", "new york", "london", "dubai"],
    mountains: ["mountain", "hill", "valley", "himalaya", "alps", "cliff", "peak"],
    castles: ["castle", "fort", "palace", "heritage", "royal"],
    pools: ["pool", "swim", "waterfront", "lagoon", "lakefront"],
    camping: ["camp", "tent", "glamp", "forest", "wild", "nature"],
    farms: ["farm", "barn", "orchard", "cottage", "vineyard", "ranch"],
    arctic: ["snow", "ice", "igloo", "arctic", "northern", "glacier", "aurora"],
};

const CATEGORY_LABELS = {
    trending: "Trending",
    rooms: "Rooms",
    cities: "Cities",
    mountains: "Mountains",
    castles: "Castles",
    pools: "Amazing pools",
    camping: "Camping",
    farms: "Farms",
    arctic: "Arctic",
};

function inferCategories(listing) {
    const haystack = [
        listing.category,
        listing.title,
        listing.description,
        listing.location,
        listing.country,
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    const matches = Object.entries(CATEGORY_KEYWORDS)
        .filter(([, keywords]) => keywords.some((keyword) => haystack.includes(keyword)))
        .map(([category]) => category);

    if (listing.category && CATEGORY_LABELS[listing.category] && !matches.includes(listing.category)) {
        matches.unshift(listing.category);
    }

    if (matches.length === 0) {
        matches.push("trending");
    }

    return [...new Set(matches)];
}

function decorateListing(listing) {
    const categories = inferCategories(listing);

    return {
        ...listing.toObject(),
        displayCategories: categories,
        displayCategoryLabels: categories.map((category) => CATEGORY_LABELS[category] || category),
        primaryCategory: categories[0],
    };
}

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
    const { q = "", category = "" } = req.query;
    const searchQuery = q.trim();
    const categoryQuery = category.trim().toLowerCase();

    const searchFilter = searchQuery
        ? {
            $or: [
                { title: { $regex: searchQuery, $options: "i" } },
                { description: { $regex: searchQuery, $options: "i" } },
                { location: { $regex: searchQuery, $options: "i" } },
                { country: { $regex: searchQuery, $options: "i" } },
            ],
        }
        : {};

    const listings = await Listing.find(searchFilter);
    let allListings = listings.map(decorateListing);

    if (categoryQuery && CATEGORY_LABELS[categoryQuery]) {
        allListings = allListings.filter((listing) => listing.displayCategories.includes(categoryQuery));
    }

    res.render("listings/index.ejs", {
        allListings,
        currentSearch: searchQuery,
        currentCategory: categoryQuery,
        categoryLabels: CATEGORY_LABELS,
    });
}



module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs", { categoryLabels: CATEGORY_LABELS });
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
        
        const listingCategories = inferCategories(listing);
        const decoratedListing = {
            ...listing.toObject(),
            displayCategories: listingCategories,
            displayCategoryLabels: listingCategories.map((category) => CATEGORY_LABELS[category] || category),
        };
        
        res.render("listings/show.ejs", { listing: decoratedListing, booked: req.query.booked === "1" });
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

    req.flash("success", "Booking confirmed!");
    res.redirect(`/listings/${id}?booked=1`);
}

module.exports.createListing = async (req, res, next) => {
    const newListing = new Listing(req.body.listing);
    if (!newListing.category) {
        newListing.category = inferCategories(newListing)[0];
    }
    if (res.locals.currUser && res.locals.currUser._id) {
        newListing.owner = res.locals.currUser._id;
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
        return res.redirect("/listings");
    }
    
    let originalImageUrl = listing.image?.url || "https://via.placeholder.com/600x400?text=No+Image";
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
    res.render("listings/edit.ejs", { listing, originalImageUrl, categoryLabels: CATEGORY_LABELS });
}

module.exports.updateListing = async (req, res) => {
    let {id} = req.params;
    let listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    Object.assign(listing, req.body.listing);

    if (!req.body.listing.category) {
        listing.category = inferCategories({ ...listing.toObject(), ...req.body.listing })[0];
    }

    if(typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename };
    }
    await listing.save();

    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
}

module.exports.destroyListing = async (req, res) => {
    let {id} = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
}
