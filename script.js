
document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("wallpaperGrid");
    const favoriteGrid = document.getElementById("favoriteGrid");
    const recentGrid = document.getElementById("recentGrid");
    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");
    const sortSelect = document.getElementById("sortSelect");
    const loadMoreBtn = document.getElementById("loadMoreBtn");
    const errorMessage = document.getElementById("errorMessage");
    const resultCount = document.getElementById("resultCount");
    const galleryTitle = document.getElementById("galleryTitle");

    const modal = document.getElementById("previewModal");
    const previewImage = document.getElementById("previewImage");
    const previewTitle = document.getElementById("previewTitle");
    const previewDimensions = document.getElementById("previewDimensions");
    const previewDownload = document.getElementById("previewDownload");
    const closeModal = document.getElementById("closeModal");
    const themeToggle = document.getElementById("themeToggle");

    const API = "";

    let page = 1;
    let category = "";
    let search = "";
    let sort = "popular";
    let loading = false;
    let total = 0;
    let currentPreview = null;

    function getStored(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch {
            return [];
        }
    }

    function store(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[character];
        });
    }

    function showError(message) {
        errorMessage.textContent = message;
    }

    function clearError() {
        errorMessage.textContent = "";
    }

    function getCategoryName(value) {
        const names = {
            all: "Explore Wallpapers",
            god: "God Wallpapers",
            barbie: "Barbie Wallpapers",
            car: "Car Wallpapers",
            bike: "Bike Wallpapers",
            nature: "Nature Wallpapers",
            anime: "Anime Wallpapers",
            cute: "Cute Wallpapers",
            love: "Love Wallpapers",
            aesthetic: "Aesthetic Wallpapers",
            gaming: "Gaming Wallpapers",
            "3d": "3D Wallpapers",
            space: "Space Wallpapers"
        };

        return names[value] || "Explore Wallpapers";
    }

    function createCard(image, section = "main") {
        const card = document.createElement("div");
        card.className = "wallpaper-card";

        const favorites = getStored("dreamwalls_favorites");
        const isFavorite = favorites.some(item => item.id === image.id);

        card.innerHTML = `
            <div class="wallpaper-image-container">
                <img
                    src="${escapeHTML(image.preview)}"
                    alt="${escapeHTML(image.title)}"
                    class="wallpaper-image"
                    loading="lazy"
                >

                <button class="favorite-button" title="Favourite">
                    ${isFavorite ? "♥" : "♡"}
                </button>

                <button class="download-button">
                    ⬇ Download
                </button>
            </div>

            <div class="wallpaper-info">
                <p>${escapeHTML(image.title)}</p>
            </div>
        `;

        const img = card.querySelector(".wallpaper-image");
        const favBtn = card.querySelector(".favorite-button");
        const downloadBtn = card.querySelector(".download-button");

        img.addEventListener("click", () => openPreview(image));

        favBtn.addEventListener("click", () => {
            let saved = getStored("dreamwalls_favorites");

            const exists = saved.some(item => item.id === image.id);

            if (exists) {
                saved = saved.filter(item => item.id !== image.id);
                favBtn.textContent = "♡";
            } else {
                saved.push(image);
                favBtn.textContent = "♥";
            }

            store("dreamwalls_favorites", saved);
            renderFavorites();
        });

        downloadBtn.addEventListener("click", async () => {
            try {
                downloadBtn.disabled = true;
                downloadBtn.textContent = "Downloading...";

                const response = await fetch(
                    `/download?url=${encodeURIComponent(image.full_image)}`
                );

                if (!response.ok) {
                    throw new Error("Download failed.");
                }

                const blob = await response.blob();
                const objectURL = URL.createObjectURL(blob);

                const link = document.createElement("a");
                link.href = objectURL;
                link.download = "DreamWalls.jpg";
                link.click();

                URL.revokeObjectURL(objectURL);

            } catch (error) {
                alert("Unable to download this wallpaper.");
            } finally {
                downloadBtn.disabled = false;
                downloadBtn.textContent = "⬇ Download";
            }
        });

        return card;
    }

    async function loadWallpapers(reset = true) {
        if (loading) return;

        loading = true;
        clearError();

        if (reset) {
            page = 1;
            grid.innerHTML = "";
        }

        grid.innerHTML = reset
            ? `<div class="loading">Loading beautiful wallpapers... ✨</div>`
            : grid.innerHTML;

        const params = new URLSearchParams();

        params.set("page", page);
        params.set("per_page", "24");
        params.set("sort", sort);

        if (search) {
            params.set("search", search);
        }

        if (category) {
            params.set("category", category);
        }

        try {
            const response = await fetch(
                `/api/wallpapers?${params.toString()}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Unable to load wallpapers.");
            }

            total = data.total || 0;

            if (reset) {
                grid.innerHTML = "";
            }

            if (!data.wallpapers || data.wallpapers.length === 0) {
                if (page === 1) {
                    grid.innerHTML =
                        `<p class="empty-message">No wallpapers found.</p>`;
                }

                loadMoreBtn.style.display = "none";
                resultCount.textContent = "No wallpapers found.";
                return;
            }

            data.wallpapers.forEach(image => {
                grid.appendChild(createCard(image));
            });

            resultCount.textContent =
                `${total.toLocaleString()} wallpapers available`;

            loadMoreBtn.style.display =
                (page * 24 < total) ? "block" : "none";

        } catch (error) {
            console.error(error);
            grid.innerHTML = "";
            showError(error.message);
        } finally {
            loading = false;
        }
    }

    function openPreview(image) {
        currentPreview = image;

        previewImage.src = image.full_image;
        previewTitle.textContent = image.title;

        previewDimensions.textContent =
            `${image.width || ""} × ${image.height || ""}`;

        modal.classList.add("active");
        modal.style.display = "flex";

        let recent = getStored("dreamwalls_recent");

        recent = recent.filter(item => item.id !== image.id);
        recent.unshift(image);
        recent = recent.slice(0, 20);

        store("dreamwalls_recent", recent);
        renderRecent();
    }

    function closePreview() {
        modal.classList.remove("active");
        modal.style.display = "none";
    }

    closeModal.addEventListener("click", closePreview);

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            closePreview();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closePreview();
        }
    });

    previewDownload.addEventListener("click", async () => {
        if (!currentPreview) return;

        try {
            previewDownload.disabled = true;

            const response = await fetch(
                `/download?url=${encodeURIComponent(currentPreview.full_image)}`
            );

            if (!response.ok) {
                throw new Error("Download failed.");
            }

            const blob = await response.blob();
            const objectURL = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = objectURL;
            link.download = "DreamWalls.jpg";
            link.click();

            URL.revokeObjectURL(objectURL);

        } catch (error) {
            alert("Download failed.");
        } finally {
            previewDownload.disabled = false;
        }
    });

    function renderFavorites() {
        const favorites = getStored("dreamwalls_favorites");

        favoriteGrid.innerHTML = "";

        if (favorites.length === 0) {
            favoriteGrid.innerHTML =
                `<p class="empty-message">
                    Your favourite wallpapers will appear here.
                </p>`;
            return;
        }

        favorites.forEach(image => {
            favoriteGrid.appendChild(createCard(image, "favorites"));
        });
    }

    function renderRecent() {
        const recent = getStored("dreamwalls_recent");

        recentGrid.innerHTML = "";

        if (recent.length === 0) {
            recentGrid.innerHTML =
                `<p class="empty-message">
                    You haven't viewed any wallpapers yet.
                </p>`;
            return;
        }

        recent.forEach(image => {
            recentGrid.appendChild(createCard(image, "recent"));
        });
    }

    searchBtn.addEventListener("click", () => {
        search = searchInput.value.trim();
        category = "";
        page = 1;

        galleryTitle.textContent = search
            ? `Results for "${search}"`
            : "Explore Wallpapers";

        loadWallpapers(true);
    });

    searchInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            searchBtn.click();
        }
    });

    document.querySelectorAll("[data-category]").forEach(button => {
        button.addEventListener("click", () => {
            const selected = button.dataset.category;

            category = selected === "all" ? "" : selected;
            search = "";
            searchInput.value = "";
            page = 1;

            document.querySelectorAll(".category-card").forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            galleryTitle.textContent = getCategoryName(selected);

            loadWallpapers(true);
        });
    });

    sortSelect.addEventListener("change", () => {
        sort = sortSelect.value;
        page = 1;
        loadWallpapers(true);
    });

    loadMoreBtn.addEventListener("click", () => {
        if (loading || page * 24 >= total) return;

        page++;
        loadWallpapers(false);
    });

    themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");

        const isDark = document.body.classList.contains("dark-mode");
        themeToggle.textContent = isDark ? "☀️" : "🌙";

        store("dreamwalls_theme", isDark ? "dark" : "light");
    });

    if (getStored("dreamwalls_theme") === "dark") {
        document.body.classList.add("dark-mode");
        themeToggle.textContent = "☀️";
    }

    renderFavorites();
    renderRecent();

    galleryTitle.textContent = "Explore Wallpapers";
    loadWallpapers(true);
});
