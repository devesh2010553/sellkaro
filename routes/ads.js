const express = require('express');
const router = express.Router();
const slugify = require('slugify');
const Ad = require('../models/Ad');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

const COMMISSION_PERCENT = Number(process.env.COMMISSION_PERCENT || 5);

async function makeUniqueSlug(title) {
  let base = slugify(title, { lower: true, strict: true }).slice(0, 80) || 'item';
  let slug = `${base}-${Date.now().toString(36)}`;
  return slug;
}

// Public: browse approved ads, with search/filter/pagination
router.get('/', async (req, res) => {
  try {
    const { category, q, city, minPrice, maxPrice, page = 1, limit = 20 } = req.query;

    const filter = { status: 'approved' };
    if (category) filter.category = category;
    if (city) filter['location.city'] = new RegExp(city, 'i');
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (q) filter.$text = { $search: q };

    const skip = (Number(page) - 1) * Number(limit);

    const [ads, total] = await Promise.all([
      Ad.find(filter).sort({ approvedAt: -1, createdAt: -1 }).skip(skip).limit(Number(limit)),
      Ad.countDocuments(filter)
    ]);

    res.json({ ads, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('Browse ads error:', err);
    res.status(500).json({ error: 'Could not load listings right now. Please try again.' });
  }
});

// Public: single approved ad by slug
router.get('/:slug', async (req, res) => {
  try {
    const ad = await Ad.findOne({ slug: req.params.slug, status: 'approved' })
      .populate('seller', 'name createdAt');

    if (!ad) return res.status(404).json({ error: 'This listing is not available. It may have been removed or is awaiting approval.' });

    ad.views += 1;
    await ad.save();

    res.json({ ad });
  } catch (err) {
    console.error('Get ad error:', err);
    res.status(500).json({ error: 'Could not load this listing.' });
  }
});

// Auth required: create a new ad - always starts as 'pending' for admin review
router.post('/', requireAuth, upload.array('images', 8), async (req, res) => {
  try {
    const { category, title, description, price, brand, model, year, fuelType, transmission, kmDriven, owners, city, state } = req.body;

    if (!category || !title || !description || !price) {
      return res.status(400).json({ error: 'Category, title, description and price are required.' });
    }
    if (Number(price) <= 0) {
      return res.status(400).json({ error: 'Price must be greater than zero.' });
    }

    const images = (req.files || []).map(f => ({ url: f.path, publicId: f.filename }));

    const ad = await Ad.create({
      seller: req.user._id,
      category,
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      carDetails: category === 'Cars' ? {
        brand, model,
        year: year ? Number(year) : undefined,
        fuelType: fuelType || '',
        transmission: transmission || '',
        kmDriven: kmDriven ? Number(kmDriven) : undefined,
        owners: owners ? Number(owners) : undefined
      } : undefined,
      images,
      location: { city: city || '', state: state || '' },
      status: 'pending',
      commissionPercent: COMMISSION_PERCENT,
      slug: await makeUniqueSlug(title)
    });

    res.status(201).json({
      ad,
      message: 'Your ad has been submitted and is awaiting admin approval. It will go live once approved.'
    });
  } catch (err) {
    console.error('Create ad error:', err);
    res.status(500).json({ error: 'Could not submit your ad. Please try again.' });
  }
});

// Auth required: seller's own ads (any status)
router.get('/mine/all', requireAuth, async (req, res) => {
  try {
    const ads = await Ad.find({ seller: req.user._id }).sort({ createdAt: -1 });
    res.json({ ads });
  } catch (err) {
    console.error('My ads error:', err);
    res.status(500).json({ error: 'Could not load your listings.' });
  }
});

// Auth required: seller marks own ad as sold
router.patch('/:id/mark-sold', requireAuth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, seller: req.user._id });
    if (!ad) return res.status(404).json({ error: 'Listing not found.' });

    ad.status = 'sold';
    ad.soldAt = new Date();
    await ad.save();

    res.json({ ad, message: `Marked as sold. Remember: ${ad.commissionPercent}% of the sale price is due as commission per the Terms & Conditions.` });
  } catch (err) {
    console.error('Mark sold error:', err);
    res.status(500).json({ error: 'Could not update this listing.' });
  }
});

// Auth required: seller deletes own pending/rejected ad
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, seller: req.user._id });
    if (!ad) return res.status(404).json({ error: 'Listing not found.' });

    await ad.deleteOne();
    res.json({ message: 'Listing deleted.' });
  } catch (err) {
    console.error('Delete ad error:', err);
    res.status(500).json({ error: 'Could not delete this listing.' });
  }
});

module.exports = router;
