from flask import Flask, request, jsonify
from llm_generator import generate_content

app = Flask(__name__)

@app.route("/", methods=["GET"])
def health():
    return jsonify({"message": "Flask API is up and running ✅"})

@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json()
    prompt = data.get("prompt", "")
    
    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400

    output = generate_content(prompt)
    return jsonify({"result": output})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
