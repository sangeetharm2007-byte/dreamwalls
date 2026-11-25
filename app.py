
import os
import requests

from io import BytesIO
from urllib.parse import urlparse
from flask import Flask, render_template, request, jsonify, send_file
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

PIXABAY_API_KEY = os.getenv("PIXABAY_API_KEY")


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/wallpapers")
def get_wallpapers():
    category = request.args.get("category", "")
    search = request.args.get("search", "")
    page = request.args.get("page", 1)
    sort = request.args.get("sort", "popular")

    if search:
        query = search
    elif category:
        query = category
    else:
        query = "nature"

    if not PIXABAY_API_KEY:
        return jsonify({"error": "Pixabay API key is missing."}), 500

    try:
        response = requests.get(
            "https://pixabay.com/api/",
            params={
                "key": PIXABAY_API_KEY,
                "q": query,
                "image_type": "photo",
                "orientation": "vertical",
                "safesearch": "true",
                "per_page": 24,
                "page": page,
            },
            timeout=20
        )

        response.raise_for_status()
        data = response.json()

        wallpapers = []

        for hit in data.get("hits", []):
            wallpapers.append({
                "id": hit["id"],
                "title": hit.get("tags", "Wallpaper"),
                "preview": hit.get("webformatURL", ""),
                "full_image": hit.get("largeImageURL", ""),
                "width": hit.get("imageWidth", 0),
                "height": hit.get("imageHeight", 0)
            })

        return jsonify({
            "wallpapers": wallpapers,
            "total": data.get("totalHits", 0)
        })

    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": "Unable to load wallpapers.",
            "details": str(e)
        }), 502


@app.route("/download", methods=["GET"])
def download_wallpaper():
    image_url = request.args.get("url", "")

    if not image_url:
        return jsonify({"error": "Image URL is missing."}), 400

    parsed = urlparse(image_url)
    hostname = parsed.hostname or ""

    if (
        parsed.scheme != "https"
        or not (
            hostname == "pixabay.com"
            or hostname.endswith(".pixabay.com")
        )
    ):
        return jsonify({"error": "Invalid image URL."}), 400

    try:
        response = requests.get(
            image_url,
            timeout=30,
            headers={"User-Agent": "Mozilla/5.0"}
        )

        response.raise_for_status()

        content_type = response.headers.get(
            "Content-Type", "image/jpeg"
        )

        if not content_type.startswith("image/"):
            return jsonify({
                "error": "The URL did not return an image."
            }), 400

        return send_file(
            BytesIO(response.content),
            mimetype=content_type,
            as_attachment=True,
            download_name="DreamWalls.jpg"
        )

    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": "Image download failed.",
            "details": str(e)
        }), 502


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5050, debug=True)
