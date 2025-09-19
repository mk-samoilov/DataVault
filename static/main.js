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

function getFileIcon(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    
    // Список расширений файлов программного кода
    const codeExtensions = [
        'py', 'c', 'cpp', 'h', 'hpp', 'java', 'js', 'ts', 'jsx', 'tsx',
        'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'sh',
        'bash', 'ps1', 'bat', 'cmd', 'sql', 'html', 'css', 'scss', 'sass',
        'less', 'xml', 'json', 'yaml', 'yml', 'toml', 'ini', 'cfg',
        'conf', 'config', 'dockerfile', 'makefile', 'cmake', 'gradle',
        'maven', 'pom', 'jar', 'war', 'ear', 'class', 'o', 'obj', 'exe',
        'dll', 'so', 'dylib', 'a', 'lib', 'rpm', 'deb', 'apk', 'ipa'
    ];
    
    if (codeExtensions.includes(extension)) {
        return '/static/img/file_icons/program_file_icon.svg';
    }
    
    return '/static/img/file_icons/file_icon.svg';
}

async function loadStats() {
    try {
        const response = await fetch("/api/stats");
        const data = await response.json();
        if (data.success) {
            document.getElementById("total-files").textContent = data.stats.total_files + " Files";
            document.getElementById("total-size").textContent = formatBytes(data.stats.total_size);
            document.getElementById("storage-limit").textContent = formatBytes(data.storage_limit);
            document.getElementById("total-size-2").textContent = formatBytes(data.stats.total_size);
            document.getElementById("storage-limit-2").textContent = formatBytes(data.storage_limit);
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
                document.getElementById("files-grid").innerHTML = '<p style="text-align: center; color: #666;">Files not found</p>';
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
            
            // Обновляем дерево файлов
            updateFilesTree(data.files);
        }
    } catch (error) {
        showAlert("Ошибка загрузки файлов", "error");
    } finally {
        document.getElementById("files-loading").style.display = "none";
    }
}

async function loadAllFiles() {
    try {
        const response = await fetch('/api/files?limit=1000&offset=0');
        const data = await response.json();
        if (data.success) {
            updateFilesTree(data.files);
        }
    } catch (error) {
        console.error("Ошибка загрузки всех файлов:", error);
    }
}

function updateFilesTree(files) {
    const filesTree = document.getElementById("files-tree");
    if (files.length === 0) {
        filesTree.innerHTML = '<p style="color: #666; text-align: center;">Файлы не найдены</p>';
        return;
    }
    
    const treeHTML = files.map(file => 
        `<div class="file-tree-item">
            <span class="file-tree-name" title="${file.filename}">
                <img src="${getFileIcon(file.filename)}" alt="File" class="file-tree-icon">
                <span class="file-tree-text">${file.filename}</span>
            </span>
            <div class="file-tree-actions">
                <button class="file-tree-action download" onclick="downloadFile('${file.hash}'); event.stopPropagation();" title="Скачать">
                    📥
                </button>
                <button class="file-tree-action delete" onclick="deleteFile('${file.hash}'); event.stopPropagation();" title="Удалить">
                    🗑️
                </button>
            </div>
        </div>`
    ).join('');

    filesTree.innerHTML = treeHTML;
}

function createFileCard(file) {
    const card = document.createElement("div");
    card.className = "file-card";
    card.setAttribute("data-file-hash", file.hash);

    card.innerHTML = `
        <div class="file-icon">
            <img src="${getFileIcon(file.filename)}" alt="File icon" style="width: 100%; height: 100%;">
        </div>
        <div class="file-name" title="${file.filename}">${file.filename}</div>
    `;

    card.addEventListener("click", (e) => {
        e.preventDefault();
        showFileContextMenu(file, e);
    });
    
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
    if (!confirm("Are you sure you want to delete this file?")) {
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
            loadAllFiles();
        } else {
            showAlert(data.error || "Ошибка удаления", "error");
        }
    } catch (error) {
        showAlert("Ошибка удаления файла", "error");
    }
}

function viewFile(filename) {
    // Открываем файл в новой вкладке для просмотра
    const viewUrl = `/file/${encodeURIComponent(filename)}`;
    window.open(viewUrl, '_blank');
}

let selectedFiles = [];
let uploadProgress = 0;

async function uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);

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
            loadAllFiles(); // Обновляем дерево файлов
        } else {
            showAlert(data.error || "Ошибка загрузки", "error");
        }
    } catch (error) {
        showAlert("Ошибка загрузки файла", "error");
    }
}

async function uploadMultipleFiles(files) {
    if (files.length === 0) return;
    
    showProgressNotification();
    const totalFiles = files.length;
    let completedFiles = 0;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            await uploadFile(file);
            completedFiles++;
            updateProgress((completedFiles / totalFiles) * 100);
        } catch (error) {
            console.error(`Ошибка загрузки файла ${file.name}:`, error);
        }
    }
    
    setTimeout(() => {
        hideProgressNotification();
    }, 2000);
}

function showProgressNotification() {
    const notification = document.getElementById("progress-notification");
    notification.style.display = "block";
    updateProgress(0);
}

function hideProgressNotification() {
    const notification = document.getElementById("progress-notification");
    notification.style.display = "none";
    updateProgress(0);
}

function updateProgress(percent) {
    const progressFill = document.getElementById("progress-fill");
    const progressText = document.getElementById("progress-text");
    
    progressFill.style.width = `${percent}%`;
    progressText.textContent = `${Math.round(percent)}%`;
}

document.addEventListener("DOMContentLoaded", function() {
    loadStats();
    loadFiles();
    loadAllFiles(); // Загружаем все файлы для дерева

    // Элементы для drag & drop на files_card_pg
    const filesCardPg = document.getElementById("files-card-pg");
    const uploadBtn = document.getElementById("upload-btn");
    const fileInput = document.getElementById("file-input");
    const loadMoreBtn = document.getElementById("load-more-btn");

    // Drag & Drop для files_card_pg
    filesCardPg.addEventListener("dragover", (e) => {
        e.preventDefault();
        filesCardPg.classList.add("dragover");
    });

    filesCardPg.addEventListener("dragleave", (e) => {
        e.preventDefault();
        filesCardPg.classList.remove("dragover");
    });

    filesCardPg.addEventListener("drop", (e) => {
        e.preventDefault();
        filesCardPg.classList.remove("dragover");
        const files = Array.from(e.dataTransfer.files);
        uploadMultipleFiles(files);
    });

    // Кнопка Upload
    uploadBtn.addEventListener("click", () => {
        showUploadModal();
    });

    // Обработчик для скрытого input
    fileInput.addEventListener("change", (e) => {
        const files = Array.from(e.target.files);
        uploadMultipleFiles(files);
    });

    // Load More
    loadMoreBtn.addEventListener("click", () => {
        loadFiles(currentOffset, true);
    });

    // Модальное окно загрузки
    setupUploadModal();
    
    // Прогресс уведомления
    setupProgressNotification();
});

function showUploadModal() {
    const modal = document.getElementById("upload-modal");
    modal.style.display = "flex";
    selectedFiles = [];
    updateSelectedFiles();
}

function hideUploadModal() {
    const modal = document.getElementById("upload-modal");
    modal.style.display = "none";
    selectedFiles = [];
    updateSelectedFiles();
}

function setupUploadModal() {
    const modal = document.getElementById("upload-modal");
    const uploadArea = document.getElementById("upload-area");
    const modalFileInput = document.getElementById("modal-file-input");
    const uploadFilesBtn = document.getElementById("upload-files-btn");
    const cancelUploadBtn = document.getElementById("cancel-upload-btn");
    const modalClose = document.querySelector(".modal-close");

    // Drag & Drop в модальном окне
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
        addFilesToSelection(files);
    });

    // Клик по области загрузки
    uploadArea.addEventListener("click", () => {
        modalFileInput.click();
    });

    // Выбор файлов
    modalFileInput.addEventListener("change", (e) => {
        const files = Array.from(e.target.files);
        addFilesToSelection(files);
    });

    // Кнопки
    uploadFilesBtn.addEventListener("click", () => {
        if (selectedFiles.length > 0) {
            uploadMultipleFiles(selectedFiles);
            hideUploadModal();
        }
    });

    cancelUploadBtn.addEventListener("click", hideUploadModal);
    modalClose.addEventListener("click", hideUploadModal);

    // Закрытие по клику вне модального окна
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            hideUploadModal();
        }
    });
}

function addFilesToSelection(files) {
    files.forEach(file => {
        if (!selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
            selectedFiles.push(file);
        }
    });
    updateSelectedFiles();
}

function removeFileFromSelection(index) {
    selectedFiles.splice(index, 1);
    updateSelectedFiles();
}

function updateSelectedFiles() {
    const container = document.getElementById("selected-files");
    if (selectedFiles.length === 0) {
        container.innerHTML = "";
        return;
    }

    const filesHTML = selectedFiles.map((file, index) => `
        <div class="file-item">
            <div>
                <div class="file-name">${file.name}</div>
                <div class="file-size">${formatBytes(file.size)}</div>
            </div>
            <button class="file-remove" onclick="removeFileFromSelection(${index})">×</button>
        </div>
    `).join("");

    container.innerHTML = filesHTML;
}

function setupProgressNotification() {
    const notificationClose = document.getElementById("notification-close");
    notificationClose.addEventListener("click", hideProgressNotification);
}

// Контекстное меню для файлов
let currentContextFile = null;

function showFileContextMenu(file, event) {
    currentContextFile = file;
    const contextMenu = document.getElementById("file-context-menu");
    
    // Обновляем информацию о файле
    document.getElementById("context-file-name").textContent = file.filename;
    document.getElementById("context-file-size").textContent = formatBytes(file.size);
    document.getElementById("context-file-date").textContent = formatDate(file.upload_time);
    
    // Позиционируем меню
    const rect = event.target.closest('.file-card').getBoundingClientRect();
    const menuWidth = 250;
    const menuHeight = 120;
    
    let left = rect.left + (rect.width / 2) - (menuWidth / 2);
    let top = rect.bottom + 10;
    
    // Проверяем, не выходит ли меню за границы экрана
    if (left < 10) left = 10;
    if (left + menuWidth > window.innerWidth - 10) {
        left = window.innerWidth - menuWidth - 10;
    }
    if (top + menuHeight > window.innerHeight - 10) {
        top = rect.top - menuHeight - 10;
    }
    
    contextMenu.style.left = left + "px";
    contextMenu.style.top = top + "px";
    contextMenu.classList.add("show");
    
    // Добавляем обработчики для кнопок
    setupContextMenuButtons();
}

function hideFileContextMenu() {
    const contextMenu = document.getElementById("file-context-menu");
    contextMenu.classList.remove("show");
    currentContextFile = null;
}

function setupContextMenuButtons() {
    const viewBtn = document.getElementById("context-view-btn");
    const downloadBtn = document.getElementById("context-download-btn");
    const deleteBtn = document.getElementById("context-delete-btn");
    
    // Удаляем старые обработчики
    viewBtn.replaceWith(viewBtn.cloneNode(true));
    downloadBtn.replaceWith(downloadBtn.cloneNode(true));
    deleteBtn.replaceWith(deleteBtn.cloneNode(true));
    
    // Добавляем новые обработчики
    document.getElementById("context-view-btn").addEventListener("click", () => {
        if (currentContextFile) {
            viewFile(currentContextFile.filename);
            hideFileContextMenu();
        }
    });
    
    document.getElementById("context-download-btn").addEventListener("click", () => {
        if (currentContextFile) {
            downloadFile(currentContextFile.hash);
            hideFileContextMenu();
        }
    });
    
    document.getElementById("context-delete-btn").addEventListener("click", () => {
        if (currentContextFile) {
            deleteFile(currentContextFile.hash);
            hideFileContextMenu();
        }
    });
}

// Закрытие контекстного меню при клике вне его
document.addEventListener("click", (e) => {
    const contextMenu = document.getElementById("file-context-menu");
    const fileCards = document.querySelectorAll(".file-card");
    
    if (!contextMenu.contains(e.target) && !Array.from(fileCards).some(card => card.contains(e.target))) {
        hideFileContextMenu();
    }
});