let currentOffset = 0;
const limit = 20;
let allFilesLoaded = false;

function showAlert(message, type = "success") {
    const alertsDiv = document.getElementById("alerts");
    const alertDiv = document.createElement("div");
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertsDiv.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}

function formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString("ru-RU");
}

async function loadStats() {
    try {
        const response = await fetch("/api/stats");
        const data = await response.json();
        if (data.success) {
            document.getElementById("total-files").textContent = data.stats.total_files;
            document.getElementById("total-size").textContent = formatBytes(data.stats.total_size);
            document.getElementById("storage-limit").textContent = formatBytes(data.storage_limit);
        }
    } catch (error) {
        console.error("Ошибка загрузки статистики:", error);
    }
}

async function loadFiles(offset = 0, append = false) {
    if (!append) {
        document.getElementById("files-loading").style.display = "block";
        document.getElementById("files-grid").innerHTML = "";
        currentOffset = 0;
        allFilesLoaded = false;
    }

    try {
        const response = await fetch(`/api/files?limit=${limit}&offset=${offset}`);
        const data = await response.json();

        if (data.success) {
            if (!append) {
                document.getElementById("files-grid").innerHTML = "";
            }

            if (data.files.length === 0 && offset === 0) {
                document.getElementById("files-grid").innerHTML = '<p style="text-align: center; color: #666;">Файлы не найдены</p>';
            } else {
                data.files.forEach(file => {
                    const fileCard = createFileCard(file);
                    document.getElementById("files-grid").appendChild(fileCard);
                });
            }

            currentOffset = offset + data.files.length;
            allFilesLoaded = data.files.length < limit;

            const loadMoreBtn = document.getElementById("load-more-btn");
            if (allFilesLoaded || data.files.length === 0) {
                loadMoreBtn.style.display = "none";
            } else {
                loadMoreBtn.style.display = "inline-block";
            }
        }
    } catch (error) {
        showAlert("Ошибка загрузки файлов", "error");
    } finally {
        document.getElementById("files-loading").style.display = "none";
    }
}

function createFileCard(file) {
    const card = document.createElement("div");
    card.className = "file-card";
    card.innerHTML = `
        <div class="file-name">${file.filename}</div>
        <div class="file-info">
            Размер: ${formatBytes(file.size)}<br>
            Загружен: ${formatDate(file.upload_time)}<br>
        </div>
        <div class="file-actions">
            <button class="btn btn-success" onclick="downloadFile('${file.hash}')">
                📥 Скачать
            </button>
            <button class="btn btn-danger" onclick="deleteFile('${file.hash}')">
                🗑️ Удалить
            </button>
        </div>
    `;
    return card;
}

async function downloadFile(fileHash) {
    try {
        const response = await fetch(`/api/download/${fileHash}`);
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = response.headers.get("X-Filename") || "file";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showAlert("Файл скачан");
        } else {
            const error = await response.json();
            showAlert(error.error || "Ошибка скачивания", "error");
        }
    } catch (error) {
        showAlert("Ошибка скачивания файла", "error");
    }
}

async function deleteFile(fileHash) {
    if (!confirm("Вы уверены, что хотите удалить этот файл?")) {
        return;
    }

    try {
        const response = await fetch(`/api/delete/${fileHash}`, {
            method: "DELETE"
        });
        const data = await response.json();

        if (data.success) {
            showAlert("Файл удален");
            loadFiles();
            loadStats();
        } else {
            showAlert(data.error || "Ошибка удаления", "error");
        }
    } catch (error) {
        showAlert("Ошибка удаления файла", "error");
    }
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const progressBar = document.getElementById("progress-bar");
    const progressFill = document.getElementById("progress-fill");
    const uploadLoading = document.getElementById("upload-loading");

    progressBar.style.display = "block";
    uploadLoading.style.display = "block";

    try {
        const response = await fetch("/api/upload", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showAlert(`Файл "${file.name}" успешно загружен`);
            loadFiles();
            loadStats();
        } else {
            showAlert(data.error || "Ошибка загрузки", "error");
        }
    } catch (error) {
        showAlert("Ошибка загрузки файла", "error");
    } finally {
        progressBar.style.display = "none";
        uploadLoading.style.display = "none";
        progressFill.style.width = "0%";
    }
}

document.addEventListener("DOMContentLoaded", function() {
    loadStats();
    loadFiles();

    const uploadArea = document.getElementById("upload-area");
    const fileInput = document.getElementById("file-input");
    const searchInput = document.getElementById("search-input");
    const loadMoreBtn = document.getElementById("load-more-btn");

    uploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadArea.classList.add("dragover");
    });

    uploadArea.addEventListener("dragleave", () => {
        uploadArea.classList.remove("dragover");
    });

    uploadArea.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadArea.classList.remove("dragover");
        const files = Array.from(e.dataTransfer.files);
        files.forEach(uploadFile);
    });

    fileInput.addEventListener("change", (e) => {
        const files = Array.from(e.target.files);
        files.forEach(uploadFile);
    });

    searchInput.addEventListener("input", (e) => {
        const query = e.target.value;
        clearTimeout(searchInput.timeout);
        searchInput.timeout = setTimeout(() => searchFiles(query), 300);
    });

    loadMoreBtn.addEventListener("click", () => {
        loadFiles(currentOffset, true);
    });
});