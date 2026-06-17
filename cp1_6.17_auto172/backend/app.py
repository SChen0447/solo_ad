from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans, DBSCAN
from sklearn.datasets import load_iris
from sklearn.preprocessing import StandardScaler
import io
import math

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


def euclidean_distance(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def compute_cluster_stats(points, labels, centroids):
    n = len(points)
    dims = len(points[0]) if n > 0 else 0

    clusters = {}
    for i, lbl in enumerate(labels):
        if lbl < 0:
            continue
        if lbl not in clusters:
            clusters[lbl] = []
        clusters[lbl].append(i)

    stats = []
    valid_labels = sorted(clusters.keys())

    for lbl in valid_labels:
        indices = clusters[lbl]
        if lbl >= len(centroids):
            continue
        centroid = centroids[lbl]

        total_dist = 0.0
        for idx in indices:
            total_dist += euclidean_distance(points[idx], centroid)

        avg_dist = total_dist / len(indices) if indices else 0.0

        c3d = [
            float(centroid[0]) if dims > 0 else 0.0,
            float(centroid[1]) if dims > 1 else 0.0,
            float(centroid[2]) if dims > 2 else 0.0,
        ]

        stats.append({
            "label": int(lbl),
            "count": len(indices),
            "centroid": c3d,
            "avgDistance": float(avg_dist),
        })

    return stats


def compute_centroids_from_labels(points, labels):
    n = len(points)
    dims = len(points[0]) if n > 0 else 0

    clusters = {}
    for i, lbl in enumerate(labels):
        if lbl < 0:
            continue
        if lbl not in clusters:
            clusters[lbl] = []
        clusters[lbl].append(points[i])

    centroids = []
    for lbl in sorted(clusters.keys()):
        cluster_pts = clusters[lbl]
        c = [0.0] * dims
        for p in cluster_pts:
            for d in range(dims):
                c[d] += p[d]
        for d in range(dims):
            c[d] /= len(cluster_pts)
        centroids.append(c)

    return centroids


@app.route("/cluster", methods=["POST"])
def cluster():
    try:
        data = request.get_json(force=True)
        if not data or "points" not in data:
            return jsonify({"error": "Missing points data"}), 400

        points_raw = data["points"]
        algorithm = data.get("algorithm", "kmeans")
        k = int(data.get("k", 3))
        epsilon = float(data.get("epsilon", 0.5))

        if not points_raw:
            return jsonify({
                "labels": [],
                "centroids": [],
                "stats": [],
            })

        X = np.array(points_raw, dtype=np.float64)
        if X.ndim == 1:
            X = X.reshape(1, -1)

        labels_list = []
        centroids_list = []

        if algorithm == "kmeans":
            k = min(k, len(X))
            model = KMeans(n_clusters=k, random_state=42, n_init=10, max_iter=300)
            model.fit(X)
            labels_list = model.labels_.tolist()
            centroids_list = model.cluster_centers_.tolist()
        else:
            model = DBSCAN(eps=epsilon, min_samples=4)
            model.fit(X)
            labels_list = model.labels_.tolist()
            centroids_list = compute_centroids_from_labels(points_raw, labels_list)

        stats = compute_cluster_stats(points_raw, labels_list, centroids_list)

        return jsonify({
            "labels": [int(l) for l in labels_list],
            "centroids": [[float(v) for v in c] for c in centroids_list],
            "stats": stats,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/csv-parse", methods=["POST"])
def csv_parse():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files["file"]
        content = file.read().decode("utf-8", errors="replace")

        df = None
        for sep in [",", "\t", ";"]:
            try:
                df = pd.read_csv(io.StringIO(content), sep=sep, engine="python")
                if df is not None and len(df.columns) >= 3:
                    break
            except Exception:
                continue

        if df is None:
            try:
                df = pd.read_csv(io.StringIO(content), sep=None, engine="python")
            except Exception:
                df = pd.read_csv(io.StringIO(content))

        max_cols = 10
        if len(df.columns) > max_cols:
            df = df.iloc[:, :max_cols]

        df_clean = df.apply(pd.to_numeric, errors="coerce")
        df_clean = df_clean.dropna()

        if df_clean.shape[1] < 3:
            return jsonify({"error": "CSV must have at least 3 numeric columns"}), 400

        coords = df_clean.iloc[:, :3].values.tolist()
        features = df_clean.iloc[:, 3:].values.tolist() if df_clean.shape[1] > 3 else [[] for _ in range(len(coords))]

        return jsonify({
            "points": [[float(v) for v in p] for p in coords],
            "features": [[float(v) for v in f] for f in features],
            "columns": list(df_clean.columns.astype(str)),
            "count": len(coords),
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/sample", methods=["GET"])
def sample():
    try:
        iris = load_iris()
        X = iris.data
        X_coords = X[:, :3].tolist()
        X_features = X[:, 3:4].tolist() if X.shape[1] > 3 else [[] for _ in range(len(X_coords))]

        return jsonify({
            "points": [[float(v) for v in p] for p in X_coords],
            "features": [[float(v) for v in f] for f in X_features],
            "columns": ["sepal_length", "sepal_width", "petal_length", "petal_width"],
            "count": len(X_coords),
            "dataset": "iris",
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "cluster-api",
    })


if __name__ == "__main__":
    print("Starting clustering backend server on http://localhost:5000")
    print("Endpoints:")
    print("  POST /cluster - KMeans/DBSCAN clustering")
    print("  POST /csv-parse - Parse CSV file upload")
    print("  GET  /sample - Iris dataset sample")
    print("  GET  /health - Health check")
    app.run(host="0.0.0.0", port=5000, debug=False)
