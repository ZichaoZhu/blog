import sharp from "sharp";

// Public paths bypass Astro's image pipeline. Keep the authored original and ship a small shared rendition.
await sharp("public/avatars/MyGirl.png")
	.resize({ width: 350, withoutEnlargement: true })
	.webp({ quality: 85 })
	.toFile("public/avatars/MyGirl.webp");
