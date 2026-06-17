import time
import uuid
import threading
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

online_users = 0

songs = [
    {
        "id": "1",
        "title": "Blinding Lights",
        "artist": "The Weeknd",
        "coverUrl": "https://picsum.photos/seed/song1/400/400",
        "duration": 200,
        "votes": 15,
        "addedBy": "User1",
    },
    {
        "id": "2",
        "title": "Shape of You",
        "artist": "Ed Sheeran",
        "coverUrl": "https://picsum.photos/seed/song2/400/400",
        "duration": 233,
        "votes": 12,
        "addedBy": "User2",
    },
    {
        "id": "3",
        "title": "Watermelon Sugar",
        "artist": "Harry Styles",
        "coverUrl": "https://picsum.photos/seed/song3/400/400",
        "duration": 174,
        "votes": 8,
        "addedBy": "User3",
    },
    {
        "id": "4",
        "title": "Levitating",
        "artist": "Dua Lipa",
        "coverUrl": "https://picsum.photos/seed/song4/400/400",
        "duration": 203,
        "votes": 6,
        "addedBy": "User4",
    },
    {
        "id": "5",
        "title": "Stay",
        "artist": "The Kid LAROI, Justin Bieber",
        "coverUrl": "https://picsum.photos/seed/song5/400/400",
        "duration": 141,
        "votes": 4,
        "addedBy": "User1",
    },
]

now_playing = {
    "song": {
        "id": "0",
        "title": "Sunflower",
        "artist": "Post Malone, Swae Lee",
        "coverUrl": "https://picsum.photos/seed/nowplaying/400/400",
        "duration": 158,
        "votes": 0,
        "addedBy": "System",
    },
    "currentTime": 65,
    "startedAt": int(time.time() * 1000) - 65000,
}

parsed_songs_db = {
    "https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b": {
        "title": "Blinding Lights",
        "artist": "The Weeknd",
        "coverUrl": "https://picsum.photos/seed/spotify1/400/400",
        "duration": 200,
    },
    "https://music.163.com/#/song?id=1330348068": {
        "title": "起风了",
        "artist": "买辣椒也用券",
        "coverUrl": "https://picsum.photos/seed/netease1/400/400",
        "duration": 325,
    },
    "https://open.spotify.com/track/0qiAJgBdH8BrD98d1cF8cQ": {
        "title": "Shape of You",
        "artist": "Ed Sheeran",
        "coverUrl": "https://picsum.photos/seed/spotify2/400/400",
        "duration": 233,
    },
}


def get_playlist_state():
    return {
        "nowPlaying": now_playing,
        "queue": songs,
        "onlineUsers": online_users,
        "totalSongs": len(songs) + 1,
    }


def broadcast_playlist():
    socketio.emit("playlist:update", get_playlist_state())


def simulate_playback():
    while True:
        time.sleep(1)
        current = now_playing["currentTime"] + 1
        if current >= now_playing["song"]["duration"]:
            if songs:
                songs_sorted = sorted(songs, key=lambda s: s["votes"], reverse=True)
                next_song = songs_sorted[0]
                now_playing["song"] = next_song
                now_playing["currentTime"] = 0
                now_playing["startedAt"] = int(time.time() * 1000)
                songs.remove(next_song)
            else:
                now_playing["currentTime"] = 0
        else:
            now_playing["currentTime"] = current
        broadcast_playlist()


@app.route("/api/playlist", methods=["GET"])
def api_get_playlist():
    return jsonify(get_playlist_state())


@app.route("/api/songs", methods=["POST"])
def api_add_song():
    data = request.get_json()
    url = data.get("url", "").strip()

    if not url:
        return jsonify({"error": "URL is required"}), 400

    song_data = parsed_songs_db.get(url)
    if not song_data:
        song_data = {
            "title": f"新歌曲 {len(songs) + 1}",
            "artist": "未知艺人",
            "coverUrl": f"https://picsum.photos/seed/newsong{len(songs)}/400/400",
            "duration": 180 + (len(songs) * 10) % 120,
        }

    new_song = {
        "id": str(uuid.uuid4()),
        "title": song_data["title"],
        "artist": song_data["artist"],
        "coverUrl": song_data["coverUrl"],
        "duration": song_data["duration"],
        "votes": 1,
        "addedBy": "Guest",
    }

    songs.append(new_song)
    socketio.emit("song:added", new_song)
    broadcast_playlist()

    return jsonify(new_song), 201


@app.route("/api/songs/<song_id>/vote", methods=["POST"])
def api_vote_song(song_id):
    for song in songs:
        if song["id"] == song_id:
            song["votes"] += 1
            broadcast_playlist()
            return jsonify({"success": True, "votes": song["votes"]})

    return jsonify({"error": "Song not found"}), 404


@socketio.on("connect")
def on_connect():
    global online_users
    online_users += 1
    emit("user:join", {"onlineUsers": online_users}, broadcast=True)
    broadcast_playlist()


@socketio.on("disconnect")
def on_disconnect():
    global online_users
    online_users = max(0, online_users - 1)
    emit("user:join", {"onlineUsers": online_users}, broadcast=True)


@socketio.on("song:vote")
def on_song_vote(data):
    song_id = data.get("songId")
    for song in songs:
        if song["id"] == song_id:
            song["votes"] += 1
            broadcast_playlist()
            break


if __name__ == "__main__":
    playback_thread = threading.Thread(target=simulate_playback, daemon=True)
    playback_thread.start()
    socketio.run(app, host="0.0.0.0", port=5000, debug=False)
