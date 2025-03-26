import os
import io
import base64
import subprocess
from flask import Flask, request, jsonify, render_template, send_from_directory
from PIL import Image
import logging
from rembg import remove  # Import the remove function directly
import jwt
import datetime
import requests

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__, 
            static_folder='static',
            template_folder='templates')

# Secret key for JWT
app.config['SECRET_KEY'] = 'your-secret-key'  # In production, use a secure key and env var

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Pocketbase URL
POCKETBASE_URL = 'http://pocketbase:8090'

# Enable CORS for debugging
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route('/')
def index():
    return send_from_directory('templates', 'index.html')

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint to verify the API is working"""
    return jsonify({'status': 'ok', 'message': 'API is running'}), 200

@app.route('/api/validate-token', methods=['POST'])
def validate_token():
    """Validate a Pocketbase token"""
    data = request.json
    if not data or 'token' not in data:
        return jsonify({'valid': False}), 400
        
    try:
        # Forward the token validation to Pocketbase
        response = requests.post(
            f"{POCKETBASE_URL}/api/collections/users/auth-refresh", 
            json={"token": data['token']}
        )
        
        if response.status_code == 200:
            return jsonify({'valid': True, 'user': response.json()}), 200
        else:
            return jsonify({'valid': False}), 401
    except Exception as e:
        logger.exception(f"Error validating token: {str(e)}")
        return jsonify({'valid': False, 'error': str(e)}), 500

@app.route('/api/remove-bg', methods=['POST'])
def remove_background():
    logger.debug("Received request to /api/remove-bg")
    
    # Get size parameter (full or reduced)
    size_type = request.args.get('size', 'reduced')
    
    # Check authorization for full size
    if size_type == 'full':
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            logger.warning("Unauthorized attempt to access full size image")
            size_type = 'reduced'  # Fallback to reduced size
        else:
            token = auth_header.split(' ')[1]
            # Validate token with Pocketbase
            try:
                response = requests.post(
                    f"{POCKETBASE_URL}/api/collections/users/auth-refresh", 
                    json={"token": token}
                )
                if response.status_code != 200:
                    logger.warning("Invalid token provided")
                    size_type = 'reduced'  # Fallback to reduced size
            except Exception as e:
                logger.exception(f"Error validating token: {str(e)}")
                size_type = 'reduced'  # Fallback to reduced size
    
    if 'image' not in request.files:
        logger.error("No image in request files")
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        logger.error("Empty filename")
        return jsonify({'error': 'No image selected'}), 400
    
    try:
        # Read the input image
        input_image = Image.open(file.stream)
        logger.debug(f"Loaded input image: {input_image.format}, size: {input_image.size}")
        
        # Use rembg Python API to remove background
        logger.debug("Removing background with rembg Python API")
        output_image = remove(input_image)
        logger.debug("Background removal completed")
        
        # Resize if needed (80% for non-authenticated users)
        if size_type == 'reduced':
            logger.debug("Reducing image size to 80%")
            width, height = output_image.size
            new_width = int(width * 0.8)
            new_height = int(height * 0.8)
            output_image = output_image.resize((new_width, new_height), Image.LANCZOS)
        
        # Convert to bytes and encode as base64
        img_byte_arr = io.BytesIO()
        # Always save as PNG to preserve transparency
        output_image.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        b64_img = base64.b64encode(img_byte_arr.read()).decode('utf-8')
        logger.debug("Successfully encoded output image to base64")
        
        return jsonify({
            'image': b64_img,
            'size_type': size_type,
            'width': output_image.width,
            'height': output_image.height
        })
    
    except Exception as e:
        logger.exception(f"Error processing image: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/batch-process', methods=['POST'])
def batch_process():
    logger.debug("Received request to /api/batch-process")
    
    # Get size parameter (full or reduced)
    size_type = request.args.get('size', 'reduced')
    
    # Check authorization for full size
    if size_type == 'full':
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            logger.warning("Unauthorized attempt to access full size image")
            size_type = 'reduced'  # Fallback to reduced size
        else:
            token = auth_header.split(' ')[1]
            # Validate token with Pocketbase
            try:
                response = requests.post(
                    f"{POCKETBASE_URL}/api/collections/users/auth-refresh", 
                    json={"token": token}
                )
                if response.status_code != 200:
                    logger.warning("Invalid token provided")
                    size_type = 'reduced'  # Fallback to reduced size
            except Exception as e:
                logger.exception(f"Error validating token: {str(e)}")
                size_type = 'reduced'  # Fallback to reduced size
    
    if 'images' not in request.files:
        logger.error("No images in request files")
        return jsonify({'error': 'No images provided'}), 400
    
    files = request.files.getlist('images')
    results = []
    
    for file in files:
        if file.filename == '':
            continue
        
        try:
            # Read the input image
            input_image = Image.open(file.stream)
            logger.debug(f"Processing {file.filename}: {input_image.format}, size: {input_image.size}")
            
            # Use rembg Python API to remove background
            output_image = remove(input_image)
            
            # Resize if needed (80% for non-authenticated users)
            if size_type == 'reduced':
                logger.debug("Reducing image size to 80%")
                width, height = output_image.size
                new_width = int(width * 0.8)
                new_height = int(height * 0.8)
                output_image = output_image.resize((new_width, new_height), Image.LANCZOS)
            
            # Convert to bytes and encode as base64
            img_byte_arr = io.BytesIO()
            # Always save as PNG to preserve transparency
            output_image.save(img_byte_arr, format='PNG')
            img_byte_arr.seek(0)
            
            b64_img = base64.b64encode(img_byte_arr.read()).decode('utf-8')
            
            results.append({
                'original_name': file.filename,
                'image': b64_img,
                'size_type': size_type,
                'width': output_image.width,
                'height': output_image.height
            })
                
        except Exception as e:
            logger.exception(f"Error processing image {file.filename}: {str(e)}")
            results.append({
                'original_name': file.filename,
                'error': str(e)
            })
    
    return jsonify({'results': results})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) 