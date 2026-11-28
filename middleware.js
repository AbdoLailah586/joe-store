export const config = {
  matcher: ['/product/:path*', '/p/:path*']
};

export default function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const isCrawler = /whatsapp|facebookexternalhit|facebot|instagram|tiktok|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|applebot|bingbot|pinterest|googlebot|google-inspectiontool|adsbot-google|storebot-google|yandex|google-structured-data-testing-tool/i.test(userAgent);

  if (isCrawler) {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const productId = parts[1];
    if (productId) {
      url.pathname = '/api/og-product';
      url.searchParams.set('id', decodeURIComponent(productId));
      return Response.redirect(url, 307);
    }
  }
}
