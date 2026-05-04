import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Routes that don't require authentication.
 * Everything else is protected by Clerk session validation at the edge.
 */
const isPublicRoute = createRouteMatcher([
  "/",                    // Landing page
  "/sign-in(.*)",         // Clerk hosted sign-in
  "/sign-up(.*)",         // Clerk hosted sign-up
  "/account-type(.*)",    // Account type selection (post sign-up, pre-dashboard)
  "/upload/(.*)",         // Client bank-statement upload (token-auth, not Clerk)
  "/invitations/(.*)",    // Invitation acceptance (public link)
  "/api/upload/(.*)",     // Client upload API (token-auth, not Clerk)
  "/api/enquiries",       // Public contact form submission
  "/api/health",          // Health check (monitoring probes)
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimisation files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
