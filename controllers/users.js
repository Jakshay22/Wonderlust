const User = require("../models/user.js");
const { fetchCurrentUser, hasSupabaseConfig, signInWithPassword, signUpWithEmail } = require("../utils/supabaseAuth.js");

function normalizeUsername(username = "", email = "") {
    const fallback = email.split("@")[0] || "traveler";
    return (username || fallback).trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+|_+$/g, "") || "traveler";
}

async function getUniqueUsername(baseUsername) {
    let username = baseUsername;
    let counter = 1;

    while (await User.exists({ username })) {
        username = `${baseUsername}_${counter}`;
        counter += 1;
    }

    return username;
}

async function syncLocalUser(supabaseUser, preferredUsername) {
    let user = null;

    if (supabaseUser.id) {
        user = await User.findOne({ supabaseId: supabaseUser.id });
    }

    if (!user && supabaseUser.email) {
        user = await User.findOne({ email: supabaseUser.email });
    }

    const baseUsername = normalizeUsername(preferredUsername || supabaseUser.user_metadata?.username, supabaseUser.email);

    if (!user) {
        const username = await getUniqueUsername(baseUsername);
        user = await User.create({
            email: supabaseUser.email,
            username,
            supabaseId: supabaseUser.id,
        });
    } else {
        if (!user.supabaseId && supabaseUser.id) {
            user.supabaseId = supabaseUser.id;
        }
        if (!user.username) {
            user.username = await getUniqueUsername(baseUsername);
        }
        if (!user.email) {
            user.email = supabaseUser.email;
        }
        await user.save();
    }

    return user;
}

function persistSession(req, user, sessionData = {}) {
    req.session.localUserId = user._id.toString();
    req.session.supabaseUserId = sessionData.user?.id || user.supabaseId || null;
    req.session.supabaseAccessToken = sessionData.access_token || null;
    req.session.supabaseRefreshToken = sessionData.refresh_token || null;
}

function normalizeAuthPayload(payload = {}) {
    const nested = payload.data || {};
    const user = payload.user || nested.user || (payload.email && payload.id ? payload : null);
    const session = payload.session || nested.session || (payload.access_token ? payload : null);

    return { user, session };
}

module.exports.renderSignupForm = (req, res) => {
    res.render("users/signup.ejs", { supabaseEnabled: hasSupabaseConfig() });
}

module.exports.signup = async (req, res) => {
    try {
        if (!hasSupabaseConfig()) {
            req.flash("error", "Supabase keys are missing. Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to use signup.");
            return res.redirect("/signup");
        }

        let { username, email, password } = req.body;
        const data = await signUpWithEmail({
            username,
            email,
            password,
        });

        const { user, session } = normalizeAuthPayload(data);

        if (!user) {
            req.flash("error", "Signup could not be completed.");
            return res.redirect("/signup");
        }

        if (session) {
            const localUser = await syncLocalUser(user, username);
            persistSession(req, localUser, session);
            req.flash("success", "Welcome to Wonderlust!");
            return res.redirect("/listings");
        }

        req.flash("success", "Account created. Please verify your email in Supabase, then log in.");
        res.redirect("/login");
    } catch(e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }
}

module.exports.renderLoginForm = (req, res) => {
    res.render("users/login.ejs", { supabaseEnabled: hasSupabaseConfig() });
}

module.exports.login = async(req, res) => {
    if (!hasSupabaseConfig()) {
        req.flash("error", "Supabase keys are missing. Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to use login.");
        return res.redirect("/login");
    }

    const { email, password } = req.body;
    const loginResponse = await signInWithPassword({ email, password });
    const { user, session } = normalizeAuthPayload(loginResponse);

    if (!session?.access_token) {
        req.flash("error", "Login could not be completed.");
        return res.redirect("/login");
    }

    const supabaseUser = user || await fetchCurrentUser(session.access_token);
    const localUser = await syncLocalUser(supabaseUser);

    persistSession(req, localUser, session);
    req.flash("success", "Welcome back to Wanderlust!");
    let redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
}

module.exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            req.flash("error", "Unable to log out right now.");
            return res.redirect("/listings");
        }

        res.clearCookie("connect.sid");
        res.redirect("/listings");
    });
}
