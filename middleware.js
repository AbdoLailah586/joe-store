export const config = {
  matcher: ['/product/:path*']
};

export default function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const isCrawler = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|applebot|bingbot|google-structured-data-testing-tool/i.test(userAgent);

  if (isCrawler) {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const productId = parts[1]; // Extracts product ID from /product/:id
    if (productId) {
      url.pathname = '/api/og-product';
      url.searchParams.set('id', productId);
      return Response.redirect(url, 307);
    }
  }
}
