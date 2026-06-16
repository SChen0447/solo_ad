from flask import Flask, request, jsonify
from flask_cors import CORS
import recommender
from tracker import tracker

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})


@app.route('/api/tags', methods=['GET'])
def get_tags():
    return jsonify({"tags": recommender.get_all_tags()})


@app.route('/api/recommend', methods=['POST'])
def get_recommendations():
    data = request.get_json() or {}
    selected_tags = data.get('tags', [])
    count = data.get('count', 6)

    exclude_ids = [b["id"] for b in tracker.get_reading_list()]
    history = tracker.get_reading_list()

    books = recommender.recommend_books(selected_tags, exclude_ids, history, count)
    return jsonify({
        "books": books,
        "total": len(books)
    })


@app.route('/api/books/<int:book_id>', methods=['GET'])
def get_book(book_id):
    book = recommender.get_book_by_id(book_id)
    if book is None:
        return jsonify({"error": "Book not found"}), 404
    return jsonify(book)


@app.route('/api/tracker/list', methods=['GET'])
def get_reading_list():
    return jsonify({"list": tracker.get_reading_list()})


@app.route('/api/tracker/add', methods=['POST'])
def add_to_list():
    data = request.get_json() or {}
    book_id = data.get('book_id')
    if book_id is None:
        return jsonify({"error": "book_id required"}), 400

    book = recommender.get_book_by_id(book_id)
    if book is None:
        return jsonify({"error": "Book not found"}), 404

    success = tracker.add_book(book)
    if not success:
        return jsonify({"success": False, "message": "Book already in list"})
    return jsonify({
        "success": True,
        "book": tracker.get_book(book_id)
    })


@app.route('/api/tracker/remove', methods=['POST'])
def remove_from_list():
    data = request.get_json() or {}
    book_id = data.get('book_id')
    if book_id is None:
        return jsonify({"error": "book_id required"}), 400

    success = tracker.remove_book(book_id)
    if not success:
        return jsonify({"success": False, "message": "Book not in list"})
    return jsonify({"success": True})


@app.route('/api/tracker/progress', methods=['POST'])
def update_progress():
    data = request.get_json() or {}
    book_id = data.get('book_id')
    new_page = data.get('current_page', 0)

    if book_id is None:
        return jsonify({"error": "book_id required"}), 400

    result = tracker.update_progress(book_id, int(new_page))
    if result is None:
        return jsonify({"error": "Book not in list"}), 404
    return jsonify({"success": True, "book": result})


@app.route('/api/tracker/note/add', methods=['POST'])
def add_note():
    data = request.get_json() or {}
    book_id = data.get('book_id')
    content = data.get('content', '').strip()

    if book_id is None or not content:
        return jsonify({"error": "book_id and content required"}), 400

    result = tracker.add_note(book_id, content)
    if result is None:
        return jsonify({"error": "Book not in list"}), 404
    return jsonify({"success": True, "book": result})


@app.route('/api/tracker/note/delete', methods=['POST'])
def delete_note():
    data = request.get_json() or {}
    book_id = data.get('book_id')
    note_id = data.get('note_id')

    if book_id is None or note_id is None:
        return jsonify({"error": "book_id and note_id required"}), 400

    result = tracker.delete_note(book_id, note_id)
    if result is None:
        return jsonify({"error": "Book not in list"}), 404
    return jsonify({"success": True, "book": result})


@app.route('/api/tracker/check/<int:book_id>', methods=['GET'])
def check_in_list(book_id):
    return jsonify({"in_list": tracker.is_in_list(book_id)})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
