require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// ---------- Security & performance middleware ----------
app.use(helmet({
  contentSecurityPolicy: false // we set our own CSP-friendly headers if needed; Firebase/Cloudinary need wider script-src
}));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limit write-heavy/public endpoints to slow down abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' }
});
app.use('/api/', apiLimiter);

// ---------- Static files ----------
app.use(express.static(path.join(__dirname, 'public')));

// ---------- DB ----------
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// ---------- API routes ----------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ads', require('./routes/ads'));
app.use('/api/inquiries', require('./routes/inquiries'));
app.use('/api/testimonials', require('./routes/testimonials'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/admin', require('./routes/admin'));

// ---------- SEO: robots.txt & sitemap.xml ----------
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
`User-agent: *
Allow: /
Disallow: /admin-panel-x7k2.html
Disallow: /dashboard.html
Disallow: /verify-email.html
Sitemap: ${process.env.BASE_URL || ''}/sitemap.xml`
  );
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    const Ad = require('./models/Ad');
    const base = process.env.BASE_URL || '';
    const ads = await Ad.find({ status: 'approved' }).select('slug approvedAt').limit(5000);

    const urls = [
      `${base}/`,
      `${base}/browse.html`,
      `${base}/sell.html`,
      `${base}/testimonials.html`,
      `${base}/about.html`
    ].map(u => `<url><loc>${u}</loc></url>`).join('');

    const adUrls = ads.map(ad =>
      `<url><loc>${base}/ad.html?slug=${ad.slug}</loc><lastmod>${(ad.approvedAt || new Date()).toISOString()}</lastmod></url>`
    ).join('');

    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}${adUrls}</urlset>`
    );
  } catch (err) {
    res.status(500).send('Could not generate sitemap');
  }
});

// ---------- Google Site Verification (alternative to meta tag / HTML file) ----------
// If you'd rather verify via a file Google gives you like google1234abcd.html,
// drop that exact file into /public and it will be served automatically as a
// static file - no route needed.

// ---------- Fallback to index for unknown non-API GET routes ----------
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- Error handler ----------
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong on our end. Please try again.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
