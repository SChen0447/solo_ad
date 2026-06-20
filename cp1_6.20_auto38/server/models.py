import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import bcrypt


class User:
    def __init__(self, username: str, password: str, nickname: str = "", avatar: str = ""):
        self.id = str(uuid.uuid4())
        self.username = username
        self.password_hash = self._hash_password(password)
        self.nickname = nickname or username
        self.avatar = avatar or f"https://api.dicebear.com/7.x/avataaars/svg?seed={username}"
        self.created_at = datetime.utcnow()

    @staticmethod
    def _hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password: str) -> bool:
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def to_dict(self, include_sensitive: bool = False) -> Dict:
        data = {
            "id": self.id,
            "username": self.username,
            "nickname": self.nickname,
            "avatar": self.avatar,
            "galleriesCount": 0,
            "favoritesCount": 0,
            "createdAt": self.created_at.isoformat()
        }
        if include_sensitive:
            data["password_hash"] = self.password_hash
        return data


class Gallery:
    def __init__(self, title: str, description: str, cover_image: str, author_id: str, author_name: str, author_avatar: str, is_public: bool = True):
        self.id = str(uuid.uuid4())
        self.title = title
        self.description = description
        self.cover_image = cover_image
        self.author_id = author_id
        self.author_name = author_name
        self.author_avatar = author_avatar
        self.is_public = is_public
        self.created_at = datetime.utcnow()
        self.artworks: List[Artwork] = []

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "coverImage": self.cover_image,
            "authorId": self.author_id,
            "authorName": self.author_name,
            "authorAvatar": self.author_avatar,
            "artworksCount": len(self.artworks),
            "isPublic": self.is_public,
            "createdAt": self.created_at.isoformat()
        }


class Artwork:
    def __init__(self, gallery_id: str, title: str, artist: str, image_url: str, starting_price: float):
        self.id = str(uuid.uuid4())
        self.gallery_id = gallery_id
        self.title = title
        self.artist = artist
        self.image_url = image_url
        self.starting_price = starting_price
        self.current_price = starting_price
        self.highest_bidder: Optional[str] = None
        self.highest_bidder_name: Optional[str] = None
        self.is_auctioning = False
        self.auction_end_time: Optional[datetime] = None
        self.created_at = datetime.utcnow()

    def start_auction(self, duration_seconds: int = 30):
        self.is_auctioning = True
        self.auction_end_time = datetime.utcnow() + timedelta(seconds=duration_seconds)

    def place_bid(self, amount: float, bidder_id: str, bidder_name: str) -> bool:
        if not self.is_auctioning:
            return False
        if amount <= self.current_price:
            return False
        if self.auction_end_time and datetime.utcnow() > self.auction_end_time:
            return False
        
        self.current_price = amount
        self.highest_bidder = bidder_id
        self.highest_bidder_name = bidder_name
        self.auction_end_time = datetime.utcnow() + timedelta(seconds=30)
        return True

    def end_auction(self):
        self.is_auctioning = False

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "galleryId": self.gallery_id,
            "title": self.title,
            "artist": self.artist,
            "imageUrl": self.image_url,
            "startingPrice": self.starting_price,
            "currentPrice": self.current_price,
            "highestBidder": self.highest_bidder,
            "highestBidderName": self.highest_bidder_name,
            "isAuctioning": self.is_auctioning,
            "auctionEndTime": self.auction_end_time.isoformat() if self.auction_end_time else None,
            "createdAt": self.created_at.isoformat()
        }


class Bid:
    def __init__(self, artwork_id: str, artwork_title: str, bidder_id: str, bidder_name: str, amount: float):
        self.id = str(uuid.uuid4())
        self.artwork_id = artwork_id
        self.artwork_title = artwork_title
        self.bidder_id = bidder_id
        self.bidder_name = bidder_name
        self.amount = amount
        self.timestamp = datetime.utcnow()
        self.is_winning = True

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "artworkId": self.artwork_id,
            "artworkTitle": self.artwork_title,
            "bidderId": self.bidder_id,
            "bidderName": self.bidder_name,
            "amount": self.amount,
            "timestamp": self.timestamp.isoformat(),
            "isWinning": self.is_winning
        }


class Database:
    def __init__(self):
        self.users: Dict[str, User] = {}
        self.galleries: Dict[str, Gallery] = {}
        self.artworks: Dict[str, Artwork] = {}
        self.bids: Dict[str, Bid] = {}
        self.user_bids: Dict[str, List[Bid]] = {}

    def add_user(self, user: User):
        self.users[user.id] = user

    def get_user_by_username(self, username: str) -> Optional[User]:
        for user in self.users.values():
            if user.username == username:
                return user
        return None

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        return self.users.get(user_id)

    def add_gallery(self, gallery: Gallery):
        self.galleries[gallery.id] = gallery
        user = self.get_user_by_id(gallery.author_id)
        if user:
            pass

    def get_public_galleries(self) -> List[Gallery]:
        return [g for g in self.galleries.values() if g.is_public]

    def get_user_galleries(self, user_id: str) -> List[Gallery]:
        return [g for g in self.galleries.values() if g.author_id == user_id]

    def add_artwork(self, artwork: Artwork):
        self.artworks[artwork.id] = artwork
        gallery = self.galleries.get(artwork.gallery_id)
        if gallery:
            gallery.artworks.append(artwork)

    def add_bid(self, bid: Bid):
        self.bids[bid.id] = bid
        if bid.bidder_id not in self.user_bids:
            self.user_bids[bid.bidder_id] = []
        self.user_bids[bid.bidder_id].append(bid)

    def get_user_bids(self, user_id: str) -> List[Bid]:
        return self.user_bids.get(user_id, [])

    def get_auctioning_artworks(self) -> List[Artwork]:
        return [a for a in self.artworks.values() if a.is_auctioning]


db = Database()
