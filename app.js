document.addEventListener('DOMContentLoaded', function () {

    /* ─── DOM ──────────────────────────────────────── */
    const templatesGrid      = document.getElementById('templatesGrid');
    const templatesSection   = document.getElementById('templatesSection');
    const uploadSection      = document.getElementById('uploadSection');
    const editorSection      = document.getElementById('editorSection');
    const memeCanvas         = document.getElementById('memeCanvas');
    const ctx                = memeCanvas.getContext('2d');
    const canvasWrapper      = document.getElementById('canvasWrapper');

    const templatesModeBtn   = document.getElementById('templatesModeBtn');
    const uploadModeBtn      = document.getElementById('uploadModeBtn');
    const refreshTemplatesBtn= document.getElementById('refreshTemplatesBtn');

    const imageUpload        = document.getElementById('imageUpload');
    const browseBtn          = document.getElementById('browseBtn');
    const uploadedPreview    = document.getElementById('uploadedPreview');
    const uploadedImage      = document.getElementById('uploadedImage');
    const useUploadedBtn     = document.getElementById('useUploadedBtn');

    const topTextInput       = document.getElementById('topText');
    const bottomTextInput    = document.getElementById('bottomText');
    const generateTopBtn     = document.getElementById('generateTopBtn');
    const generateBottomBtn  = document.getElementById('generateBottomBtn');
    const generateBothBtn    = document.getElementById('generateBothBtn');
    const suggestThemesBtn   = document.getElementById('suggestThemesBtn');
    const improveTextBtn     = document.getElementById('improveTextBtn');

    const fontSizeSlider     = document.getElementById('fontSize');
    const fontSizeValue      = document.getElementById('fontSizeValue');
    const fontFamilySelect   = document.getElementById('fontFamily');
    const textColorPicker    = document.getElementById('textColor');
    const strokeColorPicker  = document.getElementById('strokeColor');
    const strokeWidthSlider  = document.getElementById('strokeWidth');
    const strokeWidthValue   = document.getElementById('strokeWidthValue');

    const downloadBtn        = document.getElementById('downloadBtn');
    const shareBtn           = document.getElementById('shareBtn');
    const resetBtn           = document.getElementById('resetBtn');
    const resetPositionsBtn  = document.getElementById('resetPositionsBtn');
    const replaceImageBtn    = document.getElementById('replaceImageBtn');
    const editingSource      = document.getElementById('editingSource');

    const themesModal        = document.getElementById('themesModal');
    const themesGrid         = document.getElementById('themesGrid');
    const closeModalBtn      = document.querySelector('.close-modal');

    /* ─── State ────────────────────────────────────── */
    let currentTemplate  = null;
    let templates        = [];
    let memeImage        = new Image();
    memeImage.crossOrigin = 'anonymous';
    let currentMode      = 'templates';
    let uploadedFile     = null;
    let aiRequestCount   = 0;
    const MAX_AI_REQUESTS = 20;
    const aiCache        = new Map();
    let textAlign        = 'center';

    /* ─── Draggable Text State ─────────────────────── */
    // Positions stored as fractions of canvas dimensions (0–1)
    const textObjects = {
        top: {
            key: 'top',
            x: 0.5,   // horizontal centre
            y: 0.10,  // near top
            dragging: false,
            dragOffsetX: 0,
            dragOffsetY: 0,
            bounds: null   // computed during draw
        },
        bottom: {
            key: 'bottom',
            x: 0.5,
            y: 0.90,  // near bottom
            dragging: false,
            dragOffsetX: 0,
            dragOffsetY: 0,
            bounds: null
        }
    };
    let activeTextKey = null;  // which text is being dragged

    /* ─── Init ─────────────────────────────────────── */
    init();

    async function init() {
        try {
            await loadTemplates(true);
            setupEventListeners();
            setupDragAndDrop();
            updateAIStatus();
        } catch (err) {
            console.error('Init error:', err);
            showToast('Some features may not work correctly', 'warning');
        }
    }

    /* ─── Template Loading ─────────────────────────── */
    async function loadTemplates(forceRefresh = false) {
        templatesGrid.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p>Fetching fresh templates…</p></div>`;
        try {
            const url = `https://api.imgflip.com/get_memes${forceRefresh ? '?t=' + Date.now() : ''}`;
            const res  = await fetch(url);
            const data = await res.json();
            if (data.success) {
                templates = shuffleArray(data.data.memes).slice(0, 30);
                displayTemplates();
                const countEl = document.getElementById('templateCount');
                if (countEl) countEl.textContent = `${templates.length} templates`;
                showToast(`${templates.length} templates loaded!`, 'info');
            } else throw new Error('API failed');
        } catch {
            showToast('Using offline templates', 'warning');
            loadFallbackTemplates();
        }
    }

    function shuffleArray(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function loadFallbackTemplates() {
        templates = shuffleArray([
            { id: '181913649', name: 'Drake Hotline Bling',     url: 'https://i.imgflip.com/30b1gx.jpg',  width: 1200, height: 1200 },
            { id: '87743020',  name: 'Two Buttons',             url: 'https://i.imgflip.com/1g8my4.jpg',  width: 600,  height: 908  },
            { id: '112126428', name: 'Distracted Boyfriend',    url: 'https://i.imgflip.com/1ur9b0.jpg',  width: 1200, height: 800  },
            { id: '131087935', name: 'Running Away Balloon',    url: 'https://i.imgflip.com/261o3j.jpg',  width: 761,  height: 1024 },
            { id: '247375501', name: 'Buff Doge vs Cheems',     url: 'https://i.imgflip.com/43a45p.png',  width: 937,  height: 720  },
            { id: '129242436', name: 'Change My Mind',          url: 'https://i.imgflip.com/24y43o.jpg',  width: 482,  height: 361  },
            { id: '222403160', name: 'Bernie I Am Once Again',  url: 'https://i.imgflip.com/3pnzk9.jpg',  width: 750,  height: 750  },
            { id: '124822590', name: 'Left Exit 12 Off Ramp',   url: 'https://i.imgflip.com/22bdq6.jpg',  width: 804,  height: 767  },
            { id: '217743513', name: 'UNO Draw 25 Cards',       url: 'https://i.imgflip.com/3lmzyx.jpg',  width: 500,  height: 494  },
            { id: '93895088',  name: 'Expanding Brain',         url: 'https://i.imgflip.com/1jwhww.jpg',  width: 857,  height: 1202 },
        ]);
        displayTemplates();
    }

    function displayTemplates() {
        templatesGrid.innerHTML = '';
        templates.forEach(t => {
            const card = document.createElement('div');
            card.className = 'template-card';
            card.innerHTML = `<img src="${t.url}" alt="${t.name}" loading="lazy"><div class="template-name">${t.name}</div>`;
            card.addEventListener('click', () => selectTemplate(t));
            templatesGrid.appendChild(card);
        });
    }

    /* ─── Event Listeners ──────────────────────────── */
    function setupEventListeners() {
        templatesModeBtn.addEventListener('click', () => switchMode('templates'));
        uploadModeBtn.addEventListener('click',    () => switchMode('upload'));
        refreshTemplatesBtn.addEventListener('click', () => loadTemplates(true));

        browseBtn.addEventListener('click',       () => imageUpload.click());
        imageUpload.addEventListener('change',    handleImageUpload);
        useUploadedBtn.addEventListener('click',  useUploadedImage);

        topTextInput.addEventListener('input',    redraw);
        bottomTextInput.addEventListener('input', redraw);
        fontFamilySelect.addEventListener('change', redraw);
        textColorPicker.addEventListener('input',   redraw);
        strokeColorPicker.addEventListener('input',  redraw);
        fontSizeSlider.addEventListener('input',  () => { fontSizeValue.textContent = `${fontSizeSlider.value}px`; redraw(); });
        strokeWidthSlider.addEventListener('input',() => { strokeWidthValue.textContent = `${strokeWidthSlider.value}px`; redraw(); });

        generateTopBtn.addEventListener('click',  () => generateAIText('top'));
        generateBottomBtn.addEventListener('click',() => generateAIText('bottom'));
        generateBothBtn.addEventListener('click', generateBothAITexts);
        suggestThemesBtn.addEventListener('click', showThemeSuggestions);
        improveTextBtn.addEventListener('click',  improveCurrentText);

        downloadBtn.addEventListener('click',     downloadMeme);
        shareBtn.addEventListener('click',        shareMeme);
        resetBtn.addEventListener('click',        resetEditor);
        resetPositionsBtn.addEventListener('click', resetTextPositions);
        replaceImageBtn.addEventListener('click', () => switchMode('upload'));

        closeModalBtn.addEventListener('click',   () => themesModal.classList.remove('active'));
        themesModal.addEventListener('click', e => { if (e.target === themesModal) themesModal.classList.remove('active'); });

        // Alignment buttons
        document.querySelectorAll('.align-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                textAlign = btn.dataset.align;
                redraw();
            });
        });

        // Preset colour buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                textColorPicker.value   = btn.dataset.text;
                strokeColorPicker.value = btn.dataset.stroke;
                redraw();
            });
        });

        // Canvas drag events
        setupCanvasDrag();
    }

    /* ─── Canvas Drag-to-Reposition Text ───────────── */
    function setupCanvasDrag() {
        memeCanvas.addEventListener('mousedown',  onDragStart);
        memeCanvas.addEventListener('mousemove',  onDragMove);
        memeCanvas.addEventListener('mouseup',    onDragEnd);
        memeCanvas.addEventListener('mouseleave', onDragEnd);

        // Touch support
        memeCanvas.addEventListener('touchstart', e => { e.preventDefault(); onDragStart(e.touches[0]); }, { passive: false });
        memeCanvas.addEventListener('touchmove',  e => { e.preventDefault(); onDragMove(e.touches[0]); }, { passive: false });
        memeCanvas.addEventListener('touchend',   e => { e.preventDefault(); onDragEnd(); }, { passive: false });
    }

    function getCanvasPoint(clientX, clientY) {
        const rect = memeCanvas.getBoundingClientRect();
        const scaleX = memeCanvas.width  / rect.width;
        const scaleY = memeCanvas.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top)  * scaleY
        };
    }

    function hitTest(point, obj) {
        if (!obj.bounds) return false;
        const b = obj.bounds;
        return point.x >= b.left && point.x <= b.right &&
               point.y >= b.top  && point.y <= b.bottom;
    }

    function onDragStart(e) {
        if (!currentTemplate) return;
        const pt = getCanvasPoint(e.clientX, e.clientY);
        for (const key of ['top', 'bottom']) {
            const obj = textObjects[key];
            if (hitTest(pt, obj)) {
                obj.dragging = true;
                activeTextKey = key;
                const cx = obj.x * memeCanvas.width;
                const cy = obj.y * memeCanvas.height;
                obj.dragOffsetX = pt.x - cx;
                obj.dragOffsetY = pt.y - cy;
                canvasWrapper.classList.add('dragging');
                break;
            }
        }
    }

    function onDragMove(e) {
        if (!currentTemplate) return;
        const pt = getCanvasPoint(e.clientX, e.clientY);

        // Cursor feedback when hovering a text region
        let hovering = false;
        for (const key of ['top', 'bottom']) {
            if (hitTest(pt, textObjects[key])) { hovering = true; break; }
        }
        canvasWrapper.classList.toggle('drag-hover', hovering && !activeTextKey);

        if (!activeTextKey) return;
        const obj = textObjects[activeTextKey];
        if (!obj.dragging) return;

        // Move, clamp within canvas bounds
        obj.x = Math.max(0, Math.min(1, (pt.x - obj.dragOffsetX) / memeCanvas.width));
        obj.y = Math.max(0, Math.min(1, (pt.y - obj.dragOffsetY) / memeCanvas.height));
        redraw();
    }

    function onDragEnd() {
        if (activeTextKey) {
            textObjects[activeTextKey].dragging = false;
        }
        activeTextKey = null;
        canvasWrapper.classList.remove('dragging');
    }

    function resetTextPositions() {
        textObjects.top.x    = 0.5;
        textObjects.top.y    = 0.10;
        textObjects.bottom.x = 0.5;
        textObjects.bottom.y = 0.90;
        redraw();
        showToast('Text positions reset', 'info');
    }

    /* ─── Canvas Drawing ───────────────────────────── */
    function redraw() {
        if (!currentTemplate || !memeImage.complete) return;

        ctx.clearRect(0, 0, memeCanvas.width, memeCanvas.height);
        ctx.drawImage(memeImage, 0, 0, memeCanvas.width, memeCanvas.height);

        const fontSize   = parseInt(fontSizeSlider.value);
        const fontFamily = fontFamilySelect.value;
        const textColor  = textColorPicker.value;
        const strokeColor= strokeColorPicker.value;
        const strokeW    = parseInt(strokeWidthSlider.value);

        ctx.font        = `bold ${fontSize}px "${fontFamily}", Impact, Arial Black, sans-serif`;
        ctx.lineJoin    = 'round';
        ctx.miterLimit  = 2;
        ctx.textBaseline= 'middle';
        ctx.textAlign   = textAlign;

        const topText    = topTextInput.value.trim().toUpperCase();
        const bottomText = bottomTextInput.value.trim().toUpperCase();

        drawTextObject(textObjects.top,    topText,    fontSize, textColor, strokeColor, strokeW);
        drawTextObject(textObjects.bottom, bottomText, fontSize, textColor, strokeColor, strokeW);
    }

    function drawTextObject(obj, text, fontSize, textColor, strokeColor, strokeW) {
        if (!text) { obj.bounds = null; return; }

        const x = obj.x * memeCanvas.width;
        const y = obj.y * memeCanvas.height;
        const maxW = memeCanvas.width * 0.92;

        const lines = wrapText(ctx, text, maxW);
        const lineH = fontSize * 1.25;
        const totalH = lines.length * lineH;
        const startY = y - (totalH / 2) + lineH / 2;

        // Compute anchor x based on alignment
        let anchorX = x;
        if (textAlign === 'left')  anchorX = x;
        if (textAlign === 'right') anchorX = x;

        // Draw selection ring if dragging
        if (obj.dragging) {
            ctx.save();
            ctx.strokeStyle = 'rgba(34,211,238,0.9)';
            ctx.lineWidth   = 2;
            ctx.setLineDash([5, 4]);
            const pad = 10;
            const maxLineW = Math.max(...lines.map(l => ctx.measureText(l).width));
            let boxX = anchorX - maxLineW / 2 - pad;
            if (textAlign === 'left')  boxX = anchorX - pad;
            if (textAlign === 'right') boxX = anchorX - maxLineW - pad;
            ctx.strokeRect(boxX, startY - lineH / 2 - pad, maxLineW + pad * 2, totalH + pad * 2);
            ctx.restore();
        }

        // Draw text lines
        lines.forEach((line, i) => {
            const ly = startY + i * lineH;

            if (strokeW > 0) {
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth   = strokeW * 2;
                ctx.strokeText(line, anchorX, ly, memeCanvas.width);
            }
            ctx.fillStyle = textColor;
            ctx.fillText(line, anchorX, ly, memeCanvas.width);
        });

        // Update hit bounds
        const measuredMaxW = Math.max(...lines.map(l => ctx.measureText(l).width));
        const pad = 14;
        let bLeft = anchorX - measuredMaxW / 2 - pad;
        if (textAlign === 'left')  bLeft = anchorX - pad;
        if (textAlign === 'right') bLeft = anchorX - measuredMaxW - pad;

        obj.bounds = {
            left:   bLeft,
            right:  bLeft + measuredMaxW + pad * 2,
            top:    startY - lineH / 2 - pad,
            bottom: startY + totalH - lineH / 2 + pad
        };
    }

    function wrapText(context, text, maxW) {
        const words = text.split(' ');
        const lines = [];
        let current = '';
        for (const word of words) {
            const test = current ? current + ' ' + word : word;
            if (context.measureText(test).width <= maxW) {
                current = test;
            } else {
                if (current) lines.push(current);
                current = word;
            }
        }
        if (current) lines.push(current);
        return lines.length ? lines : [''];
    }

    /* ─── Template / Upload Selection ─────────────── */
    function selectTemplate(template) {
        memeImage = new Image();
        memeImage.crossOrigin = 'anonymous';
        memeImage.src = template.url;
        memeImage.onload = () => {
            setCanvasDimensions();
            currentTemplate = template;
            aiCache.clear();
            editingSource.textContent = template.name;
            resetTextPositions();
            switchToEditor();
            redraw();
        };
        memeImage.onerror = () => showToast('Could not load template image', 'error');
    }

    function useUploadedImage() {
        if (!uploadedFile) return;
        memeImage = new Image();
        memeImage.src = URL.createObjectURL(uploadedFile);
        memeImage.onload = () => {
            setCanvasDimensions();
            currentTemplate = { name: 'Custom Upload', uploaded: true };
            aiCache.clear();
            editingSource.textContent = 'Uploaded Image';
            resetTextPositions();
            switchToEditor();
            redraw();
        };
        memeImage.onerror = () => showToast('Error loading image', 'error');
    }

    function setCanvasDimensions() {
        const maxW = 640;
        const ratio = memeImage.height / memeImage.width;
        memeCanvas.width  = maxW;
        memeCanvas.height = Math.round(maxW * ratio);
    }

    /* ─── Mode Switching ───────────────────────────── */
    function switchMode(mode) {
        currentMode = mode;
        templatesModeBtn.classList.toggle('active', mode === 'templates');
        uploadModeBtn.classList.toggle('active',    mode === 'upload');
        templatesSection.style.display = mode === 'templates' ? 'block' : 'none';
        uploadSection.style.display    = mode === 'upload'    ? 'block' : 'none';
        editorSection.style.display    = 'none';
    }

    function switchToEditor() {
        templatesSection.style.display = 'none';
        uploadSection.style.display    = 'none';
        editorSection.style.display    = 'block';
        document.getElementById('imageControls').style.display =
            currentTemplate?.uploaded ? 'block' : 'none';
    }

    /* ─── File Upload ──────────────────────────────── */
    function setupDragAndDrop() {
        ['dragenter','dragover','dragleave','drop'].forEach(ev => {
            const uploadArea = document.getElementById('uploadArea');
            uploadArea.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); });
            document.body.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); });
        });
        const ua = document.getElementById('uploadArea');
        ua.addEventListener('dragenter', () => ua.classList.add('dragover'));
        ua.addEventListener('dragleave', () => ua.classList.remove('dragover'));
        ua.addEventListener('drop', e => { ua.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
        ua.addEventListener('click', () => imageUpload.click());
    }

    function handleFiles(files) {
        if (!files.length) return;
        const file = files[0];
        if (!file.type.match('image.*')) return showToast('Please upload an image file', 'error');
        if (file.size > 5 * 1024 * 1024) return showToast('File too large (max 5MB)', 'error');
        uploadedFile = file;
        const reader = new FileReader();
        reader.onload = e => {
            uploadedImage.src = e.target.result;
            uploadedPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    function handleImageUpload(e) { handleFiles(e.target.files); }

    /* ─── AI Caption Generation ────────────────────── */
    async function generateAIText(position) {
        if (!currentTemplate) return showToast('Select an image first', 'error');
        if (aiRequestCount >= MAX_AI_REQUESTS) return showToast('AI limit reached. Refresh to reset.', 'warning');

        const cacheKey = `${currentTemplate.name}-${position}`;
        if (aiCache.has(cacheKey)) {
            setTextInput(position, aiCache.get(cacheKey));
            return showToast('Using cached suggestion', 'info');
        }

        updateAIStatus('Generating…', 'warning');
        showToast(`Generating ${position} text…`, 'info');

        try {
            aiRequestCount++;
            const text = await getAICaption(currentTemplate.name, position);
            if (text) {
                aiCache.set(cacheKey, text);
                setTextInput(position, text);
                updateAIStatus();
                showToast('Caption generated!', 'info');
            }
        } catch {
            aiRequestCount--;
            updateAIStatus('AI Error', 'error');
            showToast('AI unavailable, using fallback', 'warning');
            setTextInput(position, getFallbackCaption(currentTemplate.name, position));
        }
    }

    async function generateBothAITexts() {
        if (!currentTemplate) return showToast('Select an image first', 'error');
        if (aiRequestCount >= MAX_AI_REQUESTS - 1) return showToast('AI limit reached', 'warning');

        updateAIStatus('Generating both…', 'warning');
        showToast('Generating captions…', 'info');

        try {
            const [top, bottom] = await Promise.all([
                getAICaption(currentTemplate.name, 'top'),
                getAICaption(currentTemplate.name, 'bottom')
            ]);
            if (top)    { topTextInput.value    = top;    aiCache.set(`${currentTemplate.name}-top`,    top); }
            if (bottom) { bottomTextInput.value = bottom; aiCache.set(`${currentTemplate.name}-bottom`, bottom); }
            aiRequestCount += 2;
            redraw();
            updateAIStatus();
            showToast('Both captions generated!', 'info');
        } catch {
            showToast('Using fallback captions', 'warning');
            topTextInput.value    = getFallbackCaption(currentTemplate.name, 'top');
            bottomTextInput.value = getFallbackCaption(currentTemplate.name, 'bottom');
            redraw();
            updateAIStatus();
        }
    }

    async function showThemeSuggestions() {
        if (!currentTemplate) return showToast('Select an image first', 'error');
        showToast('Fetching theme ideas…', 'info');
        try {
            const themes = await getAIThemes(currentTemplate.name);
            populateThemesGrid(themes);
        } catch {
            populateThemesGrid(getPredefinedThemes());
        }
        themesModal.classList.add('active');
    }

    function populateThemesGrid(themes) {
        themesGrid.innerHTML = '';
        themes.forEach(t => {
            const card = document.createElement('div');
            card.className = 'theme-card';
            card.innerHTML = `<h4>${t.name}</h4><p>${t.description}</p><small>Click to apply →</small>`;
            card.addEventListener('click', () => {
                topTextInput.value    = t.topText;
                bottomTextInput.value = t.bottomText;
                redraw();
                themesModal.classList.remove('active');
                showToast(`Theme "${t.name}" applied`, 'info');
            });
            themesGrid.appendChild(card);
        });
    }

    async function improveCurrentText() {
        const top    = topTextInput.value.trim();
        const bottom = bottomTextInput.value.trim();
        if (!top && !bottom) return showToast('No text to improve', 'warning');

        updateAIStatus('Improving…', 'warning');
        showToast('Improving text…', 'info');

        try {
            const improved = await improveTextWithAI(top, bottom);
            if (improved.top    && improved.top    !== top)    topTextInput.value    = improved.top;
            if (improved.bottom && improved.bottom !== bottom) bottomTextInput.value = improved.bottom;
            redraw();
            updateAIStatus();
            showToast('Text improved!', 'info');
        } catch {
            showToast('Using local enhancement', 'warning');
            const enh = localEnhance(top, bottom);
            if (enh.top)    topTextInput.value    = enh.top;
            if (enh.bottom) bottomTextInput.value = enh.bottom;
            redraw();
            updateAIStatus();
        }
    }

    function localEnhance(top, bottom) {
        const enhance = t => {
            if (!t) return '';
            let s = t.toUpperCase();
            if (!s.endsWith('!') && !s.endsWith('?') && Math.random() > .5) s += '!';
            if (s.length < 25 && Math.random() > .7) {
                const opts = ['SERIOUSLY', 'LITERALLY', 'ACTUALLY', 'WAIT—'];
                s = opts[Math.floor(Math.random() * opts.length)] + ' ' + s;
            }
            return s;
        };
        return { top: enhance(top), bottom: enhance(bottom) };
    }

    /* ─── Helpers ──────────────────────────────────── */
    function setTextInput(position, text) {
        if (position === 'top') topTextInput.value = text;
        else bottomTextInput.value = text;
        redraw();
    }

    function updateAIStatus(msg = 'AI Ready', type = 'success') {
        const el = document.getElementById('aiStatus');
        if (!el) return;
        const dot = el.querySelector('.status-dot');
        el.childNodes[el.childNodes.length - 1].textContent = ' ' + msg;
        if (dot) {
            dot.style.background = type === 'error'   ? 'var(--red)'   :
                                   type === 'warning' ? 'var(--amber)' : 'var(--green)';
            dot.style.boxShadow  = type === 'error'   ? '0 0 8px var(--red)'   :
                                   type === 'warning' ? '0 0 8px var(--amber)' : '0 0 8px var(--green)';
        }
        const remaining = MAX_AI_REQUESTS - aiRequestCount;
        if (remaining <= 5) {
            el.childNodes[el.childNodes.length - 1].textContent += ` (${remaining} left)`;
        }
    }

    /* ─── Download / Share ─────────────────────────── */
    function downloadMeme() {
        if (!currentTemplate) return showToast('Select an image first', 'error');

        // Create a clean canvas without selection UI
        const tmp = document.createElement('canvas');
        tmp.width  = memeCanvas.width;
        tmp.height = memeCanvas.height;
        const tctx = tmp.getContext('2d');

        tctx.drawImage(memeImage, 0, 0, tmp.width, tmp.height);

        const fontSize   = parseInt(fontSizeSlider.value);
        const fontFamily = fontFamilySelect.value;
        const textColor  = textColorPicker.value;
        const strokeColor= strokeColorPicker.value;
        const strokeW    = parseInt(strokeWidthSlider.value);

        tctx.font        = `bold ${fontSize}px "${fontFamily}", Impact, Arial Black, sans-serif`;
        tctx.textBaseline= 'middle';
        tctx.textAlign   = textAlign;
        tctx.lineJoin    = 'round';
        tctx.miterLimit  = 2;

        const draw = (text, obj) => {
            if (!text) return;
            const x = obj.x * tmp.width;
            const y = obj.y * tmp.height;
            const lines = wrapText(tctx, text.toUpperCase(), tmp.width * 0.92);
            const lineH = fontSize * 1.25;
            const startY = y - (lines.length * lineH / 2) + lineH / 2;
            lines.forEach((line, i) => {
                const ly = startY + i * lineH;
                if (strokeW > 0) { tctx.strokeStyle = strokeColor; tctx.lineWidth = strokeW * 2; tctx.strokeText(line, x, ly, tmp.width); }
                tctx.fillStyle = textColor;
                tctx.fillText(line, x, ly, tmp.width);
            });
        };

        draw(topTextInput.value.trim(),    textObjects.top);
        draw(bottomTextInput.value.trim(), textObjects.bottom);

        const name = currentTemplate.uploaded ? 'my-meme' : `meme-${currentTemplate.name.replace(/\s+/g, '-').toLowerCase()}`;
        const link = document.createElement('a');
        link.download = `${name}-${Date.now()}.png`;
        link.href = tmp.toDataURL('image/png');
        link.click();
        showToast('Meme downloaded!', 'info');
    }

    function shareMeme() {
        if (!currentTemplate) return showToast('Select an image first', 'error');
        memeCanvas.toBlob(blob => {
            const file = new File([blob], 'meme.png', { type: 'image/png' });
            if (navigator.share) {
                navigator.share({ title: 'Check out this meme!', files: [file] })
                    .catch(() => showToast('Share cancelled', 'info'));
            } else if (navigator.clipboard?.write) {
                navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                    .then(() => showToast('Copied to clipboard!', 'info'))
                    .catch(() => showToast('Could not copy meme', 'error'));
            } else {
                showToast('Sharing not supported in this browser', 'warning');
            }
        });
    }

    /* ─── Reset ────────────────────────────────────── */
    function resetEditor() {
        topTextInput.value    = '';
        bottomTextInput.value = '';
        fontSizeSlider.value  = 42;
        fontSizeValue.textContent = '42px';
        strokeWidthSlider.value = 3;
        strokeWidthValue.textContent = '3px';
        textColorPicker.value  = '#ffffff';
        strokeColorPicker.value= '#000000';
        fontFamilySelect.value = 'Impact';
        textAlign = 'center';
        document.querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.align-btn[data-align="center"]').classList.add('active');
        resetTextPositions();
        showToast('Editor reset', 'info');
    }

    /* ─── Toast ────────────────────────────────────── */
    function showToast(msg, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.className   = `toast ${type}`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

});
