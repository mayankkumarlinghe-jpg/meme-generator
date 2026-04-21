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

