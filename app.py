
import os
import requests

from io import BytesIO
from urllib.parse import urlparse

from flask import Flask, render_template, request, jsonify, send_file
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

PIXABAY_API_KEY = os.getenv("PIXABAY_API_KEY")
PIXABAY_API_URL = "https://pixabay.com/api/"


CATEGORIES = {
    "god": "Shiva Krishna Ganesha Hindu deity",
    "barbie": "pink barbie aesthetic",
    "car": "luxury sports car BMW Lamborghini",
    "bike": "KTM superbike motorcycle",
    "nature": "beautiful nature mountains waterfall",
    "anime": "anime aesthetic illustration",
    "cute": "cute teddy bear flowers",
    "love": "romantic roses hearts",
    "aesthetic": "pastel dreamy aesthetic",
    "gaming": "gaming setup computer",
    "3d": "3D abstract digital art",
    "space": "galaxy universe planets"
}


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/wallpapers", methods=["GET"])
def wallpapers():

    if not PIXABAY_API_KEY:
        return jsonify({
            "error": "Pixabay API key is missing. Check your .env file."
        }), 500

    search = request.args.get("search", "").strip()
    category = request.args.get("category", "").strip().lower()
    sort = request.args.get("sort", "popular")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 24, type=int)

    page = max(1, page)
    per_page = max(1, min(per_page, 50))

    if search:
        query = search
    elif category in CATEGORIES:
        query = CATEGORIES[category]
    else:
        query = "beautiful wallpaper"

    params = {
        "key": PIXABAY_API_KEY,
        "q": query,
        "image_type": "photo",
        "orientation": "vertical",
        "safesearch": "true",
        "order": "popular" if sort == "popular" else "latest",
        "page": page,
        "per_page": per_page
    }

    try:
        response = requests.get(
            PIXABAY_API_URL,
            params=params,
            timeout=25
        )

        response.raise_for_status()
        data = response.json()

        results = []

        for image in data.get("hits", []):
            results.append({
                "id": image.get("id"),
                "title": image.get("tags", "Wallpaper"),
                "preview": image.get("webformatURL"),
                "full_image": image.get("largeImageURL"),
                "width": image.get("imageWidth"),
                "height": image.get("imageHeight"),
                "likes": image.get("likes", 0),
                "downloads": image.get("downloads", 0),
                "page_url": image.get("pageURL")
            })

        return jsonify({
            "wallpapers": results,
            "total": data.get("total", 0),
            "page": page
        })

    except requests.exceptions.Timeout:
        return jsonify({
            "error": "Pixabay is taking too long to respond."
        }), 504

    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": "Unable to fetch wallpapers from Pixabay.",
            "details": str(e)
        }), 502

    except Exception as e:
        return jsonify({
            "error": "Something went wrong.",
            "details": str(e)
        }), 500


@app.route("/download", methods=["GET"])
def download_wallpaper():

    image_url = request.args.get("url", "")

    if not image_url:
        return jsonify({"error": "Image URL is missing."}), 400

    parsed = urlparse(image_url)

    if parsed.scheme != "https" or parsed.hostname != "pixabay.com":
        return jsonify({"error": "Invalid image URL."}), 400

    try:
        response = requests.get(
            image_url,
            timeout=25,
            headers={"User-Agent": "Mozilla/5.0"}
        )

        response.raise_for_status()

        return send_file(
            BytesIO(response.content),
            mimetype=response.headers.get("Content-Type", "image/jpeg"),
            as_attachment=True,
            download_name="DreamWalls.jpg"
        )

    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": "Image download failed.",
            "details": str(e)
        }), 502


@app.errorhandler(404)
def not_found(error):
    if request.path.startswith("/api/"):
        return jsonify({"error": "API route not found."}), 404

    return "Page not found.", 404


if __name__ == "__main__":
    print("DreamWalls is starting...")
    print("API route: /api/wallpapers")

    app.run(
        host="127.0.0.1",
        port=5050,
        debug=False,
        use_reloader=False
    )
