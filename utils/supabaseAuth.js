const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

function hasSupabaseConfig() {
    return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

function getHeaders(accessToken) {
    const headers = {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken || SUPABASE_PUBLISHABLE_KEY}`,
    };

    return headers;
}

async function parseSupabaseResponse(response) {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message = data.msg || data.error_description || data.error || "Supabase request failed.";
        throw new Error(message);
    }

    return data;
}

async function signUpWithEmail({ email, password, username, emailRedirectTo }) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
            email,
            password,
            data: { username },
            ...(emailRedirectTo ? { redirect_to: emailRedirectTo } : {}),
        }),
    });

    return parseSupabaseResponse(response);
}

async function signInWithPassword({ email, password }) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ email, password }),
    });

    return parseSupabaseResponse(response);
}

async function fetchCurrentUser(accessToken) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: getHeaders(accessToken),
    });

    return parseSupabaseResponse(response);
}

module.exports = {
    hasSupabaseConfig,
    signUpWithEmail,
    signInWithPassword,
    fetchCurrentUser,
};
