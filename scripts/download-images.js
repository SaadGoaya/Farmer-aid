const fs = require('fs');
const path = require('path');

const images = [
  {
    url: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80',
    dest: 'frontend/images/wheat.jpg'
  },
  {
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
    dest: 'frontend/images/rice.jpg'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/39/Cotton_bolls.jpg',
    dest: 'frontend/images/cotton.jpg'
  },
  {
    url: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Sugarcane_field.jpg',
    dest: 'frontend/images/sugarcane.jpg'
  }
];

async function download() {
  try {
    const root = path.resolve(__dirname, '..');
    for (const img of images) {
      const outPath = path.join(root, img.dest);
      const outDir = path.dirname(outPath);
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

      console.log(`Downloading ${img.url} -> ${outPath}`);
          try {
            const res = await fetch(img.url, { headers: { 'User-Agent': 'FarmerAidBot/1.0' } });
            if (!res.ok) {
              console.warn(`Warning: Skipping ${img.url} — HTTP ${res.status}`);
              failed.push({ url: img.url, status: res.status });
              continue;
            }
            const buffer = Buffer.from(await res.arrayBuffer());
            fs.writeFileSync(outPath, buffer);
            console.log(`Saved ${outPath}`);
            saved.push(outPath);
          } catch (innerErr) {
            console.warn(`Warning: Failed to download ${img.url}: ${innerErr.message}`);
            failed.push({ url: img.url, error: String(innerErr) });
            continue;
          }
    }
        console.log(`Download complete. Saved: ${saved.length}, Failed: ${failed.length}`);
        if (failed.length > 0) {
          console.warn('Some images were skipped; build will continue. Inspect the download logs for details.');
        }
  } catch (err) {
    console.error('Image download failed:', err);
    process.exit(1);
  }
}

download();
