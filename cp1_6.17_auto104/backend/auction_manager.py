import time
import threading
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass, field, asdict
import uuid


@dataclass
class BidRecord:
    id: str
    bidder: str
    amount: float
    timestamp: int


@dataclass
class AuctionItem:
    id: str
    name: str
    thumbnail: str
    description: str
    starting_price: float
    current_price: float
    bid_count: int
    remaining_time: int
    current_bidder: str
    start_time: int
    bid_history: List[BidRecord] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        elapsed = int(time.time() * 1000) - self.start_time
        elapsed_seconds = elapsed // 1000
        remaining = max(0, self.remaining_time - elapsed_seconds)
        return {
            'id': self.id,
            'name': self.name,
            'thumbnail': self.thumbnail,
            'description': self.description,
            'startingPrice': self.starting_price,
            'currentPrice': self.current_price,
            'bidCount': self.bid_count,
            'remainingTime': remaining,
            'currentBidder': self.current_bidder,
        }


class AuctionManager:
    def __init__(self, broadcast_callback: Optional[Callable] = None):
        self._items: Dict[str, AuctionItem] = {}
        self._lock = threading.RLock()
        self._broadcast = broadcast_callback
        self._init_default_items()

    def _init_default_items(self) -> None:
        now_ms = int(time.time() * 1000)
        default_items = [
            AuctionItem(
                id='item-001',
                name='清代乾隆年间古董钟表',
                thumbnail='🕰️',
                description='18世纪精雕细琢的古董钟表，鎏金外壳，珐琅表盘',
                starting_price=5000.0,
                current_price=5000.0,
                bid_count=0,
                remaining_time=600,
                current_bidder='暂无出价',
                start_time=now_ms,
                bid_history=[],
            ),
            AuctionItem(
                id='item-002',
                name='数字艺术画作《赛博都市',
                thumbnail='🎨',
                description='当代艺术家限量版NFT数字艺术作品',
                starting_price=2000.0,
                current_price=2000.0,
                bid_count=0,
                remaining_time=480,
                current_bidder='暂无出价',
                start_time=now_ms,
                bid_history=[],
            ),
            AuctionItem(
                id='item-003',
                name='限量版Air Jordan 1 Retro High OG',
                thumbnail='👟',
                description='2023联名款，全球限量500双，原厂原盒',
                starting_price=3500.0,
                current_price=3500.0,
                bid_count=0,
                remaining_time=720,
                current_bidder='暂无出价',
                start_time=now_ms,
                bid_history=[],
            ),
            AuctionItem(
                id='item-004',
                name='明代青花瓷瓶',
                thumbnail='🏺',
                description='明代官窑青花瓷瓶，缠枝莲纹，品相完好',
                starting_price=15000.0,
                current_price=15000.0,
                bid_count=0,
                remaining_time=900,
                current_bidder='暂无出价',
                start_time=now_ms,
                bid_history=[],
            ),
            AuctionItem(
                id='item-005',
                name='复古机械相机徕卡M3',
                thumbnail='📷',
                description='1954年徕卡M3原厂相机，经典黑色漆面',
                starting_price=8000.0,
                current_price=8000.0,
                bid_count=0,
                remaining_time=540,
                current_bidder='暂无出价',
                start_time=now_ms,
                bid_history=[],
            ),
            AuctionItem(
                id='item-006',
                name='稀有黑胶唱片收藏套装',
                thumbnail='💿',
                description='披头士乐队原版黑胶唱片12张套装',
                starting_price=4500.0,
                current_price=4500.0,
                bid_count=0,
                remaining_time=360,
                current_bidder='暂无出价',
                start_time=now_ms,
                bid_history=[],
            ),
            AuctionItem(
                id='item-007',
                name='和田玉籽料原石',
                thumbnail='💎',
                description='新疆和田玉籽料，重约200克，羊脂级别',
                starting_price=12000.0,
                current_price=12000.0,
                bid_count=0,
                remaining_time=660,
                current_bidder='暂无出价',
                start_time=now_ms,
                bid_history=[],
            ),
            AuctionItem(
                id='item-008',
                name='首版签名书籍《百年孤独》',
                thumbnail='📚',
                description='马尔克斯签名首版《百年孤独》精装本',
                starting_price=6000.0,
                current_price=6000.0,
                bid_count=0,
                remaining_time=420,
                current_bidder='暂无出价',
                start_time=now_ms,
                bid_history=[],
            ),
        ]
        for item in default_items:
            self._items[item.id] = item

        self._seed_initial_bids()

    def _seed_initial_bids(self) -> None:
        import random
        bidder_names = [
            '神秘买家', '收藏者A', '藏家老王', '艺术爱好者', '潮人小李',
            '鉴赏家9527', '资深藏家', '古董迷888', '拍卖行VIP',
        ]
        now_ms = int(time.time() * 1000)
        for item in self._items.values():
            num_bids = random.randint(2, 6)
            price = item.starting_price
            for i in range(num_bids):
                increment = random.randint(50, 500)
                price += increment
                bidder = random.choice(bidder_names)
                ts = now_ms - (num_bids - i) * random.randint(3000, 15000)
                record = BidRecord(
                    id=str(uuid.uuid4()),
                    bidder=bidder,
                    amount=price,
                    timestamp=ts,
                )
                item.bid_history.append(record)
            item.current_price = price
            item.bid_count = num_bids
            item.current_bidder = item.bid_history[-1].bidder if item.bid_history else '暂无出价'

    def get_all_items(self) -> List[AuctionItem]:
        with self._lock:
            return list(self._items.values())

    def get_item(self, item_id: str) -> Optional[AuctionItem]:
        with self._lock:
            return self._items.get(item_id)

    def get_bid_history(self, item_id: str) -> List[BidRecord]:
        with self._lock:
            item = self._items.get(item_id)
            if not item:
                return []
            return list(item.bid_history)

    def place_bid(
        self,
        item_id: str,
        bidder: str,
        amount: float,
    ) -> Dict[str, Any]:
        with self._lock:
            item = self._items.get(item_id)
            if not item:
                return {
                    'success': False,
                    'message': '拍卖品不存在',
                }

            elapsed_ms = int(time.time() * 1000) - item.start_time
            elapsed_seconds = elapsed_ms // 1000
            remaining = item.remaining_time - elapsed_seconds
            if remaining <= 0:
                return {
                    'success': False,
                    'message': '拍卖已结束',
                }

            if amount <= item.current_price:
                return {
                    'success': False,
                    'message': f'出价必须高于当前最高价 {} 元'.format(item.current_price),
                }

            if amount - item.current_price < 1:
                return {
                    'success': False,
                    'message': '出价必须至少高出1元',
                }

            now_ms = int(time.time() * 1000)
            record = BidRecord(
                id=str(uuid.uuid4()),
                bidder=bidder,
                amount=amount,
                timestamp=now_ms,
            )
            item.bid_history.append(record)
            item.current_price = amount
            item.bid_count += 1
            item.current_bidder = bidder

            update_data = {
                'id': item.id,
                'currentPrice': item.current_price,
                'bidCount': item.bid_count,
                'currentBidder': item.current_bidder,
                'timestamp': now_ms,
            }

            if self._broadcast:
                try:
                    self._broadcast(item.id, update_data)
                except Exception as e:
                    print(f'[AuctionManager] broadcast error: {e}')

            return {
                'success': True,
                'message': '出价成功',
                'update': update_data,
            }

    def update_broadcast_callback(self, callback: Callable) -> None:
        self._broadcast = callback
