const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3002;

const BASE_PRICES = {
  sword: 100,
  shield: 120,
  helmet: 90,
  dragonbone_sword: 300,
  iron_ingot: 20,
  charcoal: 10,
  leather: 15
};

const QUALITY_MULTIPLIERS = {
  low: 1,
  medium: 1.5,
  high: 2.5
};

const MATERIAL_STOCK = {
  iron_ingot: { stock: 50, basePrice: 20 },
  charcoal: { stock: 80, basePrice: 10 },
  leather: { stock: 40, basePrice: 15 }
};

const priceHistory = {
  sword: [],
  shield: [],
  helmet: [],
  dragonbone_sword: []
};

function generateInitialHistory(type) {
  const history = [];
  const now = Date.now();
  for (let i = 19; i >= 0; i--) {
    const base = BASE_PRICES[type] || 100;
    const wave = Math.sin((now - i * 60000) / 100000) * 0.1;
    const noise = (Math.random() - 0.5) * 0.1;
    const price = Math.round(base * (1 + wave + noise));
    history.push({
      id: uuidv4(),
      price,
      timestamp: now - i * 60000,
      quality: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
    });
  }
  return history;
}

Object.keys(priceHistory).forEach(type => {
  priceHistory[type] = generateInitialHistory(type);
});

function getCurrentPrice(type, quality) {
  const base = BASE_PRICES[type] || 100;
  const qualityMult = QUALITY_MULTIPLIERS[quality] || 1;
  const now = Date.now();
  const wave = Math.sin(now / 100000) * 0.1;
  const noise = (Math.random() - 0.5) * 0.15;
  return Math.round(base * qualityMult * (1 + wave + noise));
}

function getMaterialPrice(materialKey) {
  const mat = MATERIAL_STOCK[materialKey];
  if (!mat) return 0;
  const stockRatio = Math.max(0, (mat.stock - 10) / 80);
  const priceMult = 2 - stockRatio;
  return Math.round(mat.basePrice * priceMult);
}

app.get('/api/price-history', (req, res) => {
  const { type } = req.query;
  if (!priceHistory[type]) {
    return res.status(400).json({ error: 'Invalid weapon type' });
  }
  res.json({
    type,
    history: priceHistory[type].slice(-20),
    currentPrice: getCurrentPrice(type, 'medium'),
    priceRange: {
      min: Math.min(...priceHistory[type].map(h => h.price)),
      max: Math.max(...priceHistory[type].map(h => h.price))
    }
  });
});

app.post('/api/trade', (req, res) => {
  const { action, type, quality, quantity = 1, material } = req.body;

  if (action === 'sell') {
    if (!priceHistory[type]) {
      return res.status(400).json({ error: 'Invalid weapon type' });
    }
    const price = getCurrentPrice(type, quality);
    const record = {
      id: uuidv4(),
      price,
      timestamp: Date.now(),
      quality,
      action: 'sell'
    };
    priceHistory[type].push(record);
    if (priceHistory[type].length > 50) {
      priceHistory[type].shift();
    }
    return res.json({
      success: true,
      price,
      record
    });
  }

  if (action === 'buy_material') {
    const mat = MATERIAL_STOCK[material];
    if (!mat) {
      return res.status(400).json({ error: 'Invalid material' });
    }
    if (mat.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }
    const unitPrice = getMaterialPrice(material);
    const totalPrice = unitPrice * quantity;
    mat.stock -= quantity;
    return res.json({
      success: true,
      material,
      quantity,
      unitPrice,
      totalPrice,
      remainingStock: mat.stock
    });
  }

  res.status(400).json({ error: 'Invalid action' });
});

app.get('/api/materials', (req, res) => {
  const result = {};
  Object.keys(MATERIAL_STOCK).forEach(key => {
    result[key] = {
      stock: MATERIAL_STOCK[key].stock,
      price: getMaterialPrice(key),
      basePrice: MATERIAL_STOCK[key].basePrice
    };
  });
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Forge Market Server running on http://localhost:${PORT}`);
});
