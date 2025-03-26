document.addEventListener('DOMContentLoaded', () => {
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
    const downloadBtn = document.getElementById('download-btn');
    const batchResults = document.getElementById('batch-results');
    const batchResultsGrid = document.getElementById('batch-results-grid');
    const downloadAllBtn = document.getElementById('download-all');
    
    let batchFiles = [];
    
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
    
    // Download button
    downloadBtn.addEventListener('click', () => {
        if (resultImage.src) {
            const link = document.createElement('a');
            link.href = resultImage.src;
            link.download = 'rembg-output.png';
            link.click();
        }
    });
    
    // Download all button
    downloadAllBtn.addEventListener('click', () => {
        const resultImgs = document.querySelectorAll('.batch-result-img');
        resultImgs.forEach((img, index) => {
            const link = document.createElement('a');
            link.href = img.src;
            link.download = `rembg-output-${index + 1}.png`;
            link.click();
        });
    });
    
    // Process single image
    function processImage(file) {
        // Show loading
        loading.classList.remove('hidden');
        placeholder.classList.add('hidden');
        resultImage.classList.add('hidden');
        downloadContainer.classList.add('hidden');
        
        const formData = new FormData();
        formData.append('image', file);
        
        fetch('/api/remove-bg', {
            method: 'POST',
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
        // Show loading
        loading.classList.remove('hidden');
        batchResults.classList.add('hidden');
        batchResultsGrid.innerHTML = '';
        
        const formData = new FormData();
        files.forEach(file => {
            formData.append('images', file);
        });
        
        fetch('/api/batch-process', {
            method: 'POST',
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
                        <img src="data:image/png;base64,${result.image}" class="w-full h-full object-contain batch-result-img">
                    </div>
                    <div class="p-4 flex justify-between items-center">
                        <p class="font-medium truncate" title="${result.original_name}">${result.original_name}</p>
                        <button class="download-single-btn text-primary-600 dark:text-primary-400 hover:text-primary-800">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                `;
                
                // Add event listener to download button
                setTimeout(() => {
                    const downloadBtn = div.querySelector('.download-single-btn');
                    downloadBtn.addEventListener('click', () => {
                        const img = div.querySelector('.batch-result-img');
                        const link = document.createElement('a');
                        link.href = img.src;
                        link.download = `${result.original_name.split('.')[0]}-nobg.png`;
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
}); 