from flask import Flask, jsonify, request
from flask_cors import CORS
import random
import uuid
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

plants = [
    {
        'id': str(uuid.uuid4()),
        'name': '小绿',
        'species': '绿萝',
        'plantDate': '2026-01-15',
        'photo': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=lush%20green%20pothos%20plant%20in%20white%20pot&image_size=square',
        'waterFrequency': 3,
        'fertilizeFrequency': 30,
        'repotFrequency': 365,
        'lastWatered': '2026-06-18',
        'lastFertilized': '2026-05-20',
        'lastRepotted': '2026-01-15',
        'status': 'healthy'
    },
    {
        'id': str(uuid.uuid4()),
        'name': '多肉宝宝',
        'species': '多肉',
        'plantDate': '2026-03-20',
        'photo': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20succulent%20plant%20in%20terracotta%20pot&image_size=square',
        'waterFrequency': 14,
        'fertilizeFrequency': 60,
        'repotFrequency': 545,
        'lastWatered': '2026-06-10',
        'lastFertilized': '2026-04-20',
        'lastRepotted': '2026-03-20',
        'status': 'thirsty'
    },
    {
        'id': str(uuid.uuid4()),
        'name': '龟背先生',
        'species': '龟背竹',
        'plantDate': '2026-02-10',
        'photo': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=large%20monstera%20deliciosa%20plant%20with%20split%20leaves&image_size=square',
        'waterFrequency': 5,
        'fertilizeFrequency': 21,
        'repotFrequency': 365,
        'lastWatered': '2026-06-15',
        'lastFertilized': '2026-05-30',
        'lastRepotted': '2026-02-10',
        'status': 'low_light'
    }
]

species_defaults = {
    '绿萝': {'waterFrequency': 3, 'fertilizeFrequency': 30, 'repotFrequency': 365},
    '多肉': {'waterFrequency': 14, 'fertilizeFrequency': 60, 'repotFrequency': 545},
    '龟背竹': {'waterFrequency': 5, 'fertilizeFrequency': 21, 'repotFrequency': 365},
    '琴叶榕': {'waterFrequency': 7, 'fertilizeFrequency': 30, 'repotFrequency': 365},
    '蝴蝶兰': {'waterFrequency': 7, 'fertilizeFrequency': 14, 'repotFrequency': 730}
}


@app.route('/api/plants', methods=['GET'])
def get_plants():
    return jsonify(plants)


@app.route('/api/plants', methods=['POST'])
def add_plant():
    data = request.json
    species = data.get('species', '绿萝')
    defaults = species_defaults.get(species, species_defaults['绿萝'])
    today = datetime.now().strftime('%Y-%m-%d')

    new_plant = {
        'id': str(uuid.uuid4()),
        'name': data.get('name', ''),
        'species': species,
        'plantDate': data.get('plantDate', today),
        'photo': data.get('photo', ''),
        'waterFrequency': data.get('waterFrequency', defaults['waterFrequency']),
        'fertilizeFrequency': data.get('fertilizeFrequency', defaults['fertilizeFrequency']),
        'repotFrequency': data.get('repotFrequency', defaults['repotFrequency']),
        'lastWatered': today,
        'lastFertilized': today,
        'lastRepotted': data.get('plantDate', today),
        'status': 'healthy'
    }
    plants.append(new_plant)
    return jsonify(new_plant), 201


@app.route('/api/plants/<plant_id>', methods=['DELETE'])
def delete_plant(plant_id):
    global plants
    plants = [p for p in plants if p['id'] != plant_id]
    return jsonify({'message': '删除成功'})


@app.route('/api/plants/<plant_id>', methods=['PUT'])
def update_plant(plant_id):
    data = request.json
    for plant in plants:
        if plant['id'] == plant_id:
            plant.update(data)
            return jsonify(plant)
    return jsonify({'error': '植物不存在'}), 404


@app.route('/api/sensor', methods=['GET'])
def get_sensor_data():
    data = {
        'temperature': round(20 + random.random() * 10, 1),
        'humidity': round(50 + random.random() * 30, 1),
        'light': round(500 + random.random() * 800),
        'soilMoisture': round(20 + random.random() * 60, 1)
    }
    return jsonify(data)


@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    tasks = []
    today = datetime.now()

    for plant in plants:
        task_types = [
            ('water', plant['waterFrequency'], plant['lastWatered']),
            ('fertilize', plant['fertilizeFrequency'], plant['lastFertilized']),
            ('repot', plant['repotFrequency'], plant['lastRepotted'])
        ]

        for task_type, frequency, last_date_str in task_types:
            try:
                last_date = datetime.strptime(last_date_str, '%Y-%m-%d')
            except ValueError:
                continue

            for i in range(60):
                next_date = last_date + timedelta(days=(i + 1) * frequency)
                if next_date >= today:
                    date_str = next_date.strftime('%Y-%m-%d')
                    tasks.append({
                        'id': f"{plant['id']}-{task_type}-{date_str}",
                        'plantId': plant['id'],
                        'plantName': plant['name'],
                        'type': task_type,
                        'date': date_str,
                        'completed': False
                    })
                    break

    return jsonify(tasks)


@app.route('/api/advice', methods=['GET'])
def get_care_advice():
    sensor_data = {
        'temperature': round(20 + random.random() * 10, 1),
        'humidity': round(50 + random.random() * 30, 1),
        'light': round(500 + random.random() * 800),
        'soilMoisture': round(20 + random.random() * 60, 1)
    }

    advice = []

    for plant in plants:
        if sensor_data['soilMoisture'] < 30 and plant['status'] != 'thirsty':
            advice.append({
                'plantId': plant['id'],
                'plantName': plant['name'],
                'advice': '土壤湿度较低，建议及时浇水',
                'priority': 'high'
            })

        if sensor_data['light'] < 600 and plant['species'] != '多肉':
            advice.append({
                'plantId': plant['id'],
                'plantName': plant['name'],
                'advice': '光照不足，建议移到光线更好的位置',
                'priority': 'medium'
            })

        if sensor_data['temperature'] > 30:
            advice.append({
                'plantId': plant['id'],
                'plantName': plant['name'],
                'advice': '温度过高，注意遮阳和通风',
                'priority': 'medium'
            })

        if sensor_data['humidity'] < 40 and plant['species'] == '龟背竹':
            advice.append({
                'plantId': plant['id'],
                'plantName': plant['name'],
                'advice': '空气太干燥，建议喷雾增湿',
                'priority': 'low'
            })

    return jsonify(advice)


@app.route('/api/growth', methods=['GET'])
def get_growth_data():
    data = []
    today = datetime.now()
    for i in range(29, -1, -1):
        d = today - timedelta(days=i)
        data.append({
            'date': f"{d.month}/{d.day}",
            'count': random.randint(1, 3)
        })
    return jsonify(data)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
