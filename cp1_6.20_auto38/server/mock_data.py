import random
from datetime import datetime, timedelta
from models import db, User, Gallery, Artwork

GALLERY_STYLES = [
    "印象派", "现代主义", "古典主义", "抽象艺术", "波普艺术",
    "极简主义", "超现实主义", "立体主义", "表现主义", "达达主义",
    "未来主义", "象征主义", "新古典主义", "浪漫主义", "现实主义"
]

GALLERY_SCENES = [
    "花园", "都市", "山水", "星空", "海洋",
    "森林", "建筑", "人物", "静物", "风景",
    "梦境", "时光", "记忆", "幻想", "秘境"
]

CHINESE_ARTISTS = [
    "齐白石", "张大千", "徐悲鸿", "潘天寿", "林风眠",
    "傅抱石", "李可染", "吴冠中", "黄宾虹", "刘海粟",
    "关山月", "石鲁", "钱松岩", "黄永玉", "范曾"
]

WESTERN_ARTISTS = [
    "Van Gogh", "Picasso", "Monet", "Da Vinci", "Michelangelo",
    "Rembrandt", "Dali", "Warhol", "Kandinsky", "Matisse",
    "Renoir", "Cezanne", "Gauguin", "Turner", "Frida Kahlo"
]

def generate_gallery_name() -> str:
    style = random.choice(GALLERY_STYLES)
    scene = random.choice(GALLERY_SCENES)
    suffixes = ["画廊", "展览馆", "艺术馆", "展厅", "收藏馆"]
    suffix = random.choice(suffixes)
    return f"{style}{scene}{suffix}"

def generate_artwork_title() -> str:
    adjectives = ["静谧的", "绚烂的", "忧郁的", "欢乐的", "神秘的",
                  "永恒的", "瞬间的", "梦幻的", "真实的", "抽象的"]
    nouns = ["黄昏", "黎明", "午后", "夜晚", "春日",
             "夏日", "秋日", "冬日", "雨滴", "雪花"]
    adj = random.choice(adjectives)
    noun = random.choice(nouns)
    numbers = ["之一", "之二", "三号", "No.1", "系列", "变体"]
    num = random.choice(numbers) if random.random() > 0.5 else ""
    return f"{adj}{noun}{num}"

def generate_artist_name() -> str:
    if random.random() > 0.5:
        return random.choice(CHINESE_ARTISTS)
    return random.choice(WESTERN_ARTISTS)

def generate_image_url(seed: str) -> str:
    return f"https://picsum.photos/seed/{seed}/800/600"

def generate_mock_data():
    demo_users = [
        ("artlover", "pass123", "艺术爱好者"),
        ("collector", "pass123", "收藏家小王"),
        ("artist001", "pass123", "新锐艺术家"),
        ("curator", "pass123", "策展人李先生"),
        ("visitor", "pass123", "访客用户")
    ]
    
    created_users = []
    for username, password, nickname in demo_users:
        user = User(username, password, nickname)
        db.add_user(user)
        created_users.append(user)
    
    for i in range(60):
        author = random.choice(created_users)
        title = generate_gallery_name()
        description = f"这是一个精心策划的{title}，汇集了多位艺术家的精品力作，展现了独特的艺术视角和创作理念。"
        cover_seed = f"gallery-cover-{i}"
        cover_image = generate_image_url(cover_seed)
        
        gallery = Gallery(
            title=title,
            description=description,
            cover_image=cover_image,
            author_id=author.id,
            author_name=author.nickname,
            author_avatar=author.avatar,
            is_public=random.random() > 0.1
        )
        
        gallery.created_at = datetime.utcnow() - timedelta(days=random.randint(0, 30))
        
        artwork_count = random.randint(5, 10)
        for j in range(artwork_count):
            artwork_seed = f"artwork-{i}-{j}"
            artwork = Artwork(
                gallery_id=gallery.id,
                title=generate_artwork_title(),
                artist=generate_artist_name(),
                image_url=generate_image_url(artwork_seed),
                starting_price=random.randint(1000, 100000)
            )
            artwork.created_at = gallery.created_at + timedelta(hours=random.randint(1, 48))
            
            if random.random() > 0.6:
                artwork.is_auctioning = True
                artwork.auction_end_time = datetime.utcnow() + timedelta(seconds=random.randint(60, 600))
                bid_increments = random.randint(0, 5)
                for k in range(bid_increments):
                    bidder = random.choice(created_users)
                    artwork.current_price += random.randint(500, 5000)
                    artwork.highest_bidder = bidder.id
                    artwork.highest_bidder_name = bidder.nickname
            
            gallery.artworks.append(artwork)
            db.add_artwork(artwork)
        
        db.add_gallery(gallery)
    
    print(f"Generated mock data: {len(db.users)} users, {len(db.galleries)} galleries, {len(db.artworks)} artworks")
