import legacy from "./src/data/legacy-routes.json" with { type: "json" };

// Reuse the migration map for HTTP redirects, including original image URLs.
export const config = {
	framework: "astro",
	outputDirectory: "dist",
	installCommand: "pnpm install --frozen-lockfile",
	buildCommand:
		'if [ "$VERCEL_ENV" = "production" ]; then PUBLIC_SITE_MODE=production PUBLIC_SITE_ORIGIN=https://blog.blessingworld.cn pnpm build; else PUBLIC_SITE_MODE=preview PUBLIC_SITE_ORIGIN=http://127.0.0.1:4321 pnpm build; fi',
	trailingSlash: true,
	redirects: [
		...Object.entries(legacy.paths).map(([source, destination]) => ({
			source,
			destination,
			permanent: true,
		})),
		...Object.entries(legacy.images).map(([path, image]) => ({
			source: `/api/images/${path.replace(/[()]/g, "\\$&")}`,
			destination: image.original,
			permanent: true,
		})),
	],
};
