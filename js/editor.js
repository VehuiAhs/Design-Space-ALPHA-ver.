// Editor State
const editorState = {
    canvasWidth: 800,
    canvasHeight: 600,
    minCanvasHeight: 0,    // Minimum canvas height
    maxCanvasHeight: 10000,   // Maximum canvas height
    zoom: 1,
    minZoom: 0.1,
    maxZoom: 3,
    zoomStep: 0.1,
    selectedElement: null,
    elements: [],
    isDragging: false,
    isResizing: false,
    isRotating: false,
    dragOffset: { x: 0, y: 0 },
    rotation: 0,
    rotationOrigin: { x: 0, y: 0 },
    dragState: {
        velocity: { x: 0, y: 0 },
        lastPosition: { x: 0, y: 0 },
        timestamp: 0,
        momentum: false,
        gridSnap: 10, // pixels
        guides: [],
        snapThreshold: 5
    },
    history: {
        undoStack: [],
        redoStack: [],
        maxSize: 50 // Maximum number of actions to store
    },
    draggedElement: null,  // Add this line to track which element is being dragged
};

// Preset Canvas Sizes with fixed dimensions
const CANVAS_PRESETS = {
    'instagram-post': { width: 1080, height: 1080, label: 'Instagram Post' },
    'instagram-story': { width: 1080, height: 1920, label: 'Instagram Story' },
    'facebook-post': { width: 1200, height: 630, label: 'Facebook Post' },
    'twitter-post': { width: 1200, height: 675, label: 'Twitter Post' },
    'presentation': { width: 1300, height: 1080, label: 'Presentation' },
    'business-card': { width: 900, height: 500, label: 'Business Card' },
    'resume': { width: 1414, height: 2000, label: 'Resume' },
    'custom': { width: 800, height: 600, label: 'Custom Size' }
};

// DOM Elements
const canvas = document.getElementById('canvas');
const canvasWrapper = document.querySelector('.canvas-wrapper');
const templateButtons = document.querySelectorAll('.template-btn');
const textButtons = document.querySelectorAll('.text-tools .tool-btn');
const shapeButtons = document.querySelectorAll('.shape-tools .tool-btn');

// Initialize Editor
function initEditor() {
    // Ensure sidebar is expanded by default
    const sidebarContainer = document.querySelector('.sidebar-container');
    if (sidebarContainer.classList.contains('collapsed')) {
        sidebarContainer.classList.remove('collapsed');
    }
    
    // Add undo/redo buttons to the toolbar
    const toolbar = document.querySelector('.nav-left');
    
    const undoBtn = document.createElement('button');
    undoBtn.id = 'undoBtn';
    undoBtn.className = 'nav-btn';
    undoBtn.innerHTML = '<i class="fas fa-undo"></i>';
    undoBtn.title = 'Undo (Ctrl+Z)';
    undoBtn.disabled = true;
    undoBtn.addEventListener('click', undo);
    
    const redoBtn = document.createElement('button');
    redoBtn.id = 'redoBtn';
    redoBtn.className = 'nav-btn';
    redoBtn.innerHTML = '<i class="fas fa-redo"></i>';
    redoBtn.title = 'Redo (Ctrl+Y)';
    redoBtn.disabled = true;
    redoBtn.addEventListener('click', redo);
    
    toolbar.appendChild(undoBtn);
    toolbar.appendChild(redoBtn);
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            } else if (e.key === 'y') {
                e.preventDefault();
                redo();
            }
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            // Only delete if we're not editing text
            if (!editorState.selectedElement?.isContentEditable && 
                !document.activeElement?.isContentEditable) {
                e.preventDefault();
                deleteSelectedElement();
            }
        }
    });
    
    // Setup auto-save
    startAutoSave();
    
    // Save state when page is unloaded
    window.addEventListener('beforeunload', () => {
        saveEditorState();
    });
    
    // Try to restore previous state
    if (!restoreEditorState()) {
        // If no state to restore, set up default canvas
    setupCanvasSize(editorState.canvasWidth, editorState.canvasHeight);
    }
    
    // Setup other components
    setupPanelToggle();
    setupTemplateButtons();
    setupZoomHandling();
    setupTextTools();
    setupShapeTools();
    setupCanvasInteraction();
    setupPropertyControls();
    setupTextEditingToolbar();
    setupMediaTools();
    initializePageManagement();
    setupShapeContextMenu();
    setupTemplatesFeature();
}

// Setup Panel Toggle
function setupPanelToggle() {
    const panelToggle = document.getElementById('panelToggle');
    const sidebarContainer = document.querySelector('.sidebar-container');
    
    // Ensure sidebar is expanded by default
    if (sidebarContainer.classList.contains('collapsed')) {
        sidebarContainer.classList.remove('collapsed');
    }
    
    panelToggle.addEventListener('click', () => {
        sidebarContainer.classList.toggle('collapsed');
        
        // Update canvas fit after panel toggle
        setTimeout(() => {
            fitCanvasToScreen();
        }, 300); // Wait for transition to complete
    });
}

// Setup Template Size Buttons
function setupTemplateButtons() {
    templateButtons.forEach(button => {
        button.addEventListener('click', () => {
            const presetKey = button.dataset.preset;
            const preset = CANVAS_PRESETS[presetKey];
            
            if (preset) {
                if (presetKey === 'custom') {
                    // Show custom size controls
                    document.querySelector('.custom-size-controls').style.display = 'block';
                    // Update input values with current canvas size
                    document.getElementById('customWidth').value = editorState.canvasWidth;
                    document.getElementById('customHeight').value = editorState.canvasHeight;
                } else {
                    // Hide custom size controls
                    document.querySelector('.custom-size-controls').style.display = 'none';
                    // Update canvas size with animation
                    updateCanvasSize(preset.width, preset.height);
                }
                
                // Update active state
                templateButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            }
        });
    });
    
    // Setup custom size controls
    const applyCustomSizeBtn = document.getElementById('applyCustomSize');
    applyCustomSizeBtn.addEventListener('click', () => {
        const width = parseInt(document.getElementById('customWidth').value);
        const height = parseInt(document.getElementById('customHeight').value);
        
        if (width >= 50 && width <= 4000 && height >= 50 && height <= 4000) {
            updateCanvasSize(width, height);
        } else {
            alert('Please enter dimensions between 50 and 4000 pixels.');
        }
    });
}

// Update Canvas Size with Animation
function updateCanvasSize(width, height) {
    // Validate dimensions
    width = Math.max(50, Math.min(width, 4000));
    height = Math.max(50, Math.min(height, 4000));
    
    // Update editor state
    editorState.canvasWidth = width;
    editorState.canvasHeight = height;
    
    const canvas = document.getElementById('canvas');
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    // Reset zoom to fit
    fitCanvasToScreen();
    
    // Custom event to notify about canvas size change
    const canvasSizeChangedEvent = new CustomEvent('canvasSizeChanged', {
        detail: { width, height }
    });
    document.dispatchEvent(canvasSizeChangedEvent);
    
    // Update status or show dimensions
    updateCanvasSizeStatus(width, height);
}

/**
 * Updates the canvas size display in the interface
 * @param {number} width - Canvas width in pixels
 * @param {number} height - Canvas height in pixels
 */
function updateCanvasSizeStatus(width, height) {
    // Get the canvas type based on dimensions
    let canvasType = '';
    
    // Check for common preset sizes
    if (width === 1080 && height === 1080) canvasType = 'Instagram Post';
    else if (width === 1080 && height === 1920) canvasType = 'Instagram Story';
    else if (width === 1200 && height === 630) canvasType = 'Facebook Post';
    else if (width === 1200 && height === 675) canvasType = 'Twitter Post';
    else if (width === 1920 && height === 1080) canvasType = 'Presentation';
    else if (width === 900 && height === 500) canvasType = 'Business Card';
    else if (width === 1414 && height === 2000) canvasType = 'Resume';
    else canvasType = 'Custom Size';
    
    // Update active state of template buttons
    const templateButtons = document.querySelectorAll('.template-btn');
    templateButtons.forEach(button => {
        const presetKey = button.dataset.preset;
        if (presetKey && CANVAS_PRESETS[presetKey]) {
            const preset = CANVAS_PRESETS[presetKey];
            if (preset.width === width && preset.height === height) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }
    });
    
    // You could also update a status display showing the current canvas size
    console.log(`Canvas size: ${width}x${height} (${canvasType})`);
}

// Setup Canvas Size
function setupCanvasSize(width, height) {
    updateCanvasSize(width, height);
}

// Setup Zoom Handling
function setupZoomHandling() {
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomSelect = document.getElementById('zoomSelect');
    const zoomPercent = document.getElementById('zoomPercent');
    const canvasContainer = document.querySelector('.canvas-container');
    
    // Zoom In Button
    zoomInBtn.addEventListener('click', () => {
        const newZoom = Math.min(editorState.zoom + editorState.zoomStep, editorState.maxZoom);
        updateZoom(newZoom);
    });
    
    // Zoom Out Button
    zoomOutBtn.addEventListener('click', () => {
        const newZoom = Math.max(editorState.zoom - editorState.zoomStep, editorState.minZoom);
        updateZoom(newZoom);
    });
    
    // Zoom Select
    zoomSelect.addEventListener('change', (e) => {
        if (e.target.value === 'fit') {
            fitCanvasToScreen();
        } else {
            updateZoom(parseFloat(e.target.value));
        }
    });
    
    // Mouse Wheel Zoom
    canvasContainer.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            
            const delta = e.deltaY;
            const zoomChange = delta > 0 ? -editorState.zoomStep : editorState.zoomStep;
            const newZoom = Math.max(
                editorState.minZoom,
                Math.min(editorState.maxZoom, editorState.zoom + zoomChange)
            );
            
            updateZoom(newZoom);
        }
    });
}

// Update Zoom
function updateZoom(newZoom) {
    editorState.zoom = newZoom;
    
    // Update canvas transform
    canvasWrapper.style.transform = `scale(${newZoom})`;
    
    // Update zoom display
    const zoomPercent = document.getElementById('zoomPercent');
    zoomPercent.textContent = `${Math.round(newZoom * 100)}%`;
    
    // Update zoom select if it matches a preset value
    const zoomSelect = document.getElementById('zoomSelect');
    const option = Array.from(zoomSelect.options).find(opt => parseFloat(opt.value) === newZoom);
    if (option) {
        zoomSelect.value = option.value;
    }
}

// Fit Canvas to Screen
function fitCanvasToScreen() {
    const containerWidth = document.querySelector('.canvas-container').clientWidth - 80;
    const containerHeight = document.querySelector('.canvas-container').clientHeight - 80;
    
    const scaleX = containerWidth / editorState.canvasWidth;
    const scaleY = containerHeight / editorState.canvasHeight;
    const scale = Math.min(scaleX, scaleY, 1);
    
    updateZoom(scale);
}

// Handle Window Resize
function handleResize() {
    setupCanvasSize(editorState.canvasWidth, editorState.canvasHeight);
}

// Event Listeners
window.addEventListener('resize', handleResize);
window.addEventListener('load', initEditor);

// Save Button Handler
document.getElementById('saveBtn').addEventListener('click', () => {
    // TODO: Implement save functionality
    console.log('Save button clicked');
});

// Download Button Handler
document.getElementById('downloadBtn').addEventListener('click', () => {
    // Create a dropdown menu for download options
    const downloadMenu = document.createElement('div');
    downloadMenu.className = 'download-menu';
    downloadMenu.style.position = 'absolute';
    downloadMenu.style.top = '60px';
    downloadMenu.style.right = '120px';
    downloadMenu.style.backgroundColor = '#fff';
    downloadMenu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    downloadMenu.style.borderRadius = '4px';
    downloadMenu.style.padding = '10px 0';
    downloadMenu.style.zIndex = '1000';
    
    // Add download options
    const options = [
        { label: 'Download as PNG', format: 'png' },
        { label: 'Download as JPEG', format: 'jpeg' },
        { label: 'Download as PDF', format: 'pdf' }
    ];
    
    options.forEach(option => {
        const optionItem = document.createElement('div');
        optionItem.className = 'download-option';
        optionItem.textContent = option.label;
        optionItem.style.padding = '8px 20px';
        optionItem.style.cursor = 'pointer';
        optionItem.style.transition = 'background-color 0.2s';
        
        optionItem.addEventListener('mouseover', () => {
            optionItem.style.backgroundColor = '#f5f5f5';
        });
        
        optionItem.addEventListener('mouseout', () => {
            optionItem.style.backgroundColor = 'transparent';
        });
        
        optionItem.addEventListener('click', () => {
            // Remove the menu
            document.body.removeChild(downloadMenu);
            
            // Handle download based on selected format
            if (option.format === 'pdf') {
                downloadAsPDF();
            } else {
                downloadAsImage(option.format);
            }
        });
        
        downloadMenu.appendChild(optionItem);
    });
    
    // Add the menu to the document
    document.body.appendChild(downloadMenu);
    
    // Close the menu when clicking outside
    const closeMenu = (e) => {
        if (!downloadMenu.contains(e.target) && e.target.id !== 'downloadBtn') {
            document.body.removeChild(downloadMenu);
            document.removeEventListener('click', closeMenu);
        }
    };
    
    // Add a small delay before adding the click event listener
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 100);
});

/**
 * Downloads the current canvas as an image
 * @param {string} format - The image format ('png' or 'jpeg')
 */
function downloadAsImage(format) {
    // Show loading indicator
    showSaveIndicator("Preparing image...");
    
    // Get the current canvas
    const canvasElement = document.getElementById('canvas');
    
    // Add progress cursor to body
    document.body.classList.add('pdf-generating');
    
    // Create a combined canvas that includes the background and all elements
    createCombinedCanvas(canvasElement)
        .then(combinedCanvas => {
            // Convert to data URL
            const dataURL = combinedCanvas.toDataURL(`image/${format}`, 1.0);
            
            // Create a download link
            const link = document.createElement('a');
            link.download = `my-design.${format}`;
            link.href = dataURL;
            
            // Trigger the download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Show success message
            showSaveIndicator(`Image downloaded successfully!`);
            
            // Remove progress cursor
            document.body.classList.remove('pdf-generating');
        })
        .catch(error => {
            console.error('Error creating image:', error);
            showSaveIndicator("Error creating image. Please try again.", true);
            
            // Remove progress cursor
            document.body.classList.remove('pdf-generating');
        });
}

/**
 * Downloads all pages as a single PDF
 */
function downloadAsPDF() {
    // Show prompt for file name
    const fileName = prompt("What name would you like to give the PDF file?", "my-design");
    
    // If user cancels or enters empty name, abort
    if (!fileName || fileName.trim() === '') {
        return;
    }
    
    // Sanitize file name
    const sanitizedFileName = sanitizeFileName(fileName.trim());
    
    // Show loading indicator
    showSaveIndicator("Preparing PDF...");
    
    // Add progress cursor to body
    document.body.classList.add('pdf-generating');
    
    // Store current page ID to restore later
    const originalPageId = currentPageId;
    
    // Process all pages sequentially
    let currentPageIndex = 0;
    
    // Initialize PDF with the first page to ensure we have the correct dimensions
    processNextPage();
    
    function processNextPage() {
        if (currentPageIndex >= pages.length) {
            // All pages processed, save the PDF
            pdf.save(`${sanitizedFileName}.pdf`);
            
            // Restore original page
            switchToPage(originalPageId);
            
            // Show success message
            showSaveIndicator("PDF downloaded successfully!");
            
            // Remove progress cursor
            document.body.classList.remove('pdf-generating');
            return;
        }
        
        const page = pages[currentPageIndex];
        showSaveIndicator(`Processing page ${currentPageIndex + 1} of ${pages.length}...`);
        
        // Switch to the page
        switchToPage(page.id);
        
        // Get the canvas element
        const canvasElement = document.getElementById('canvas');
        
        // Get the exact dimensions of the current canvas
        const canvasWidth = canvasElement.offsetWidth;
        const canvasHeight = canvasElement.offsetHeight;
        
        // Create combined canvas for the current page
        createCombinedCanvas(canvasElement)
            .then(combinedCanvas => {
                // Convert canvas to image data
                const imgData = combinedCanvas.toDataURL('image/png', 1.0);
                
                // Initialize jsPDF or add new page
                if (currentPageIndex === 0) {
                    // Initialize jsPDF with the exact canvas dimensions
                    const { jsPDF } = window.jspdf;
                    window.pdf = new jsPDF({
                        orientation: canvasWidth > canvasHeight ? 'landscape' : 'portrait',
                        unit: 'px',
                        format: [canvasWidth, canvasHeight],
                        hotfixes: ['px_scaling']
                    });
                    pdf = window.pdf;
                } else {
                    // Add new page with the exact dimensions of the current canvas
                    pdf.addPage([canvasWidth, canvasHeight]);
                }
                
                // Add the image to the PDF with the exact dimensions
                pdf.addImage(imgData, 'PNG', 0, 0, canvasWidth, canvasHeight);
                
                // Process next page
                currentPageIndex++;
                setTimeout(processNextPage, 100);
            })
            .catch(error => {
                console.error('Error processing page:', error);
                showSaveIndicator("Error generating PDF. Please try again.", true);
                document.body.classList.remove('pdf-generating');
                switchToPage(originalPageId);
            });
    }
}

/**
 * Preloads an image and returns a promise that resolves with the loaded image
 * @param {string} url - The URL of the image to preload
 * @returns {Promise<HTMLImageElement>} - A promise that resolves with the loaded image
 */
function preloadImage(url) {
    return new Promise((resolve, reject) => {
        // Create a new image element
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        // Set up event handlers
        img.onload = () => {
            console.log(`Successfully preloaded: ${url}`);
            resolve(img);
        };
        
        img.onerror = () => {
            console.error(`Failed to preload image: ${url}`);
            reject(new Error(`Failed to load image: ${url}`));
        };
        
        // Set a timeout in case the image takes too long to load
        const timeoutId = setTimeout(() => {
            console.error(`Timeout loading image: ${url}`);
            reject(new Error(`Timeout loading image: ${url}`));
        }, 15000); // 15 second timeout
        
        // Clear the timeout if the image loads or errors out
        img.onload = () => {
            clearTimeout(timeoutId);
            resolve(img);
        };
        
        img.onerror = () => {
            clearTimeout(timeoutId);
            reject(new Error(`Failed to load image: ${url}`));
        };
        
        // Start loading the image
        img.src = url;
    });
}

/**
 * Creates a combined canvas that includes the background and all elements
 * @param {HTMLElement} canvasElement - The canvas element
 * @returns {Promise<HTMLCanvasElement>} - A promise that resolves to the combined canvas
 */
function createCombinedCanvas(canvasElement) {
    return new Promise((resolve, reject) => {
        try {
            // Show loading indicator
            showSaveIndicator("Preparing canvas...");
            
            // Check if the canvas has a background image
            const hasBackground = canvasElement.classList.contains('has-background');
            const backgroundImage = hasBackground ? 
                window.getComputedStyle(canvasElement).backgroundImage : null;
            
            // Create a new canvas
            const combinedCanvas = document.createElement('canvas');
            combinedCanvas.width = canvasElement.offsetWidth;
            combinedCanvas.height = canvasElement.offsetHeight;
            const ctx = combinedCanvas.getContext('2d');
            
            // Fill with white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);
            
            // If there's a background image, draw it first
            if (hasBackground && backgroundImage) {
                // Extract the URL from the backgroundImage CSS value
                const urlMatch = backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
                if (urlMatch && urlMatch[1]) {
                    const imageUrl = urlMatch[1];
                    
                    // Update loading indicator
                    showSaveIndicator("Loading template image...");
                    
                    // Try multiple methods to load the image
                    loadImageWithFallbacks(imageUrl)
                        .then(bgImage => {
                            // Draw the background image
                            ctx.drawImage(bgImage, 0, 0, combinedCanvas.width, combinedCanvas.height);
                            
                            // Update loading indicator
                            showSaveIndicator("Capturing design elements...");
                            
                            // Then capture the canvas content
                            captureCanvasElements();
                        })
                        .catch(error => {
                            console.error('All image loading methods failed:', error);
                            // Continue without the background
                            captureCanvasWithoutBackground();
                        });
                } else {
                    // If we couldn't extract the URL, fall back to standard capture
                    captureCanvasWithoutBackground();
                }
            } else {
                // No background image, use standard capture
                captureCanvasWithoutBackground();
            }
            
            // Function to try multiple methods to load an image
            function loadImageWithFallbacks(url) {
                return new Promise((resolve, reject) => {
                    // First try: Use cached image if available
                    const cachedImage = sessionStorage.getItem(`cached_image_${url}`);
                    if (cachedImage) {
                        console.log(`Using cached image for: ${url}`);
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.onerror = () => tryDirectLoading(url);
                        img.src = cachedImage;
                        return;
                    }
                    
                    // Second try: Direct loading
                    tryDirectLoading(url);
                    
                    function tryDirectLoading(url) {
                        console.log(`Trying direct loading for: ${url}`);
                        const img = new Image();
                        img.crossOrigin = 'Anonymous';
                        img.onload = () => {
                            // Cache the successful load
                            try {
                                const tempCanvas = document.createElement('canvas');
                                tempCanvas.width = img.width;
                                tempCanvas.height = img.height;
                                const tempCtx = tempCanvas.getContext('2d');
                                tempCtx.drawImage(img, 0, 0);
                                const dataUrl = tempCanvas.toDataURL('image/png');
                                sessionStorage.setItem(`cached_image_${url}`, dataUrl);
                            } catch (e) {
                                console.warn('Failed to cache image:', e);
                            }
                            resolve(img);
                        };
                        img.onerror = () => tryWithProxies(url);
                        img.src = url;
                    }
                    
                    function tryWithProxies(url) {
                        console.log(`Trying proxies for: ${url}`);
                        // List of CORS proxies to try
                        const proxies = [
                            `https://cors-anywhere.herokuapp.com/${url}`,
                            `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
                            `https://crossorigin.me/${url}`,
                            `https://thingproxy.freeboard.io/fetch/${url}`
                        ];
                        
                        // Try each proxy in sequence
                        tryNextProxy(0);
                        
                        function tryNextProxy(index) {
                            if (index >= proxies.length) {
                                // All proxies failed, try data URL conversion as last resort
                                tryDataUrlConversion(url);
                                return;
                            }
                            
                            const proxyUrl = proxies[index];
                            console.log(`Trying proxy ${index + 1}/${proxies.length}: ${proxyUrl}`);
                            
                            const img = new Image();
                            img.crossOrigin = 'Anonymous';
                            img.onload = () => {
                                // Cache the successful load
                                try {
                                    const tempCanvas = document.createElement('canvas');
                                    tempCanvas.width = img.width;
                                    tempCanvas.height = img.height;
                                    const tempCtx = tempCanvas.getContext('2d');
                                    tempCtx.drawImage(img, 0, 0);
                                    const dataUrl = tempCanvas.toDataURL('image/png');
                                    sessionStorage.setItem(`cached_image_${url}`, dataUrl);
                                } catch (e) {
                                    console.warn('Failed to cache image:', e);
                                }
                                resolve(img);
                            };
                            img.onerror = () => tryNextProxy(index + 1);
                            img.src = proxyUrl;
                        }
                    }
                    
                    function tryDataUrlConversion(url) {
                        console.log(`Trying data URL conversion for: ${url}`);
                        // Create an XMLHttpRequest to get the image as a blob
                        const xhr = new XMLHttpRequest();
                        xhr.open('GET', url, true);
                        xhr.responseType = 'blob';
                        
                        xhr.onload = function() {
                            if (this.status === 200) {
                                const reader = new FileReader();
                                reader.onloadend = function() {
                                    const dataUrl = reader.result;
                                    const img = new Image();
                                    img.onload = () => {
                                        // Cache the successful load
                                        try {
                                            sessionStorage.setItem(`cached_image_${url}`, dataUrl);
                                        } catch (e) {
                                            console.warn('Failed to cache image:', e);
                                        }
                                        resolve(img);
                                    };
                                    img.onerror = () => {
                                        console.error('All methods failed to load image');
                                        reject(new Error('All methods failed to load image'));
                                    };
                                    img.src = dataUrl;
                                };
                                reader.readAsDataURL(xhr.response);
                            } else {
                                console.error('XHR request failed');
                                reject(new Error('XHR request failed'));
                            }
                        };
                        
                        xhr.onerror = function() {
                            console.error('XHR request error');
                            reject(new Error('XHR request error'));
                        };
                        
                        xhr.send();
                    }
                });
            }
            
            // Function to capture canvas elements directly
            function captureCanvasElements() {
                // Get all elements in the canvas
                const elements = Array.from(canvasElement.querySelectorAll('.canvas-element'));
                
                // Create a promise for each element
                const elementPromises = elements.map(element => {
                    return new Promise((resolve) => {
                        // Skip resize handles and other UI elements
                        if (element.classList.contains('resize-handle') || 
                            element.classList.contains('rotate-button')) {
                            resolve();
                            return;
                        }
                        
                        // Get element position and size
                        const rect = element.getBoundingClientRect();
                        const canvasRect = canvasElement.getBoundingClientRect();
                        
                        // Calculate position relative to canvas
                        const x = rect.left - canvasRect.left;
                        const y = rect.top - canvasRect.top;
                        const width = rect.width;
                        const height = rect.height;
                        
                        // If it's an image element, draw it directly
                        if (element.classList.contains('media-element') && element.dataset.mediaType === 'image') {
                            const img = element.querySelector('img');
                            if (img) {
                                // Create a new image to ensure it's loaded
                                const newImg = new Image();
                                newImg.crossOrigin = 'Anonymous';
                                newImg.onload = () => {
                                    // Get rotation if any
                                    let rotation = 0;
                                    const transform = element.style.transform;
                                    if (transform) {
                                        const rotateMatch = transform.match(/rotate\(([^)]+)deg\)/);
                                        if (rotateMatch && rotateMatch[1]) {
                                            rotation = parseFloat(rotateMatch[1]);
                                        }
                                    }
                                    
                                    // Save context state
                                    ctx.save();
                                    
                                    // Translate to the center of where the image should be
                                    ctx.translate(x + width/2, y + height/2);
                                    
                                    // Rotate if needed
                                    if (rotation !== 0) {
                                        ctx.rotate(rotation * Math.PI / 180);
                                    }
                                    
                                    // Draw the image centered
                                    ctx.drawImage(newImg, -width/2, -height/2, width, height);
                                    
                                    // Restore context state
                                    ctx.restore();
                                    
                                    resolve();
                                };
                                newImg.onerror = () => {
                                    console.error('Failed to load image element');
                                    resolve();
                                };
                                newImg.src = img.src;
                            } else {
                                resolve();
                            }
                        } 
                        // For text and shape elements, use html2canvas
                        else {
                            html2canvas(element, {
                                scale: 2,
                                useCORS: true,
                                allowTaint: true,
                                backgroundColor: null,
                                logging: false,
                                imageTimeout: 15000
                            }).then(elementCanvas => {
                                // Get rotation if any
                                let rotation = 0;
                                const transform = element.style.transform;
                                if (transform) {
                                    const rotateMatch = transform.match(/rotate\(([^)]+)deg\)/);
                                    if (rotateMatch && rotateMatch[1]) {
                                        rotation = parseFloat(rotateMatch[1]);
                                    }
                                }
                                
                                // Save context state
                                ctx.save();
                                
                                // Translate to the center of where the element should be
                                ctx.translate(x + width/2, y + height/2);
                                
                                // Rotate if needed
                                if (rotation !== 0) {
                                    ctx.rotate(rotation * Math.PI / 180);
                                }
                                
                                // Draw the element centered
                                ctx.drawImage(elementCanvas, -width/2, -height/2, width, height);
                                
                                // Restore context state
                                ctx.restore();
                                
                                resolve();
                            }).catch(error => {
                                console.error('Error capturing element:', error);
                                resolve();
                            });
                        }
                    });
                });
                
                // Wait for all elements to be processed
                Promise.all(elementPromises)
                    .then(() => {
                        // Resolve with the combined canvas
                        resolve(combinedCanvas);
                    })
                    .catch(error => {
                        console.error('Error processing elements:', error);
                        reject(error);
                    });
            }
            
            // Function to capture canvas without background
            function captureCanvasWithoutBackground() {
                showSaveIndicator("Capturing design...");
                
                // Use the element-by-element approach even without background
                captureCanvasElements();
            }
        } catch (error) {
            console.error('Error creating combined canvas:', error);
            reject(error);
        }
    });
}

/**
 * Sanitizes a file name by removing invalid characters
 * @param {string} fileName - The file name to sanitize
 * @returns {string} - The sanitized file name
 */
function sanitizeFileName(fileName) {
    // Remove characters that are invalid in file names
    return fileName.replace(/[\\/:*?"<>|]/g, '_');
}

// Share Button Handler
document.getElementById('shareBtn').addEventListener('click', () => {
    // TODO: Implement share functionality
    console.log('Share button clicked');
});

// Text Tools Setup
function setupTextTools() {
    const textButtons = document.querySelectorAll('.text-tools .tool-btn');
    textButtons.forEach(button => {
        button.addEventListener('click', () => {
            const type = button.id;
            let fontSize, text;
            
            switch(type) {
                case 'addHeadingBtn':
                    fontSize = 32;
                    text = 'Heading';
                    break;
                case 'addSubheadingBtn':
                    fontSize = 24;
                    text = 'Subheading';
                    break;
                case 'addTextBtn':
                    fontSize = 16;
                    text = 'Text';
                    break;
            }
            
            const element = addTextElement(text, fontSize);
            
            // Show text editing toolbar immediately
            const toolbar = document.getElementById('textEditingToolbar');
            if (toolbar) {
                toolbar.style.display = 'flex';
                updateTextToolbarState(element);
            }
            
            // Make the element editable immediately
            element.contentEditable = true;
            element.focus();
            
            // Select all text for immediate editing
            const range = document.createRange();
            range.selectNodeContents(element);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        });
    });
}

function addTextElement(text, fontSize) {
    const element = document.createElement('div');
    element.className = 'canvas-element text-element';
    element.contentEditable = true;
    element.innerHTML = text;
    
    // Set initial styles with proper defaults
    element.style.fontSize = `${fontSize || 16}px`;
    element.style.fontFamily = '"Open Sans", sans-serif';
    element.style.left = '50%';
    element.style.top = '50%';
    element.style.transform = 'translate(-50%, -50%) rotate(0deg)';
    element.style.width = 'auto';
    element.style.minWidth = '30px';
    element.style.height = 'auto';
    element.style.whiteSpace = 'pre-wrap';
    element.style.wordWrap = 'break-word';
    element.style.textAlign = 'left';
    element.style.lineHeight = '1.5';
    element.style.padding = '4px 8px';
    element.style.boxSizing = 'border-box';
    element.style.color = '#000000';
    element.style.fontWeight = 'normal';
    element.style.fontStyle = 'normal';
    element.style.textDecoration = 'none';
    element.style.userSelect = 'none';
    element.style.cursor = 'move';
    element.style.zIndex = '1';
    
    // Add resize handles
    const handles = [
        'top-left', 'top', 'top-right',
        'left', 'right',
        'bottom-left', 'bottom', 'bottom-right'
    ];
    
    handles.forEach(position => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${position}`;
        element.appendChild(handle);
    });
    
    // Add the rotation button
    const rotateButton = document.createElement('button');
    rotateButton.className = 'rotate-button';
    rotateButton.innerHTML = '<i class="fas fa-arrows-alt"></i>';
    rotateButton.title = 'Drag to rotate';
    element.appendChild(rotateButton);
    
    canvas.appendChild(element);
    
    // Event listeners
    element.addEventListener('click', handleTextClick);
    element.addEventListener('blur', handleTextBlur);
    element.addEventListener('mousedown', handleMouseDown);
    
    // Make element resizable and rotatable
    makeElementResizable(element);
    makeElementRotatable(element);
    
    // Select the element immediately
    selectElement(element);
    
    // Update toolbar state
    updateTextToolbarState(element);
    
    return element;
}

function handleTextClick(e) {
    if (editorState.isDragging) return;
    
    const element = e.target.closest('.text-element');
    if (!element) return;
    
    // Always show properties panel for text elements
    const textProperties = document.querySelector('.text-properties');
    const shapeProperties = document.querySelector('.shape-properties');
    const noSelection = document.querySelector('.no-selection-message');
    
    if (textProperties) textProperties.style.display = 'block';
    if (shapeProperties) shapeProperties.style.display = 'none';
    if (noSelection) noSelection.style.display = 'none';
    
    // Deselect all other elements
    document.querySelectorAll('.canvas-element').forEach(el => {
        if (el !== element) {
            el.classList.remove('selected', 'active-element');
            if (el.classList.contains('text-element')) {
            el.contentEditable = false;
            }
        }
    });
    
    // Select current element and show properties
    element.classList.add('selected', 'active-element');
    
    // Update editor state
    editorState.selectedElement = element;
    
    // Always update text properties
        updateTextToolbarState(element);
    updateTextProperties(element);
    
    // Handle text editing
    if (e.target === element) {
        element.contentEditable = true;
        element.focus();
        
        // Place cursor at click position
        const selection = window.getSelection();
        const range = document.caretRangeFromPoint(e.clientX, e.clientY);
        if (range) {
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
    
    e.stopPropagation();
}

function handleTextBlur(e) {
    const element = e.target;
    if (!element.classList.contains('text-element')) return;
    
    // Keep element selected but make it non-editable
    element.contentEditable = false;
    
    // Check if text is empty
    if (!element.textContent.trim()) {
        element.remove();
        return;
    }
    
    // Keep the toolbar visible and updated
    const toolbar = document.getElementById('textEditingToolbar');
    if (toolbar) {
        toolbar.style.display = 'flex';
        updateTextToolbarState(element);
    }
    
    // Keep the element selected
    element.classList.add('selected');
}

function updateTextToolbarState(element) {
    if (!element || !element.classList.contains('text-element')) return;
    
    // Update font family
    const fontFamily = element.style.fontFamily.replace(/['"]/g, '') || 'Arial';
    const fontFamilySelect = document.getElementById('fontFamily');
    const fontFamilySelectToolbar = document.getElementById('fontFamilySelect');
    if (fontFamilySelect) fontFamilySelect.value = fontFamily;
    if (fontFamilySelectToolbar) fontFamilySelectToolbar.value = fontFamily;
    
    // Update font size
    const fontSize = parseInt(window.getComputedStyle(element).fontSize) || 16;
    const fontSizeInput = document.getElementById('fontSize');
    const fontSizeInputToolbar = document.getElementById('fontSizeInput');
    if (fontSizeInput) fontSizeInput.value = fontSize;
    if (fontSizeInputToolbar) fontSizeInputToolbar.value = fontSize;
    
    // Update color
    const color = rgbToHex(window.getComputedStyle(element).color) || '#000000';
    const colorPicker = document.getElementById('textColor');
    const colorPickerToolbar = document.getElementById('textColorPicker');
    if (colorPicker) colorPicker.value = color;
    if (colorPickerToolbar) colorPickerToolbar.value = color;
    
    // Update style buttons
    const computedStyle = window.getComputedStyle(element);
    const isBold = parseInt(computedStyle.fontWeight) >= 600;
    const isItalic = computedStyle.fontStyle === 'italic';
    const isUnderlined = computedStyle.textDecoration.includes('underline');
    
    // Update both sets of style buttons
    ['', 'Text'].forEach(suffix => {
        const boldBtn = document.getElementById(`bold${suffix}`);
        const italicBtn = document.getElementById(`italic${suffix}`);
        const underlineBtn = document.getElementById(`underline${suffix}`);
        
        if (boldBtn) boldBtn.classList.toggle('active', isBold);
        if (italicBtn) italicBtn.classList.toggle('active', isItalic);
        if (underlineBtn) underlineBtn.classList.toggle('active', isUnderlined);
    });
    
    // Update alignment buttons
    const textAlign = element.style.textAlign || 'left';
    const alignButtons = {
        'left': ['alignLeftBtn', 'alignLeft'],
        'center': ['alignCenterBtn', 'alignCenter'],
        'right': ['alignRightBtn', 'alignRight']
    };
    
    Object.entries(alignButtons).forEach(([align, btnIds]) => {
        btnIds.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) btn.classList.toggle('active', align === textAlign);
        });
    });
    
    // Update data-align buttons
    document.querySelectorAll('[data-align]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.align === textAlign);
    });
}

function handleMouseDown(e) {
    const element = e.target.closest('.text-element');
    if (!element) return;
    
    // Don't start drag if clicking resize handle or editing
    if (e.target.classList.contains('resize-handle') || 
        (element.classList.contains('selected') && e.target === element)) {
        return;
    }
    
    startDragging(e, element);
}

function startDragging(e, element) {
    if (!element) return;
    e.preventDefault();
    
    // Enable hardware acceleration
    element.style.willChange = 'transform';
    
    // Get initial positions and cache element properties
    const canvas = document.getElementById('canvas');
    const canvasRect = canvas.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    // Calculate initial offset relative to the mouse position
    const startX = e.clientX;
    const startY = e.clientY;
    const initialLeft = parseFloat(element.style.left) || 0;
    const initialTop = parseFloat(element.style.top) || 0;
    const offsetX = startX - elementRect.left;
    const offsetY = startY - elementRect.top;
    
    // Get current zoom level
    const zoom = editorState.zoom;
    
    // Prepare element for dragging
    element.classList.add('dragging');
    
    function handleDrag(e) {
        // Calculate new position relative to canvas
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        // Convert mouse position to canvas coordinates
        let x = (mouseX - canvasRect.left - offsetX) / zoom;
        let y = (mouseY - canvasRect.top - offsetY) / zoom;
        
        // Get actual canvas dimensions
        const canvasWidth = editorState.canvasWidth;
        const canvasHeight = editorState.canvasHeight;
        
        // Get element dimensions
        const elementWidth = parseFloat(element.style.width) || elementRect.width / zoom;
        const elementHeight = parseFloat(element.style.height) || elementRect.height / zoom;
        
        if (element.classList.contains('text-element')) {
            // For text elements, we need to handle the center alignment differently
            const halfWidth = elementWidth / 2;
            const halfHeight = elementHeight / 2;
            
            // Constrain to canvas boundaries while considering center alignment
            x = Math.max(halfWidth + 1, Math.min(canvasWidth - halfWidth - 1, x));
            y = Math.max(halfHeight + 1, Math.min(canvasHeight - halfHeight - 1, y));
        } else {
            // For other elements, constrain to canvas boundaries with 1px offset
            x = Math.max(1, Math.min(canvasWidth - elementWidth - 1, x));
            y = Math.max(1, Math.min(canvasHeight - elementHeight - 1, y));
        }
        
        // Apply position
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;
        
        // Update position inputs if element is selected
        if (editorState.selectedElement === element) {
            const posXInput = document.getElementById('positionX');
            const posYInput = document.getElementById('positionY');
            if (posXInput) posXInput.value = Math.round(x);
            if (posYInput) posYInput.value = Math.round(y);
        }
    }
    
    function stopDragging() {
        element.style.willChange = 'auto';
        element.classList.remove('dragging');
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', stopDragging);
        
        // Add to history
        pushToHistory({
            type: 'move',
            elementId: element.id,
            oldPosition: { x: initialLeft, y: initialTop },
            newPosition: { 
                x: parseFloat(element.style.left), 
                y: parseFloat(element.style.top)
            }
        });
    }
    
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDragging);
}

// Make Element Resizable
function makeElementResizable(element) {
    const handles = element.querySelectorAll('.resize-handle');
    
    handles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const position = handle.className.replace('resize-handle ', '');
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = element.offsetWidth;
            const startHeight = element.offsetHeight;
            const startLeft = element.offsetLeft;
            const startTop = element.offsetTop;
            
            element.classList.add('resizing');
            
            function resize(e) {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                let newWidth = startWidth;
                let newHeight = startHeight;
                let newLeft = startLeft;
                let newTop = startTop;
                
                // Handle resizing based on which handle was grabbed
                if (position.includes('left')) {
                    newWidth = Math.max(20, startWidth - deltaX);
                    newLeft = startLeft + (startWidth - newWidth);
                }
                if (position.includes('right')) {
                    newWidth = Math.max(20, startWidth + deltaX);
                }
                if (position.includes('top')) {
                    newHeight = Math.max(20, startHeight - deltaY);
                    newTop = startTop + (startHeight - newHeight);
                }
                if (position.includes('bottom')) {
                    newHeight = Math.max(20, startHeight + deltaY);
                }
                
                // For circle shape, maintain aspect ratio
                if (element.dataset.shapeType === 'circle') {
                    const size = Math.max(newWidth, newHeight);
                    newWidth = size;
                    newHeight = size;
                }
                
                // Apply the new dimensions and position
                element.style.width = `${newWidth}px`;
                element.style.height = `${newHeight}px`;
                element.style.left = `${newLeft}px`;
                element.style.top = `${newTop}px`;
                
                // Update SVG viewBox if shape has SVG content
                const svg = element.querySelector('svg');
                if (svg) {
                    svg.setAttribute('width', '100%');
                    svg.setAttribute('height', '100%');
                    if (element.dataset.shapeType === 'line' || element.dataset.shapeType === 'arrow') {
                        svg.setAttribute('viewBox', `0 0 ${newWidth} ${newHeight}`);
                        const line = svg.querySelector('line');
                        if (line) {
                            if (element.dataset.shapeType === 'arrow') {
                                line.setAttribute('x2', String(newWidth - 10));
                            } else {
                                line.setAttribute('x2', String(newWidth));
                            }
                        }
                    }
                }
            }
            
            function stopResize() {
                element.classList.remove('resizing');
                document.removeEventListener('mousemove', resize);
                document.removeEventListener('mouseup', stopResize);
            }
            
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
        });
    });
}

// Shape Tools Setup
function setupShapeTools() {
    shapeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const shapeType = button.dataset.shape;
            addShapeElement(shapeType);
        });
    });
}

// Add Shape Element
function addShapeElement(shapeType) {
    // Generate a unique ID for the shape
    const shapeId = `shape-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const element = document.createElement('div');
    element.className = 'canvas-element shape-element';
    element.id = shapeId;
    element.dataset.shapeType = shapeType;
    
    // Set initial position to center of canvas
    const canvas = document.getElementById('canvas');
    const canvasRect = canvas.getBoundingClientRect();
    
    // Default size and position
    let width = 100;
    let height = 100;
    
    // Adjust size based on shape type
    switch(shapeType) {
        case 'line':
        case 'arrow':
            width = 200;
            height = 24;
            break;
        case 'star':
            width = 120;
            height = 120;
            break;
    }
    
    // Position in center of canvas
    const left = (canvasRect.width - width) / 2;
    const top = (canvasRect.height - height) / 2;
    
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
    
    // Set default styles
    element.style.backgroundColor = '#ffffff';
    element.style.border = '1px solid #000000';
    
    // Add resize handles
    const handles = [
        'top-left', 'top', 'top-right',
        'left', 'right',
        'bottom-left', 'bottom', 'bottom-right'
    ];
    
    handles.forEach(position => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${position}`;
        element.appendChild(handle);
    });
    
    // Special handling for different shape types
    if (shapeType === 'circle') {
        element.style.borderRadius = '50%';
    } else if (shapeType === 'line' || shapeType === 'arrow') {
        element.style.backgroundColor = 'transparent';
        element.style.border = 'none';
        
        // Create SVG for line/arrow
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.style.display = 'block';
        
        if (shapeType === 'line') {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '0');
            line.setAttribute('y1', height / 2);
            line.setAttribute('x2', width);
            line.setAttribute('y2', height / 2);
            line.setAttribute('stroke', '#000000');
            line.setAttribute('stroke-width', '2');
            line.style.stroke = '#000000';
            svg.appendChild(line);
        } else {
            // Create marker for arrow head
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
            marker.setAttribute('id', `arrowhead-${shapeId}`);
            marker.setAttribute('markerWidth', '30');
            marker.setAttribute('markerHeight', '30');
            marker.setAttribute('refX', '30');
            marker.setAttribute('refY', '15');
            marker.setAttribute('orient', 'auto');
            marker.setAttribute('markerUnits', 'userSpaceOnUse');
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M0,0 L30,15 L0,30 Z');
            path.setAttribute('fill', '#000000');
            path.style.fill = '#000000';
            
            marker.appendChild(path);
            defs.appendChild(marker);
            svg.appendChild(defs);
            
            // Create line with arrow
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '0');
            line.setAttribute('y1', height / 2);
            line.setAttribute('x2', width - 30);
            line.setAttribute('y2', height / 2);
            line.setAttribute('stroke', '#000000');
            line.setAttribute('stroke-width', '8');
            line.setAttribute('marker-end', `url(#arrowhead-${shapeId})`);
            line.style.stroke = '#000000';
            svg.appendChild(line);
        }
        
        element.appendChild(svg);
        
        // Store the initial color
        element.dataset.color = '#000000';
    }
    
    // Add to canvas
    canvas.appendChild(element);
    
    // Make element interactive
    makeElementDraggable(element);
    makeElementResizable(element);
    makeElementRotatable(element);
    
    // Select the element
    selectElement(element);
    
    return element;
}

// Helper function to get cursor style for resize handles
function getCursorForHandle(position) {
    switch(position) {
        case 'top-left':
        case 'bottom-right':
            return 'nwse-resize';
        case 'top-right':
        case 'bottom-left':
            return 'nesw-resize';
        case 'top':
        case 'bottom':
            return 'ns-resize';
        case 'left':
        case 'right':
            return 'ew-resize';
        default:
            return 'move';
    }
}

// Make Element Draggable
function makeElementDraggable(element) {
    let isDragging = false;
    let dragStartTime;
    
    function handleMouseDown(e) {
        // Don't handle if clicking resize or rotation handles
        if (e.target.classList.contains('resize-handle') || 
            e.target.classList.contains('rotation-handle')) {
            return;
        }
        
        dragStartTime = Date.now();
        isDragging = false;
        
        // Always select on mousedown
        if (e.target === element) {
            selectElement(element);
        }
        
        const moveHandler = (moveEvent) => {
            // Only start dragging if mouse has moved
            if (!isDragging && (Math.abs(moveEvent.clientX - e.clientX) > 5 || 
                Math.abs(moveEvent.clientY - e.clientY) > 5)) {
                isDragging = true;
                startDragging(e, element);
            }
        };
        
        const upHandler = () => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
        };
        
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    }

    // Store the handler reference on the element
    element._dragHandler = handleMouseDown;
    
    // Remove previous handlers if they exist
    if (element._oldDragHandler) {
        element.removeEventListener('mousedown', element._oldDragHandler);
    }
    
    // Add new handler
    element.addEventListener('mousedown', handleMouseDown);
    
    // Store current handler as old handler for future cleanup
    element._oldDragHandler = handleMouseDown;
}

// Apply Momentum
function applyMomentum(element, velocity) {
    const friction = 0.95;
    const minSpeed = 0.1;
    let currentVelocity = { ...velocity };
    
    function momentumStep() {
        if (!element) return;
        
        // Get current position
        const currentLeft = parseFloat(element.style.left) || 0;
        const currentTop = parseFloat(element.style.top) || 0;
        
        // Update position
        element.style.left = `${currentLeft + currentVelocity.x}px`;
        element.style.top = `${currentTop + currentVelocity.y}px`;
        
        // Apply friction
        currentVelocity.x *= friction;
        currentVelocity.y *= friction;
        
        // Continue animation if velocity is still significant
        if (Math.abs(currentVelocity.x) > minSpeed || Math.abs(currentVelocity.y) > minSpeed) {
            requestAnimationFrame(momentumStep);
        }
    }
    
    requestAnimationFrame(momentumStep);
}

// Make Element Rotatable
function makeElementRotatable(element) {
    const rotationHandle = document.createElement('div');
    rotationHandle.className = 'rotation-handle';
    element.appendChild(rotationHandle);
    
    rotationHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        startRotating(e, element);
    });
}

// Start Rotating
function startRotating(e, element) {
    editorState.isRotating = true;
    editorState.selectedElement = element;
    
    const rect = element.getBoundingClientRect();
    editorState.rotationOrigin = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
    
    // Get current rotation
    const transform = element.style.transform;
    const match = transform.match(/rotate\((-?\d+)deg\)/);
    editorState.rotation = match ? parseInt(match[1]) : 0;
}

// Handle Rotation
function handleRotation(e) {
    if (!editorState.isRotating || !editorState.selectedElement) return;
    
    const element = editorState.selectedElement;
    const origin = editorState.rotationOrigin;
    
    // Calculate angle
    const angle = Math.atan2(
        e.clientY - origin.y,
        e.clientX - origin.x
    ) * 180 / Math.PI + 90;
    
    // Update rotation
    const newRotation = (angle + 360) % 360;
    updateElementRotation(element, newRotation);
    
    // Update rotation controls
    document.getElementById('rotationSlider').value = newRotation;
    document.getElementById('rotationInput').value = Math.round(newRotation);
}

// Update Element Rotation
function updateElementRotation(element, angle) {
    const currentTransform = element.style.transform;
    const baseTransform = currentTransform.replace(/\s*rotate\(-?\d+deg\)/, '');
    element.style.transform = `${baseTransform} rotate(${angle}deg)`;
}

// Setup Canvas Interaction
function setupCanvasInteraction() {
    const canvasContainer = document.querySelector('.canvas-container');
    
    // Handle mouse wheel scrolling
    canvasContainer.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            // Handle zoom
            e.preventDefault();
            const delta = e.deltaY;
            const zoomChange = delta > 0 ? -editorState.zoomStep : editorState.zoomStep;
            const newZoom = Math.max(
                editorState.minZoom,
                Math.min(editorState.maxZoom, editorState.zoom + zoomChange)
            );
            updateZoom(newZoom);
        } else if (e.shiftKey) {
            // Horizontal scroll
            e.preventDefault();
            canvasContainer.scrollLeft += e.deltaY;
        }
    });
    
    // Handle other interactions
    document.addEventListener('mousemove', (e) => {
        if (editorState.isDragging) {
            handleDragging(e);
        } else if (editorState.isResizing) {
            handleResizing(e);
        } else if (editorState.isRotating) {
            handleRotation(e);
        }
    });
    
    document.addEventListener('mouseup', () => {
        editorState.isDragging = false;
        editorState.isResizing = false;
        editorState.isRotating = false;
    });
    
    canvas.addEventListener('click', (e) => {
        if (e.target === canvas) {
            deselectElement();
        }
    });
}

// Handle Resizing
function handleResizing(e) {
    if (!editorState.isResizing || !editorState.selectedElement) return;

    const element = editorState.selectedElement;
    const shapeType = element.dataset.shapeType;
    const handle = e.target;
    const position = handle.dataset.position;

    // Get current dimensions and position
    const rect = element.getBoundingClientRect();
    const startWidth = rect.width;
    const startLeft = parseFloat(element.style.left);
    const startX = e.clientX;

    function resize(e) {
        const deltaX = (e.clientX - startX) / editorState.zoom;

        if (shapeType === 'line' || shapeType === 'arrow') {
            let newWidth = startWidth;
            let newLeft = startLeft;

            if (position === 'left') {
                newWidth = Math.max(100, startWidth - deltaX); // Increased minimum width
                newLeft = startLeft + deltaX;
            } else if (position === 'right') {
                newWidth = Math.max(100, startWidth + deltaX); // Increased minimum width
            }

            // Update element dimensions
            element.style.width = `${newWidth}px`;
            element.style.left = `${newLeft}px`;

            // Update SVG viewBox and elements
            const svg = element.querySelector('svg');
            if (svg) {
                svg.setAttribute('viewBox', `0 0 ${newWidth} 24`);

                if (shapeType === 'line') {
                    const line = svg.querySelector('line');
                    line.setAttribute('x2', String(newWidth));
                } else if (shapeType === 'arrow') {
                    const line = svg.querySelector('line');
                    line.setAttribute('x2', String(newWidth - 30)); // Adjusted for larger arrowhead
                }
            }
        }
    }
        
    function stopResize() {
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
        element.classList.remove('resizing');
        editorState.isResizing = false;
    }
    
    element.classList.add('resizing');
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
}

// Select Element
function selectElement(element) {
    if (!element) return;

    // Update editor state
    editorState.selectedElement = element;
    
    // Remove selection from all other elements
    document.querySelectorAll('.canvas-element').forEach(el => {
        if (el !== element) {
            el.classList.remove('selected', 'active-element');
            if (el.classList.contains('text-element')) {
                el.contentEditable = false;
            }
            // Hide resize handles for other elements
            const handles = el.querySelectorAll('.resize-handle');
            handles.forEach(handle => {
                handle.style.opacity = '0';
                handle.style.visibility = 'hidden';
            });
        }
    });
    
    // Add selection to current element
    element.classList.add('selected', 'active-element');
    
    // Show resize handles for the selected element
        const handles = element.querySelectorAll('.resize-handle');
        handles.forEach(handle => {
            handle.style.opacity = '1';
            handle.style.visibility = 'visible';
        });
    
    // Show appropriate property panel
    const textProperties = document.querySelector('.text-properties');
    const shapeProperties = document.querySelector('.shape-properties');
    const noSelection = document.querySelector('.no-selection-message');
    
    if (element.classList.contains('text-element')) {
        if (textProperties) textProperties.style.display = 'block';
        if (shapeProperties) shapeProperties.style.display = 'none';
        if (noSelection) noSelection.style.display = 'none';
        updateTextProperties(element);
        updateTextToolbarState(element);
    } else if (element.classList.contains('shape-element')) {
        if (textProperties) textProperties.style.display = 'none';
        if (shapeProperties) shapeProperties.style.display = 'block';
        if (noSelection) noSelection.style.display = 'none';
        updateShapeProperties(element);
    } else if (element.classList.contains('media-element')) {
        // For media elements, show shape properties panel for now
        if (textProperties) textProperties.style.display = 'none';
        if (shapeProperties) shapeProperties.style.display = 'block';
        if (noSelection) noSelection.style.display = 'none';
    }
    
    // Add a delete button to the selected element if it doesn't already have one
    if (!element.querySelector('.delete-btn')) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.title = 'Delete element';
        deleteBtn.style.position = 'absolute';
        deleteBtn.style.top = '-25px';
        deleteBtn.style.right = '-25px';
        deleteBtn.style.backgroundColor = '#f44336';
        deleteBtn.style.color = 'white';
        deleteBtn.style.border = 'none';
        deleteBtn.style.borderRadius = '50%';
        deleteBtn.style.width = '24px';
        deleteBtn.style.height = '24px';
        deleteBtn.style.display = 'flex';
        deleteBtn.style.alignItems = 'center';
        deleteBtn.style.justifyContent = 'center';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.zIndex = '100';
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSelectedElement();
        });
        
        element.appendChild(deleteBtn);
    }
}

// Update deselectElement function
function deselectElement() {
    const activeElement = document.querySelector('.active-element');
    if (activeElement) {
        activeElement.classList.remove('active-element', 'selected');
        
        // Clear outline and box shadow
        activeElement.style.outline = 'none';
        activeElement.style.boxShadow = 'none';
        
        // Hide resize handles
            const handles = activeElement.querySelectorAll('.resize-handle');
            handles.forEach(handle => {
                handle.style.opacity = '0';
                handle.style.visibility = 'hidden';
            });
        
        // Remove delete button if it exists
        const deleteBtn = activeElement.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.remove();
        }
        
        // Handle text element specific cleanup
        if (activeElement.classList.contains('text-element')) {
            activeElement.contentEditable = false;
        }
    }
    
    editorState.selectedElement = null;
    
    // Hide all property panels
    const textProperties = document.querySelector('.text-properties');
    const shapeProperties = document.querySelector('.shape-properties');
    const noSelection = document.querySelector('.no-selection-message');
    
    if (textProperties) textProperties.style.display = 'none';
    if (shapeProperties) shapeProperties.style.display = 'none';
    if (noSelection) noSelection.style.display = 'block';
}

// Setup Property Controls
function setupPropertyControls() {
    // Text Properties
    document.getElementById('fontFamily').addEventListener('change', updateSelectedTextFont);
    document.getElementById('fontSize').addEventListener('change', updateSelectedTextSize);
    document.getElementById('textColor').addEventListener('change', updateSelectedTextColor);
    
    // Text Style Buttons
    document.getElementById('boldBtn').addEventListener('click', toggleBold);
    document.getElementById('italicBtn').addEventListener('click', toggleItalic);
    document.getElementById('underlineBtn').addEventListener('click', toggleUnderline);
    
    // Text Alignment Buttons
    document.getElementById('alignLeftBtn').addEventListener('click', () => setTextAlign('left'));
    document.getElementById('alignCenterBtn').addEventListener('click', () => setTextAlign('center'));
    document.getElementById('alignRightBtn').addEventListener('click', () => setTextAlign('right'));
    
    // Shape Properties
    document.getElementById('shapeFillColor').addEventListener('change', updateShapeFill);
    document.getElementById('shapeBorderColor').addEventListener('change', updateShapeBorder);
    document.getElementById('shapeBorderWidth').addEventListener('change', updateShapeBorderWidth);
    document.getElementById('shapeOpacity').addEventListener('change', updateShapeOpacity);
    
    // Rotation Controls
    document.getElementById('rotationSlider').addEventListener('input', updateRotationFromSlider);
    document.getElementById('rotationInput').addEventListener('change', updateRotationFromInput);
    
    // Position Controls
    document.getElementById('positionX').addEventListener('change', updateElementPosition);
    document.getElementById('positionY').addEventListener('change', updateElementPosition);
    
    // Border Style
    document.getElementById('shapeBorderStyle').addEventListener('change', updateShapeBorderStyle);
}

// Property Update Functions
function updateTextProperties(element) {
    document.getElementById('fontFamily').value = element.style.fontFamily || 'Arial';
    document.getElementById('fontSize').value = parseInt(element.style.fontSize) || 16;
    document.getElementById('textColor').value = rgbToHex(element.style.color) || '#000000';
}

function updateShapeProperties(element) {
    document.getElementById('shapeFillColor').value = rgbToHex(element.style.backgroundColor) || '#ffffff';
    document.getElementById('shapeBorderColor').value = rgbToHex(element.style.borderColor) || '#000000';
    document.getElementById('shapeBorderWidth').value = parseInt(element.style.borderWidth) || 1;
    document.getElementById('shapeOpacity').value = Math.round(parseFloat(element.style.opacity) * 100) || 100;
}

// Text Property Update Functions
function updateSelectedTextFont(e) {
    if (!editorState.selectedElement || !editorState.selectedElement.classList.contains('text-element')) return;
    
    const element = editorState.selectedElement;
    element.style.fontFamily = `"${e.target.value}"`;
    
    // Update all font family controls
    const fontControls = [
        document.getElementById('fontFamily'),
        document.getElementById('fontFamilySelect')
    ];
    
    fontControls.forEach(control => {
        if (control && control !== e.target) {
            control.value = e.target.value;
        }
    });
}

function updateSelectedTextSize(e) {
    if (!editorState.selectedElement || !editorState.selectedElement.classList.contains('text-element')) return;
    
    const element = editorState.selectedElement;
    const size = Math.max(8, Math.min(200, parseInt(e.target.value) || 16));
    element.style.fontSize = `${size}px`;
    
    // Update all font size controls
    const sizeControls = [
        document.getElementById('fontSize'),
        document.getElementById('fontSizeInput')
    ];
    
    sizeControls.forEach(control => {
        if (control && control !== e.target) {
            control.value = size;
        }
    });
}

function updateSelectedTextColor(e) {
    if (!editorState.selectedElement || !editorState.selectedElement.classList.contains('text-element')) return;
    
    const element = editorState.selectedElement;
    element.style.color = e.target.value;
    
    // Update all color controls
    const colorControls = [
        document.getElementById('textColor'),
        document.getElementById('textColorPicker')
    ];
    
    colorControls.forEach(control => {
        if (control && control !== e.target) {
            control.value = e.target.value;
        }
    });
}

function toggleBold() {
    if (!editorState.selectedElement || !editorState.selectedElement.classList.contains('text-element')) return;
    
    const element = editorState.selectedElement;
    const currentWeight = window.getComputedStyle(element).fontWeight;
    const isBold = parseInt(currentWeight) >= 600;
    element.style.fontWeight = isBold ? 'normal' : 'bold';
    
    // Update all bold buttons
    const boldButtons = [
        document.getElementById('boldBtn'),
        document.getElementById('boldText')
    ];
    
    boldButtons.forEach(btn => {
        if (btn) btn.classList.toggle('active', !isBold);
    });
}

function toggleItalic() {
    if (!editorState.selectedElement || !editorState.selectedElement.classList.contains('text-element')) return;
    
    const element = editorState.selectedElement;
    const isItalic = window.getComputedStyle(element).fontStyle === 'italic';
    element.style.fontStyle = isItalic ? 'normal' : 'italic';
    
    // Update all italic buttons
    const italicButtons = [
        document.getElementById('italicBtn'),
        document.getElementById('italicText')
    ];
    
    italicButtons.forEach(btn => {
        if (btn) btn.classList.toggle('active', !isItalic);
    });
}

function toggleUnderline() {
    if (!editorState.selectedElement || !editorState.selectedElement.classList.contains('text-element')) return;
    
    const element = editorState.selectedElement;
    const hasUnderline = window.getComputedStyle(element).textDecoration.includes('underline');
    element.style.textDecoration = hasUnderline ? 'none' : 'underline';
    
    // Update all underline buttons
    const underlineButtons = [
        document.getElementById('underlineBtn'),
        document.getElementById('underlineText')
    ];
    
    underlineButtons.forEach(btn => {
        if (btn) btn.classList.toggle('active', !hasUnderline);
    });
}

function setTextAlign(alignment) {
    if (!editorState.selectedElement || !editorState.selectedElement.classList.contains('text-element')) return;
    
    const element = editorState.selectedElement;
    element.style.textAlign = alignment;
    
    // Update all alignment buttons
    const alignmentMap = {
        'left': ['alignLeftBtn', 'alignLeft'],
        'center': ['alignCenterBtn', 'alignCenter'],
        'right': ['alignRightBtn', 'alignRight']
    };
    
    // Update standard alignment buttons
    Object.entries(alignmentMap).forEach(([align, btnIds]) => {
        btnIds.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) btn.classList.toggle('active', align === alignment);
        });
    });
    
    // Update data-align buttons
    document.querySelectorAll('[data-align]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.align === alignment);
    });
}

// Shape Property Update Functions
function updateShapeFill(e) {
    const element = editorState.selectedElement;
    if (!element) return;
    
    const color = e.target.value;
    
    if (element.dataset.shapeType === 'line' || element.dataset.shapeType === 'arrow') {
        const svg = element.querySelector('svg');
        const line = svg.querySelector('line');
        line.style.stroke = color;
        line.setAttribute('stroke', color);
        
        if (element.dataset.shapeType === 'arrow') {
            const path = svg.querySelector('path');
            path.style.fill = color;
            path.setAttribute('fill', color);
        }
        
        element.dataset.color = color;
    } else {
        element.style.backgroundColor = color;
    }
    
    // Add to history
    pushToHistory({
        type: 'update',
        elementId: element.id,
        property: 'fill',
        oldValue: element.dataset.color || element.style.backgroundColor,
        newValue: color
    });
}

function updateShapeBorder(e) {
    if (!editorState.selectedElement) return;
    const element = editorState.selectedElement;
    const shapeType = element.dataset.shapeType;
    
    if (shapeType === 'line' || shapeType === 'arrow') {
        const svg = element.querySelector('svg');
        if (svg) {
            const shapes = svg.querySelectorAll('line, path');
            shapes.forEach(shape => {
                if (shape.tagName === 'line') {
                    shape.style.stroke = e.target.value;
                } else {
                    shape.style.fill = e.target.value;
                }
            });
        }
    } else if (!['star', 'hexagon'].includes(shapeType)) {
        element.style.borderColor = e.target.value;
    }
}

function updateShapeBorderWidth(e) {
    if (!editorState.selectedElement) return;
    const element = editorState.selectedElement;
    const shapeType = element.dataset.shapeType;
    
    if (shapeType === 'line' || shapeType === 'arrow') {
        const svg = element.querySelector('svg');
        if (svg) {
            const line = svg.querySelector('line');
            if (line) {
                line.style.strokeWidth = e.target.value;
            }
        }
    } else if (!['star', 'hexagon'].includes(shapeType)) {
        element.style.borderWidth = `${e.target.value}px`;
    }
}

function updateShapeOpacity(e) {
    if (!editorState.selectedElement) return;
    const element = editorState.selectedElement;
    element.style.opacity = e.target.value / 100;
}

function updateShapeBorderStyle(e) {
    if (!editorState.selectedElement) return;
    const element = editorState.selectedElement;
    const shapeType = element.dataset.shapeType;
    
    if (!['line', 'arrow', 'star', 'hexagon'].includes(shapeType)) {
        element.style.borderStyle = e.target.value;
    }
}

// Rotation Control Functions
function updateRotationFromSlider(e) {
    if (!editorState.selectedElement) return;
    const angle = parseInt(e.target.value);
    updateElementRotation(editorState.selectedElement, angle);
    document.getElementById('rotationInput').value = angle;
}

function updateRotationFromInput(e) {
    if (!editorState.selectedElement) return;
    const angle = parseInt(e.target.value);
    updateElementRotation(editorState.selectedElement, angle);
    document.getElementById('rotationSlider').value = angle;
}

// Position Update Function
function updateElementPosition(e) {
    if (!editorState.selectedElement) return;
    const element = editorState.selectedElement;
    const x = document.getElementById('positionX').value;
    const y = document.getElementById('positionY').value;
    
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
}

// Border Style Update Function
function updateShapeBorderStyle(e) {
    if (!editorState.selectedElement) return;
    editorState.selectedElement.style.borderStyle = e.target.value;
}

// Helper Functions
function rgbToHex(rgb) {
    if (!rgb) return '#000000';
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return rgb;
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

// Event Listeners
window.addEventListener('load', initEditor);
window.addEventListener('resize', handleResize); 

// Add history management functions
function pushToHistory(action) {
    // Clear redo stack when new action is performed
    editorState.history.redoStack = [];
    
    // Add action to undo stack
    editorState.history.undoStack.push(action);
    
    // Limit stack size
    if (editorState.history.undoStack.length > editorState.history.maxSize) {
        editorState.history.undoStack.shift();
    }
    
    // Update undo/redo button states
    updateUndoRedoButtons();
}

function undo() {
    if (editorState.history.undoStack.length === 0) return;
    
    const action = editorState.history.undoStack.pop();
    editorState.history.redoStack.push(action);
    
    // Perform the undo action
    switch (action.type) {
        case 'add':
            // Remove the element
            const elementToRemove = document.getElementById(action.elementId);
            if (elementToRemove) {
                elementToRemove.remove();
                editorState.elements = editorState.elements.filter(el => el.id !== action.elementId);
            }
            break;
            
        case 'remove':
            // Restore the element
            const elementData = action.elementData;
            if (elementData.type === 'text') {
                restoreTextElement(elementData);
            } else if (elementData.type === 'shape') {
                restoreShapeElement(elementData);
            }
            break;
            
        case 'move':
            // Restore previous position
            const elementToMove = document.getElementById(action.elementId);
            if (elementToMove) {
                elementToMove.style.left = `${action.oldPosition.x}px`;
                elementToMove.style.top = `${action.oldPosition.y}px`;
                if (action.oldTransform) {
                    elementToMove.style.transform = action.oldTransform;
                }
            }
            break;
    }
    
    updateUndoRedoButtons();
}

function redo() {
    if (editorState.history.redoStack.length === 0) return;
    
    const action = editorState.history.redoStack.pop();
    editorState.history.undoStack.push(action);
    
    // Perform the redo action
    switch (action.type) {
        case 'add':
            // Restore the element
            const elementData = action.elementData;
            if (elementData.type === 'text') {
                restoreTextElement(elementData);
            } else if (elementData.type === 'shape') {
                restoreShapeElement(elementData);
            }
            break;
            
        case 'remove':
            // Remove the element
            const elementToRemove = document.getElementById(action.elementId);
            if (elementToRemove) {
                elementToRemove.remove();
                editorState.elements = editorState.elements.filter(el => el.id !== action.elementId);
            }
            break;
            
        case 'move':
            // Apply the move
            const elementToMove = document.getElementById(action.elementId);
            if (elementToMove) {
                elementToMove.style.left = `${action.newPosition.x}px`;
                elementToMove.style.top = `${action.newPosition.y}px`;
                if (action.newTransform) {
                    elementToMove.style.transform = action.newTransform;
                }
            }
            break;
    }
    
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    if (undoBtn) {
        undoBtn.disabled = editorState.history.undoStack.length === 0;
    }
    if (redoBtn) {
        redoBtn.disabled = editorState.history.redoStack.length === 0;
    }
}

// Helper function to restore text element
function restoreTextElement(elementData) {
    const element = document.createElement('div');
    element.id = elementData.id;
    element.className = 'canvas-element text-element';
    element.contentEditable = true;
    element.innerHTML = elementData.content;
    Object.assign(element.style, elementData.styles);
    
    canvas.appendChild(element);
    editorState.elements.push(elementData);
    
    makeElementDraggable(element);
    makeElementResizable(element);
}

// Helper function to restore shape element
function restoreShapeElement(elementData) {
    const element = document.createElement('div');
    element.id = elementData.id;
    element.className = 'canvas-element shape-element';
    element.dataset.shapeType = elementData.shapeType;
    
    // Restore styles
    Object.assign(element.style, elementData.styles);
    
    // Restore SVG elements for lines and arrows
    if (elementData.shapeType === 'line' || elementData.shapeType === 'arrow') {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${elementData.styles.width} ${elementData.styles.height}`);
        
        if (elementData.shapeType === 'line') {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '0');
            line.setAttribute('y1', parseInt(elementData.styles.height) / 2);
            line.setAttribute('x2', elementData.styles.width);
            line.setAttribute('y2', parseInt(elementData.styles.height) / 2);
            line.setAttribute('stroke', elementData.color || '#000000');
            line.setAttribute('stroke-width', '2');
            line.style.stroke = elementData.color || '#000000';
            svg.appendChild(line);
        } else {
            // Restore arrow with marker
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
            marker.setAttribute('id', `arrowhead-${elementData.id}`);
            marker.setAttribute('markerWidth', '30');
            marker.setAttribute('markerHeight', '30');
            marker.setAttribute('refX', '30');
            marker.setAttribute('refY', '15');
            marker.setAttribute('orient', 'auto');
            marker.setAttribute('markerUnits', 'userSpaceOnUse');
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M0,0 L30,15 L0,30 Z');
            path.setAttribute('fill', '#000000');
            path.style.fill = '#000000';
            
            marker.appendChild(path);
            defs.appendChild(marker);
            svg.appendChild(defs);
            
            // Create line with arrow
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '0');
            line.setAttribute('y1', height / 2);
            line.setAttribute('x2', width - 30);
            line.setAttribute('y2', height / 2);
            line.setAttribute('stroke', '#000000');
            line.setAttribute('stroke-width', '8');
            line.setAttribute('marker-end', `url(#arrowhead-${elementData.id})`);
            line.style.stroke = '#000000';
            svg.appendChild(line);
        }
        
        element.appendChild(svg);
        element.dataset.color = elementData.color || '#000000';
    }
    
    canvas.appendChild(element);
    
    // Make element interactive
    makeElementDraggable(element);
    makeElementResizable(element);
    makeElementRotatable(element);
    
    return element;
}

// Delete Selected Element
function deleteSelectedElement() {
    const element = editorState.selectedElement;
    if (!element) return;
    
    // Don't delete if we're editing text
    if (element.isContentEditable && document.activeElement === element) {
        return;
    }
    
    // Store element data for undo
    const elementData = {
        id: element.id,
        type: element.classList.contains('text-element') ? 'text' : 'shape',
        styles: { ...element.style },
        content: element.innerHTML,
        shapeType: element.dataset.shapeType,
        className: element.className
    };
    
    // Remove from DOM
    element.remove();
    
    // Update editor state
    editorState.elements = editorState.elements.filter(el => el.id !== element.id);
    editorState.selectedElement = null;
    
    // Add to history
    pushToHistory({
        type: 'remove',
        elementId: element.id,
        elementData: elementData
    });
    
    // Hide property panels
    document.querySelector('.text-properties').style.display = 'none';
    document.querySelector('.shape-properties').style.display = 'none';
    document.querySelector('.no-selection-message').style.display = 'block';
}

// Add keyboard event listener for delete/backspace
document.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && editorState.selectedElement) {
        const element = editorState.selectedElement;
        
        // Only delete if we're not editing text
        if (!element.isContentEditable || document.activeElement !== element) {
            e.preventDefault(); // Prevent browser back navigation on backspace
            deleteSelectedElement();
        }
    }
});

// Add setupTextEditingToolbar function
function setupTextEditingToolbar() {
    const toolbar = document.getElementById('textEditingToolbar');
    if (!toolbar) {
        console.error('Text editing toolbar not found');
        return;
    }
    
    // Ensure toolbar is initially hidden
    toolbar.style.display = 'none';
    
    // Font family change
    const fontFamilySelect = document.getElementById('fontFamilySelect');
    if (fontFamilySelect) {
        fontFamilySelect.addEventListener('change', (e) => {
            const element = document.querySelector('.text-element.selected');
            if (!element) return;
            element.style.fontFamily = e.target.value;
        });
    }
    
    // Font size change
    const fontSizeInput = document.getElementById('fontSizeInput');
    if (fontSizeInput) {
        fontSizeInput.addEventListener('input', (e) => {
            const element = document.querySelector('.text-element.selected');
            if (!element) return;
            element.style.fontSize = `${e.target.value}px`;
        });
    }
    
    // Text color change
    const textColorPicker = document.getElementById('textColorPicker');
    if (textColorPicker) {
        textColorPicker.addEventListener('input', (e) => {
            const element = document.querySelector('.text-element.selected');
            if (!element) return;
            element.style.color = e.target.value;
        });
    }
    
    // Style buttons
    const boldText = document.getElementById('boldText');
    if (boldText) {
        boldText.addEventListener('click', () => {
            const element = document.querySelector('.text-element.selected');
            if (!element) return;
            const isBold = element.style.fontWeight === 'bold';
            element.style.fontWeight = isBold ? 'normal' : 'bold';
            boldText.classList.toggle('active');
        });
    }
    
    const italicText = document.getElementById('italicText');
    if (italicText) {
        italicText.addEventListener('click', () => {
            const element = document.querySelector('.text-element.selected');
            if (!element) return;
            const isItalic = element.style.fontStyle === 'italic';
            element.style.fontStyle = isItalic ? 'normal' : 'italic';
            italicText.classList.toggle('active');
        });
    }
    
    const underlineText = document.getElementById('underlineText');
    if (underlineText) {
        underlineText.addEventListener('click', () => {
            const element = document.querySelector('.text-element.selected');
            if (!element) return;
            const isUnderlined = element.style.textDecoration === 'underline';
            element.style.textDecoration = isUnderlined ? 'none' : 'underline';
            underlineText.classList.toggle('active');
        });
    }
    
    // Alignment buttons
    document.querySelectorAll('[data-align]').forEach(button => {
        button.addEventListener('click', () => {
            const element = document.querySelector('.text-element.selected');
            if (!element) return;
            const alignment = button.dataset.align;
            element.style.textAlign = alignment;
            
            // Update active state
            document.querySelectorAll('[data-align]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.align === alignment);
            });
        });
    });
    
    // Prevent toolbar from disappearing when clicked
    toolbar.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    
    // Update toolbar position when window is resized
    window.addEventListener('resize', () => {
        const selectedElement = document.querySelector('.text-element.selected');
        if (selectedElement && toolbar.style.display === 'flex') {
            updateTextToolbarState(selectedElement);
        }
    });
} 

// Add Media Tools Setup
function setupMediaTools() {
    const imageBtn = document.getElementById('addImageBtn');
    const videoBtn = document.getElementById('addVideoBtn');
    const imageInput = document.getElementById('imageFileInput');
    const videoInput = document.getElementById('videoFileInput');
    
    if (!imageBtn || !videoBtn || !imageInput || !videoInput) {
        console.error('Media tools elements not found');
        return;
    }
    
    // Image upload handling
    imageBtn.addEventListener('click', () => {
        console.log('Image button clicked');
        imageInput.click();
    });
    
    imageInput.addEventListener('change', (e) => {
        console.log('Image input changed');
        const file = e.target.files[0];
        if (file) {
            console.log('File selected:', file.name);
            if (file.type.startsWith('image/')) {
                handleImageUpload(file);
            } else {
                alert('Please select a valid image file');
            }
        }
        // Reset input to allow uploading the same file again
        imageInput.value = '';
    });
    
    // Video upload handling
    videoBtn.addEventListener('click', () => {
        videoInput.click();
    });
    
    videoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type.startsWith('video/')) {
                handleVideoUpload(file);
            } else {
                alert('Please select a valid video file');
            }
        }
        // Reset input to allow uploading the same file again
        videoInput.value = '';
    });
}

function handleImageUpload(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        console.log('Image loaded');
        const img = new Image();
        
        img.onload = () => {
            console.log('Creating image element');
            // Create media element with default size 500x500
            const element = document.createElement('div');
            element.className = 'canvas-element media-element';
            element.dataset.mediaType = 'image';
            
            // Set unique ID
            element.id = `element-${Date.now()}`;
            
            // Calculate aspect ratio
            const aspectRatio = img.naturalWidth / img.naturalHeight;
            
            // Set default size (500x500 or maintain aspect ratio)
            const defaultSize = 500;
            let width = defaultSize;
            let height = defaultSize;
            
            if (aspectRatio > 1) {
                height = width / aspectRatio;
            } else {
                width = height * aspectRatio;
            }
            
            // Position at center of canvas
            const centerX = Math.max(1, Math.min(editorState.canvasWidth - width - 1, (editorState.canvasWidth - width) / 2));
            const centerY = Math.max(1, Math.min(editorState.canvasHeight - height - 1, (editorState.canvasHeight - height) / 2));
            
            // Set styles
            Object.assign(element.style, {
                position: 'absolute',
                width: `${width}px`,
                height: `${height}px`,
                left: `${centerX}px`,
                top: `${centerY}px`,
                transform: 'rotate(0deg)',
                cursor: 'move',
                overflow: 'hidden'
            });
            
            // Create image element
            const imgElement = document.createElement('img');
            imgElement.src = e.target.result;
            imgElement.style.width = '100%';
            imgElement.style.height = '100%';
            imgElement.style.objectFit = 'contain';
            imgElement.style.pointerEvents = 'none'; // Set to none to ensure clicks go to the container
            
            // Add click handler to the container
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                selectElement(element);
            });
            
            // Add context menu event listener to both container and image
            element.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleImageContextMenu(e, imgElement.src);
            });
            
            imgElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleImageContextMenu(e, imgElement.src);
            });
            
            element.appendChild(imgElement);
            
            // Add resize handles
            addResizeHandles(element);
            
            // Add to canvas
            const canvas = document.getElementById('canvas');
            canvas.appendChild(element);
            
            // Make interactive
            makeElementDraggable(element);
            makeElementResizable(element);
            makeElementRotatable(element);
            
            // Select the new element
            selectElement(element);
            
            // Add to editor state
            editorState.elements.push({
                id: element.id,
                type: 'media',
                mediaType: 'image',
                element: element
            });
            
            // Add to history
            pushToHistory({
                type: 'add',
                elementId: element.id,
                elementState: captureElementState(element)
            });
        };
        
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

// Function to handle image context menu
function handleImageContextMenu(e, imageSrc) {
    e.preventDefault();
    
    // Remove any existing context menus
    removeExistingContextMenu();
    
    // Create context menu
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.style.display = 'block'; // Ensure menu is visible
    contextMenu.style.position = 'fixed';
    contextMenu.style.zIndex = '9999';
    contextMenu.style.backgroundColor = '#ffffff';
    contextMenu.style.border = '1px solid #ccc';
    contextMenu.style.borderRadius = '4px';
    contextMenu.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    contextMenu.style.padding = '8px 0';
    
    // Add "Set as Background" option
    const setBackgroundOption = document.createElement('div');
    setBackgroundOption.className = 'context-menu-item';
    setBackgroundOption.innerHTML = '<i class="fas fa-image"></i> Set as Background';
    setBackgroundOption.style.padding = '8px 16px';
    setBackgroundOption.style.cursor = 'pointer';
    setBackgroundOption.style.display = 'flex';
    setBackgroundOption.style.alignItems = 'center';
    setBackgroundOption.style.gap = '8px';
    
    // Add hover effect
    setBackgroundOption.addEventListener('mouseover', () => {
        setBackgroundOption.style.backgroundColor = '#f0f0f0';
    });
    setBackgroundOption.addEventListener('mouseout', () => {
        setBackgroundOption.style.backgroundColor = 'transparent';
    });
    
    // Add click handler
    setBackgroundOption.addEventListener('click', () => {
        setAsBackground(imageSrc);
        removeExistingContextMenu();
    });
    
    contextMenu.appendChild(setBackgroundOption);
    
    // Position the context menu at cursor
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.style.top = `${e.clientY}px`;
    
    // Add to document
    document.body.appendChild(contextMenu);
    
    // Ensure menu stays within viewport
    const rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        contextMenu.style.left = `${e.clientX - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
        contextMenu.style.top = `${e.clientY - rect.height}px`;
    }
    
    // Close context menu when clicking outside
    document.addEventListener('click', removeExistingContextMenu);
}

// Function to remove existing context menu
function removeExistingContextMenu() {
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    document.removeEventListener('click', removeExistingContextMenu);
}

// Function to set image as background
function setAsBackground(imageSrc) {
    const canvas = document.getElementById('canvas');
    
    // Create a temporary image to get dimensions
    const tempImg = new Image();
    tempImg.onload = () => {
        // Add has-background class to canvas
        canvas.classList.add('has-background');
        
        // Set the background image with proper sizing
        canvas.style.backgroundImage = `url('${imageSrc}')`;
        canvas.style.backgroundPosition = 'center';
        canvas.style.backgroundRepeat = 'no-repeat';
        canvas.style.backgroundSize = 'cover';
        canvas.style.backgroundColor = '#ffffff';
        
        // Remove grid background if it exists
        canvas.style.setProperty('--grid-display', 'none');
        
        // Add to history
        pushToHistory({
            type: 'background',
            oldBackground: canvas.style.backgroundImage,
            newBackground: `url('${imageSrc}')`
        });
        
        // Force a redraw to ensure proper scaling
        canvas.style.display = 'none';
        canvas.offsetHeight; // Force reflow
        canvas.style.display = '';
    };
    
    tempImg.src = imageSrc;
}

function addResizeHandles(element) {
    const handles = [
        'top-left', 'top', 'top-right',
        'left', 'right',
        'bottom-left', 'bottom', 'bottom-right'
    ];
    
    handles.forEach(position => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${position}`;
        handle.style.position = 'absolute';
        handle.style.width = '12px'; // Larger clickable area
        handle.style.height = '12px';
        handle.style.backgroundColor = 'transparent'; // Make handle invisible
        handle.style.border = 'none'; // Remove border
        handle.style.cursor = getCursorForHandle(position);
        handle.style.zIndex = '100';
        
        // Position the handle with larger hit area but invisible
        switch(position) {
            case 'top-left':
                handle.style.top = '-6px';
                handle.style.left = '-6px';
                break;
            case 'top':
                handle.style.top = '-6px';
                handle.style.left = '50%';
                handle.style.transform = 'translateX(-50%)';
                break;
            case 'top-right':
                handle.style.top = '-6px';
                handle.style.right = '-6px';
                break;
            case 'left':
                handle.style.left = '-6px';
                handle.style.top = '50%';
                handle.style.transform = 'translateY(-50%)';
                break;
            case 'right':
                handle.style.right = '-6px';
                handle.style.top = '50%';
                handle.style.transform = 'translateY(-50%)';
                break;
            case 'bottom-left':
                handle.style.bottom = '-6px';
                handle.style.left = '-6px';
                break;
            case 'bottom':
                handle.style.bottom = '-6px';
                handle.style.left = '50%';
                handle.style.transform = 'translateX(-50%)';
                break;
            case 'bottom-right':
                handle.style.bottom = '-6px';
                handle.style.right = '-6px';
                break;
        }
        
        element.appendChild(handle);
    });
} 

function handleVideoUpload(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        console.log('Video loaded');
        
        // Create media element with default size
        const element = document.createElement('div');
        element.className = 'canvas-element media-element';
        element.dataset.mediaType = 'video';
        
        // Set unique ID
        element.id = `element-${Date.now()}`;
        
        // Set default size for video container
        const defaultWidth = 500;
        const defaultHeight = 300;
        
        // Position at center of canvas
        const centerX = Math.max(1, Math.min(editorState.canvasWidth - defaultWidth - 1, (editorState.canvasWidth - defaultWidth) / 2));
        const centerY = Math.max(1, Math.min(editorState.canvasHeight - defaultHeight - 1, (editorState.canvasHeight - defaultHeight) / 2));
        
        // Set styles for container
        Object.assign(element.style, {
            position: 'absolute',
            width: `${defaultWidth}px`,
            height: `${defaultHeight}px`,
            left: `${centerX}px`,
            top: `${centerY}px`,
            transform: 'rotate(0deg)',
            cursor: 'move',
            overflow: 'hidden',
            backgroundColor: '#000'
        });
        
        // Create video element
        const videoElement = document.createElement('video');
        videoElement.src = e.target.result;
        videoElement.controls = true;
        Object.assign(videoElement.style, {
            width: '100%',
            height: '100%',
            objectFit: 'contain'
        });
        
        // Add play/pause functionality
        const playPauseBtn = document.createElement('button');
        playPauseBtn.className = 'video-control play-pause';
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        playPauseBtn.style.position = 'absolute';
        playPauseBtn.style.top = '10px';
        playPauseBtn.style.left = '10px';
        playPauseBtn.style.zIndex = '2';
        playPauseBtn.style.backgroundColor = 'rgba(0,0,0,0.5)';
        playPauseBtn.style.color = 'white';
        playPauseBtn.style.border = 'none';
        playPauseBtn.style.borderRadius = '50%';
        playPauseBtn.style.width = '32px';
        playPauseBtn.style.height = '32px';
        playPauseBtn.style.cursor = 'pointer';
        
        playPauseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (videoElement.paused) {
                videoElement.play();
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                videoElement.pause();
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        });
        
        // Add volume control
        const volumeControl = document.createElement('input');
        volumeControl.type = 'range';
        volumeControl.min = '0';
        volumeControl.max = '1';
        volumeControl.step = '0.1';
        volumeControl.value = '1';
        volumeControl.className = 'video-control volume';
        Object.assign(volumeControl.style, {
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            width: '100px',
            zIndex: '2'
        });
        
        volumeControl.addEventListener('input', (e) => {
            e.stopPropagation();
            videoElement.volume = e.target.value;
        });
        
        // Add elements to container
        element.appendChild(videoElement);
        element.appendChild(playPauseBtn);
        element.appendChild(volumeControl);
        
        // Add resize handles
        addResizeHandles(element);
        
        // Add to canvas
        const canvas = document.getElementById('canvas');
        canvas.appendChild(element);
        
        // Make interactive
        makeElementDraggable(element);
        makeElementResizable(element);
        makeElementRotatable(element);
        
        // Select the new element
        selectElement(element);
        
        // Add to editor state
        editorState.elements.push({
            id: element.id,
            type: 'media',
            mediaType: 'video',
            element: element
        });
        
        // Add to history
        pushToHistory({
            type: 'add',
            elementId: element.id,
            elementState: captureElementState(element)
        });
    };
    
    
    reader.onerror = (error) => {
        console.error('Error reading file:', error);
        alert('Error reading video file');
    };
    
    reader.readAsDataURL(file);
}

// Update makeElementResizable to handle video resizing
function makeElementResizable(element) {
    const handles = element.querySelectorAll('.resize-handle');
    
    handles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const position = handle.className.replace('resize-handle ', '');
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = element.offsetWidth;
            const startHeight = element.offsetHeight;
            const startLeft = element.offsetLeft;
            const startTop = element.offsetTop;
            
            element.classList.add('resizing');
            
            function resize(e) {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                let newWidth = startWidth;
                let newHeight = startHeight;
                let newLeft = startLeft;
                let newTop = startTop;
                
                // Handle resizing based on which handle was grabbed
                if (position.includes('left')) {
                    newWidth = Math.max(20, startWidth - deltaX);
                    newLeft = startLeft + (startWidth - newWidth);
                }
                if (position.includes('right')) {
                    newWidth = Math.max(20, startWidth + deltaX);
                }
                if (position.includes('top')) {
                    newHeight = Math.max(20, startHeight - deltaY);
                    newTop = startTop + (startHeight - newHeight);
                }
                if (position.includes('bottom')) {
                    newHeight = Math.max(20, startHeight + deltaY);
                }
                
                // For circle shape, maintain aspect ratio
                if (element.dataset.shapeType === 'circle') {
                    const size = Math.max(newWidth, newHeight);
                    newWidth = size;
                    newHeight = size;
                }
                
                // Apply the new dimensions and position
                element.style.width = `${newWidth}px`;
                element.style.height = `${newHeight}px`;
                element.style.left = `${newLeft}px`;
                element.style.top = `${newTop}px`;
                
                // Update SVG viewBox if shape has SVG content
                const svg = element.querySelector('svg');
                if (svg) {
                    svg.setAttribute('width', '100%');
                    svg.setAttribute('height', '100%');
                    if (element.dataset.shapeType === 'line' || element.dataset.shapeType === 'arrow') {
                        svg.setAttribute('viewBox', `0 0 ${newWidth} ${newHeight}`);
                        const line = svg.querySelector('line');
                        if (line) {
                            if (element.dataset.shapeType === 'arrow') {
                                line.setAttribute('x2', String(newWidth - 10));
                            } else {
                                line.setAttribute('x2', String(newWidth));
                            }
                        }
                    }
                }
            }
            
            function stopResize() {
                element.classList.remove('resizing');
                document.removeEventListener('mousemove', resize);
                document.removeEventListener('mouseup', stopResize);
            }
            
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
        });
    });
}

// Add canvas click handler to deselect text elements
document.addEventListener('click', (e) => {
    // Only deselect if clicking outside any text element
    if (!e.target.closest('.text-element')) {
        document.querySelectorAll('.text-element.selected').forEach(el => {
            el.classList.remove('selected');
            el.contentEditable = false;
        });
        
        // Hide toolbar
        const toolbar = document.getElementById('textEditingToolbar');
        if (toolbar) {
            toolbar.style.display = 'none';
        }
    }
});

// Page Management
let pages = [{
    id: 1,
    name: 'Page 1',
    elements: [] // Will store all elements on this page
}];
let currentPageId = 1;

function initializePageManagement() {
    const addPageBtn = document.getElementById('addPageBtn');
    const pageList = document.getElementById('pageList');
    
    // Create first page
    createPageItem(pages[0]);
    
    // Add page button click handler
    addPageBtn.addEventListener('click', addNewPage);
    
    // Update page count
    updatePageCount();
}

function addNewPage() {
    // Generate a unique ID using timestamp
    const newPageId = Date.now();
    const newPage = {
        id: newPageId,
        name: `Page ${pages.length + 1}`, // Temporary name, will be updated by renumberPages
        elements: [],
        hasBackground: false,
        backgroundImage: '',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundColor: '#ffffff'
    };
    
    // Save current page state before switching
    const currentPage = pages.find(p => p.id === currentPageId);
    if (currentPage) {
        // Save elements
        currentPage.elements = Array.from(document.querySelectorAll('.canvas-element')).map(el => ({
            element: el.cloneNode(true),
            position: {
                left: el.style.left,
                top: el.style.top
            }
        }));
        
        // Save background/template information
        const canvas = document.getElementById('canvas');
        currentPage.hasBackground = canvas.classList.contains('has-background');
        currentPage.backgroundImage = canvas.style.backgroundImage || '';
        currentPage.backgroundPosition = canvas.style.backgroundPosition || 'center';
        currentPage.backgroundRepeat = canvas.style.backgroundRepeat || 'no-repeat';
        currentPage.backgroundSize = canvas.style.backgroundSize || 'cover';
        currentPage.backgroundColor = canvas.style.backgroundColor || '#ffffff';
    }
    
    // Add the new page
    pages.push(newPage);
    
    // Renumber all pages to ensure consistent naming
    renumberPages();
    
    // Switch to the new page
    switchToPage(newPageId);
    
    // Update page count
    updatePageCount();
    
    // Show feedback
    showSaveIndicator('New page added', false);
}

function createPageItem(page) {
    const pageList = document.getElementById('pageList');
    const pageItem = document.createElement('div');
    pageItem.className = 'page-item' + (page.id === currentPageId ? ' active' : '');
    pageItem.innerHTML = `
        <div class="page-item-content">
            <i class="fas fa-file"></i>
            <span class="page-name" data-page-id="${page.id}">${page.name}</span>
        </div>
            <button class="delete-page-btn" data-page-id="${page.id}">
                <i class="fas fa-times"></i>
            </button>
    `;
    
    // Add click handler for page selection
    pageItem.addEventListener('click', (e) => {
        if (!e.target.closest('.delete-page-btn') && !e.target.closest('.page-name')) {
            switchToPage(page.id);
        }
    });
    
    // Add delete button handler
        const deleteBtn = pageItem.querySelector('.delete-page-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deletePage(page.id);
        });

    // Add double click handler for page name editing
    const pageNameElement = pageItem.querySelector('.page-name');
    pageNameElement.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        makePageNameEditable(pageNameElement);
    });
    
    pageList.appendChild(pageItem);
    
    return pageItem;
}

function makePageNameEditable(pageNameElement) {
    const pageId = parseInt(pageNameElement.dataset.pageId);
    const currentName = pageNameElement.textContent;
    
    // Make the element editable
    pageNameElement.contentEditable = true;
    pageNameElement.focus();
    
    // Select all text
    const range = document.createRange();
    range.selectNodeContents(pageNameElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    function saveName() {
        const newName = pageNameElement.textContent.trim();
        
        // Don't allow empty names
        if (!newName) {
            pageNameElement.textContent = currentName;
            return;
        }
        
        // Check for duplicate names
        const isDuplicate = pages.some(p => p.id !== pageId && p.name === newName);
        if (isDuplicate) {
            alert('A page with this name already exists');
            pageNameElement.textContent = currentName;
            return;
        }
        
        // Update the page name in the pages array
        const page = pages.find(p => p.id === pageId);
        if (page) {
            page.name = newName;
        }
        
        // Make element non-editable
        pageNameElement.contentEditable = false;
    }
    
    // Save on enter key
    pageNameElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveName();
            pageNameElement.blur();
        }
        // Cancel on escape key
        else if (e.key === 'Escape') {
            pageNameElement.textContent = currentName;
            pageNameElement.blur();
        }
    });
    
    // Save on blur
    pageNameElement.addEventListener('blur', () => {
        saveName();
    }, { once: true });
}

function switchToPage(pageId) {
    // Save current page elements and background
    const currentPage = pages.find(p => p.id === currentPageId);
    
    // Save elements
    currentPage.elements = Array.from(document.querySelectorAll('.canvas-element')).map(el => ({
        element: el.cloneNode(true),
        position: {
            left: el.style.left,
            top: el.style.top
        }
    }));
    
    // Save background/template information
    const canvas = document.getElementById('canvas');
    currentPage.hasBackground = canvas.classList.contains('has-background');
    currentPage.backgroundImage = canvas.style.backgroundImage || '';
    currentPage.backgroundPosition = canvas.style.backgroundPosition || 'center';
    currentPage.backgroundRepeat = canvas.style.backgroundRepeat || 'no-repeat';
    currentPage.backgroundSize = canvas.style.backgroundSize || 'cover';
    currentPage.backgroundColor = canvas.style.backgroundColor || '#ffffff';
    
    // Clear current canvas
    canvas.innerHTML = '';
    
    // Reset canvas background
    canvas.style.backgroundImage = '';
    canvas.classList.remove('has-background');
    canvas.style.backgroundColor = '#ffffff';
    
    // Update active state in sidebar
    document.querySelectorAll('.page-item').forEach(item => {
        item.classList.toggle('active', item.querySelector(`[data-page-id="${pageId}"]`) !== null);
    });
    
    // Load new page elements
    currentPageId = pageId;
    const newPage = pages.find(p => p.id === pageId);
    
    // Restore background/template if this page has one
    if (newPage.hasBackground && newPage.backgroundImage) {
        canvas.classList.add('has-background');
        canvas.style.backgroundImage = newPage.backgroundImage;
        canvas.style.backgroundPosition = newPage.backgroundPosition || 'center';
        canvas.style.backgroundRepeat = newPage.backgroundRepeat || 'no-repeat';
        canvas.style.backgroundSize = newPage.backgroundSize || 'cover';
        canvas.style.backgroundColor = newPage.backgroundColor || '#ffffff';
        
        // Remove grid background if it exists
        canvas.style.setProperty('--grid-display', 'none');
    }
    
    // Restore elements
    newPage.elements.forEach(({element, position}) => {
        element.style.left = position.left;
        element.style.top = position.top;
        canvas.appendChild(element);
        
        // Reattach event listeners
        if (element.classList.contains('text-element')) {
            makeElementDraggable(element);
            makeElementResizable(element);
            makeElementRotatable(element);
        } else if (element.classList.contains('shape-element')) {
            makeElementDraggable(element);
            makeElementResizable(element);
            makeElementRotatable(element);
        }
    });
}

function deletePage(pageId) {
    // Check if this is the last page
    if (pages.length <= 1) {
        // Instead of preventing deletion, create a new blank page first
        const newPageId = Date.now(); // Use timestamp for unique ID
        const newPage = {
            id: newPageId,
            name: 'Page 1',
            elements: [],
            hasBackground: false,
            backgroundImage: '',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundColor: '#ffffff'
        };
        
        // Add the new page
        pages.push(newPage);
        createPageItem(newPage);
        
        // Now we can safely delete the original page
        pages = pages.filter(p => p.id !== pageId);
        
        // Remove page item from sidebar
        const pageItem = document.querySelector(`.page-item:has([data-page-id="${pageId}"])`);
        if (pageItem) {
            pageItem.remove();
        }
        
        // Switch to the new page
        switchToPage(newPageId);
        
        // Show feedback
        showSaveIndicator('Page deleted and new page created', false);
    } else {
        // Standard deletion for when there are multiple pages
    // Remove page from array
    pages = pages.filter(p => p.id !== pageId);
    
    // Remove page item from sidebar
    const pageItem = document.querySelector(`.page-item:has([data-page-id="${pageId}"])`);
    if (pageItem) {
        pageItem.remove();
    }
    
    // If current page was deleted, switch to first available page
    if (currentPageId === pageId) {
        switchToPage(pages[0].id);
    }
        
        // Show feedback
        showSaveIndicator('Page deleted', false);
    }
    
    // Renumber all pages
    renumberPages();
    
    updatePageCount();
    
    // Update delete buttons visibility
    if (pages.length === 1) {
        document.querySelectorAll('.delete-page-btn').forEach(btn => {
            if (btn.parentElement) {
                btn.remove();
            }
        });
    }
}

// Function to renumber all pages
function renumberPages() {
    // Sort pages by their current ID to maintain order
    pages.sort((a, b) => a.id - b.id);
    
    // Clear the page list in the UI
    const pageList = document.getElementById('pageList');
    pageList.innerHTML = '';
    
    // Renumber and recreate each page
    pages.forEach((page, index) => {
        // Update page name to reflect new position
        page.name = `Page ${index + 1}`;
        
        // Create new page item in the UI
        createPageItem(page);
    });
    
    // Save the updated state
    saveEditorState();
}

function updatePageCount() {
    const pageCount = document.getElementById('pageCount');
    pageCount.textContent = `Total Pages: ${pages.length}`;
}

// Create context menu for shape elements
function setupShapeContextMenu() {
    // Create context menu element
    const contextMenu = document.createElement('div');
    contextMenu.id = 'shapeContextMenu';
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `
        <ul>
            <li data-action="bring-forward"><i class="fas fa-arrow-up"></i> Bring Forward</li>
            <li data-action="bring-to-front"><i class="fas fa-level-up-alt"></i> Bring to Front</li>
            <li data-action="send-backward"><i class="fas fa-arrow-down"></i> Send Backward</li>
            <li data-action="send-to-back"><i class="fas fa-level-down-alt"></i> Send to Back</li>
        </ul>
    `;
    document.body.appendChild(contextMenu);
    
    // Add event listeners for context menu
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', hideContextMenu);
    
    // Add event listeners for menu items
    contextMenu.querySelectorAll('li').forEach(item => {
        item.addEventListener('click', handleContextMenuAction);
    });
}

// Handle right-click on shape elements
function handleContextMenu(e) {
    // Only show context menu for shape elements, not text elements
    const shapeElement = e.target.closest('.shape-element:not(.text-element)');
    if (!shapeElement) {
        hideContextMenu();
        return;
    }
    
    // Prevent default context menu
    e.preventDefault();
    
    // Select the element when right-clicking
    selectElement(shapeElement);
    
    // Store reference to the target element
    const contextMenu = document.getElementById('shapeContextMenu');
    contextMenu.dataset.targetId = shapeElement.id;
    
    // Position context menu at cursor
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.style.display = 'block';
    
    // Ensure menu stays within viewport
    const rect = contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        contextMenu.style.left = `${e.clientX - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
        contextMenu.style.top = `${e.clientY - rect.height}px`;
    }
}

// Hide context menu
function hideContextMenu() {
    const contextMenu = document.getElementById('shapeContextMenu');
    if (contextMenu) {
        contextMenu.style.display = 'none';
    }
}

// Handle context menu actions
function handleContextMenuAction(e) {
    const action = e.currentTarget.dataset.action;
    const contextMenu = document.getElementById('shapeContextMenu');
    const targetId = contextMenu.dataset.targetId;
    const element = document.getElementById(targetId);
    
    if (!element) return;
    
    // Get all canvas elements for z-index manipulation
    const canvas = document.getElementById('canvas');
    const allElements = Array.from(canvas.querySelectorAll('.canvas-element'));
    
    // Get current z-index
    const currentZIndex = parseInt(window.getComputedStyle(element).zIndex) || 0;
    
    switch (action) {
        case 'bring-forward':
            // Find elements with higher z-index
            const nextElement = allElements.find(el => {
                const elZIndex = parseInt(window.getComputedStyle(el).zIndex) || 0;
                return elZIndex === currentZIndex + 1;
            });
            
            if (nextElement) {
                // Swap z-indices
                element.style.zIndex = currentZIndex + 1;
                nextElement.style.zIndex = currentZIndex;
            } else {
                // If no element with higher z-index, increment by 1
                element.style.zIndex = currentZIndex + 1;
            }
            break;
            
        case 'bring-to-front':
            // Find highest z-index
            const highestZIndex = allElements.reduce((max, el) => {
                const elZIndex = parseInt(window.getComputedStyle(el).zIndex) || 0;
                return Math.max(max, elZIndex);
            }, 0);
            
            // Set to highest + 1
            element.style.zIndex = highestZIndex + 1;
            break;
            
        case 'send-backward':
            // Find elements with lower z-index
            const prevElement = allElements.find(el => {
                const elZIndex = parseInt(window.getComputedStyle(el).zIndex) || 0;
                return elZIndex === currentZIndex - 1;
            });
            
            if (prevElement) {
                // Swap z-indices
                element.style.zIndex = currentZIndex - 1;
                prevElement.style.zIndex = currentZIndex;
            } else if (currentZIndex > 0) {
                // If no element with lower z-index, decrement by 1 (but not below 0)
                element.style.zIndex = currentZIndex - 1;
            }
            break;
            
        case 'send-to-back':
            // Find lowest z-index
            const lowestZIndex = allElements.reduce((min, el) => {
                const elZIndex = parseInt(window.getComputedStyle(el).zIndex) || 0;
                return Math.min(min, elZIndex);
            }, 0);
            
            // Set to lowest - 1 (but not below 0)
            element.style.zIndex = Math.max(0, lowestZIndex - 1);
            break;
    }
    
    // Hide context menu
    hideContextMenu();
}

/**
 * Sets up the Templates feature including the modal and template selection
 */
function setupTemplatesFeature() {
    // Get DOM elements
    const browseTemplatesBtn = document.getElementById('browseTemplatesBtn');
    const templateModal = document.getElementById('templateModal');
    const closeTemplateModal = document.getElementById('closeTemplateModal');
    const templatesGrid = document.getElementById('templatesGrid');
    const templateSearchInput = document.getElementById('templateSearchInput');
    const templateSearchBtn = document.getElementById('templateSearchBtn');
    const templateCategoryFilter = document.getElementById('templateCategoryFilter');
    const currentCanvasType = document.getElementById('currentCanvasType');
    const prevTemplatesPage = document.getElementById('prevTemplatesPage');
    const nextTemplatesPage = document.getElementById('nextTemplatesPage');
    const templatePageIndicator = document.getElementById('templatePageIndicator');
    
    // Template state
    const templateState = {
        currentPage: 1,
        totalPages: 1,
        perPage: 12,
        templates: [],
        filteredTemplates: [],
        searchTerm: '',
        currentCategory: 'all',
        canvasType: 'Instagram Post'
    };
    
    // Template data - Free templates from various sources organized by canvas type
    // In a real application, this would be fetched from an API
    const templateData = {
        'Instagram Post': [
            { id: 'ip-1', name: 'Colorful Abstract', category: 'social', imageUrl: 'https://img.freepik.com/free-vector/gradient-sale-background_23-2149050986.jpg' },
            { id: 'ip-2', name: 'Fashion Promo', category: 'social', imageUrl: 'https://img.freepik.com/free-vector/gradient-minimalist-background_52683-74285.jpg' },
            { id: 'ip-3', name: 'Food Photography', category: 'social', imageUrl: 'https://img.freepik.com/free-vector/abstract-background-with-squares_23-2148995948.jpg' },
            { id: 'ip-4', name: 'Quote Template', category: 'social', imageUrl: 'https://img.freepik.com/free-vector/abstract-background-with-monochrome-design_52683-66451.jpg' },
            { id: 'ip-5', name: 'Product Showcase', category: 'marketing', imageUrl: 'https://img.freepik.com/free-vector/gradient-abstract-background_52683-136324.jpg' },
            { id: 'ip-6', name: 'Event Announcement', category: 'marketing', imageUrl: 'https://img.freepik.com/free-vector/gradient-network-connection-background_23-2148874124.jpg' },
            { id: 'ip-7', name: 'Travel Photography', category: 'social', imageUrl: 'https://img.freepik.com/free-vector/colorful-abstract-background_23-2148827807.jpg' },
            { id: 'ip-8', name: 'Fitness Motivation', category: 'social', imageUrl: 'https://img.freepik.com/free-vector/watercolor-background-with-hand-painted-elements_52683-67938.jpg' }
        ],
        'Instagram Story': [
            { id: 'is-1', name: 'Story Highlights', category: 'social', imageUrl: 'https://img.freepik.com/free-vector/instagram-stories-gradient-with-frame_52683-83011.jpg' },
            { id: 'is-2', name: 'Daily Update', category: 'social', imageUrl: 'https://img.freepik.com/free-vector/instagram-stories-template-with-brush-strokes_52683-66864.jpg' },
            { id: 'is-3', name: 'Sale Announcement', category: 'marketing', imageUrl: 'https://img.freepik.com/free-vector/instagram-story-template-with-summer-vibes_23-2148551843.jpg' },
            { id: 'is-4', name: 'Quote Story', category: 'social', imageUrl: 'https://img.freepik.com/free-vector/watercolor-instagram-stories-template_52683-80982.jpg' }
        ],
        'Facebook Post': [
            { id: 'fb-1', name: 'Engagement Post', category: 'social', imageUrl: 'https://img.freepik.com/free-vector/gradient-instagram-post-collection_52683-71216.jpg' },
            { id: 'fb-2', name: 'Special Offer', category: 'marketing', imageUrl: 'https://img.freepik.com/free-vector/gradient-sale-background_23-2149052579.jpg' },
            { id: 'fb-3', name: 'Brand Announcement', category: 'marketing', imageUrl: 'https://img.freepik.com/free-vector/gradient-instagram-post-template_23-2148961143.jpg' }
        ],
        'Twitter Post': [
            { id: 'tw-1', name: 'Tweet Template', category: 'social', imageUrl: 'https://img.freepik.com/free-vector/abstract-business-twitter-header_23-2148910302.jpg' },
            { id: 'tw-2', name: 'Twitter Promo', category: 'marketing', imageUrl: 'https://img.freepik.com/free-vector/gradient-twitter-post-template_23-2148961132.jpg' }
        ],
        'Presentation': [
            { id: 'pr-1', name: 'Business Slide', category: 'presentation', imageUrl: 'https://img.freepik.com/free-vector/abstract-business-presentation-template-with-image_52683-30888.jpg' },
            { id: 'pr-2', name: 'Creative Presentation', category: 'presentation', imageUrl: 'https://img.freepik.com/free-vector/abstract-business-presentation-template_52683-28122.jpg' },
            { id: 'pr-3', name: 'Data Analysis', category: 'presentation', imageUrl: 'https://img.freepik.com/free-vector/abstract-business-presentation-template-with-photo_52683-28123.jpg' },
            { id: 'pr-4', name: 'Project Timeline', category: 'presentation', imageUrl: 'https://img.freepik.com/free-vector/abstract-business-presentation-template-with-geometric-shapes_52683-28118.jpg' },
            { id: 'pr-5', name: 'Pitch Deck', category: 'presentation', imageUrl: 'https://img.freepik.com/free-vector/business-presentation-template-with-infographic-elements_52683-31438.jpg' }
        ],
        'Business Card': [
            { id: 'bc-1', name: 'Professional Card', category: 'print', imageUrl: 'https://img.freepik.com/free-vector/business-card-design_1057-2291.jpg' },
            { id: 'bc-2', name: 'Creative Studio', category: 'print', imageUrl: 'https://img.freepik.com/free-vector/colorful-abstract-business-card-template_52683-24380.jpg' },
            { id: 'bc-3', name: 'Corporate Identity', category: 'print', imageUrl: 'https://img.freepik.com/free-vector/abstract-business-card-template_52683-24381.jpg' }
        ],
        'Resume': [
            { id: 'rs-1', name: 'Modern CV', category: 'print', imageUrl: 'https://img.freepik.com/free-vector/professional-curriculum-vitae-template-with-design_23-2147935116.jpg' },
            { id: 'rs-2', name: 'Creative Resume', category: 'print', imageUrl: 'https://img.freepik.com/free-vector/minimalist-cv-template_23-2148909060.jpg' },
            { id: 'rs-3', name: 'Executive Bio', category: 'print', imageUrl: 'https://img.freepik.com/free-vector/modern-cv-template-with-abstract-shapes_23-2147905196.jpg' }
        ],
        'Custom Size': [
            { id: 'cs-1', name: 'Universal Template', category: 'print', imageUrl: 'https://img.freepik.com/free-vector/abstract-minimal-design-background_1408-181.jpg' },
            { id: 'cs-2', name: 'Custom Design', category: 'print', imageUrl: 'https://img.freepik.com/free-vector/abstract-business-card-template_52683-24371.jpg' }
        ]
    };
    
    // Get the canvas type based on width and height
    function getCanvasTypeFromDimensions(width, height) {
        if (width === 1080 && height === 1080) return 'Instagram Post';
        if (width === 1080 && height === 1920) return 'Instagram Story';
        if (width === 1200 && height === 630) return 'Facebook Post';
        if (width === 1200 && height === 675) return 'Twitter Post';
        if (width === 1920 && height === 1080) return 'Presentation';
        if (width === 900 && height === 500) return 'Business Card';
        if (width === 1414 && height === 2000) return 'Resume';
        return 'Custom Size';
    }
    
    // Initialize templates based on current canvas size
    function initTemplates() {
        const canvasType = getCanvasTypeFromDimensions(editorState.canvasWidth, editorState.canvasHeight);
        templateState.canvasType = canvasType;
        templateState.templates = templateData[canvasType] || templateData['Custom Size'];
        templateState.filteredTemplates = [...templateState.templates];
        templateState.totalPages = Math.ceil(templateState.filteredTemplates.length / templateState.perPage);
        
        // Update current canvas type display
        if (currentCanvasType) {
            currentCanvasType.textContent = canvasType;
        }
    }
    
    // Filter templates based on search term and category
    function filterTemplates() {
        const searchTerm = templateState.searchTerm.toLowerCase();
        const category = templateState.currentCategory;
        
        templateState.filteredTemplates = templateState.templates.filter(template => {
            const matchesSearch = searchTerm === '' || 
                template.name.toLowerCase().includes(searchTerm) ||
                template.category.toLowerCase().includes(searchTerm);
                
            const matchesCategory = category === 'all' || template.category === category;
            
            return matchesSearch && matchesCategory;
        });
        
        templateState.totalPages = Math.max(1, Math.ceil(templateState.filteredTemplates.length / templateState.perPage));
        templateState.currentPage = 1; // Reset to first page after filtering
        
        renderTemplates();
        updatePagination();
    }
    
    // Render templates to the grid
    function renderTemplates() {
        if (!templatesGrid) return;
        
        // Clear existing templates
        templatesGrid.innerHTML = '';
        
        // Show loading indicator if templates aren't loaded yet
        if (templateState.filteredTemplates.length === 0) {
            templatesGrid.innerHTML = '<div class="template-loading">No templates found matching your criteria</div>';
            return;
        }
        
        // Calculate start and end index for pagination
        const startIndex = (templateState.currentPage - 1) * templateState.perPage;
        const endIndex = Math.min(startIndex + templateState.perPage, templateState.filteredTemplates.length);
        
        // Create and append template items
        for (let i = startIndex; i < endIndex; i++) {
            const template = templateState.filteredTemplates[i];
            const templateItem = document.createElement('div');
            templateItem.className = 'template-item';
            templateItem.dataset.templateId = template.id;
            
            templateItem.innerHTML = `
                <div class="template-preview" style="background-image: url('${template.imageUrl}')"></div>
                <div class="template-info">
                    <div class="template-name">${template.name}</div>
                    <div class="template-category">${template.category}</div>
                </div>
            `;
            
            // Add click event to apply template
            templateItem.addEventListener('click', () => {
                applyTemplate(template);
            });
            
            templatesGrid.appendChild(templateItem);
        }
    }
    
    // Update pagination controls
    function updatePagination() {
        if (!templatePageIndicator || !prevTemplatesPage || !nextTemplatesPage) return;
        
        templatePageIndicator.textContent = `Page ${templateState.currentPage} of ${templateState.totalPages}`;
        
        prevTemplatesPage.disabled = templateState.currentPage <= 1;
        nextTemplatesPage.disabled = templateState.currentPage >= templateState.totalPages;
    }
    
    // Apply selected template as background
    function applyTemplate(template) {
        // Show loading indicator
        showSaveIndicator("Applying template...");
        
        // Preload and cache the template image
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        img.onload = () => {
            console.log('Template image loaded successfully');
            
            // Cache the image in sessionStorage
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                // Get data URL and store in sessionStorage
                const dataUrl = canvas.toDataURL('image/png');
                sessionStorage.setItem(`cached_image_${template.imageUrl}`, dataUrl);
                console.log('Template image cached successfully');
                
        // Set the template image as background
        setAsBackground(template.imageUrl);
                
                // Save the editor state to persist the template
                setTimeout(() => {
                    saveEditorState();
                    showSaveIndicator("Template applied successfully!");
                }, 500);
            } catch (e) {
                console.warn('Failed to cache template image:', e);
                // Still set the background even if caching failed
                setAsBackground(template.imageUrl);
                
                // Save the editor state to persist the template
                setTimeout(() => {
                    saveEditorState();
                    showSaveIndicator("Template applied successfully!");
                }, 500);
            }
        };
        
        img.onerror = () => {
            console.error('Failed to load template image directly, trying proxy');
            
            // Try with a proxy
            const proxyUrl = `https://cors-anywhere.herokuapp.com/${template.imageUrl}`;
            const proxyImg = new Image();
            proxyImg.crossOrigin = 'Anonymous';
            
            proxyImg.onload = () => {
                console.log('Template image loaded via proxy');
                
                // Cache the image in sessionStorage
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = proxyImg.width;
                    canvas.height = proxyImg.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(proxyImg, 0, 0);
                    
                    // Get data URL and store in sessionStorage
                    const dataUrl = canvas.toDataURL('image/png');
                    sessionStorage.setItem(`cached_image_${template.imageUrl}`, dataUrl);
                    console.log('Template image cached successfully via proxy');
                } catch (e) {
                    console.warn('Failed to cache template image from proxy:', e);
                }
                
                // Set the template image as background
                setAsBackground(template.imageUrl);
                
                // Save the editor state to persist the template
                setTimeout(() => {
                    saveEditorState();
                    showSaveIndicator("Template applied successfully!");
                }, 500);
            };
            
            proxyImg.onerror = () => {
                console.error('Failed to load template image via proxy');
                // Still try to set the background
                setAsBackground(template.imageUrl);
                
                // Save the editor state to persist the template
                setTimeout(() => {
                    saveEditorState();
                    showSaveIndicator("Template applied with limited compatibility!");
                }, 500);
            };
            
            proxyImg.src = proxyUrl;
        };
        
        // Start loading the image
        img.src = template.imageUrl;
        
        // Close the modal
        closeModal();
    }
    
    // Open modal and initialize templates
    function openModal() {
        if (!templateModal) return;
        
        // Initialize templates based on current canvas size
        initTemplates();
        
        // Render templates
        renderTemplates();
        
        // Update pagination
        updatePagination();
        
        // Show modal
        templateModal.classList.add('visible');
    }
    
    // Close modal
    function closeModal() {
        if (!templateModal) return;
        templateModal.classList.remove('visible');
    }
    
    // Event listeners
    if (browseTemplatesBtn) {
        browseTemplatesBtn.addEventListener('click', openModal);
    }
    
    if (closeTemplateModal) {
        closeTemplateModal.addEventListener('click', closeModal);
    }
    
    if (templateSearchInput) {
        templateSearchInput.addEventListener('input', (e) => {
            templateState.searchTerm = e.target.value;
            filterTemplates();
        });
    }
    
    if (templateSearchBtn) {
        templateSearchBtn.addEventListener('click', () => {
            filterTemplates();
        });
    }
    
    if (templateCategoryFilter) {
        templateCategoryFilter.addEventListener('change', (e) => {
            templateState.currentCategory = e.target.value;
            filterTemplates();
        });
    }
    
    if (prevTemplatesPage) {
        prevTemplatesPage.addEventListener('click', () => {
            if (templateState.currentPage > 1) {
                templateState.currentPage--;
                renderTemplates();
                updatePagination();
            }
        });
    }
    
    if (nextTemplatesPage) {
        nextTemplatesPage.addEventListener('click', () => {
            if (templateState.currentPage < templateState.totalPages) {
                templateState.currentPage++;
                renderTemplates();
                updatePagination();
            }
        });
    }
    
    // Close modal when clicking outside content
    templateModal?.addEventListener('click', (e) => {
        if (e.target === templateModal) {
            closeModal();
        }
    });
    
    // Listen for canvas size changes to update templates
    document.addEventListener('canvasSizeChanged', () => {
        if (templateModal.classList.contains('visible')) {
            initTemplates();
            renderTemplates();
            updatePagination();
        }
    });
}

// Functions to save and restore editor state using localStorage
function saveEditorState() {
    console.log('Saving editor state to localStorage...');
    
    // Get the current canvas
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    
    // Create a state object to save
    const editorState = {
        canvasWidth: canvas.offsetWidth,
        canvasHeight: canvas.offsetHeight,
        backgroundColor: canvas.style.backgroundColor || '#ffffff',
        elements: [],
        lastSaved: new Date().toISOString(),
        // Save template background if it exists
        hasBackground: canvas.classList.contains('has-background'),
        backgroundImage: canvas.style.backgroundImage || '',
        backgroundPosition: canvas.style.backgroundPosition || 'center',
        backgroundRepeat: canvas.style.backgroundRepeat || 'no-repeat',
        backgroundSize: canvas.style.backgroundSize || 'cover'
    };
    
    // Save all elements in the canvas
    const elements = canvas.querySelectorAll('.canvas-element');
    elements.forEach((element, index) => {
        // Get element type
        let type = 'unknown';
        if (element.classList.contains('text-element')) {
            type = 'text';
        } else if (element.classList.contains('shape-element')) {
            type = 'shape';
        } else if (element.classList.contains('image-element')) {
            type = 'image';
        }
        
        // Create element data object
        const elementData = {
            id: element.id || `element-${index}`,
            type: type,
            html: element.outerHTML,
            style: element.getAttribute('style') || '',
            position: {
                top: parseInt(element.style.top) || 0,
                left: parseInt(element.style.left) || 0,
                width: parseInt(element.style.width) || 100,
                height: parseInt(element.style.height) || 100
            },
            content: element.innerHTML,
            className: element.className
        };
        
        // Add specific properties based on element type
        if (type === 'text') {
            elementData.text = element.innerText;
            elementData.fontSize = element.style.fontSize;
            elementData.fontFamily = element.style.fontFamily;
            elementData.color = element.style.color;
            elementData.textAlign = element.style.textAlign;
        } else if (type === 'shape') {
            elementData.shapeType = element.dataset.shapeType;
            elementData.fillColor = element.style.backgroundColor;
            elementData.borderColor = element.style.borderColor;
            elementData.borderWidth = element.style.borderWidth;
        } else if (type === 'image') {
            const img = element.querySelector('img');
            if (img) {
                elementData.src = img.src;
                elementData.alt = img.alt;
            }
        }
        
        // Add to elements array
        editorState.elements.push(elementData);
    });
    
    // Save to localStorage
    try {
        localStorage.setItem('designEditorState', JSON.stringify(editorState));
        console.log('Editor state saved successfully');
        
        // Show save indicator
        showSaveIndicator('Design saved');
    } catch (error) {
        console.error('Error saving editor state:', error);
        showSaveIndicator('Error saving design', true);
    }
}

// Function to restore editor state from localStorage
function restoreEditorState() {
    console.log('Restoring editor state from localStorage...');
    
    try {
        // Get saved state from localStorage
        const savedState = localStorage.getItem('designEditorState');
        if (!savedState) {
            console.log('No saved state found');
            return false;
        }
        
        // Parse the saved state
        const editorState = JSON.parse(savedState);
        console.log('Found saved state from:', editorState.lastSaved);
        
        // Get the canvas
        const canvas = document.getElementById('canvas');
        if (!canvas) return false;
        
        // Restore canvas properties
        if (editorState.canvasWidth && editorState.canvasHeight) {
            updateCanvasSize(editorState.canvasWidth, editorState.canvasHeight);
        }
        
        // Restore background color
        if (editorState.backgroundColor) {
            canvas.style.backgroundColor = editorState.backgroundColor;
        }
        
        // Restore template background if it exists
        if (editorState.hasBackground && editorState.backgroundImage) {
            // Add has-background class to canvas
            canvas.classList.add('has-background');
            
            // Restore background properties
            canvas.style.backgroundImage = editorState.backgroundImage;
            canvas.style.backgroundPosition = editorState.backgroundPosition || 'center';
            canvas.style.backgroundRepeat = editorState.backgroundRepeat || 'no-repeat';
            canvas.style.backgroundSize = editorState.backgroundSize || 'cover';
            
            // Remove grid background if it exists
            canvas.style.setProperty('--grid-display', 'none');
            
            console.log('Restored template background:', editorState.backgroundImage);
        }
        
        // Clear existing elements
        while (canvas.firstChild) {
            canvas.removeChild(canvas.firstChild);
        }
        
        // Restore elements
        if (editorState.elements && editorState.elements.length > 0) {
            editorState.elements.forEach(elementData => {
                if (elementData.html) {
                    // Create element from HTML
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = elementData.html;
                    const newElement = tempDiv.firstChild;
                    
                    // Append to canvas
                    canvas.appendChild(newElement);
                    
                    // Make element interactive
                    if (elementData.type === 'text') {
                        makeElementDraggable(newElement);
                        makeElementResizable(newElement);
                        makeElementRotatable(newElement);
                        
                        // Add text editing event
                        newElement.addEventListener('dblclick', function() {
                            this.contentEditable = true;
                            this.focus();
                        });
                        
                        newElement.addEventListener('blur', function() {
                            this.contentEditable = false;
                        });
                    } else if (elementData.type === 'shape') {
                        makeElementDraggable(newElement);
                        makeElementResizable(newElement);
                        makeElementRotatable(newElement);
                    } else if (elementData.type === 'image') {
                        makeElementDraggable(newElement);
                        makeElementResizable(newElement);
                        makeElementRotatable(newElement);
                    }
                }
            });
            
            console.log(`Restored ${editorState.elements.length} elements`);
            showSaveIndicator('Design restored');
            return true;
        }
    } catch (error) {
        console.error('Error restoring editor state:', error);
        showSaveIndicator('Error restoring design', true);
    }
    
    return false;
}

// Function to show save indicator
function showSaveIndicator(message, isError = false) {
    // Remove existing indicator
    const existingIndicator = document.getElementById('saveIndicator');
    if (existingIndicator) {
        document.body.removeChild(existingIndicator);
    }
    
    // Create indicator element
    const indicator = document.createElement('div');
    indicator.id = 'saveIndicator';
    indicator.textContent = message;
    indicator.style.position = 'fixed';
    indicator.style.bottom = '20px';
    indicator.style.left = '20px';
    indicator.style.padding = '10px 20px';
    indicator.style.borderRadius = '4px';
    indicator.style.backgroundColor = isError ? '#f44336' : '#4caf50';
    indicator.style.color = 'white';
    indicator.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    indicator.style.zIndex = '9999';
    indicator.style.opacity = '0';
    indicator.style.transition = 'opacity 0.3s ease';
    
    // Add to body
    document.body.appendChild(indicator);
    
    // Show indicator
    setTimeout(() => {
        indicator.style.opacity = '1';
    }, 10);
    
    // Hide after 3 seconds
    setTimeout(() => {
        indicator.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(indicator)) {
                document.body.removeChild(indicator);
            }
        }, 300);
    }, 3000);
}

// Auto-save timer
let autoSaveTimer = null;

// Function to start auto-save
function startAutoSave(interval = 30000) { // Default: save every 30 seconds
    // Clear existing timer if any
    if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
    }
    
    // Set up new timer
    autoSaveTimer = setInterval(saveEditorState, interval);
    console.log(`Auto-save started: saving every ${interval/1000} seconds`);
}

// Function to stop auto-save
function stopAutoSave() {
    if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
        autoSaveTimer = null;
        console.log('Auto-save stopped');
    }
}

// Initialize editor with saved state
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing editor with saved state...');
    
    // Try to restore saved state
    const restored = restoreEditorState();
    
    // Start auto-save
    startAutoSave();
    
    // Add event listener for manual save
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            saveEditorState();
        });
    }
    
    // Add event listener for beforeunload to save state before leaving
    window.addEventListener('beforeunload', function() {
        saveEditorState();
    });
    
    // Add event listeners for canvas changes
    const canvas = document.getElementById('canvas');
    if (canvas) {
        // Save when elements are added or modified
        const observer = new MutationObserver(function(mutations) {
            // Don't save immediately for every change to avoid performance issues
            // Instead, set a short timeout to batch changes
            if (window.saveTimeout) {
                clearTimeout(window.saveTimeout);
            }
            window.saveTimeout = setTimeout(saveEditorState, 1000);
        });
        
        observer.observe(canvas, { 
            childList: true, 
            subtree: true, 
            attributes: true, 
            characterData: true 
        });
    }
});

/**
 * Caches an image locally by converting it to a data URL
 * @param {string} url - The URL of the image to cache
 * @returns {Promise<string>} - A promise that resolves with the data URL
 */
function cacheImageLocally(url) {
    return new Promise((resolve, reject) => {
        // Check if we already have this image cached in sessionStorage
        const cachedImage = sessionStorage.getItem(`cached_image_${url}`);
        if (cachedImage) {
            console.log(`Using cached image for: ${url}`);
            resolve(cachedImage);
            return;
        }
        
        // If not cached, load the image
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        img.onload = () => {
            try {
                // Create a canvas to convert the image to a data URL
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                // Draw the image to the canvas
                ctx.drawImage(img, 0, 0);
                
                // Get the data URL
                const dataURL = canvas.toDataURL('image/png');
                
                // Cache the data URL in sessionStorage
                try {
                    sessionStorage.setItem(`cached_image_${url}`, dataURL);
                } catch (e) {
                    console.warn('Failed to cache image in sessionStorage:', e);
                }
                
                // Resolve with the data URL
                resolve(dataURL);
            } catch (e) {
                console.error('Error converting image to data URL:', e);
                reject(e);
            }
        };
        
        img.onerror = (e) => {
            console.error('Error loading image:', e);
            reject(new Error(`Failed to load image: ${url}`));
        };
        
        // Set a timeout
        const timeoutId = setTimeout(() => {
            reject(new Error(`Timeout loading image: ${url}`));
        }, 15000);
        
        // Clear the timeout if the image loads or errors out
        img.onload = () => {
            clearTimeout(timeoutId);
            try {
                // Create a canvas to convert the image to a data URL
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                // Draw the image to the canvas
                ctx.drawImage(img, 0, 0);
                
                // Get the data URL
                const dataURL = canvas.toDataURL('image/png');
                
                // Cache the data URL in sessionStorage
                try {
                    sessionStorage.setItem(`cached_image_${url}`, dataURL);
                } catch (e) {
                    console.warn('Failed to cache image in sessionStorage:', e);
                }
                
                // Resolve with the data URL
                resolve(dataURL);
            } catch (e) {
                console.error('Error converting image to data URL:', e);
                reject(e);
            }
        };
        
        img.onerror = () => {
            clearTimeout(timeoutId);
            reject(new Error(`Failed to load image: ${url}`));
        };
        
        // Start loading the image
        img.src = url;
    });
}

