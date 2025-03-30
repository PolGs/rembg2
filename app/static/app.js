document.addEventListener('DOMContentLoaded', () => {
    // Auth state
    let currentUser = null;
    const POCKETBASE_URL = 'http://api-rembg.kineticproxies.com'; // This is the direct URL for browser access
    
    // Check for existing token in localStorage
    const checkAuth = async () => {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const response = await fetch('/api/validate-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ token })
                });
                
                const data = await response.json();
                if (data.valid) {
                    currentUser = data.user;
                    updateUIForLoggedInUser();
                } else {
                    localStorage.removeItem('authToken');
                    updateUIForLoggedOutUser();
                }
            } catch (error) {
                console.error('Auth error:', error);
                localStorage.removeItem('authToken');
                updateUIForLoggedOutUser();
            }
        } else {
            updateUIForLoggedOutUser();
        }
    };
    
    // Update UI elements based on auth state
    const updateUIForLoggedInUser = () => {
        document.getElementById('auth-buttons').classList.add('hidden');
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('username').textContent = currentUser.record.username;
        document.getElementById('free-account-info').classList.add('hidden');
        
        // Show correct download buttons
        document.getElementById('guest-download').classList.add('hidden');
        document.getElementById('user-download').classList.remove('hidden');
        document.getElementById('guest-batch-download').classList.add('hidden');
        document.getElementById('user-batch-download').classList.remove('hidden');
    };
    
    const updateUIForLoggedOutUser = () => {
        document.getElementById('auth-buttons').classList.remove('hidden');
        document.getElementById('user-info').classList.add('hidden');
        document.getElementById('free-account-info').classList.remove('hidden');
        
        // Show correct download buttons
        document.getElementById('guest-download').classList.remove('hidden');
        document.getElementById('user-download').classList.add('hidden');
        document.getElementById('guest-batch-download').classList.remove('hidden');
        document.getElementById('user-batch-download').classList.add('hidden');
    };
    
    // Modal functionality
    const openModal = (modalId) => {
        document.getElementById(modalId).classList.add('active');
    };
    
    const closeModal = (modalId) => {
        document.getElementById(modalId).classList.remove('active');
    };
    
    // Close modals when clicking outside or on close button
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });
    
    // Auth buttons handlers
    document.getElementById('login-btn').addEventListener('click', () => {
        openModal('login-modal');
    });
    
    document.getElementById('register-btn').addEventListener('click', () => {
        openModal('register-modal');
    });
    
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('authToken');
        currentUser = null;
        updateUIForLoggedOutUser();
    });
    
    // Login form handler
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const email = form.email.value;
        const identity = email;
        const password = form.password.value;
        const errorElem = document.getElementById('login-error');
        
        try {
            const response = await fetch(`${POCKETBASE_URL}/api/collections/users/auth-with-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ identity, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('authToken', data.token);
                currentUser = data;
                updateUIForLoggedInUser();
                closeModal('login-modal');
                form.reset();
                errorElem.classList.add('hidden');
            } else {
                errorElem.textContent = data.message || 'Login failed. Please check your credentials.';
                errorElem.classList.remove('hidden');
            }
        } catch (error) {
            errorElem.textContent = 'An error occurred. Please try again.';
            errorElem.classList.remove('hidden');
        }
    });
    
    // Register form handler
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const username = form.username.value;
        const email = form.email.value;
        const identity = email;
        const password = form.password.value;
        const passwordConfirm = form.passwordConfirm.value;
        const errorElem = document.getElementById('register-error');
        
        if (password !== passwordConfirm) {
            errorElem.textContent = 'Passwords do not match';
            errorElem.classList.remove('hidden');
            return;
        }
        
        try {
            const response = await fetch(`${POCKETBASE_URL}/api/collections/users/records`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    passwordConfirm
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Auto login after registration
                const loginResponse = await fetch(`${POCKETBASE_URL}/api/collections/users/auth-with-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ identity, password })
                });
                
                const loginData = await loginResponse.json();
                
                if (loginResponse.ok) {
                    localStorage.setItem('authToken', loginData.token);
                    currentUser = loginData;
                    updateUIForLoggedInUser();
                    closeModal('register-modal');
                    form.reset();
                    errorElem.classList.add('hidden');
                }
            } else {
                errorElem.textContent = data.message || 'Registration failed. Please try again.';
                errorElem.classList.remove('hidden');
            }
        } catch (error) {
            errorElem.textContent = 'An error occurred. Please try again.';
            errorElem.classList.remove('hidden');
        }
    });

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
    // Check for saved theme preference or use system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    }
    
    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        if (isDark) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
            localStorage.setItem('theme', 'dark');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
            localStorage.setItem('theme', 'light');
        }
    });
    
    // File upload and drag/drop
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const batchFileInput = document.getElementById('batch-file-input');
    const processBatchBtn = document.getElementById('process-batch');
    const batchPreview = document.getElementById('batch-preview');
    const resultContainer = document.getElementById('result-container');
    const resultImage = document.getElementById('result-image');
    const placeholder = document.getElementById('placeholder');
    const loading = document.getElementById('loading');
    const downloadContainer = document.getElementById('download-container');
    const imageDimensions = document.getElementById('image-dimensions');
    const downloadReducedBtn = document.getElementById('download-reduced-btn');
    const downloadFullBtn = document.getElementById('download-full-btn');
    const downloadReducedBtnAuth = document.getElementById('download-reduced-btn-auth');
    const batchResults = document.getElementById('batch-results');
    const batchResultsGrid = document.getElementById('batch-results-grid');
    const downloadAllReduced = document.getElementById('download-all-reduced');
    const downloadAllFull = document.getElementById('download-all-full');
    const downloadAllReducedAuth = document.getElementById('download-all-reduced-auth');
    
    let batchFiles = [];
    let currentProcessedImage = null;
    
    // Helper function to get auth headers
    const getAuthHeaders = () => {
        const token = localStorage.getItem('authToken');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };
    
    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('active');
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('active');
        });
    });
    
    dropZone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (file && file.type.match('image.*')) {
            processImage(file);
        }
    });
    
    // File input change
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            processImage(fileInput.files[0]);
        }
    });
    
    // Batch file input change
    batchFileInput.addEventListener('change', () => {
        if (batchFileInput.files.length > 0) {
            batchFiles = Array.from(batchFileInput.files);
            showBatchPreview();
            processBatchBtn.classList.remove('hidden');
        }
    });
    
    // Process batch button
    processBatchBtn.addEventListener('click', () => {
        if (batchFiles.length > 0) {
            processBatchImages(batchFiles);
        }
    });
    
    // Download buttons
    downloadReducedBtn.addEventListener('click', () => {
        downloadImage('reduced');
    });
    
    downloadFullBtn.addEventListener('click', () => {
        downloadImage('full');
    });
    
    downloadReducedBtnAuth.addEventListener('click', () => {
        downloadImage('reduced');
    });
    
    // Batch download buttons
    downloadAllReduced.addEventListener('click', () => {
        downloadAllImages('reduced');
    });
    
    downloadAllFull.addEventListener('click', () => {
        downloadAllImages('full');
    });
    
    downloadAllReducedAuth.addEventListener('click', () => {
        downloadAllImages('reduced');
    });
    
    // Download image function
    function downloadImage(sizeType) {
        if (!currentProcessedImage) return;
        
        // If trying to download full size without auth, show login prompt
        if (sizeType === 'full' && !currentUser) {
            openModal('login-modal');
            return;
        }
        
        // Get current image or process a new full-size one
        if (sizeType === 'full' && currentProcessedImage.size_type === 'reduced' && currentUser) {
            // Need to process full size image first
            processImageWithSize(currentProcessedImage.originalFile, 'full');
        } else {
            // Download current image
            const link = document.createElement('a');
            link.href = resultImage.src;
            link.download = `rembg-output-${sizeType}.png`;
            link.click();
        }
    }
    
    // Download all images function
    function downloadAllImages(sizeType) {
        const resultImgs = document.querySelectorAll('.batch-result-img');
        
        // If trying to download full size without auth, show login prompt
        if (sizeType === 'full' && !currentUser) {
            openModal('login-modal');
            return;
        }
        
        resultImgs.forEach((img, index) => {
            const link = document.createElement('a');
            link.href = img.src;
            link.download = `rembg-output-${index + 1}-${sizeType}.png`;
            link.click();
        });
    }
    
    // Process single image
    function processImage(file) {
        // Use the current user auth status to determine default size
        const sizeType = currentUser ? 'full' : 'reduced';
        processImageWithSize(file, sizeType);
    }
    
    // Process image with specific size
    function processImageWithSize(file, sizeType) {
        // Show loading
        loading.classList.remove('hidden');
        placeholder.classList.add('hidden');
        resultImage.classList.add('hidden');
        downloadContainer.classList.add('hidden');
        
        const formData = new FormData();
        formData.append('image', file);
        
        // Add auth headers if user is logged in
        const headers = getAuthHeaders();
        
        fetch(`/api/remove-bg?size=${sizeType}`, {
            method: 'POST',
            headers,
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                alert('Error: ' + data.error);
            } else {
                resultImage.src = 'data:image/png;base64,' + data.image;
                resultImage.classList.remove('hidden');
                downloadContainer.classList.remove('hidden');
                
                // Store current processed image info
                currentProcessedImage = {
                    base64: data.image,
                    size_type: data.size_type,
                    width: data.width,
                    height: data.height,
                    originalFile: file
                };
                
                // Update dimensions info
                imageDimensions.textContent = `Image dimensions: ${data.width} × ${data.height} px`;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while processing the image: ' + error.message);
        })
        .finally(() => {
            loading.classList.add('hidden');
        });
    }
    
    // Show batch preview
    function showBatchPreview() {
        batchPreview.innerHTML = '';
        batchPreview.classList.remove('hidden');
        
        batchFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'relative bg-gray-100 dark:bg-gray-700 rounded aspect-square overflow-hidden';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'w-full h-full object-cover';
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs';
                removeBtn.innerHTML = '×';
                removeBtn.addEventListener('click', () => {
                    batchFiles = batchFiles.filter((_, i) => i !== index);
                    showBatchPreview();
                    if (batchFiles.length === 0) {
                        processBatchBtn.classList.add('hidden');
                        batchPreview.classList.add('hidden');
                    }
                });
                
                div.appendChild(img);
                div.appendChild(removeBtn);
                batchPreview.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    }
    
    // Process batch images
    function processBatchImages(files) {
        // Use the current user auth status to determine default size
        const sizeType = currentUser ? 'full' : 'reduced';
        processBatchImagesWithSize(files, sizeType);
    }
    
    // Process batch images with specific size
    function processBatchImagesWithSize(files, sizeType) {
        // Show loading
        loading.classList.remove('hidden');
        batchResults.classList.add('hidden');
        batchResultsGrid.innerHTML = '';
        
        const formData = new FormData();
        files.forEach(file => {
            formData.append('images', file);
        });
        
        // Add auth headers if user is logged in
        const headers = getAuthHeaders();
        
        fetch(`/api/batch-process?size=${sizeType}`, {
            method: 'POST',
            headers,
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                alert('Error: ' + data.error);
            } else {
                displayBatchResults(data.results);
                batchResults.classList.remove('hidden');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while processing the images: ' + error.message);
        })
        .finally(() => {
            loading.classList.add('hidden');
        });
    }
    
    // Display batch results
    function displayBatchResults(results) {
        batchResultsGrid.innerHTML = '';
        
        results.forEach(result => {
            const div = document.createElement('div');
            div.className = 'bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow';
            
            if (result.error) {
                div.innerHTML = `
                    <div class="p-4">
                        <p class="font-medium">${result.original_name}</p>
                        <p class="text-red-500 mt-2">Error: ${result.error}</p>
                    </div>
                `;
            } else {
                div.innerHTML = `
                    <div class="relative aspect-square bg-gray-100 dark:bg-gray-700">
                        <img src="data:image/png;base64,${result.image}" class="w-full h-full object-contain batch-result-img" data-size-type="${result.size_type}">
                    </div>
                    <div class="p-4">
                        <div class="flex justify-between items-center mb-2">
                            <p class="font-medium truncate" title="${result.original_name}">${result.original_name}</p>
                            <button class="download-single-btn text-primary-600 dark:text-primary-400 hover:text-primary-800">
                                <i class="fas fa-download"></i>
                            </button>
                        </div>
                        <p class="text-xs text-gray-500">${result.width} × ${result.height} px (${result.size_type} size)</p>
                    </div>
                `;
                
                // Add event listener to download button
                setTimeout(() => {
                    const downloadBtn = div.querySelector('.download-single-btn');
                    downloadBtn.addEventListener('click', () => {
                        const img = div.querySelector('.batch-result-img');
                        const link = document.createElement('a');
                        link.href = img.src;
                        link.download = `${result.original_name.split('.')[0]}-nobg-${result.size_type}.png`;
                        link.click();
                    });
                }, 0);
            }
            
            batchResultsGrid.appendChild(div);
        });
    }
    
    // Click on drop zone to trigger file input
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Initialize auth state on page load
    checkAuth();
}); 