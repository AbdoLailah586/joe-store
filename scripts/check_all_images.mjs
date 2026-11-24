const urls = [
  '/product-images/banner-hunter-charging-series.jpg',
  '/product-images/hunter-67w-gan-box.jpg',
  '/product-images/hunter-45w-gan-box.jpg',
  '/product-images/hunter-25w-pd-box.jpg',
  '/product-images/hunter-ai-45w-gan-box.jpg',
  '/product-images/hunter-90w-gan-desktop-box.jpg',
  '/product-images/oraimo-freepods-3c-box.jpg',
  '/product-images/oraimo-freepods-3c-features.jpg',
  '/product-images/soundcore-r50i-nc-box.jpg',
  '/product-images/hollyland-lark-wireless-mic-box.jpg',
  '/product-images/lito-wireless-powerbank-10k.jpg',
  '/product-images/car-jumpstarter-airpump.jpg',
  '/product-images/world-tag-apple-findmy.jpg',
  '/product-images/k30-magnetic-car-mount.jpg',
  '/product-images/haino-teko-sq18-amoled-box.jpg',
  '/product-images/nabi-kids-smartwatch-gps-box.jpg',
  '/product-images/tasbih-beiqi-s7pro-smartring.jpg',
  '/product-images/onmust-zolo-30w-studio.jpg',
  '/product-images/onmust-zolo-30w-box-clean.png'
];

async function checkAll() {
  console.log('Testing all 19 non-case images on live Vercel deployment:');
  for (const u of urls) {
    try {
      const res = await fetch('https://joe-store-2026.vercel.app' + u, { method: 'HEAD' });
      console.log(`[${res.status}] ${u} (${res.headers.get('content-type')})`);
    } catch (e) {
      console.error(`[ERR] ${u}:`, e.message);
    }
  }
}

checkAll();
