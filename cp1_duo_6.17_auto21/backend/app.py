from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
CORS(app, resources={r"/*": {"origins": Config.CORS_ORIGINS, "methods": Config.CORS_METHODS}})
db = SQLAlchemy(app)


class Preset(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    obstacle_type = db.Column(db.String(50), nullable=False)
    wind_speed = db.Column(db.Float, default=8.0)
    particle_density = db.Column(db.Integer, default=5000)
    rotation_x = db.Column(db.Float, default=0.0)
    rotation_y = db.Column(db.Float, default=0.0)
    rotation_z = db.Column(db.Float, default=0.0)
    display_mode = db.Column(db.String(20), default='particles')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'obstacleType': self.obstacle_type,
            'windSpeed': self.wind_speed,
            'particleDensity': self.particle_density,
            'rotationX': self.rotation_x,
            'rotationY': self.rotation_y,
            'rotationZ': self.rotation_z,
            'displayMode': self.display_mode,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


@app.route('/preset', methods=['POST'])
def create_preset():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No input data provided'}), 400

        required_fields = ['name', 'obstacleType']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        preset = Preset(
            name=data['name'],
            obstacle_type=data['obstacleType'],
            wind_speed=data.get('windSpeed', 8.0),
            particle_density=data.get('particleDensity', 5000),
            rotation_x=data.get('rotationX', 0.0),
            rotation_y=data.get('rotationY', 0.0),
            rotation_z=data.get('rotationZ', 0.0),
            display_mode=data.get('displayMode', 'particles')
        )

        db.session.add(preset)
        db.session.commit()

        return jsonify({
            'id': preset.id,
            'name': preset.name,
            'message': 'Preset saved'
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/presets', methods=['GET'])
def get_presets():
    try:
        presets = Preset.query.order_by(Preset.created_at.desc()).all()
        return jsonify([preset.to_dict() for preset in presets]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/preset/<int:id>', methods=['DELETE'])
def delete_preset(id):
    try:
        preset = Preset.query.get(id)
        if not preset:
            return jsonify({'message': 'Preset not found'}), 404

        db.session.delete(preset)
        db.session.commit()

        return jsonify({'message': 'Preset deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000, debug=True)
