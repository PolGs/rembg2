import os
import io
import base64
import subprocess
from flask import Flask, request, jsonify, render_template, send_from_directory
from PIL import Image
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__, 
            static_folder='static',
            template_folder='templates')

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

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

@app.route('/api/remove-bg', methods=['POST'])
def remove_background():
    logger.debug("Received request to /api/remove-bg")
    
    if 'image' not in request.files:
        logger.error("No image in request files")
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        logger.error("Empty filename")
        return jsonify({'error': 'No image selected'}), 400
    
    # Save the uploaded file temporarily
    input_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(input_path)
    logger.debug(f"Saved input file to {input_path}")
    
    # Output path for processed image
    filename, ext = os.path.splitext(file.filename)
    output_path = os.path.join(UPLOAD_FOLDER, f"{filename}_nobg{ext}")
    
    try:
        # Use rembg CLI with the -i option as requested
        logger.debug(f"Running rembg command: rembg i {input_path} {output_path}")
        result = subprocess.run(['rembg', 'i', input_path, output_path], check=True, capture_output=True)
        logger.debug(f"rembg command output: {result.stdout.decode() if result.stdout else 'No stdout'}")
        
        if not os.path.exists(output_path):
            logger.error(f"Output file not created at {output_path}")
            return jsonify({'error': 'Failed to process image - output file not created'}), 500
            
        # Read the processed image and convert to base64
        with open(output_path, 'rb') as img_file:
            img_data = img_file.read()
            b64_img = base64.b64encode(img_data).decode('utf-8')
        
        logger.debug("Successfully encoded output image to base64")
        
        # Clean up temporary files
        if os.path.exists(input_path):
            os.remove(input_path)
        if os.path.exists(output_path):
            os.remove(output_path)
        
        return jsonify({'image': b64_img})
    
    except Exception as e:
        logger.exception(f"Error processing image: {str(e)}")
        # Clean up in case of errors
        if os.path.exists(input_path):
            os.remove(input_path)
        if os.path.exists(output_path):
            os.remove(output_path)
        
        return jsonify({'error': str(e)}), 500

@app.route('/api/batch-process', methods=['POST'])
def batch_process():
    logger.debug("Received request to /api/batch-process")
    
    if 'images' not in request.files:
        logger.error("No images in request files")
        return jsonify({'error': 'No images provided'}), 400
    
    files = request.files.getlist('images')
    results = []
    
    for file in files:
        if file.filename == '':
            continue
        
        # Save the uploaded file temporarily
        input_path = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(input_path)
        logger.debug(f"Saved input file to {input_path}")
        
        # Output path for processed image
        filename, ext = os.path.splitext(file.filename)
        output_path = os.path.join(UPLOAD_FOLDER, f"{filename}_nobg{ext}")
        
        try:
            # Use rembg CLI with the -i option
            logger.debug(f"Running rembg command: rembg i {input_path} {output_path}")
            result = subprocess.run(['rembg', 'i', input_path, output_path], check=True, capture_output=True)
            
            if not os.path.exists(output_path):
                logger.error(f"Output file not created at {output_path}")
                results.append({
                    'original_name': file.filename,
                    'error': 'Failed to process image - output file not created'
                })
                continue
                
            # Read the processed image and convert to base64
            with open(output_path, 'rb') as img_file:
                img_data = img_file.read()
                b64_img = base64.b64encode(img_data).decode('utf-8')
            
            results.append({
                'original_name': file.filename,
                'image': b64_img
            })
            
            # Clean up temporary files
            if os.path.exists(input_path):
                os.remove(input_path)
            if os.path.exists(output_path):
                os.remove(output_path)
                
        except Exception as e:
            logger.exception(f"Error processing image {file.filename}: {str(e)}")
            # Clean up in case of errors
            if os.path.exists(input_path):
                os.remove(input_path)
            if os.path.exists(output_path):
                os.remove(output_path)
                
            results.append({
                'original_name': file.filename,
                'error': str(e)
            })
    
    return jsonify({'results': results})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) 