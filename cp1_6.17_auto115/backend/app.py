from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from models import store

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")


def broadcast_books_update():
    books = [book.to_dict() for book in store.get_all_books()]
    socketio.emit("books_updated", {"books": books})


def broadcast_cart_update():
    items = store.get_cart_items()
    total = store.get_cart_total()
    socketio.emit("cart_updated", {"items": items, "total": total})


@app.route("/api/books", methods=["GET"])
def get_books():
    query = request.args.get("q", "")
    if query:
        books = store.search_books(query)
    else:
        books = store.get_all_books()
    return jsonify([book.to_dict() for book in books])


@app.route("/api/books/<book_id>", methods=["GET"])
def get_book(book_id):
    book = store.get_book(book_id)
    if not book:
        return jsonify({"error": "Book not found"}), 404
    return jsonify(book.to_dict())


@app.route("/api/books", methods=["POST"])
def add_book():
    data = request.json
    book = store.add_book(
        title=data.get("title", ""),
        author=data.get("author", ""),
        price=float(data.get("price", 0)),
        stock=int(data.get("stock", 0)),
        description=data.get("description", ""),
        category=data.get("category", "小说"),
        cover_image=data.get("cover_image", ""),
    )
    broadcast_books_update()
    return jsonify(book.to_dict()), 201


@app.route("/api/books/<book_id>", methods=["PUT"])
def update_book(book_id):
    data = request.json
    book = store.update_book(
        book_id,
        title=data.get("title"),
        author=data.get("author"),
        price=float(data["price"]) if "price" in data else None,
        stock=int(data["stock"]) if "stock" in data else None,
        description=data.get("description"),
        category=data.get("category"),
        cover_image=data.get("cover_image"),
    )
    if not book:
        return jsonify({"error": "Book not found"}), 404
    broadcast_books_update()
    broadcast_cart_update()
    return jsonify(book.to_dict())


@app.route("/api/books/<book_id>", methods=["DELETE"])
def delete_book(book_id):
    success = store.delete_book(book_id)
    if not success:
        return jsonify({"error": "Book not found"}), 404
    broadcast_books_update()
    broadcast_cart_update()
    return jsonify({"message": "Book deleted successfully"})


@app.route("/api/cart", methods=["GET"])
def get_cart():
    items = store.get_cart_items()
    total = store.get_cart_total()
    return jsonify({"items": items, "total": total})


@app.route("/api/cart", methods=["POST"])
def add_to_cart():
    data = request.json
    book_id = data.get("book_id", "")
    quantity = int(data.get("quantity", 1))
    cart_item = store.add_to_cart(book_id, quantity)
    if not cart_item:
        return jsonify({"error": "Book not found or insufficient stock"}), 400
    broadcast_cart_update()
    return jsonify({"message": "Added to cart successfully"}), 201


@app.route("/api/cart/<book_id>", methods=["PUT"])
def update_cart_item(book_id):
    data = request.json
    quantity = int(data.get("quantity", 1))
    cart_item = store.update_cart_quantity(book_id, quantity)
    if cart_item is None and quantity != 0:
        return jsonify({"error": "Book not found or insufficient stock"}), 400
    broadcast_cart_update()
    return jsonify({"message": "Cart updated successfully"})


@app.route("/api/cart/<book_id>", methods=["DELETE"])
def remove_from_cart(book_id):
    success = store.remove_from_cart(book_id)
    if not success:
        return jsonify({"error": "Item not found in cart"}), 404
    broadcast_cart_update()
    return jsonify({"message": "Removed from cart successfully"})


@socketio.on("connect")
def handle_connect():
    books = [book.to_dict() for book in store.get_all_books()]
    cart_items = store.get_cart_items()
    cart_total = store.get_cart_total()
    emit("initial_data", {"books": books, "cart": {"items": cart_items, "total": cart_total}})


@socketio.on("add_to_cart")
def handle_add_to_cart(data):
    book_id = data.get("book_id", "")
    quantity = int(data.get("quantity", 1))
    cart_item = store.add_to_cart(book_id, quantity)
    if cart_item:
        items = store.get_cart_items()
        total = store.get_cart_total()
        emit("cart_updated", {"items": items, "total": total}, broadcast=True)


@socketio.on("remove_from_cart")
def handle_remove_from_cart(data):
    book_id = data.get("book_id", "")
    store.remove_from_cart(book_id)
    items = store.get_cart_items()
    total = store.get_cart_total()
    emit("cart_updated", {"items": items, "total": total}, broadcast=True)


@socketio.on("update_cart_quantity")
def handle_update_cart(data):
    book_id = data.get("book_id", "")
    quantity = int(data.get("quantity", 1))
    store.update_cart_quantity(book_id, quantity)
    items = store.get_cart_items()
    total = store.get_cart_total()
    emit("cart_updated", {"items": items, "total": total}, broadcast=True)


if __name__ == "__main__":
    socketio.run(app, debug=True, port=5000)
