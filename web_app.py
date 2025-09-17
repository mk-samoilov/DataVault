from flask import Flask, request, jsonify, render_template, send_file

import io

from file_server import file_server_instance

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/disk")
def disk():
    return render_template("disk.html")


@app.route("/api/upload", methods=["POST"])
def api_upload():
    if "file" not in request.files:
        return jsonify({"success": False, "error": "Файл не найден"})
    
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "error": "Файл не выбран"})
    
    file_data = file.read()
    result = file_server_instance.upload_file(file_data, file.filename)
    
    return jsonify(result)


@app.route("/api/download/<file_hash>")
def api_download(file_hash):
    result = file_server_instance.download_file(file_hash)
    
    if result["success"]:
        file_data = result["file_data"]
        filename = result["filename"]
        mime_type = result["mime_type"]
        
        return send_file(
            io.BytesIO(file_data),
            as_attachment=True,
            download_name=filename,
            mimetype=mime_type
        )
    else:
        return jsonify(result), 404


@app.route("/api/delete/<file_hash>", methods=["DELETE"])
def api_delete(file_hash):
    result = file_server_instance.delete_file(file_hash)
    return jsonify(result)


@app.route("/api/files")
def api_list_files():
    limit = request.args.get("limit", 50, type=int)
    offset = request.args.get("offset", 0, type=int)
    
    result = file_server_instance.list_files(limit, offset)
    return jsonify(result)


@app.route("/api/file/<file_hash>")
def api_file_info(file_hash):
    result = file_server_instance.get_file_info(file_hash)
    return jsonify(result)


@app.route("/api/stats")
def api_stats():
    result = file_server_instance.get_stats()
    return jsonify(result)


@app.route("/api/search")
def api_search():
    query = request.args.get("q", "")
    result = file_server_instance.search_files(query)
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=80)
