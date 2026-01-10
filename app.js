document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const templatesGrid = document.getElementById('templatesGrid');
    const uploadArea = document.getElementById('uploadArea');
    const templatesSection = document.getElementById('templatesSection');
    const uploadSection = document.getElementById('uploadSection');
    const editorSection = document.getElementById('editorSection');
    const memeCanvas = document.getElementById('memeCanvas');
    const ctx = memeCanvas.getContext('2d');
    
    // Mode buttons
    const templatesModeBtn = document.getElementById('templatesModeBtn');
    const uploadModeBtn = document.getElementById('uploadModeBtn');
    const refreshTemplatesBtn = document.getElementById('refreshTemplatesBtn');
    
    // Upload elements
    const imageUpload = document.getElementById('imageUpload');
    const browseBtn = document.getElementById('browseBtn');
    const uploadedPreview = document.getElementById('uploadedPreview');
    const uploadedImage = document.getElementById('uploadedImage');
    const useUploadedBtn = document.getElementById('useUploadedBtn');
    
    // Editor controls
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');
    const shareBtn = document.getElementById('shareBtn');
    const topTextInput = document.getElementById('topText');
    const bottomTextInput = document.getElementById('bottomText');
    const generateTopBtn = document.getElementById('generateTopBtn');
    const generateBottomBtn = document.getElementById('generateBottomBtn');
    const generateBothBtn = document.getElementById('generateBothBtn');
    const suggestThemesBtn = document.getElementById('suggestThemesBtn');
    const improveTextBtn = document.getElementById('improveTextBtn');
    const fontSizeSlider = document.getElementById('fontSize');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const fontFamilySelect = document.getElementById('fontFamily');
    const textColorPicker = document.getElementById('textColor');
    const strokeColorPicker = document.getElementById('strokeColor');
    const strokeWidthSlider = document.getElementById('strokeWidth');
    const strokeWidthValue = document.getElementById('strokeWidthValue');
    const replaceImageBtn = document.getElementById('replaceImageBtn');
    const sourceInfo = document.getElementById('sourceInfo');
    const editingSource = document.getElementById('editingSource');
    
    // Overlay elements
    const topTextOverlay = document.getElementById('topTextOverlay');
    const bottomTextOverlay = document.getElementById('bottomTextOverlay');
    
    // Modal
    const themesModal = document.getElementById('themesModal');
    const themesGrid = document.getElementById('themesGrid');
    const closeModal = document.querySelector('.close-modal');
    
    // State
    let currentTemplate = null;
    let templates = [];
    let memeImage = new Image();
    memeImage.crossOrigin = 'anonymous';
    let currentMode = 'templates'; // 'templates' or 'upload'
    let uploadedFile = null;
    let aiRequestCount = 0;
    const MAX_AI_REQUESTS = 10; // Rate limiting
    
    // Cache for AI responses to avoid duplicate requests
    const aiCache = new Map();

    // Initialize
    init();

    async function init() {
        try {
            showToast('Loading meme templates...', 'info');
            await loadTemplates(true);
            setupEventListeners();
            setupDragAndDrop();
            
            // Wait for DOM to be fully ready
            await waitForElement('#aiStatus');
            
            updateAIStatus();
            aiRequestCount = 0;
            
            console.log('Meme Generator initialized successfully');
        } catch (error) {
            console.error('Initialization error:', error);
            showToast('Initialization error, some features may not work', 'error');
        }
    }

    // Helper function to wait for DOM elements
    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }
            
            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // Timeout if element doesn't appear
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found after ${timeout}ms`));
            }, timeout);
        });
    }

    // Load templates with cache busting
    async function loadTemplates(forceRefresh = false) {
        try {
            templatesGrid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading fresh meme templates...</div>';
            
            // Add cache busting parameter
            const cacheBuster = forceRefresh ? `?t=${Date.now()}` : '';
            const response = await fetch(`https://api.imgflip.com/get_memes${cacheBuster}`);
            const data = await response.json();
            
            if (data.success) {
                // Shuffle templates for variety
                templates = shuffleArray(data.data.memes).slice(0, 24); // Get 24 random templates
                displayTemplates();
                showToast(`${templates.length} fresh templates loaded!`, 'info');
            } else {
                throw new Error('Failed to load templates');
            }
        } catch (error) {
            console.error('Error loading templates:', error);
            showToast('Error loading templates. Using fallback data.', 'error');
            loadFallbackTemplates();
        }
    }

    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    function loadFallbackTemplates() {
        templates = shuffleArray([
            { id: '181913649', name: 'Drake Hotline Bling', url: 'https://i.imgflip.com/30b1gx.jpg', width: 1200, height: 1200 },
            { id: '87743020', name: 'Two Buttons', url: 'https://i.imgflip.com/1g8my4.jpg', width: 600, height: 908 },
            { id: '112126428', name: 'Distracted Boyfriend', url: 'https://i.imgflip.com/1ur9b0.jpg', width: 1200, height: 800 },
            { id: '131087935', name: 'Running Away Balloon', url: 'https://i.imgflip.com/261o3j.jpg', width: 761, height: 1024 },
            { id: '247375501', name: 'Buff Doge vs Cheems', url: 'https://i.imgflip.com/43a45p.png', width: 937, height: 720 },
            { id: '129242436', name: 'Change My Mind', url: 'https://i.imgflip.com/24y43o.jpg', width: 482, height: 361 },
            { id: '222403160', name: 'Bernie I Am Once Again', url: 'https://i.imgflip.com/3pnzk9.jpg', width: 750, height: 750 },
            { id: '124822590', name: 'Left Exit 12 Off Ramp', url: 'https://i.imgflip.com/22bdq6.jpg', width: 804, height: 767 },
            { id: '217743513', name: 'UNO Draw 25 Cards', url: 'https://i.imgflip.com/3lmzyx.jpg', width: 500, height: 494 },
            { id: '93895088', name: 'Expanding Brain', url: 'https://i.imgflip.com/1jwhww.jpg', width: 857, height: 1202 }
        ]);
        displayTemplates();
    }

    function displayTemplates() {
        templatesGrid.innerHTML = '';
        
        templates.forEach(template => {
            const templateCard = document.createElement('div');
            templateCard.className = 'template-card';
            templateCard.innerHTML = `
                <img src="${template.url}" alt="${template.name}" loading="lazy">
                <div class="template-name">${template.name}</div>
            `;
            
            templateCard.addEventListener('click', () => selectTemplate(template));
            templatesGrid.appendChild(templateCard);
        });
    }

    function setupEventListeners() {
        // Mode switching
        templatesModeBtn.addEventListener('click', () => switchMode('templates'));
        uploadModeBtn.addEventListener('click', () => switchMode('upload'));
        refreshTemplatesBtn.addEventListener('click', () => loadTemplates(true));
        
        // Upload handling
        browseBtn.addEventListener('click', () => imageUpload.click());
        imageUpload.addEventListener('change', handleImageUpload);
        useUploadedBtn.addEventListener('click', useUploadedImage);
        
        // Editor controls
        topTextInput.addEventListener('input', updateMeme);
        bottomTextInput.addEventListener('input', updateMeme);
        fontFamilySelect.addEventListener('change', updateMeme);
        textColorPicker.addEventListener('input', updateMeme);
        strokeColorPicker.addEventListener('input', updateMeme);
        
        // AI buttons
        generateTopBtn.addEventListener('click', () => generateAIText('top'));
        generateBottomBtn.addEventListener('click', () => generateAIText('bottom'));
        generateBothBtn.addEventListener('click', generateBothAITexts);
        suggestThemesBtn.addEventListener('click', showThemeSuggestions);
        improveTextBtn.addEventListener('click', async () => {
            try {
                await improveCurrentText();
            } catch (error) {
                console.error('Improve text failed:', error);
                showToast('Failed to improve text', 'error');
            }
        });
        
        // Action buttons
        downloadBtn.addEventListener('click', downloadMeme);
        resetBtn.addEventListener('click', resetEditor);
        shareBtn.addEventListener('click', shareMeme);
        replaceImageBtn.addEventListener('click', () => switchMode('upload'));
        
        // Modal
        closeModal.addEventListener('click', () => themesModal.classList.remove('active'));
        themesModal.addEventListener('click', (e) => {
            if (e.target === themesModal) {
                themesModal.classList.remove('active');
            }
        });
        
        // Real-time preview updates with debounce
        let updateTimeout;
        [topTextInput, bottomTextInput, fontFamilySelect, textColorPicker, strokeColorPicker, fontSizeSlider, strokeWidthSlider].forEach(input => {
            input.addEventListener('input', () => {
                clearTimeout(updateTimeout);
                updateTimeout = setTimeout(updateMeme, 300);
            });
        });

        // Update slider values in real-time
        fontSizeSlider.addEventListener('input', () => {
            fontSizeValue.textContent = `${fontSizeSlider.value}px`;
        });
        
        strokeWidthSlider.addEventListener('input', () => {
            strokeWidthValue.textContent = `${strokeWidthSlider.value}px`;
        });
    }

    function setupDragAndDrop() {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        // Highlight drop area
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, unhighlight, false);
        });

        // Handle dropped files
        uploadArea.addEventListener('drop', handleDrop, false);

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        function highlight() {
            uploadArea.classList.add('dragover');
        }

        function unhighlight() {
            uploadArea.classList.remove('dragover');
        }

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            handleFiles(files);
        }
    }

    function handleFiles(files) {
        if (files.length === 0) return;
        
        const file = files[0];
        if (!file.type.match('image.*')) {
            showToast('Please upload an image file (JPG, PNG, GIF)', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showToast('File size must be less than 5MB', 'error');
            return;
        }
        
        uploadedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImage.src = e.target.result;
            uploadedPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    function handleImageUpload(e) {
        handleFiles(e.target.files);
    }

    function useUploadedImage() {
        if (!uploadedFile) return;
        
        memeImage.src = URL.createObjectURL(uploadedFile);
        memeImage.onload = () => {
            setCanvasDimensions();
            currentTemplate = { 
                name: 'Custom Upload', 
                uploaded: true, 
                width: memeImage.width, 
                height: memeImage.height 
            };
            aiCache.clear();
            editingSource.textContent = 'Uploaded Image';
            switchToEditor();
            updateMeme();
        };
        memeImage.onerror = () => showToast('Error loading uploaded image', 'error');
    }

    function selectTemplate(template) {
        memeImage.src = template.url;
        memeImage.onload = () => {
            setCanvasDimensions();
            currentTemplate = template;
            aiCache.clear();
            editingSource.textContent = template.name;
            switchToEditor();
            updateMeme();
        };
        memeImage.onerror = () => showToast('Error loading template image', 'error');
    }

    function switchMode(mode) {
        currentMode = mode;
        templatesModeBtn.classList.toggle('active', mode === 'templates');
        uploadModeBtn.classList.toggle('active', mode === 'upload');
        templatesSection.style.display = mode === 'templates' ? 'block' : 'none';
        uploadSection.style.display = mode === 'upload' ? 'block' : 'none';
    }

    function switchToEditor() {
        templatesSection.style.display = 'none';
        uploadSection.style.display = 'none';
        editorSection.style.display = 'block';
        document.getElementById('imageControls').style.display = currentTemplate.uploaded ? 'block' : 'none';
    }

    function setCanvasDimensions() {
        const maxWidth = 600;
        const aspectRatio = memeImage.height / memeImage.width;
        memeCanvas.width = maxWidth;
        memeCanvas.height = maxWidth * aspectRatio;
        
        // Also update overlay container size
        const canvasWrapper = document.querySelector('.canvas-wrapper');
        if (canvasWrapper) {
            canvasWrapper.style.width = `${maxWidth}px`;
            canvasWrapper.style.height = `${memeCanvas.height}px`;
        }
    }

    function updateMeme() {
        if (!currentTemplate || !memeImage.complete) return;
        
        // Clear canvas and draw ONLY the image
        ctx.clearRect(0, 0, memeCanvas.width, memeCanvas.height);
        ctx.drawImage(memeImage, 0, 0, memeCanvas.width, memeCanvas.height);
        
        // Update text overlays
        updateTextOverlays();
    }

    function updateTextOverlays() {
        const topText = topTextInput.value.trim().toUpperCase();
        const bottomText = bottomTextInput.value.trim().toUpperCase();
        
        // Show/hide overlays based on text content
        topTextOverlay.style.display = topText ? 'block' : 'none';
        bottomTextOverlay.style.display = bottomText ? 'block' : 'none';
        
        // Update overlay text content
        topTextOverlay.textContent = topText;
        bottomTextOverlay.textContent = bottomText;
        
        // Update overlay styles and positioning
        updateOverlayStyles();
        positionTextOverlays();
    }

    function positionTextOverlays() {
        const fontSize = parseInt(fontSizeSlider.value);
        
        // Position top text overlay with some padding
        if (topTextOverlay.textContent) {
            topTextOverlay.style.top = `${fontSize * 0.5}px`;
        }
        
        // Position bottom text overlay with some padding
        if (bottomTextOverlay.textContent) {
            bottomTextOverlay.style.bottom = `${fontSize * 0.5}px`;
        }
    }

    function updateOverlayStyles() {
        const fontSize = parseInt(fontSizeSlider.value);
        const fontFamily = fontFamilySelect.value;
        const textColor = textColorPicker.value;
        const strokeColor = strokeColorPicker.value;
        const strokeWidth = parseInt(strokeWidthSlider.value);
        
        // Apply styles to both overlays
        [topTextOverlay, bottomTextOverlay].forEach(overlay => {
            overlay.style.fontSize = `${fontSize}px`;
            overlay.style.fontFamily = `${fontFamily}, Impact, sans-serif`;
            overlay.style.color = textColor;
            overlay.style.textShadow = `
                ${strokeWidth}px ${strokeWidth}px 0 ${strokeColor},
                ${-strokeWidth}px ${strokeWidth}px 0 ${strokeColor},
                ${strokeWidth}px ${-strokeWidth}px 0 ${strokeColor},
                ${-strokeWidth}px ${-strokeWidth}px 0 ${strokeColor}
            `;
            overlay.style.fontWeight = 'bold';
            overlay.style.letterSpacing = '1px';
            overlay.style.lineHeight = '1.2';
            overlay.style.padding = '5px 0';
        });
    }

    async function generateAIText(position) {
        if (!currentTemplate) {
            showToast('Please select an image first', 'error');
            return;
        }
        
        if (aiRequestCount >= MAX_AI_REQUESTS) {
            showToast('AI limit reached. Please wait or refresh.', 'warning');
            return;
        }
        
        // Create cache key
        const cacheKey = `${currentTemplate.name}-${position}`;
        
        // Check cache first
        if (aiCache.has(cacheKey)) {
            const cachedText = aiCache.get(cacheKey);
            updateTextInput(position, cachedText);
            showToast(`Using cached AI suggestion for ${position} text`, 'info');
            return;
        }
        
        showToast(`Generating ${position} text with AI...`, 'info');
        updateAIStatus('Generating...', 'warning');
        
        try {
            aiRequestCount++;
            const text = await getAICaption(currentTemplate.name, position);
            
            if (text) {
                // Cache the result
                aiCache.set(cacheKey, text);
                updateTextInput(position, text);
                updateAIStatus();
                showToast(`${position} text generated successfully!`, 'info');
            }
        } catch (error) {
            console.error('AI Generation error:', error);
            aiRequestCount--;
            updateAIStatus('AI Error', 'error');
            showToast('AI service unavailable. Using fallback.', 'error');
            
            // Use fallback
            const fallbackText = getFallbackCaption(currentTemplate.name, position);
            updateTextInput(position, fallbackText);
        }
    }

    function updateTextInput(position, text) {
        if (position === 'top') {
            topTextInput.value = text;
        } else {
            bottomTextInput.value = text;
        }
        updateMeme();
    }

    async function generateBothAITexts() {
        if (!currentTemplate) {
            showToast('Please select an image first', 'error');
            return;
        }
        
        if (aiRequestCount >= MAX_AI_REQUESTS - 1) {
            showToast('AI limit reached. Please wait or refresh.', 'warning');
            return;
        }
        
        showToast('Generating both texts with AI...', 'info');
        updateAIStatus('Generating both...', 'warning');
        
        try {
            const [topText, bottomText] = await Promise.all([
                getAICaption(currentTemplate.name, 'top'),
                getAICaption(currentTemplate.name, 'bottom')
            ]);
            
            if (topText) {
                topTextInput.value = topText;
                aiCache.set(`${currentTemplate.name}-top`, topText);
            }
            
            if (bottomText) {
                bottomTextInput.value = bottomText;
                aiCache.set(`${currentTemplate.name}-bottom`, bottomText);
            }
            
            aiRequestCount += 2;
            updateMeme();
            updateAIStatus();
            showToast('Both texts generated successfully!', 'info');
        } catch (error) {
            console.error('AI Generation error:', error);
            showToast('Using fallback captions', 'warning');
            
            topTextInput.value = getFallbackCaption(currentTemplate.name, 'top');
            bottomTextInput.value = getFallbackCaption(currentTemplate.name, 'bottom');
            updateMeme();
            updateAIStatus();
        }
    }

    async function getAICaption(templateName, position, context = null) {
        try {
            const cacheKey = `${templateName}-${position}-${context || 'default'}`;
            
            if (aiCache.has(cacheKey)) {
                return aiCache.get(cacheKey);
            }

            const response = await fetch('/api/generate-caption', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    templateName,
                    position,
                    context: context || 'general internet humor'
                })
            });

            if (!response.ok) throw new Error(`API error: ${response.status}`);

            const data = await response.json();
            if (data.success === false || !data.caption) {
                throw new Error('Invalid response from AI');
            }

            aiCache.set(cacheKey, data.caption);
            return data.caption;

        } catch (error) {
            console.warn('AI API failed, using fallback:', error);
            return getFallbackCaption(templateName, position);
        }
    }

    async function showThemeSuggestions() {
        if (!currentTemplate) {
            showToast('Please select an image first', 'error');
            return;
        }
        
        showToast('Generating theme suggestions...', 'info');
        
        try {
            const themes = await getAIThemes(currentTemplate.name);
            populateThemesGrid(themes);
            themesModal.classList.add('active');
        } catch (error) {
            console.error('Error getting themes:', error);
            populateThemesGrid(getPredefinedThemes());
            themesModal.classList.add('active');
        }
    }

    function populateThemesGrid(themes) {
        themesGrid.innerHTML = '';
        
        themes.forEach(theme => {
            const themeCard = document.createElement('div');
            themeCard.className = 'theme-card';
            themeCard.innerHTML = `
                <h4>${theme.name}</h4>
                <p>${theme.description}</p>
                <small>Click to apply</small>
            `;
            
            themeCard.addEventListener('click', () => {
                topTextInput.value = theme.topText;
                bottomTextInput.value = theme.bottomText;
                updateMeme();
                themesModal.classList.remove('active');
                showToast(`Applied theme: ${theme.name}`, 'info');
            });
            
            themesGrid.appendChild(themeCard);
        });
    }

    async function improveCurrentText() {
        const currentTop = topTextInput.value.trim();
        const currentBottom = bottomTextInput.value.trim();
        
        if (!currentTop && !currentBottom) {
            showToast('No text to improve', 'warning');
            return;
        }
        
        showToast('Improving text with AI...', 'info');
        updateAIStatus('Improving text...', 'warning');
        
        try {
            const improvedText = await improveTextWithAI(currentTop, currentBottom);
            
            let changed = false;
            
            if (improvedText.top && improvedText.top !== currentTop) {
                topTextInput.value = improvedText.top;
                changed = true;
            }
            
            if (improvedText.bottom && improvedText.bottom !== currentBottom) {
                bottomTextInput.value = improvedText.bottom;
                changed = true;
            }
            
            if (changed) {
                updateMeme();
                showToast('Text improved successfully!', 'success');
            } else {
                showToast('Text already looks great!', 'info');
            }
            
            updateAIStatus();
            
        } catch (error) {
            console.error('Error improving text:', error);
            showToast('Could not improve text. Using local enhancement.', 'warning');
            
            const enhanced = localTextEnhancementFallback(currentTop, currentBottom);
            if (enhanced.top) topTextInput.value = enhanced.top;
            if (enhanced.bottom) bottomTextInput.value = enhanced.bottom;
            updateMeme();
            updateAIStatus();
        }
    }

    function localTextEnhancementFallback(topText, bottomText) {
        const enhance = (text) => {
            if (!text) return '';
            let enhanced = text.toUpperCase();
            
            if (!enhanced.endsWith('!') && !enhanced.endsWith('?') && Math.random() > 0.5) {
                enhanced += '!';
            }
            
            if (enhanced.length < 25) {
                const intensifiers = ['SERIOUSLY', 'ACTUALLY', 'LITERALLY', 'FOR REAL'];
                if (Math.random() > 0.7) {
                    enhanced = intensifiers[Math.floor(Math.random() * intensifiers.length)] + ' ' + enhanced;
                }
            }
            
            return enhanced;
        };
        
        return {
            top: enhance(topText),
            bottom: enhance(bottomText)
        };
    }

    function updateAIStatus(text = 'AI Ready', type = 'success') {
        const aiStatus = document.getElementById('aiStatus');
        
        if (!aiStatus) {
            console.warn('aiStatus element not found in DOM');
            return;
        }
        
        const icon = aiStatus.querySelector('i');
        
        aiStatus.textContent = text;
        aiStatus.style.color = type === 'error' ? '#f56565' : 
                               type === 'warning' ? '#ed8936' : 
                               '#48bb78';
        
        if (icon) {
            icon.className = type === 'error' ? 'fas fa-exclamation-circle' :
                             type === 'warning' ? 'fas fa-clock' :
                             'fas fa-circle';
        }
        
        const remaining = MAX_AI_REQUESTS - aiRequestCount;
        if (remaining <= 3) {
            aiStatus.innerHTML = `${text} <span style="font-size: 0.8em;">(${remaining} left)</span>`;
        }
    }

    function downloadMeme() {
        if (!currentTemplate) {
            showToast('Please select an image first', 'error');
            return;
        }
        
        // Create a temporary canvas for download that includes the text
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Set temp canvas dimensions
        tempCanvas.width = memeCanvas.width;
        tempCanvas.height = memeCanvas.height;
        
        // Draw image
        tempCtx.drawImage(memeImage, 0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw text on temp canvas for download
        const topText = topTextInput.value.trim().toUpperCase();
        const bottomText = bottomTextInput.value.trim().toUpperCase();
        
        if (topText || bottomText) {
            const fontSize = parseInt(fontSizeSlider.value);
            const fontFamily = fontFamilySelect.value;
            const textColor = textColorPicker.value;
            const strokeColor = strokeColorPicker.value;
            const strokeWidth = parseInt(strokeWidthSlider.value);
            
            tempCtx.textAlign = 'center';
            tempCtx.textBaseline = 'middle';
            tempCtx.font = `bold ${fontSize}px ${fontFamily}, Impact, Arial Black, sans-serif`;
            tempCtx.lineWidth = strokeWidth;
            tempCtx.lineJoin = 'round';
            tempCtx.strokeStyle = strokeColor;
            tempCtx.fillStyle = textColor;
            
            // Draw top text
            if (topText) {
                const lines = wrapText(tempCtx, topText, tempCanvas.width * 0.9);
                const lineHeight = fontSize * 1.2;
                let y = fontSize * 1.5;
                
                lines.forEach((line, index) => {
                    const yPos = y + (index * lineHeight);
                    tempCtx.strokeText(line, tempCanvas.width / 2, yPos);
                    tempCtx.fillText(line, tempCanvas.width / 2, yPos);
                });
            }
            
            // Draw bottom text
            if (bottomText) {
                const lines = wrapText(tempCtx, bottomText, tempCanvas.width * 0.9);
                const lineHeight = fontSize * 1.2;
                const totalHeight = lines.length * lineHeight;
                let y = tempCanvas.height - fontSize * 1.5 - totalHeight;
                
                lines.forEach((line, index) => {
                    const yPos = y + (index * lineHeight);
                    tempCtx.strokeText(line, tempCanvas.width / 2, yPos);
                    tempCtx.fillText(line, tempCanvas.width / 2, yPos);
                });
            }
        }
        
        // Download the temp canvas
        const link = document.createElement('a');
        const fileName = currentTemplate.uploaded ? 'my-meme' : 
                        `meme-${currentTemplate.name.replace(/\s+/g, '-').toLowerCase()}`;
        link.download = `${fileName}-${Date.now()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
        showToast('Meme downloaded!', 'info');
    }

    // Helper function for text wrapping in download
    function wrapText(context, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = context.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }

    function shareMeme() {
        if (!navigator.share && !navigator.clipboard) {
            showToast('Sharing not supported in this browser', 'error');
            return;
        }
        
        // Use the same temp canvas logic as download
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = memeCanvas.width;
        tempCanvas.height = memeCanvas.height;
        tempCtx.drawImage(memeImage, 0, 0, tempCanvas.width, tempCanvas.height);
        
        // (Add text drawing logic here similar to downloadMeme)
        
        tempCanvas.toBlob(blob => {
            const file = new File([blob], 'meme.png', { type: 'image/png' });
            
            if (navigator.share) {
                navigator.share({
                    title: 'Check out this meme!',
                    text: 'I created this meme using AI Meme Generator Pro',
                    files: [file]
                }).catch(() => showToast('Share cancelled', 'info'));
            } else {
                const item = new ClipboardItem({ 'image/png': blob });
                navigator.clipboard.write([item])
                    .then(() => showToast('Meme copied to clipboard!', 'info'))
                    .catch(() => showToast('Failed to copy meme', 'error'));
            }
        });
    }

    function resetEditor() {
        topTextInput.value = '';
        bottomTextInput.value = '';
        fontSizeSlider.value = 42;
        fontSizeValue.textContent = '42px';
        strokeWidthSlider.value = 3;
        strokeWidthValue.textContent = '3px';
        textColorPicker.value = '#ffffff';
        strokeColorPicker.value = '#000000';
        fontFamilySelect.value = 'Impact';
        updateMeme();
        showToast('Editor reset', 'info');
    }

    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Initialize AI system
    updateAIStatus();
});
