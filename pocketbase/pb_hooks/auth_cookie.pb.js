/// <reference path="../pb_data/types.d.ts" />

// 1. Global Middleware: Intercept API requests and read the HttpOnly cookie
routerUse((e) => {
    // Only attempt to read cookie if the request has a dummy token or no token.
    // The frontend SDK sends "Bearer dummy_token"
    const authHeader = e.request.header.get("Authorization");
    if (authHeader && authHeader !== "Bearer dummy_token") {
        // Legitimate non-cookie auth (e.g., API scripts or external integrations)
        e.next();
        return;
    }

    try {
        const cookie = e.request.cookie("pb_auth");
        if (cookie && cookie.value) {
            // Overwrite the dummy token with the real token from the HttpOnly cookie.
            // PocketBase's native auth middleware will process this header downstream.
            e.request.header.set("Authorization", "Bearer " + cookie.value);
        }
    } catch (err) {
        // Ignore "http: named cookie not present" errors
    }
    
    e.next();
});

// 2. Auth Interceptor: When a user logs in, set the HttpOnly cookie
onRecordAuthRequest((e) => {
    if (e.token) {
        // e.httpContext has the response writer, but wait, `e.setCookie` is a method on `router.Event`?
        // Actually, we can just use `e.setCookie` since RecordAuthRequestEvent implements `router.Event`.
        // Let's create the cookie.
        
        // Use e.setCookie instead of creating a generic cookie because it's available on the event.
        // Wait, in JS pb_hooks we use `$os` or `new Cookie`?
        // It's `new Cookie({...})`
        e.setCookie(new Cookie({
            name:     "pb_auth",
            value:    e.token,
            secure:   e.isTLS(),  // Automatically true on HTTPS, false on HTTP
            sameSite: "Strict",
            httpOnly: true,
            path:     "/",
            maxAge:   86400 * 7   // 7 days
        }));
    }
    e.next();
});

// 3. Custom Logout Route: Clear the HttpOnly cookie
routerAdd("POST", "/api/logout", (e) => {
    e.setCookie(new Cookie({
        name:     "pb_auth",
        value:    "",
        secure:   e.isTLS(),
        sameSite: "Strict",
        httpOnly: true,
        path:     "/",
        maxAge:   -1          // -1 deletes the cookie immediately
    }));
    
    return e.json(200, { success: true });
});
