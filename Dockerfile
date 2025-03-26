FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Install additional dependencies for rembg
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY . .

RUN mkdir -p app/uploads

# Make sure uploads directory has correct permissions
RUN chmod 777 app/uploads

EXPOSE 5000

# Use environment variable for bind address to allow overrides
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--log-level", "debug", "--timeout", "120", "app.app:app"] 