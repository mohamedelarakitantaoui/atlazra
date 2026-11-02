// Production only; dev retains Astro's image endpoint. Project pages are
// prerendered, and every Picture/getImage URL is a generated static asset.
export function GET() {
  return new Response(null, { status: 404 });
}
