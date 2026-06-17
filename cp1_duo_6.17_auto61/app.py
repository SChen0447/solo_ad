from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

components = [
    {
        "id": 1,
        "name": "Primary Button",
        "category": "button",
        "tags": ["button", "primary", "action"],
        "defaultProps": {
            "text": "Click Me",
            "variant": "primary"
        }
    },
    {
        "id": 2,
        "name": "Secondary Button",
        "category": "button",
        "tags": ["button", "secondary"],
        "defaultProps": {
            "text": "Cancel",
            "variant": "secondary"
        }
    },
    {
        "id": 3,
        "name": "Outline Button",
        "category": "button",
        "tags": ["button", "outline"],
        "defaultProps": {
            "text": "Learn More",
            "variant": "outline"
        }
    },
    {
        "id": 4,
        "name": "Info Card",
        "category": "card",
        "tags": ["card", "info", "display"],
        "defaultProps": {
            "title": "Welcome",
            "description": "This is a sample card component with some description text."
        }
    },
    {
        "id": 5,
        "name": "Profile Card",
        "category": "card",
        "tags": ["card", "profile", "user"],
        "defaultProps": {
            "title": "John Doe",
            "description": "Software Engineer at Example Corp"
        }
    },
    {
        "id": 6,
        "name": "Product Card",
        "category": "card",
        "tags": ["card", "product", "ecommerce"],
        "defaultProps": {
            "title": "Premium Widget",
            "description": "High-quality widget with amazing features."
        }
    },
    {
        "id": 7,
        "name": "Text Input",
        "category": "input",
        "tags": ["input", "text", "form"],
        "defaultProps": {
            "placeholder": "Enter your text here...",
            "label": "Username"
        }
    },
    {
        "id": 8,
        "name": "Email Input",
        "category": "input",
        "tags": ["input", "email", "form"],
        "defaultProps": {
            "placeholder": "your@email.com",
            "label": "Email Address"
        }
    },
    {
        "id": 9,
        "name": "Password Input",
        "category": "input",
        "tags": ["input", "password", "form", "security"],
        "defaultProps": {
            "placeholder": "••••••••",
            "label": "Password"
        }
    },
    {
        "id": 10,
        "name": "Alert Modal",
        "category": "modal",
        "tags": ["modal", "alert", "dialog"],
        "defaultProps": {
            "title": "Alert",
            "content": "This is an important alert message.",
            "buttonText": "OK"
        }
    },
    {
        "id": 11,
        "name": "Confirm Modal",
        "category": "modal",
        "tags": ["modal", "confirm", "dialog"],
        "defaultProps": {
            "title": "Confirm Action",
            "content": "Are you sure you want to proceed?",
            "buttonText": "Confirm"
        }
    },
    {
        "id": 12,
        "name": "Info Modal",
        "category": "modal",
        "tags": ["modal", "info", "dialog"],
        "defaultProps": {
            "title": "Information",
            "content": "Here is some useful information for you.",
            "buttonText": "Got it"
        }
    }
]

themes = [
    {
        "id": "default",
        "name": "Default Blue",
        "primaryColor": "#3b82f6",
        "secondaryColor": "#10b981",
        "bgColor": "#ffffff",
        "fontFamily": "Inter, system-ui, sans-serif"
    },
    {
        "id": "ocean",
        "name": "Ocean Breeze",
        "primaryColor": "#0ea5e9",
        "secondaryColor": "#06b6d4",
        "bgColor": "#f0f9ff",
        "fontFamily": "Georgia, serif"
    },
    {
        "id": "sunset",
        "name": "Sunset Warm",
        "primaryColor": "#f97316",
        "secondaryColor": "#ef4444",
        "bgColor": "#fffbeb",
        "fontFamily": "'Courier New', monospace"
    },
    {
        "id": "forest",
        "name": "Forest Green",
        "primaryColor": "#22c55e",
        "secondaryColor": "#84cc16",
        "bgColor": "#f0fdf4",
        "fontFamily": "'Times New Roman', serif"
    },
    {
        "id": "lavender",
        "name": "Lavender Dream",
        "primaryColor": "#a855f7",
        "secondaryColor": "#ec4899",
        "bgColor": "#faf5ff",
        "fontFamily": "Verdana, sans-serif"
    },
    {
        "id": "midnight",
        "name": "Midnight Dark",
        "primaryColor": "#6366f1",
        "secondaryColor": "#8b5cf6",
        "bgColor": "#1e293b",
        "fontFamily": "system-ui, sans-serif"
    }
]

favorites = set()


@app.route('/api/components', methods=['GET'])
def get_components():
    return jsonify(components)


@app.route('/api/themes', methods=['GET'])
def get_themes():
    return jsonify(themes)


@app.route('/api/favorites', methods=['GET'])
def get_favorites():
    return jsonify(list(favorites))


@app.route('/api/favorites', methods=['POST'])
def toggle_favorite():
    data = request.get_json()
    component_id = data.get('id')
    if component_id is None:
        return jsonify({'success': False, 'error': 'Missing component id'}), 400
    if component_id in favorites:
        favorites.remove(component_id)
        is_favorite = False
    else:
        favorites.add(component_id)
        is_favorite = True
    return jsonify({'success': True, 'id': component_id, 'isFavorite': is_favorite})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
