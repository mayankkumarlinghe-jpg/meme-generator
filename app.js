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

