# Rembg Web Application

A lightweight, high-performance web application for background removal using [rembg](https://github.com/danielgatis/rembg).
![image](https://github.com/user-attachments/assets/f269e873-b75f-4054-a4db-e6bbc1369def)

## Features

- 🖼️ Fast and effective image background removal
- 🎨 Beautiful responsive UI with dark/light mode
- 📁 Drag & drop file upload
- 🔄 Batch processing support
- 🌐 Dockerized for easy deployment
- 📲 Mobile-friendly design

## Technology Stack

- **Frontend**: HTML, JavaScript, Tailwind CSS
- **Backend**: Flask (Python)
- **Infrastructure**: Nginx (serving frontend + reverse proxy for backend)
- **Deployment**: Docker (fully containerized)

## Getting Started

### Prerequisites

- Docker and Docker Compose

### Installation & Running

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/rembg-web-app.git
   cd rembg-web-app
   ```

2. Build and run the Docker containers:
   ```bash
   docker-compose up -d
   ```

3. Access the application at http://localhost

## API Documentation

### Remove Background - Single Image

**Endpoint**: `/api/remove-bg`
**Method**: POST
**Content-Type**: multipart/form-data

**Parameters**:
- `image`: The image file to process

**Response**:
```json
{
  "image": "base64_encoded_image_data"
}
```

### Batch Processing - Multiple Images

**Endpoint**: `/api/batch-process`
**Method**: POST
**Content-Type**: multipart/form-data

**Parameters**:
- `images`: Array of image files to process

**Response**:
```json
{
  "results": [
    {
      "original_name": "image1.jpg",
      "image": "base64_encoded_image_data"
    },
    {
      "original_name": "image2.jpg",
      "image": "base64_encoded_image_data"
    }
  ]
}
```

## Development

To run the application in development mode:

```bash
# Install dependencies
pip install -r requirements.txt

# Run the Flask app
python -m app.app
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [rembg](https://github.com/danielgatis/rembg) - The amazing background removal library 
