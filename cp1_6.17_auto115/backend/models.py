import uuid
from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class Book:
    id: str
    title: str
    author: str
    price: float
    stock: int
    description: str
    category: str
    cover_image: str = ""

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "title": self.title,
            "author": self.author,
            "price": self.price,
            "stock": self.stock,
            "description": self.description,
            "category": self.category,
            "cover_image": self.cover_image,
        }


@dataclass
class CartItem:
    book_id: str
    quantity: int = 1

    def to_dict(self, book: Book) -> Dict:
        return {
            "book_id": self.book_id,
            "title": book.title,
            "author": book.author,
            "price": book.price,
            "quantity": self.quantity,
            "category": book.category,
            "cover_image": book.cover_image,
        }


class BookStore:
    def __init__(self):
        self.books: Dict[str, Book] = {}
        self.cart: Dict[str, CartItem] = {}
        self._init_sample_data()

    def _init_sample_data(self):
        sample_books = [
            Book(
                id=str(uuid.uuid4()),
                title="百年孤独",
                author="加西亚·马尔克斯",
                price=49.90,
                stock=100,
                description="魔幻现实主义文学的代表作，讲述布恩迪亚家族七代人的传奇故事。",
                category="小说",
                cover_image="",
            ),
            Book(
                id=str(uuid.uuid4()),
                title="活着",
                author="余华",
                price=35.00,
                stock=80,
                description="讲述了农村人福贵悲惨的人生遭遇。",
                category="小说",
                cover_image="",
            ),
            Book(
                id=str(uuid.uuid4()),
                title="三体",
                author="刘慈欣",
                price=59.00,
                stock=120,
                description="中国科幻小说的里程碑之作，讲述人类与三体文明的首次接触。",
                category="小说",
                cover_image="",
            ),
            Book(
                id=str(uuid.uuid4()),
                title="深度学习",
                author="Ian Goodfellow",
                price=168.00,
                stock=50,
                description="深度学习领域的经典教材，由三位顶尖专家撰写。",
                category="科技",
                cover_image="",
            ),
            Book(
                id=str(uuid.uuid4()),
                title="代码整洁之道",
                author="Robert C. Martin",
                price=59.00,
                stock=75,
                description="教你如何编写整洁、可维护的代码。",
                category="科技",
                cover_image="",
            ),
            Book(
                id=str(uuid.uuid4()),
                title="设计模式",
                author="GoF",
                price=79.00,
                stock=60,
                description="软件设计模式的经典著作。",
                category="科技",
                cover_image="",
            ),
            Book(
                id=str(uuid.uuid4()),
                title="艺术的故事",
                author="贡布里希",
                price=128.00,
                stock=40,
                description="从史前到现代艺术的完整叙述。",
                category="艺术",
                cover_image="",
            ),
            Book(
                id=str(uuid.uuid4()),
                title="梵高传",
                author="欧文·斯通",
                price=45.00,
                stock=55,
                description="荷兰后印象派画家梵高的传记。",
                category="艺术",
                cover_image="",
            ),
            Book(
                id=str(uuid.uuid4()),
                title="人类简史",
                author="尤瓦尔·赫拉利",
                price=68.00,
                stock=90,
                description="从认知革命、农业革命到科学革命的人类简史。",
                category="小说",
                cover_image="",
            ),
            Book(
                id=str(uuid.uuid4()),
                title="算法导论",
                author="Thomas H. Cormen",
                price=128.00,
                stock=35,
                description="计算机算法领域的权威教材。",
                category="科技",
                cover_image="",
            ),
            Book(
                id=str(uuid.uuid4()),
                title="西方哲学史",
                author="罗素",
                price=88.00,
                stock=45,
                description="从古希腊到现代西方哲学的发展历程。",
                category="艺术",
                cover_image="",
            ),
            Book(
                id=str(uuid.uuid4()),
                title="设计心理学",
                author="唐纳德·诺曼",
                price=58.00,
                stock=65,
                description="探讨设计与人类心理的关系。",
                category="艺术",
                cover_image="",
            ),
        ]
        for book in sample_books:
            self.books[book.id] = book

    def add_book(self, title: str, author: str, price: float, stock: int, 
                 description: str, category: str, cover_image: str = "") -> Book:
        book_id = str(uuid.uuid4())
        book = Book(
            id=book_id,
            title=title,
            author=author,
            price=price,
            stock=stock,
            description=description,
            category=category,
            cover_image=cover_image,
        )
        self.books[book_id] = book
        return book

    def update_book(self, book_id: str, **kwargs) -> Book | None:
        if book_id not in self.books:
            return None
        book = self.books[book_id]
        for key, value in kwargs.items():
            if hasattr(book, key) and value is not None:
                setattr(book, key, value)
        return book

    def delete_book(self, book_id: str) -> bool:
        if book_id in self.books:
            del self.books[book_id]
            if book_id in self.cart:
                del self.cart[book_id]
            return True
        return False

    def get_book(self, book_id: str) -> Book | None:
        return self.books.get(book_id)

    def get_all_books(self) -> List[Book]:
        return list(self.books.values())

    def search_books(self, query: str) -> List[Book]:
        query = query.lower()
        return [
            book for book in self.books.values()
            if query in book.title.lower() or query in book.author.lower()
        ]

    def add_to_cart(self, book_id: str, quantity: int = 1) -> CartItem | None:
        book = self.books.get(book_id)
        if not book or book.stock < quantity:
            return None
        if book_id in self.cart:
            self.cart[book_id].quantity += quantity
        else:
            self.cart[book_id] = CartItem(book_id=book_id, quantity=quantity)
        return self.cart[book_id]

    def remove_from_cart(self, book_id: str) -> bool:
        if book_id in self.cart:
            del self.cart[book_id]
            return True
        return False

    def update_cart_quantity(self, book_id: str, quantity: int) -> CartItem | None:
        book = self.books.get(book_id)
        if not book or book.stock < quantity:
            return None
        if book_id in self.cart:
            if quantity <= 0:
                del self.cart[book_id]
                return None
            self.cart[book_id].quantity = quantity
            return self.cart[book_id]
        return None

    def get_cart_items(self) -> List[Dict]:
        items = []
        for cart_item in self.cart.values():
            book = self.books.get(cart_item.book_id)
            if book:
                items.append(cart_item.to_dict(book))
        return items

    def get_cart_total(self) -> float:
        total = 0.0
        for cart_item in self.cart.values():
            book = self.books.get(cart_item.book_id)
            if book:
                total += book.price * cart_item.quantity
        return round(total, 2)


store = BookStore()
