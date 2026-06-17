from flask import Flask
from flask_cors import CORS
from routes.inventory import inventory_bp
from routes.orders import orders_bp
from routes.forecast import forecast_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(inventory_bp)
app.register_blueprint(orders_bp)
app.register_blueprint(forecast_bp)


@app.route("/api/health", methods=["GET"])
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
