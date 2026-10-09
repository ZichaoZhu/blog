import { defineMiddleware } from 'astro:middleware';
export const onRequest = defineMiddleware(async (_context, next) => {
 const response = await next();
 response.headers.set('cache-control', 'private, no-store');
 response.headers.set('x-robots-tag', 'noindex, nofollow');
 response.headers.set('referrer-policy', 'same-origin');
 response.headers.set('x-content-type-options', 'nosniff');
 return response;
});
