import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { Product, Order } from '../types.js';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const { title, description, category, price, stock, negotiable } = req.body;

  if (!title || !description || !category || !price || stock === undefined) {
    return res.status(400).json({ error: '请填写完整商品信息' });
  }

  const newProduct: Product = {
    id: uuidv4(),
    title,
    description,
    category,
    price: parseFloat(price),
    stock: parseInt(stock),
    negotiable: negotiable === true || negotiable === 'true',
    sellerId: req.userId!,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.data.products.push(newProduct);
  await db.write();

  res.json(newProduct);
});

router.get('/', async (req, res) => {
  const { keyword, category, minPrice, maxPrice, page = '1', limit = '20' } = req.query;

  let products = db.data.products.filter(p => p.status === 'active');

  if (keyword && typeof keyword === 'string') {
    const kw = keyword.toLowerCase();
    products = products.filter(
      p => p.title.toLowerCase().includes(kw) || p.description.toLowerCase().includes(kw)
    );
  }

  if (category && typeof category === 'string' && category !== 'all') {
    products = products.filter(p => p.category === category);
  }

  if (minPrice && typeof minPrice === 'string') {
    products = products.filter(p => p.price >= parseFloat(minPrice));
  }

  if (maxPrice && typeof maxPrice === 'string') {
    products = products.filter(p => p.price <= parseFloat(maxPrice));
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedProducts = products.slice(startIndex, startIndex + limitNum);

  const productsWithSeller = await Promise.all(
    paginatedProducts.map(async p => {
      const seller = db.data.users.find(u => u.id === p.sellerId);
      const sellerReviews = db.data.reviews.filter(
        r => r.targetId === p.sellerId && (r.type === 'buyer' || r.type === 'seller')
      );
      const avgRating = sellerReviews.length > 0
        ? sellerReviews.reduce((sum, r) => sum + r.rating, 0) / sellerReviews.length
        : 5;

      return {
        ...p,
        seller: seller ? {
          id: seller.id,
          username: seller.username,
          avatar: seller.avatar,
          createdAt: seller.createdAt,
          creditScore: avgRating.toFixed(1),
          reviewCount: sellerReviews.length
        } : null
      };
    })
  );

  res.json({
    products: productsWithSeller,
    total: products.length,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(products.length / limitNum)
  });
});

router.get('/my', authMiddleware, async (req: AuthRequest, res) => {
  const products = db.data.products.filter(p => p.sellerId === req.userId);
  res.json(products);
});

router.get('/:id', async (req, res) => {
  const product = db.data.products.find(p => p.id === req.params.id);

  if (!product) {
    return res.status(404).json({ error: '商品不存在' });
  }

  const seller = db.data.users.find(u => u.id === product.sellerId);
  const sellerReviews = db.data.reviews.filter(
    r => r.targetId === product.sellerId && (r.type === 'buyer' || r.type === 'seller')
  );
  const avgRating = sellerReviews.length > 0
    ? sellerReviews.reduce((sum, r) => sum + r.rating, 0) / sellerReviews.length
    : 5;

  const productReviews = db.data.reviews.filter(r => r.productId === product.id && r.type === 'product');
  const productAvgRating = productReviews.length > 0
    ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length
    : null;

  res.json({
    ...product,
    seller: seller ? {
      id: seller.id,
      username: seller.username,
      avatar: seller.avatar,
      createdAt: seller.createdAt,
      creditScore: avgRating.toFixed(1),
      reviewCount: sellerReviews.length
    } : null,
    productRating: productAvgRating ? productAvgRating.toFixed(1) : null,
    reviewCount: productReviews.length
  });
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  const productIndex = db.data.products.findIndex(p => p.id === req.params.id);

  if (productIndex === -1) {
    return res.status(404).json({ error: '商品不存在' });
  }

  const product = db.data.products[productIndex];

  if (product.sellerId !== req.userId) {
    return res.status(403).json({ error: '无权限编辑此商品' });
  }

  const { title, description, category, price, stock, negotiable } = req.body;

  db.data.products[productIndex] = {
    ...product,
    title: title || product.title,
    description: description || product.description,
    category: category || product.category,
    price: price !== undefined ? parseFloat(price) : product.price,
    stock: stock !== undefined ? parseInt(stock) : product.stock,
    negotiable: negotiable !== undefined ? (negotiable === true || negotiable === 'true') : product.negotiable,
    updatedAt: new Date().toISOString()
  };

  await db.write();
  res.json(db.data.products[productIndex]);
});

router.patch('/:id/remove', authMiddleware, async (req: AuthRequest, res) => {
  const productIndex = db.data.products.findIndex(p => p.id === req.params.id);

  if (productIndex === -1) {
    return res.status(404).json({ error: '商品不存在' });
  }

  const product = db.data.products[productIndex];

  if (product.sellerId !== req.userId) {
    return res.status(403).json({ error: '无权限操作此商品' });
  }

  db.data.products[productIndex].status = 'removed';
  db.data.products[productIndex].updatedAt = new Date().toISOString();

  await db.write();
  res.json({ message: '商品已下架' });
});

router.post('/:id/buy', authMiddleware, async (req: AuthRequest, res) => {
  const product = db.data.products.find(p => p.id === req.params.id);

  if (!product) {
    return res.status(404).json({ error: '商品不存在' });
  }

  if (product.sellerId === req.userId) {
    return res.status(400).json({ error: '不能购买自己的商品' });
  }

  if (product.status !== 'active' || product.stock <= 0) {
    return res.status(400).json({ error: '商品已售罄或下架' });
  }

  const { quantity = 1 } = req.body;
  const qty = parseInt(quantity);

  if (qty > product.stock) {
    return res.status(400).json({ error: '库存不足' });
  }

  const newOrder: Order = {
    id: uuidv4(),
    productId: product.id,
    buyerId: req.userId!,
    sellerId: product.sellerId,
    price: product.price * qty,
    quantity: qty,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  product.stock -= qty;
  if (product.stock === 0) {
    product.status = 'sold';
  }

  db.data.orders.push(newOrder);
  await db.write();

  res.json(newOrder);
});

router.get('/orders/my', authMiddleware, async (req: AuthRequest, res) => {
  const userRole = req.query.role as string;
  let orders: Order[] = [];

  if (userRole === 'seller') {
    orders = db.data.orders.filter(o => o.sellerId === req.userId);
  } else {
    orders = db.data.orders.filter(o => o.buyerId === req.userId);
  }

  const ordersWithDetails = orders.map(order => {
    const product = db.data.products.find(p => p.id === order.productId);
    const buyer = db.data.users.find(u => u.id === order.buyerId);
    const seller = db.data.users.find(u => u.id === order.sellerId);

    return {
      ...order,
      product: product ? {
        id: product.id,
        title: product.title,
        price: product.price
      } : null,
      buyer: buyer ? {
        id: buyer.id,
        username: buyer.username,
        avatar: buyer.avatar
      } : null,
      seller: seller ? {
        id: seller.id,
        username: seller.username,
        avatar: seller.avatar
      } : null
    };
  });

  res.json(ordersWithDetails);
});

router.patch('/orders/:id/ship', authMiddleware, async (req: AuthRequest, res) => {
  const { deliveryInfo } = req.body;
  const orderIndex = db.data.orders.findIndex(o => o.id === req.params.id);

  if (orderIndex === -1) {
    return res.status(404).json({ error: '订单不存在' });
  }

  const order = db.data.orders[orderIndex];

  if (order.sellerId !== req.userId) {
    return res.status(403).json({ error: '无权限操作此订单' });
  }

  if (order.status !== 'pending') {
    return res.status(400).json({ error: '订单状态不允许发货' });
  }

  db.data.orders[orderIndex].status = 'shipped';
  db.data.orders[orderIndex].deliveryInfo = deliveryInfo;
  db.data.orders[orderIndex].updatedAt = new Date().toISOString();

  await db.write();
  res.json(db.data.orders[orderIndex]);
});

router.patch('/orders/:id/confirm', authMiddleware, async (req: AuthRequest, res) => {
  const orderIndex = db.data.orders.findIndex(o => o.id === req.params.id);

  if (orderIndex === -1) {
    return res.status(404).json({ error: '订单不存在' });
  }

  const order = db.data.orders[orderIndex];

  if (order.buyerId !== req.userId) {
    return res.status(403).json({ error: '无权限操作此订单' });
  }

  if (order.status !== 'shipped') {
    return res.status(400).json({ error: '订单状态不允许确认收货' });
  }

  db.data.orders[orderIndex].status = 'completed';
  db.data.orders[orderIndex].updatedAt = new Date().toISOString();

  await db.write();
  res.json(db.data.orders[orderIndex]);
});

export default router;
