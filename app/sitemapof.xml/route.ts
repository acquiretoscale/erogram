/** Dead sitemap. The catch-all route answered 200 with an HTML page, so Google saw a soft 404. */
export async function GET() {
  return new Response(null, { status: 404 });
}
