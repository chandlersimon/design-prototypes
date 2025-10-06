const BASE_GRAY = '#434343';
const DEFAULT_TEMP_TICK_COUNT = 72;

const ID_SUFFIXES = {
    dial: 'dial',
    tempDisplay: 'tempDisplay',
    timeDisplayMain: 'timeDisplayMain',
    modeLabel: 'modeLabel',
    cookingStatus: 'cookingStatus',
    completionButtons: 'completionButtons',
    bitMoreBtn: 'bitMoreBtn',
    keepWarmBtn: 'keepWarmBtn'
};

export const DEFAULT_DEBUG_SETTINGS = Object.freeze({
    scalingEnabled: true,
    gradientColorMode: 'seamless',
    currentLength: 2.0,
    adjacentFalloff: 25,
    radiusPercent: 10,
    alignment: 'outward',
    curve: 'exponential',
    tickMode: 'wrap',
    autoReset: true,
    resetDelay: 0.45,
    gapAngle: 20,
    preheatEnabled: true,
    flashDuration: 150,
    flashCount: 3,
    globalTickMode: '72-continuous',
    trailMode: 'standard',
    rapidModeThreshold: 30
});

export const createCircularTimeDialDebugSettings = (overrides = {}) => ({
    ...DEFAULT_DEBUG_SETTINGS,
    ...overrides
});

const buildTemplate = (idPrefix) => {
    const withPrefix = (suffix) => (idPrefix ? `${idPrefix}-${suffix}` : suffix);

    return `
    <div class="cooking-status" id="${withPrefix(ID_SUFFIXES.cookingStatus)}"></div>
    <canvas id="${withPrefix(ID_SUFFIXES.dial)}" width="320" height="320"></canvas>
    <div class="center-display">
        <div class="temp-display" id="${withPrefix(ID_SUFFIXES.tempDisplay)}">
            <div class="temp-unit" style="opacity: 0;">°F</div>
            <div class="temp-number">400</div>
            <div class="temp-unit">°F</div>
        </div>
        <div class="time-display-main" id="${withPrefix(ID_SUFFIXES.timeDisplayMain)}">10:00</div>
        <div class="mode-label" id="${withPrefix(ID_SUFFIXES.modeLabel)}">MIN - SEC</div>
        <div class="rack-icon" id="${withPrefix('rackIcon')}">
            <svg width="33" height="34" viewBox="0 0 33 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.3672 10.293H20.4316C19.916 10.0352 19.2715 9.77734 18.2402 9.77734C15.9199 9.77734 14.2441 11.3887 13.9863 13.7734C14.6953 12.8066 15.8555 12.291 17.209 12.291C19.6582 12.291 21.3984 13.9668 21.3984 16.5449C21.3984 19.123 19.3359 20.8633 16.6934 20.8633C13.5352 20.8633 11.7305 18.2207 11.7305 15.0625C11.7305 10.5508 14.502 7.7793 18.3691 7.7793C19.5293 7.7793 20.4961 8.03711 21.0762 8.42383L20.3672 10.293ZM16.6934 18.8652C17.9824 18.8652 19.0781 18.0273 19.0781 16.5449C19.0781 15.127 17.9824 14.2246 16.6934 14.2246C15.3398 14.2246 14.2441 15.127 14.2441 16.5449C14.2441 17.9629 15.4043 18.8652 16.6934 18.8652ZM5.47852 22.6035H8.37891C8.83008 22.6035 9.28125 22.9902 9.3457 23.4414L9.92578 26.084H23.0742L23.6543 23.4414C23.7188 22.9902 24.1699 22.6035 24.6211 22.6035H27.5215C28.1016 22.6035 28.5527 23.1191 28.5527 23.6348C28.5527 24.2148 28.1016 24.666 27.5215 24.666H25.459L24.9434 27.3086C24.8145 27.7598 24.4277 28.1465 23.9121 28.1465H9.08789C8.57227 28.1465 8.18555 27.7598 8.05664 27.3086L7.54102 24.666H5.47852C4.96289 24.666 4.44727 24.2148 4.44727 23.6348C4.44727 23.1191 4.96289 22.6035 5.47852 22.6035Z" fill="var(--text-primary)"/>
            </svg>
        </div>
        <div class="rack-label">RACK</div>
    </div>
    <div class="completion-buttons" id="${withPrefix(ID_SUFFIXES.completionButtons)}">
        <button class="completion-btn active" id="${withPrefix(ID_SUFFIXES.bitMoreBtn)}">A bit more</button>
        <button class="completion-btn" id="${withPrefix(ID_SUFFIXES.keepWarmBtn)}">Keep warm</button>
    </div>
`;
};

class CircularTimeDial {
    constructor(target = '.circular-time-dial', options = {}) {
        const container = typeof target === 'string' ? document.querySelector(target) : target;
        if (!container) {
            throw new Error(`CircularTimeDial: container "${target}" not found`);
        }

        this.root = container;
        this.options = options;
        this.debugRoot = options.debugRoot || null;
        this.debugSelectors = options.debugSelectors || {};
        this._debugElementCache = new Map();

        // Debug settings
        const providedDebug = options.debugSettings || {};
        this.debugSettings = {
            ...DEFAULT_DEBUG_SETTINGS,
            ...providedDebug
        };

        this.autoBindKeys = options.autoBindKeys !== false;
        this.boundHandleKeydown = this.handleKeydown.bind(this);

        const idPrefix = typeof options.idPrefix === 'string' ? options.idPrefix : 'circular-time-dial';
        this.idPrefix = idPrefix;
        this.ids = {};
        Object.entries(ID_SUFFIXES).forEach(([key, suffix]) => {
            this.ids[key] = idPrefix ? `${idPrefix}-${suffix}` : suffix;
        });

        this.root.classList.add('circular-time-dial');

        if (!options.useExistingMarkup) {
            this.root.innerHTML = buildTemplate(idPrefix);
        }

        this.canvas = document.getElementById(this.ids.dial);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.tempDisplay = document.getElementById(this.ids.tempDisplay);
        this.timeDisplayMain = document.getElementById(this.ids.timeDisplayMain);
        this.modeLabel = document.getElementById(this.ids.modeLabel);
        this.cookingStatus = document.getElementById(this.ids.cookingStatus);
        this.completionButtons = document.getElementById(this.ids.completionButtons);
        this.bitMoreBtn = document.getElementById(this.ids.bitMoreBtn);
        this.keepWarmBtn = document.getElementById(this.ids.keepWarmBtn);

        if (!this.canvas || !this.ctx || !this.tempDisplay || !this.timeDisplayMain || !this.modeLabel || !this.cookingStatus || !this.completionButtons || !this.bitMoreBtn || !this.keepWarmBtn) {
            throw new Error('CircularTimeDial: required markup missing after initialization');
        }

        this.totalMinutes = 10; // Start with 10 minutes
        this.maxMinutes = 72 * 60;

        this.temperature = 400; // Start with 400°F
        this.minTemp = 300;
        this.maxTemp = 480;

        this.tempMode = true; // Start in temperature mode

        this.centerX = 160;
        this.centerY = 160;
        this.radius = 136;

        // Timer for scaling reset
        this.lastActionTime = Date.now();
        this.scalingActive = false;

        // Acceleration properties for rapid key presses
        this.keyPressHistory = []; // Array to store recent key press timestamps
        this.accelerationMultiplier = 1;
        this.maxAcceleration = 4; // Maximum acceleration multiplier in rapid mode
        this.rapidMode = false; // Whether we're in rapid mode
        this.rapidModeThreshold = Math.max(1, parseInt(this.debugSettings.rapidModeThreshold, 10) || 30); // Number of clicks needed to trigger rapid mode
        this.debugSettings.rapidModeThreshold = this.rapidModeThreshold;
        this.rapidModeWindow = 2000; // Time window (2 seconds) to count clicks for rapid mode
        this.rapidModeDecayTime = 600; // ms - time of inactivity before exiting rapid mode
        this.lastKeyPressed = null; // Track which key was last pressed ('o' or 'p')

        // Animation properties
        this.animationDuration = 300; // ms
        this.animationStartTime = null;
        this.animatingToState = null; // 'active' or 'inactive'
        this.previousMultipliers = new Map(); // Store previous multipliers for smooth transitions

        // Ring fill animation properties
        this.ringFillAnimation = false;
        this.ringFillStartTime = null;
        this.ringFillDuration = 800; // ms - longer for smoother fill

        // Countdown mode properties
        this.countdownMode = false;
        this.countdownStartTime = null;
        this.countdownDuration = 0; // in seconds
        this.colonBlinkState = true;
        this.preheatPhase = false;
        this.preheatFlashState = true;

        // Completion state properties
        this.cookingComplete = false;
        this.selectedButton = 0; // 0 = "A bit more", 1 = "Keep warm"

        // Flash animation properties
        this.isFlashing = false;
        this.flashStartTime = null;
        this.flashCount = 0;
        this.flashVisible = true;
        this.hasFlashedAtBoundary = false;

        // Trail direction state (for 'stay' mode)
        this.trailDirection = 'normal'; // 'normal' or 'opposite'
        this.trailDirectionTarget = 'normal'; // Target direction for animation
        this.trailDirectionAnimationStart = null; // Animation start time
        this.trailDirectionAnimationDuration = 200; // Animation duration in ms

        // Animated trail state (for 'animated' mode)
        this.trailAnimationTickPositions = []; // Array of tick positions for animated trail
        this.trailCatchUpAnimation = false;
        this.trailCatchUpStart = null;
        this.trailFlowOutAnimation = false;
        this.trailFlowOutStart = null;
        this.lastMovementTime = Date.now();
        this.isMoving = false;
        this.previousCurrentTick = -1;
        this.movementDirection = null; // 'forward' or 'backward'
        this.trailLength = 0; // How many trail ticks to show (grows as you move)
        this.maxTrailLength = 7; // Maximum trail length

        if (this.autoBindKeys) {
            this.setupEventListeners();
        }
        this.setupDebugControls();
        this.startUpdateLoop();
        this.render();
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.boundHandleKeydown);
    }

    handleKeydown(event) {
        if (!event || !event.key) {
            return;
        }

        const key = event.key.toLowerCase();
        if (key === 'p') {
            if (this.cookingComplete) {
                this.navigateButtons(1); // Next button
            } else {
                if (this.debugSettings.trailMode === 'stay') {
                    this.startTrailDirectionAnimation('normal'); // P sets trail to normal direction
                }
                this.increaseValue();
            }
        } else if (key === 'o') {
            if (this.cookingComplete) {
                this.navigateButtons(-1); // Previous button
            } else {
                if (this.debugSettings.trailMode === 'stay') {
                    this.startTrailDirectionAnimation('opposite'); // O sets trail to opposite direction
                }
                this.decreaseValue();
            }
        } else if (key === 'r') {
            this.restart();
        } else if (key === 'q') {
            this.toggleMode();
        } else if (key === '1') {
            this.startCooking();
        }
    }

    calculateAcceleration(currentKey) {
        const now = Date.now();

        // Check if direction changed - if so, reset rapid mode
        if (this.lastKeyPressed && this.lastKeyPressed !== currentKey) {
            this.rapidMode = false;
            this.keyPressHistory = [];
            this.accelerationMultiplier = 1;
        }
        this.lastKeyPressed = currentKey;

        // Add current key press to history
        this.keyPressHistory.push(now);

        // Clean old key presses (older than rapid mode window)
        this.keyPressHistory = this.keyPressHistory.filter(timestamp => 
            now - timestamp <= this.rapidModeWindow
        );

        // Check if we should enter rapid mode
        if (!this.rapidMode && this.keyPressHistory.length >= this.rapidModeThreshold) {
            this.rapidMode = true;
        }

        // Check if we should exit rapid mode (no recent key presses)
        if (this.rapidMode) {
            const timeSinceLastPress = now - this.keyPressHistory[this.keyPressHistory.length - 2] || 0;
            if (timeSinceLastPress > this.rapidModeDecayTime) {
                this.rapidMode = false;
                this.accelerationMultiplier = 1;
                return 1;
            }
        }

        if (this.rapidMode) {
            // Rapid mode uses 3x acceleration
            this.accelerationMultiplier = this.maxAcceleration;
        } else {
            // Normal mode: always 1x
            this.accelerationMultiplier = 1;
        }

        // Update debug display
        this.updateAccelerationDebug();

        return Math.round(this.accelerationMultiplier);
    }

    updateAccelerationDebug() {
        const keyPressCount = this.getDebugElement('keyPressCount');
        const rapidModeStatus = this.getDebugElement('rapidModeStatus');
        const accelerationMultiplierDisplay = this.getDebugElement('accelerationMultiplier');
        const lastKeyDisplay = this.getDebugElement('lastKey');
        const thresholdDisplay = this.getDebugElement('rapidModeThresholdDisplay');

        if (!keyPressCount || !rapidModeStatus || !accelerationMultiplierDisplay || !lastKeyDisplay) {
            return;
        }

        keyPressCount.textContent = this.keyPressHistory.length;
        if (thresholdDisplay) {
            thresholdDisplay.textContent = this.debugSettings.rapidModeThreshold;
        }

        if (this.rapidMode) {
            rapidModeStatus.textContent = 'RAPID MODE';
            rapidModeStatus.className = 'rapid-mode';
        } else {
            rapidModeStatus.textContent = 'Normal';
            rapidModeStatus.className = 'normal-mode';
        }

        accelerationMultiplierDisplay.textContent = Math.round(this.accelerationMultiplier);
        lastKeyDisplay.textContent = this.lastKeyPressed || 'None';
    }

    handleTrailMovement(direction) {
        if (this.debugSettings.trailMode !== 'animated') return;

        const now = Date.now();
        this.lastMovementTime = now;
        this.isMoving = true;
        this.movementDirection = direction;

        // Grow trail by one tick each key press (not per individual time increment)
        this.trailLength = Math.min(this.trailLength + 1, this.maxTrailLength);

        // Stop any catch-up animation since we're moving
        this.trailCatchUpAnimation = false;
        this.trailCatchUpStart = null;
        this.trailAnimationCatchUpProgress = undefined;
    }

    updateAnimatedTrail() {
        if (this.debugSettings.trailMode !== 'animated') return;

        const now = Date.now();
        const timeSinceLastMovement = now - this.lastMovementTime;

        // Check if we should stop moving and start catch-up
        if (this.isMoving && timeSinceLastMovement > 0) { // Immediate catch-up when stopped
            this.isMoving = false;
            this.trailFlowOutAnimation = false;
            this.trailFlowOutStart = null;

            // Start catch-up animation if we have a trail
            if (this.trailLength > 0) {
                this.trailCatchUpAnimation = true;
                this.trailCatchUpStart = now;
            }
        }

        // Update trail positions based on animation state
        if (this.trailCatchUpAnimation && this.trailCatchUpStart) {
            this.updateTrailCatchUp();
        } else if (this.trailFlowOutAnimation && this.trailFlowOutStart) {
            this.updateTrailFlowOut();
        }
    }

    updateTrailFade() {
        const elapsed = Date.now() - this.trailFadeStart;
        const fadeOutDuration = 400; // 400ms to fade to 30% opacity
        const progress = Math.min(elapsed / fadeOutDuration, 1);

        // Fade from 100% to 30% opacity
        this.trailOpacity = 1.0 - (progress * 0.7); // Goes from 1.0 to 0.3

        if (progress >= 1) {
            // Fade complete - start catch-up animation
            this.trailFadeAnimation = false;
            this.trailFadeStart = null;

            // Start catch-up animation
            this.trailCatchUpAnimation = true;
            this.trailCatchUpStart = Date.now();
        }
    }

    updateTrailCatchUp() {
        const elapsed = Date.now() - this.trailCatchUpStart;
        const duration = 350; // 350ms for full catch-up
        const progress = Math.min(elapsed / duration, 1);

        // Calculate remaining trail length more smoothly to avoid simultaneous disappearance
        // Use continuous calculation instead of discrete steps
        const totalTicksToRemove = this.trailLength + 1; // +1 to ensure complete removal
        const exactTicksToRemove = progress * totalTicksToRemove;
        const remainingTrail = Math.max(0, this.trailLength + 1 - exactTicksToRemove);

        this.trailAnimationCatchUpProgress = progress;
        this.currentTrailLength = Math.max(0, Math.floor(remainingTrail));

        if (progress >= 1) {
            // Animation complete - ensure trail is completely cleared
            this.trailCatchUpAnimation = false;
            this.trailCatchUpStart = null;
            this.trailAnimationCatchUpProgress = undefined;
            this.trailLength = 0;
            this.currentTrailLength = 0;
        }
    }

    updateTrailFlowOut() {
        const elapsed = Date.now() - this.trailFlowOutStart;
        const duration = 300; // 300ms for flow-out effect
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out function for smooth flow
        const easeProgress = 1 - Math.pow(1 - progress, 2);

        // Calculate trail flow-out effect
        this.trailAnimationFlowProgress = easeProgress;

        if (progress >= 1 && !this.isMoving) {
            // Animation complete and we're not moving
            this.trailFlowOutAnimation = false;
            this.trailFlowOutStart = null;
        }
    }

    getAnimatedTrailColor(tickIndex, currentTickIndex, totalTicks) {
        const start = 67;  // BASE_GRAY channel value
        const end = 255;   // white

        // Calculate distance from current tick
        let distance;
        if (this.movementDirection === 'backward') {
            // Trail goes forward from current tick when moving backward
            distance = (tickIndex - currentTickIndex + totalTicks) % totalTicks;
        } else {
            // Trail goes backward from current tick when moving forward (default)
            distance = (currentTickIndex - tickIndex + totalTicks) % totalTicks;
        }

        // Determine current trail length to show
        let activeTrailLength;
        if (this.trailCatchUpAnimation && this.currentTrailLength !== undefined) {
            activeTrailLength = this.currentTrailLength;
        } else {
            activeTrailLength = this.trailLength;
        }

        // Show trail only within the active trail length
        if (distance > 0 && distance <= activeTrailLength) {
            const trailProgress = distance / this.maxTrailLength;
            const intensity = Math.round(start + (end - start) * (1 - trailProgress));
            return `rgb(${intensity}, ${intensity}, ${intensity})`;
        }

        // Default: no trail
        return BASE_GRAY;
    }

    getDebugElement(id) {
        if (!id) {
            return null;
        }

        if (!this._debugElementCache) {
            this._debugElementCache = new Map();
        }

        if (this._debugElementCache.has(id)) {
            return this._debugElementCache.get(id);
        }

        const scope = this.debugRoot || document;
        const selector = this.debugSelectors[id];
        let element = null;

        if (selector) {
            element = scope.querySelector(selector);
        }

        if (!element && this.debugRoot) {
            element = this.debugRoot.querySelector(`#${id}`) || this.debugRoot.querySelector(`[data-debug="${id}"]`);
        }

        if (!element) {
            element = document.getElementById(id);
        }

        if (element) {
            this._debugElementCache.set(id, element);
        }

        return element;
    }

    bindDebugControl({
        elementId,
        valueElementId,
        eventType = 'change',
        getValue,
        setValue,
        formatValue = (value) => value,
        render = false
    }) {
        if (typeof getValue !== 'function' || typeof setValue !== 'function') {
            return null;
        }

        const control = this.getDebugElement(elementId);
        if (!control) {
            return null;
        }

        const valueElement = valueElementId ? this.getDebugElement(valueElementId) : null;
        const format = typeof formatValue === 'function' ? formatValue : (value) => value;

        const updateValueDisplay = (value) => {
            if (!valueElement) {
                return;
            }
            valueElement.textContent = format(value);
        };

        const initialValue = getValue();
        if (initialValue !== undefined) {
            control.value = String(initialValue);
            updateValueDisplay(initialValue);
        }

        control.addEventListener(eventType, (event) => {
            const updatedValue = setValue(event.target.value);
            updateValueDisplay(updatedValue);
            if (render) {
                this.render();
            }
        });

        return control;
    }

    setupDebugControls() {
        this.bindDebugControl({
            elementId: 'enableScalingSelect',
            getValue: () => (this.debugSettings.scalingEnabled ? 'true' : 'false'),
            setValue: (value) => {
                this.debugSettings.scalingEnabled = value === 'true';
                this.toggleScalingControls();
                return value;
            },
            render: true
        });

        const gradientColorSelect = this.getDebugElement('gradientColorSelect');
        if (gradientColorSelect) {
            gradientColorSelect.value = this.debugSettings.gradientColorMode;
            gradientColorSelect.addEventListener('change', (event) => {
                this.debugSettings.gradientColorMode = event.target.value;
                this.render();
            });
        }

        const trailModeSelect = this.getDebugElement('trailModeSelect');
        if (trailModeSelect) {
            trailModeSelect.value = this.debugSettings.trailMode;
            trailModeSelect.addEventListener('change', (event) => {
                this.debugSettings.trailMode = event.target.value;
                this.trailDirection = 'normal';
                this.trailDirectionTarget = 'normal';
                this.trailDirectionAnimationStart = null;
                this.render();
            });
        }

        const accelerationDebugSelect = this.getDebugElement('accelerationDebugSelect');
        if (accelerationDebugSelect) {
            accelerationDebugSelect.value = 'false';
            const accelerationDebug = this.getDebugElement('accelerationDebug');
            accelerationDebugSelect.addEventListener('change', (event) => {
                if (!accelerationDebug) {
                    return;
                }
                if (event.target.value === 'true') {
                    accelerationDebug.classList.remove('hidden');
                } else {
                    accelerationDebug.classList.add('hidden');
                }
            });
        }

        this.bindDebugControl({
            elementId: 'rapidModeThreshold',
            valueElementId: 'rapidModeThresholdValue',
            eventType: 'input',
            getValue: () => this.debugSettings.rapidModeThreshold,
            setValue: (value) => {
                const parsed = Math.max(1, parseInt(value, 10) || 1);
                this.debugSettings.rapidModeThreshold = parsed;
                this.rapidModeThreshold = parsed;
                return this.debugSettings.rapidModeThreshold;
            },
            formatValue: (value) => `${value} presses`
        });

        this.bindDebugControl({
            elementId: 'currentLength',
            valueElementId: 'currentLengthValue',
            eventType: 'input',
            getValue: () => this.debugSettings.currentLength,
            setValue: (value) => {
                this.debugSettings.currentLength = parseFloat(value);
                return this.debugSettings.currentLength;
            },
            formatValue: (value) => `${value}x`,
            render: true
        });

        this.bindDebugControl({
            elementId: 'adjacentFalloff',
            valueElementId: 'adjacentFalloffValue',
            eventType: 'input',
            getValue: () => this.debugSettings.adjacentFalloff,
            setValue: (value) => {
                this.debugSettings.adjacentFalloff = parseInt(value, 10);
                return this.debugSettings.adjacentFalloff;
            },
            formatValue: (value) => `${value}%`,
            render: true
        });

        this.bindDebugControl({
            elementId: 'radiusPercent',
            valueElementId: 'radiusPercentValue',
            eventType: 'input',
            getValue: () => this.debugSettings.radiusPercent,
            setValue: (value) => {
                this.debugSettings.radiusPercent = parseInt(value, 10);
                return this.debugSettings.radiusPercent;
            },
            formatValue: (value) => `${value}%`,
            render: true
        });

        this.bindDebugControl({
            elementId: 'alignmentSelect',
            getValue: () => this.debugSettings.alignment,
            setValue: (value) => {
                this.debugSettings.alignment = value;
                return this.debugSettings.alignment;
            },
            render: true
        });

        this.bindDebugControl({
            elementId: 'curveSelect',
            getValue: () => this.debugSettings.curve,
            setValue: (value) => {
                this.debugSettings.curve = value;
                return this.debugSettings.curve;
            },
            render: true
        });

        this.bindDebugControl({
            elementId: 'gapAngle',
            valueElementId: 'gapAngleValue',
            eventType: 'input',
            getValue: () => this.debugSettings.gapAngle,
            setValue: (value) => {
                this.debugSettings.gapAngle = parseInt(value, 10);
                return this.debugSettings.gapAngle;
            },
            formatValue: (value) => `${value}°`,
            render: true
        });

        this.bindDebugControl({
            elementId: 'preheatSelect',
            getValue: () => (this.debugSettings.preheatEnabled ? 'true' : 'false'),
            setValue: (value) => {
                this.debugSettings.preheatEnabled = value === 'true';
                return value;
            },
            render: true
        });

        this.bindDebugControl({
            elementId: 'autoResetSelect',
            getValue: () => (this.debugSettings.autoReset ? 'true' : 'false'),
            setValue: (value) => {
                this.debugSettings.autoReset = value === 'true';
                return value;
            },
            render: true
        });

        this.bindDebugControl({
            elementId: 'resetDelay',
            valueElementId: 'resetDelayValue',
            eventType: 'input',
            getValue: () => this.debugSettings.resetDelay,
            setValue: (value) => {
                this.debugSettings.resetDelay = parseFloat(value);
                return this.debugSettings.resetDelay;
            },
            formatValue: (value) => `${value}s`,
        });

        this.bindDebugControl({
            elementId: 'flashDuration',
            valueElementId: 'flashDurationValue',
            eventType: 'input',
            getValue: () => this.debugSettings.flashDuration,
            setValue: (value) => {
                this.debugSettings.flashDuration = parseInt(value, 10);
                return this.debugSettings.flashDuration;
            },
            formatValue: (value) => `${value}ms`,
        });

        this.bindDebugControl({
            elementId: 'flashCount',
            valueElementId: 'flashCountValue',
            eventType: 'input',
            getValue: () => this.debugSettings.flashCount,
            setValue: (value) => {
                this.debugSettings.flashCount = parseInt(value, 10);
                return this.debugSettings.flashCount;
            },
            formatValue: (value) => `${value} flashes`,
        });

        this.bindDebugControl({
            elementId: 'globalTickModeSelect',
            getValue: () => this.debugSettings.globalTickMode,
            setValue: (value) => {
                this.debugSettings.globalTickMode = value;
                return this.debugSettings.globalTickMode;
            },
            render: true
        });

        this.toggleScalingControls();
    }

    toggleScalingControls() {
        const scope = this.debugRoot || document;
        const scalingControls = scope.querySelectorAll('.scaling-control');
        scalingControls.forEach((control) => {
            if (this.debugSettings.scalingEnabled) {
                control.classList.remove('hidden');
            } else {
                control.classList.add('hidden');
            }
        });
    }

    increaseValue() {
        if (this.countdownMode) return;

        // Calculate acceleration multiplier
        const accelerationMultiplier = this.calculateAcceleration('p');

        if (this.tempMode) {
            if (this.temperature >= this.maxTemp) {
                // Only trigger flash once per boundary hit
                if (!this.hasFlashedAtBoundary && !this.isFlashing) {
                    this.startFlashAnimation();
                    this.hasFlashedAtBoundary = true;
                }
                return;
            }

            // Handle animated trail movement tracking (only when actual movement occurs)
            this.handleTrailMovement('forward');

            // Reset flash boundary flag when moving away from boundary
            this.hasFlashedAtBoundary = false;

            this.lastActionTime = Date.now();
            if (!this.scalingActive) {
                this.startScalingAnimation(true);
            }
            this.scalingActive = true;

            // Apply acceleration to temperature change (base 5°F)
            const tempIncrement = 5 * accelerationMultiplier;
            this.temperature = Math.min(this.temperature + tempIncrement, this.maxTemp);
        } else {
            // For time mode, check if we can actually increase before handling trail
            if (this.totalMinutes >= this.maxMinutes) {
                // Only trigger flash once per boundary hit
                if (!this.hasFlashedAtBoundary && !this.isFlashing) {
                    this.startFlashAnimation();
                    this.hasFlashedAtBoundary = true;
                }
                return;
            }

            // Handle animated trail movement tracking (only when actual movement occurs)
            this.handleTrailMovement('forward');

            // Apply acceleration to the increase
            for (let i = 0; i < accelerationMultiplier; i++) {
                this.increaseTime();
            }
        }
        this.render();
    }

    decreaseValue() {
        if (this.countdownMode) return;

        // Calculate acceleration multiplier
        const accelerationMultiplier = this.calculateAcceleration('o');

        if (this.tempMode) {
            if (this.temperature <= this.minTemp) {
                // Only trigger flash once per boundary hit
                if (!this.hasFlashedAtBoundary && !this.isFlashing) {
                    this.startFlashAnimation();
                    this.hasFlashedAtBoundary = true;
                }
                return;
            }

            // Handle animated trail movement tracking (only when actual movement occurs)
            this.handleTrailMovement('backward');

            // Reset flash boundary flag when moving away from boundary
            this.hasFlashedAtBoundary = false;

            this.lastActionTime = Date.now();
            if (!this.scalingActive) {
                this.startScalingAnimation(true);
            }
            this.scalingActive = true;

            // Apply acceleration to temperature change (base 5°F)
            const tempDecrement = 5 * accelerationMultiplier;
            this.temperature = Math.max(this.temperature - tempDecrement, this.minTemp);
        } else {
            // For time mode, check if we can actually decrease before handling trail
            if (this.totalMinutes <= 1) {
                // Only trigger flash once per boundary hit
                if (!this.hasFlashedAtBoundary && !this.isFlashing) {
                    this.startFlashAnimation();
                    this.hasFlashedAtBoundary = true;
                }
                return;
            }

            // Handle animated trail movement tracking (only when actual movement occurs)
            this.handleTrailMovement('backward');

            // Apply acceleration to the decrease
            for (let i = 0; i < accelerationMultiplier; i++) {
                this.decreaseTime();
            }
        }
        this.render();
    }


    toggleMode() {
        if (this.countdownMode) return;
        this.tempMode = !this.tempMode;
        this.render();
    }

    startCooking() {
        if (this.countdownMode) return;
        this.startRingFillAnimation();
    }

    startScalingAnimation(toActive) {
        this.animationStartTime = Date.now();
        this.animatingToState = toActive ? 'active' : 'inactive';
        this.animateTransition();
    }

    startFlashAnimation() {
        this.isFlashing = true;
        this.flashStartTime = Date.now();
        this.flashCount = 0;
        this.flashVisible = true;
        this.animateFlash();
    }

    animateFlash() {
        if (!this.isFlashing) return;

        const currentTime = Date.now();
        const elapsed = currentTime - this.flashStartTime;
        const flashDuration = this.debugSettings.flashDuration; // ms per flash (on/off cycle)
        const totalFlashes = this.debugSettings.flashCount;

        // Calculate current flash cycle
        const flashCycle = Math.floor(elapsed / flashDuration);

        if (flashCycle >= totalFlashes * 2) {
            // Animation complete
            this.isFlashing = false;
            this.flashVisible = true;
            this.render();
            return;
        }

        // Toggle visibility every flash duration
        this.flashVisible = (flashCycle % 2 === 0);
        this.render();

        requestAnimationFrame(() => this.animateFlash());
    }

    animateTransition() {
        const currentTime = Date.now();
        const elapsed = currentTime - this.animationStartTime;
        const progress = Math.min(elapsed / this.animationDuration, 1);

        // Ease function
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        this.animationProgress = easeProgress;
        this.render();

        if (progress < 1) {
            requestAnimationFrame(() => this.animateTransition());
        } else {
            this.animationStartTime = null;
            this.animatingToState = null;
            this.animationProgress = null;
        }
    }

    startTrailDirectionAnimation(targetDirection) {
        // Don't start animation if already at target
        if (this.trailDirection === targetDirection) return;

        // Don't start animation if at or near boundaries (to prevent glitches)
        const trailThreshold = 0.2; // 20% threshold for trail interference

        if (this.tempMode) {
            const tempRange = this.maxTemp - this.minTemp;
            const tempThresholdRange = tempRange * trailThreshold;
            const nearMinTemp = this.temperature <= (this.minTemp + tempThresholdRange);
            const nearMaxTemp = this.temperature >= (this.maxTemp - tempThresholdRange);

            if (nearMinTemp || nearMaxTemp) {
                // Near boundary - just set direction immediately without animation
                this.trailDirection = targetDirection;
                this.trailDirectionTarget = targetDirection;
                this.render();
                return;
            }
        } else {
            // For time mode, check both phase A and B boundaries
            if (this.totalMinutes <= 60) {
                // Phase A: check if near 1 minute or 60 minutes
                const phaseARange = 59; // 1 to 60 minutes
                const timeThresholdRange = phaseARange * trailThreshold;
                const nearMinTime = this.totalMinutes <= (1 + timeThresholdRange);
                const nearPhaseTransition = this.totalMinutes >= (60 - timeThresholdRange);

                if (nearMinTime || nearPhaseTransition) {
                    this.trailDirection = targetDirection;
                    this.trailDirectionTarget = targetDirection;
                    this.render();
                    return;
                }
            } else {
                // Phase B: check if near phase transition or max time
                const phaseBRange = this.maxMinutes - 60;
                const timeThresholdRange = phaseBRange * trailThreshold;
                const nearPhaseTransition = this.totalMinutes <= (60 + timeThresholdRange);
                const nearMaxTime = this.totalMinutes >= (this.maxMinutes - timeThresholdRange);

                if (nearPhaseTransition || nearMaxTime) {
                    this.trailDirection = targetDirection;
                    this.trailDirectionTarget = targetDirection;
                    this.render();
                    return;
                }
            }
        }

        this.trailDirectionTarget = targetDirection;
        this.trailDirectionAnimationStart = Date.now();
        this.animateTrailDirection();
    }

    animateTrailDirection() {
        if (!this.trailDirectionAnimationStart) return;

        const currentTime = Date.now();
        const elapsed = currentTime - this.trailDirectionAnimationStart;
        const progress = Math.min(elapsed / this.trailDirectionAnimationDuration, 1);

        // Ease function for smooth transition
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        this.render();

        if (progress < 1) {
            requestAnimationFrame(() => this.animateTrailDirection());
        } else {
            // Animation complete - set final direction
            this.trailDirection = this.trailDirectionTarget;
            this.trailDirectionAnimationStart = null;
            this.render();
        }
    }

    startUpdateLoop() {
        setInterval(() => {
            if (!this.debugSettings.autoReset) return;

            const timeSinceLastAction = Date.now() - this.lastActionTime;
            const wasScalingActive = this.scalingActive;

            if (timeSinceLastAction > (this.debugSettings.resetDelay * 1000)) {
                if (this.scalingActive) {
                    this.startScalingAnimation(false);
                }
                this.scalingActive = false;
            }

            // Update animated trail
            this.updateAnimatedTrail();

            // Re-render if trail animations are active
            if (this.debugSettings.trailMode === 'animated' && 
                (this.trailCatchUpAnimation || this.trailFlowOutAnimation)) {
                this.render();
            }
        }, 100); // Check every 100ms

        // Countdown update loop
        setInterval(() => {
            if (this.countdownMode) {
                this.updateCountdown();
            }
        }, 100); // Update countdown every 100ms

        // Preheat flash loop
        setInterval(() => {
            if (this.countdownMode && this.preheatPhase) {
                this.preheatFlashState = !this.preheatFlashState;
                this.render();
            }
        }, 600); // Flash every 600ms
    }

    formatTime() {
        if (this.totalMinutes < 60) {
            // Phase A: Show minutes as M:00 (1:00, 2:00, etc.)
            return `${this.totalMinutes}:00`;
        } else {
            // Phase B: Show hours and minutes as H:MM
            const hours = Math.floor(this.totalMinutes / 60);
            const minutes = this.totalMinutes % 60;
            return `${hours}:${minutes.toString().padStart(2, '0')}`;
        }
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, 320, 320);

        if (this.cookingComplete) {
            this.renderCompletionMode();
        } else if (this.ringFillAnimation) {
            this.renderRingFillAnimation();
        } else if (this.countdownMode) {
            this.renderCountdownMode();
        } else {
            if (this.tempMode) {
                this.renderTemperatureMode();
            } else {
                if (this.totalMinutes < 60) {
                    this.renderPhaseA();
                } else {
                    this.renderPhaseB();
                }
            }
        }

        // Update display
        if (this.cookingComplete) {
            this.updateCompletionDisplay();
        } else if (this.ringFillAnimation) {
            this.updateStartingDisplay();
        } else if (this.countdownMode) {
            this.updateCountdownDisplay();
        } else {
            this.updateSetupDisplay();
        }
    }

    updateSetupDisplay() {
        // Hide cooking status and completion buttons during setup
        this.cookingStatus.style.display = 'none';
        this.completionButtons.style.display = 'none';

        // Determine label text based on phase
        const labelText = this.totalMinutes < 60 ? 'MIN - SEC' : 'HR - MIN';

        if (this.tempMode) {
            // Temperature mode: temperature is active, time is inactive
            this.tempDisplay.querySelector('.temp-number').textContent = this.temperature;
            this.tempDisplay.className = 'temp-display active';
            // Apply flash visibility to temperature display
            this.tempDisplay.style.opacity = (this.isFlashing && !this.flashVisible) ? '0' : '1';

            this.timeDisplayMain.textContent = this.formatTime();
            this.timeDisplayMain.className = 'time-display-main inactive';
            this.modeLabel.textContent = labelText;
            this.modeLabel.style.color = 'var(--text-tertiary)';
            this.modeLabel.style.opacity = 1.0;
        } else {
            // Time mode: time is active, temperature is inactive
            this.tempDisplay.querySelector('.temp-number').textContent = this.temperature;
            this.tempDisplay.className = 'temp-display inactive';
            this.timeDisplayMain.textContent = this.formatTime();
            this.timeDisplayMain.className = 'time-display-main active';
            // Apply flash visibility to time display
            this.timeDisplayMain.style.opacity = (this.isFlashing && !this.flashVisible) ? '0' : '1';

            this.modeLabel.textContent = labelText;
            this.modeLabel.style.color = 'var(--text-primary)';
            this.modeLabel.style.opacity = 1.0;
        }
    }

    updateStartingDisplay() {
        // Hide completion buttons during starting
        this.completionButtons.style.display = 'none';
        // Show cooking status during starting animation
        this.cookingStatus.style.display = 'block';
        this.cookingStatus.style.opacity = 1.0;
        this.cookingStatus.textContent = this.debugSettings.preheatEnabled ? 'Preheating...' : 'Actively cooking';

        this.tempDisplay.querySelector('.temp-number').textContent = this.temperature;
        this.tempDisplay.className = 'temp-display inactive';
        this.timeDisplayMain.textContent = this.formatTime();
        this.timeDisplayMain.className = 'time-display-main active';

        // Show appropriate time label below
        this.modeLabel.textContent = this.totalMinutes < 60 ? 'MIN - SEC' : 'HR - MIN';
        this.modeLabel.style.color = 'var(--text-tertiary)';
        this.modeLabel.style.opacity = 1.0;
    }

    updateCountdownDisplay() {
        // Hide completion buttons during cooking
        this.completionButtons.style.display = 'none';
        // Show cooking status above circle
        this.cookingStatus.style.display = 'block';

        if (this.preheatPhase && this.debugSettings.preheatEnabled) {
            // During preheat: show temperature and time set
            this.tempDisplay.querySelector('.temp-number').textContent = this.temperature;
            this.tempDisplay.className = 'temp-display inactive';
            this.timeDisplayMain.textContent = this.formatTime();
            this.timeDisplayMain.className = 'time-display-main active';

            // Flash the cooking status above circle
            const labelOpacity = this.preheatFlashState ? 1.0 : 0.25;
            this.cookingStatus.style.opacity = labelOpacity;
            this.cookingStatus.textContent = 'Preheating...';

            // Keep original label below (HR-MIN since we're in phase B during cooking)
            this.modeLabel.textContent = this.totalMinutes < 60 ? 'MIN - SEC' : 'HR - MIN';
            this.modeLabel.style.color = 'var(--text-tertiary)';
            this.modeLabel.style.opacity = 1.0;
        } else {
            // During cooking: show countdown with temperature
            this.tempDisplay.querySelector('.temp-number').textContent = this.temperature;
            this.tempDisplay.className = 'temp-display inactive';
            const { minutes, seconds } = this.getCurrentCountdownTime();

            // Format time like 1:15 for 1hr 15min, 59:00 for 59min
            const totalMinutesLeft = minutes;
            const isUnderOneHour = totalMinutesLeft < 60;

            if (isUnderOneHour) {
                // Show as MM:SS format for under 1 hour
                this.timeDisplayMain.textContent = `${totalMinutesLeft.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else {
                // Show as H:MM format for 1+ hours
                const hours = Math.floor(totalMinutesLeft / 60);
                const mins = totalMinutesLeft % 60;
                this.timeDisplayMain.textContent = `${hours}:${mins.toString().padStart(2, '0')}`;
            }

            this.timeDisplayMain.className = 'time-display-main active';

            // Show "Actively cooking" above circle
            this.cookingStatus.style.opacity = 1.0;
            this.cookingStatus.textContent = 'Actively cooking';

            // Show appropriate label below based on time remaining
            this.modeLabel.textContent = isUnderOneHour ? 'MIN - SEC' : 'HR - MIN';
            this.modeLabel.style.color = 'var(--text-tertiary)';
            this.modeLabel.style.opacity = 1.0;
        }
    }

    renderTemperatureMode() {
        // Calculate temperature progress and current tick based on global tick mode
        const totalTempTicks = this.getTickCountForMode('tempMode');
        const tempRange = this.maxTemp - this.minTemp; // 180 degrees

        let currentTempTick, filledTempTicks, tempIncrement;

        if (this.debugSettings.globalTickMode === '72-ticks' || this.debugSettings.globalTickMode === '72-continuous') {
            // In both 72-ticks and 72-continuous modes, we loop through the temperature range
            tempIncrement = tempRange / 72;
            const tempProgress = (this.temperature - this.minTemp) % tempRange;
            currentTempTick = Math.round(tempProgress / tempIncrement);
            filledTempTicks = Math.floor((this.temperature - this.minTemp) / tempIncrement) + 1;
        } else {
            // Default mode
            tempIncrement = tempRange / DEFAULT_TEMP_TICK_COUNT;
            currentTempTick = Math.round((this.temperature - this.minTemp) / tempIncrement);
            filledTempTicks = currentTempTick + 1;
        }

        for (let i = 0; i < totalTempTicks; i++) {
            const angle = (i * (360 / totalTempTicks) - 90) * Math.PI / 180;
            const isFilled = i < filledTempTicks;
            const isCurrent = i === currentTempTick;

            // Calculate proximity to current tick for gradual sizing
            const lengthMultiplier = this.getTickLengthMultiplier(i, currentTempTick, totalTempTicks);

            this.drawTick(angle, isFilled, isCurrent, false, lengthMultiplier, false, 0, i, currentTempTick, totalTempTicks);
        }
    }

    renderRingFillAnimation() {
        const elapsed = Date.now() - this.ringFillStartTime;
        const progress = Math.min(elapsed / this.ringFillDuration, 1);

        // Ease-out animation for smoother filling
        const easeProgress = 1 - Math.pow(1 - progress, 2);

        // Calculate gap and segments like in countdown mode
        const mainGapAngle = (this.debugSettings.gapAngle * Math.PI) / 180;
        const preheatGapAngle = this.debugSettings.preheatEnabled ? (10 * Math.PI) / 180 : 0;
        const totalGapsAngle = mainGapAngle + preheatGapAngle;
        const availableAngle = 2 * Math.PI - totalGapsAngle;

        const topCenter = -Math.PI / 2;

        if (this.debugSettings.preheatEnabled) {
            const preheatPercentage = 0.25;
            const cookingPercentage = 0.75;
            const preheatAngle = availableAngle * preheatPercentage;
            const cookingAngle = availableAngle * cookingPercentage;

            const preheatStartAngle = topCenter - mainGapAngle / 2;
            const preheatEndAngle = preheatStartAngle - preheatAngle;
            const cookingStartAngle = preheatEndAngle - preheatGapAngle;
            const cookingEndAngle = cookingStartAngle - cookingAngle;

            // Draw background segments
            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, this.radius, preheatEndAngle, preheatStartAngle);
            this.ctx.strokeStyle = '#5a060a';
            this.ctx.lineWidth = 20;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, this.radius, cookingEndAngle, cookingStartAngle);
            this.ctx.strokeStyle = '#5a060a';
            this.ctx.lineWidth = 20;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();

            // Draw animated fill
            const totalFillAngle = preheatAngle + cookingAngle;
            const currentFillAngle = totalFillAngle * easeProgress;

            if (currentFillAngle > 0) {
                if (currentFillAngle <= preheatAngle) {
                    // Filling preheat segment
                    const fillEndAngle = preheatStartAngle - currentFillAngle;
                    this.ctx.beginPath();
                    this.ctx.arc(this.centerX, this.centerY, this.radius, fillEndAngle, preheatStartAngle);
                    this.ctx.strokeStyle = '#FA4947';
                    this.ctx.lineWidth = 20;
                    this.ctx.lineCap = 'round';
                    this.ctx.stroke();
                } else {
                    // Preheat full, filling cooking segment
                    this.ctx.beginPath();
                    this.ctx.arc(this.centerX, this.centerY, this.radius, preheatEndAngle, preheatStartAngle);
                    this.ctx.strokeStyle = '#FA4947';
                    this.ctx.lineWidth = 20;
                    this.ctx.lineCap = 'round';
                    this.ctx.stroke();

                    const cookingFillAngle = currentFillAngle - preheatAngle;
                    const cookingFillEndAngle = cookingStartAngle - cookingFillAngle;
                    this.ctx.beginPath();
                    this.ctx.arc(this.centerX, this.centerY, this.radius, cookingFillEndAngle, cookingStartAngle);
                    this.ctx.strokeStyle = '#FA4947';
                    this.ctx.lineWidth = 20;
                    this.ctx.lineCap = 'round';
                    this.ctx.stroke();
                }
            }
        } else {
            // No preheat: simple fill animation
            const startAngle = topCenter + mainGapAngle / 2;
            const endAngle = startAngle + availableAngle;

            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, this.radius, startAngle, endAngle);
            this.ctx.strokeStyle = '#5a060a';
            this.ctx.lineWidth = 20;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();

            if (easeProgress > 0) {
                const fillAngle = availableAngle * easeProgress;
                const fillEndAngle = startAngle + fillAngle;

                this.ctx.beginPath();
                this.ctx.arc(this.centerX, this.centerY, this.radius, startAngle, fillEndAngle);
                this.ctx.strokeStyle = '#FA4947';
                this.ctx.lineWidth = 20;
                this.ctx.lineCap = 'round';
                this.ctx.stroke();
            }
        }
    }

    renderCountdownMode() {
        if (this.countdownDuration === 0) return;

        const elapsed = this.countdownStartTime ? (Date.now() - this.countdownStartTime) / 1000 : 0;

        // Calculate gap size (in radians) from debug settings
        const mainGapAngle = (this.debugSettings.gapAngle * Math.PI) / 180;
        const preheatGapAngle = this.debugSettings.preheatEnabled ? (10 * Math.PI) / 180 : 0; // 10% gap after preheat
        const totalGapsAngle = mainGapAngle + preheatGapAngle;
        const availableAngle = 2 * Math.PI - totalGapsAngle;

        // Calculate preheat and cooking segments
        const preheatPercentage = this.debugSettings.preheatEnabled ? 0.25 : 0; // 25% for preheat
        const cookingPercentage = 1 - preheatPercentage;

        const preheatAngle = availableAngle * preheatPercentage;
        const cookingAngle = availableAngle * cookingPercentage;

        // Main gap is centered at top: preheat starts after gap and goes counter-clockwise (left)
        const topCenter = -Math.PI / 2;
        const preheatStartAngle = topCenter - mainGapAngle / 2; // Start before main gap (left side)
        const preheatEndAngle = preheatStartAngle - preheatAngle; // Go further counter-clockwise (left)

        // Secondary gap and cooking segment start
        const cookingStartAngle = preheatEndAngle - preheatGapAngle;
        const cookingEndAngle = cookingStartAngle - cookingAngle;

        if (this.debugSettings.preheatEnabled) {
            // Draw preheat segment background (dark red)
            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, this.radius, preheatEndAngle, preheatStartAngle);
            this.ctx.strokeStyle = '#5a060a';
            this.ctx.lineWidth = 20;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();

            // Draw cooking segment background (dark red)
            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, this.radius, cookingEndAngle, cookingStartAngle);
            this.ctx.strokeStyle = '#5a060a';
            this.ctx.lineWidth = 20;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();

            if (this.preheatPhase) {
                // During preheat: unfill preheat segment CLOCKWISE (from left to right, like in the image)
                const preheatProgress = Math.min(elapsed / 10, 1); // 10 seconds preheat
                const remainingPreheatProgress = 1 - preheatProgress; // How much is left
                const remainingPreheatAngle = preheatAngle * remainingPreheatProgress;

                if (remainingPreheatAngle > 0) {
                    // Draw from the END, keeping the right portion (near the gap)
                    const currentPreheatStartAngle = preheatEndAngle + remainingPreheatAngle;
                    this.ctx.beginPath();
                    this.ctx.arc(this.centerX, this.centerY, this.radius, preheatEndAngle, currentPreheatStartAngle);
                    this.ctx.strokeStyle = '#FA4947';
                    this.ctx.lineWidth = 20;
                    this.ctx.lineCap = 'round';
                    this.ctx.stroke();
                }

                // Keep cooking segment full during preheat
                this.ctx.beginPath();
                this.ctx.arc(this.centerX, this.centerY, this.radius, cookingEndAngle, cookingStartAngle);
                this.ctx.strokeStyle = '#FA4947';
                this.ctx.lineWidth = 20;
                this.ctx.lineCap = 'round';
                this.ctx.stroke();
            } else {
                // During cooking: cooking segment unfills CLOCKWISE (same direction as preheat)
                const cookingProgress = 1 - Math.min(elapsed / this.countdownDuration, 1);
                const remainingCookingAngle = cookingAngle * cookingProgress;

                if (remainingCookingAngle > 0) {
                    // Draw from the END, keeping the right portion (clockwise unfilling)
                    const currentCookingStartAngle = cookingEndAngle + remainingCookingAngle;
                    this.ctx.beginPath();
                    this.ctx.arc(this.centerX, this.centerY, this.radius, cookingEndAngle, currentCookingStartAngle);
                    this.ctx.strokeStyle = '#FA4947';
                    this.ctx.lineWidth = 20;
                    this.ctx.lineCap = 'round';
                    this.ctx.stroke();
                }
            }
        } else {
            // No preheat: standard behavior - starts from top and goes clockwise
            const remaining = Math.max(0, this.countdownDuration - elapsed);
            const progress = 1 - Math.min(elapsed / this.countdownDuration, 1);

            const startAngle = topCenter + mainGapAngle / 2;
            const endAngle = startAngle + availableAngle;

            // Draw dark red background ring
            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, this.radius, startAngle, endAngle);
            this.ctx.strokeStyle = '#5a060a';
            this.ctx.lineWidth = 20;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();

            // Draw bright red progress ring
            if (progress > 0) {
                const progressAngle = progress * availableAngle;
                const progressEndAngle = startAngle + progressAngle;

                this.ctx.beginPath();
                this.ctx.arc(this.centerX, this.centerY, this.radius, startAngle, progressEndAngle);
                this.ctx.strokeStyle = '#FA4947';
                this.ctx.lineWidth = 20;
                this.ctx.lineCap = 'round';
                this.ctx.stroke();
            }
        }
    }

    renderPhaseA() {
        const totalTicks = this.getTickCountForMode('phaseA');

        let filledTicks, currentTickIndex;

        if (this.debugSettings.globalTickMode === '72-ticks') {
            // In 72-ticks mode, map 1-59 minutes to 72 ticks with looping
            const minuteProgress = Math.max(1, Math.min(this.totalMinutes, 59));
            filledTicks = Math.ceil(minuteProgress * 72 / 59);
            currentTickIndex = filledTicks - 1;
        } else if (this.debugSettings.globalTickMode === '72-continuous') {
            // In 72-continuous mode, use first 59 ticks for minutes 1-59 (1:1 mapping)
            const minuteProgress = Math.max(1, Math.min(this.totalMinutes, 59));
            filledTicks = minuteProgress;
            currentTickIndex = filledTicks - 1;
        } else {
            // Default mode - 59 ticks for minutes 1-59
            filledTicks = Math.max(1, Math.min(this.totalMinutes, 59)); 
            currentTickIndex = filledTicks - 1;
        }

        for (let i = 0; i < totalTicks; i++) {
            const angle = (i * (360 / totalTicks) - 90) * Math.PI / 180;
            const isFilled = i < filledTicks;
            const isCurrent = i === currentTickIndex;

            // Calculate proximity to current tick for gradual sizing
            const lengthMultiplier = this.getTickLengthMultiplier(i, currentTickIndex, totalTicks);

            this.drawTick(angle, isFilled, isCurrent, false, lengthMultiplier, false, 0, i, currentTickIndex, totalTicks);
        }
    }

    renderPhaseB() {
        if (this.debugSettings.tickMode === 'hourly') {
            this.renderPhaseBHourly();
        } else if (this.debugSettings.tickMode === 'wrap') {
            this.renderPhaseBWrap();
        } else {
            this.renderPhaseB15Min();
        }
    }

    renderPhaseB15Min() {
        const totalTicks = this.getTickCountForMode('phaseB15Min');
        const minutesInPhaseB = this.totalMinutes - 60;
        const ticksInPhaseB = Math.max(1, Math.floor(minutesInPhaseB / 15) + 1); // +1 for 1:00 tick, always at least 1
        const currentTickIndex = ticksInPhaseB - 1;

        for (let i = 0; i < totalTicks; i++) {
            const angle = (i * (360 / totalTicks) - 90) * Math.PI / 180;
            const isFilled = i < ticksInPhaseB;
            const isCurrent = i === currentTickIndex;

            const lengthMultiplier = this.getTickLengthMultiplier(i, currentTickIndex, totalTicks);

            this.drawTick(angle, isFilled, isCurrent, true, lengthMultiplier, false, 0, i, currentTickIndex, totalTicks);
        }
    }

    renderPhaseBWrap() {
        const totalTicks = this.getTickCountForMode('phaseBWrap');
        const minutesInPhaseB = this.totalMinutes - 60;

        let currentLap, ticksInCurrentLap, currentTickIndex, incrementsCompleted;

        if (this.debugSettings.globalTickMode === '72-continuous') {
            // In 72-continuous mode, continue from tick 59, then wrap after tick 72
            incrementsCompleted = Math.floor(minutesInPhaseB / 15) + 1; // +1 to start with 1 increment at 1:00
            const maxContinuousSlots = 13; // Ticks 60-72 = 13 slots for 15-minute increments

            if (incrementsCompleted <= maxContinuousSlots) {
                // First 13 increments: continue from minutes to ticks 60-72
                currentLap = 0; // Still on the "continuous" progression
                currentTickIndex = 59 + (incrementsCompleted - 1); // 1st increment -> index 59 (tick 60)
                ticksInCurrentLap = 59 + incrementsCompleted; // Fill minute ticks + increment ticks
            } else {
                // After 13 increments, start wrapping from tick 0
                const wrappedIncrements = incrementsCompleted - maxContinuousSlots;
                currentLap = Math.floor((wrappedIncrements - 1) / totalTicks) + 1; // Start lap counting from 1
                ticksInCurrentLap = ((wrappedIncrements - 1) % totalTicks) + 1; // 1-72
                currentTickIndex = ticksInCurrentLap - 1; // 0-71
            }
        } else {
            // Default wrap mode logic
            // Each increment is 15 minutes
            // At 60 min (1:00), we want the first tick filled
            // At 75 min (1:15), we want the second tick filled, etc.
            incrementsCompleted = Math.floor(minutesInPhaseB / 15) + 1; // +1 to start with 1 tick at 1:00
            currentLap = Math.floor((incrementsCompleted - 1) / totalTicks); // Adjust for the +1
            ticksInCurrentLap = ((incrementsCompleted - 1) % totalTicks) + 1; // Always 1-72
            currentTickIndex = ticksInCurrentLap - 1;
        }

        for (let i = 0; i < totalTicks; i++) {
            const angle = (i * (360 / totalTicks) - 90) * Math.PI / 180;

            let isFilled, showAsGray;

            if (this.debugSettings.globalTickMode === '72-continuous') {
                if (currentLap === 0) {
                    // Still in continuous mode: show filled up to current position
                    isFilled = i < ticksInCurrentLap;
                    showAsGray = false; // No gray ticks in continuous mode
                } else {
                    // In wrap mode after continuous: normal wrap behavior
                    isFilled = i < ticksInCurrentLap;
                    showAsGray = currentLap > 1 && i >= ticksInCurrentLap; // Show gray for previous laps
                }
            } else {
                // Default wrap mode logic
                isFilled = i < ticksInCurrentLap;
                showAsGray = currentLap > 0 && i >= ticksInCurrentLap;
            }

            const isCurrent = i === currentTickIndex;
            const lengthMultiplier = this.getTickLengthMultiplier(i, currentTickIndex, totalTicks);
            this.drawWrapTick(angle, isFilled, isCurrent, currentLap, lengthMultiplier, showAsGray, i, currentTickIndex, totalTicks);
        }
    }

    renderPhaseBHourly() {
        const totalTicks = this.getTickCountForMode('phaseBHourly');
        const minutesInPhaseB = this.totalMinutes - 60;

        let hoursCompleted, currentTickIndex, filledTicks;

        if (this.debugSettings.globalTickMode === '72-ticks') {
            // In 72-ticks mode, loop through the max time range
            const maxHours = 72; // Maximum hours in Phase B
            const hourProgress = Math.floor(minutesInPhaseB / 60) % maxHours;
            hoursCompleted = Math.max(1, hourProgress + 1);
            currentTickIndex = (hoursCompleted - 1) % 72;
            filledTicks = hoursCompleted;
        } else if (this.debugSettings.globalTickMode === '72-continuous') {
            // In 72-continuous mode, continue seamlessly from minutes to hours
            // At 1:00 (totalMinutes = 60), we want to be at tick 60 (index 59)
            // At 2:00 (totalMinutes = 120), we want to be at tick 61 (index 60), etc.

            const hoursFromStart = Math.floor(this.totalMinutes / 60); // 1, 2, 3, etc.
            const maxAvailableHours = 13; // Ticks 60-72 = 13 slots

            if (hoursFromStart > maxAvailableHours) {
                // Loop when exceeding available slots
                const loopedHour = ((hoursFromStart - 1) % maxAvailableHours) + 1;
                currentTickIndex = 58 + loopedHour; // 58 + 1 = 59 (tick 60)
                filledTicks = 72; // Show all ticks filled when looping
            } else {
                // Direct mapping: 1:00 -> tick 60 (index 59), 2:00 -> tick 61 (index 60), etc.
                currentTickIndex = 59 + (hoursFromStart - 1); // 59 + 0 = 59 (tick 60)
                filledTicks = 59 + hoursFromStart; // All minute ticks + hour ticks
            }
        } else {
            // Default mode
            hoursCompleted = Math.max(1, Math.floor(minutesInPhaseB / 60) + 1); 
            currentTickIndex = hoursCompleted - 1;
            filledTicks = hoursCompleted;
        }

        // Calculate progress within current hour for next tick animation
        const minutesInCurrentHour = minutesInPhaseB % 60;
        const hourProgress = minutesInCurrentHour / 60; // 0 to 1

        for (let i = 0; i < totalTicks; i++) {
            const angle = (i * (360 / totalTicks) - 90) * Math.PI / 180;

            let isFilled;
            if (this.debugSettings.globalTickMode === '72-continuous') {
                // In continuous mode: fill first 59 ticks (minutes) + hour ticks
                isFilled = i < filledTicks;
            } else {
                isFilled = i < hoursCompleted;
            }

            const isCurrent = i === currentTickIndex;
            const isNext = i === currentTickIndex + 1 && currentTickIndex + 1 < totalTicks;

            const lengthMultiplier = this.getTickLengthMultiplier(i, currentTickIndex, totalTicks);

            this.drawTick(angle, isFilled, isCurrent, true, lengthMultiplier, isNext, hourProgress, i, currentTickIndex, totalTicks);
        }
    }

    // Helper methods to get tick counts based on global tick mode setting
    getTickCountForMode(mode) {
        if (this.debugSettings.globalTickMode === '72-ticks') {
            return 72; // All modes use 72 ticks
        }

        if (this.debugSettings.globalTickMode === '72-continuous') {
            // 72-continuous mode uses 72 ticks for all modes but with different logic
            return 72;
        }

        // Default mode - use original tick counts
        switch(mode) {
            case 'phaseA': return 59; // Minute mode (1-59 minutes)
            case 'tempMode': return DEFAULT_TEMP_TICK_COUNT + 1; // Temperature + 1 for endpoint
            case 'phaseBHourly': return 72; // Hourly mode
            case 'phaseBWrap': return 72; // Wrap mode  
            case 'phaseB15Min': return 285; // 15-minute mode (71 hours * 4 + 1)
            default: return 72;
        }
    }

    restart() {
        // Reset all values to initial defaults
        this.totalMinutes = 10; // Start with 10 minutes
        this.temperature = 400; // Start with 400°F
        this.tempMode = true; // Start in temperature mode

        // Reset timer and scaling properties
        this.lastActionTime = Date.now();
        this.scalingActive = false;

        // Reset acceleration properties
        this.keyPressHistory = [];
        this.accelerationMultiplier = 1;
        this.rapidMode = false;
        this.lastKeyPressed = null;

        // Reset animated trail properties
        this.movementDirection = null;
        this.isMoving = false;
        this.trailLength = 0;
        this.currentTrailLength = 0;
        this.trailCatchUpAnimation = false;
        this.trailFlowOutAnimation = false;

        // Reset trail direction and animation
        this.trailDirection = 'normal';
        this.trailDirectionTarget = 'normal';
        this.trailDirectionAnimationStart = null;

        // Reset animation properties
        this.animationStartTime = null;
        this.animatingToState = null;
        this.animationProgress = null;
        this.previousMultipliers = new Map();

        // Reset ring fill animation properties
        this.ringFillAnimation = false;
        this.ringFillStartTime = null;

        // Reset countdown mode properties
        this.countdownMode = false;
        this.countdownStartTime = null;
        this.countdownDuration = 0;
        this.colonBlinkState = true;
        this.preheatPhase = false;
        this.preheatFlashState = true;

        // Reset completion state
        this.cookingComplete = false;
        this.selectedButton = 0;

        // Reset flash animation
        this.isFlashing = false;
        this.flashStartTime = null;
        this.flashCount = 0;
        this.flashVisible = true;
        this.hasFlashedAtBoundary = false;

        this.render();
    }

    navigateButtons(direction) {
        this.selectedButton = (this.selectedButton + direction + 2) % 2; // Keep in range 0-1
        this.updateButtonSelection();
    }

    updateButtonSelection() {
        this.bitMoreBtn.classList.toggle('active', this.selectedButton === 0);
        this.keepWarmBtn.classList.toggle('active', this.selectedButton === 1);
    }

    renderCompletionMode() {
        // Draw a full green circle
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius, 0, 2 * Math.PI);
        this.ctx.strokeStyle = '#2BB671';
        this.ctx.lineWidth = 20;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();
    }

    updateCompletionDisplay() {
        // Hide cooking status
        this.cookingStatus.style.display = 'none';

        // Show completion buttons
        this.completionButtons.style.display = 'flex';

        // Update display content
        this.tempDisplay.querySelector('.temp-number').textContent = this.temperature;
        this.tempDisplay.className = 'temp-display inactive';
        this.timeDisplayMain.textContent = '00:00';
        this.timeDisplayMain.className = 'time-display-main active';

        // Change label to "Enjoy"
        this.modeLabel.textContent = 'Enjoy';
        this.modeLabel.style.color = '#2BB671';
        this.modeLabel.style.opacity = 1.0;

        // Update button selection
        this.updateButtonSelection();
    }

    increaseTime() {
        if (this.totalMinutes >= this.maxMinutes) {
            // Only trigger flash once per boundary hit
            if (!this.hasFlashedAtBoundary && !this.isFlashing) {
                this.startFlashAnimation();
                this.hasFlashedAtBoundary = true;
            }
            return;
        }

        // Reset flash boundary flag when moving away from boundary
        this.hasFlashedAtBoundary = false;

        this.lastActionTime = Date.now();
        if (!this.scalingActive) {
            this.startScalingAnimation(true);
        }
        this.scalingActive = true;

        if (this.totalMinutes < 60) {
            this.totalMinutes += 1;
        } else {
            this.totalMinutes = Math.min(this.totalMinutes + 15, this.maxMinutes);
        }

        this.render();
    }

    decreaseTime() {
        if (this.totalMinutes <= 1) {
            // Only trigger flash once per boundary hit
            if (!this.hasFlashedAtBoundary && !this.isFlashing) {
                this.startFlashAnimation();
                this.hasFlashedAtBoundary = true;
            }
            return;
        }

        // Reset flash boundary flag when moving away from boundary
        this.hasFlashedAtBoundary = false;

        this.lastActionTime = Date.now();
        if (!this.scalingActive) {
            this.startScalingAnimation(true);
        }
        this.scalingActive = true;

        if (this.totalMinutes <= 60) {
            this.totalMinutes = Math.max(this.totalMinutes - 1, 1); // Stop at 1 minute
        } else {
            this.totalMinutes = Math.max(this.totalMinutes - 15, 60);
            if (this.totalMinutes === 60) {
                this.totalMinutes = 59;
            }
        }

        this.render();
    }

    startRingFillAnimation() {
        this.ringFillAnimation = true;
        this.ringFillStartTime = Date.now();
        this.animateRingFill();
    }

    animateRingFill() {
        const currentTime = Date.now();
        const elapsed = currentTime - this.ringFillStartTime;
        const progress = Math.min(elapsed / this.ringFillDuration, 1);

        this.render();

        if (progress < 1) {
            requestAnimationFrame(() => this.animateRingFill());
        } else {
            // Animation complete, start actual countdown
            this.ringFillAnimation = false;
            this.countdownMode = true;
            this.countdownDuration = this.totalMinutes * 60;
            this.countdownStartTime = Date.now();
            this.colonBlinkState = true;
            this.preheatFlashState = true;
            this.preheatPhase = this.debugSettings.preheatEnabled;
            this.render();
        }
    }

    updateCountdown() {
        if (!this.countdownMode || this.countdownStartTime === null) return;

        const elapsed = (Date.now() - this.countdownStartTime) / 1000; // seconds

        // Handle preheat phase (10 seconds) - only if preheat is enabled
        if (this.preheatPhase && this.debugSettings.preheatEnabled && elapsed >= 10) {
            this.preheatPhase = false;
            this.countdownStartTime = Date.now(); // Reset timer for cooking phase
            this.render();
            return;
        }

        // Handle cooking phase (or immediate cooking if no preheat)
        if (!this.preheatPhase || !this.debugSettings.preheatEnabled) {
            const remaining = Math.max(0, this.countdownDuration - elapsed);

            if (remaining <= 0) {
                // Countdown finished
                this.countdownMode = false;
                this.cookingComplete = true;
                this.totalMinutes = 0;
            }
        }

        this.render();
    }

    getCurrentCountdownTime() {
        if (!this.countdownMode || this.countdownStartTime === null) {
            return { minutes: 0, seconds: 0 };
        }

        const elapsed = (Date.now() - this.countdownStartTime) / 1000;
        const remaining = Math.max(0, this.countdownDuration - elapsed);

        const minutes = Math.floor(remaining / 60);
        const seconds = Math.floor(remaining % 60);

        return { minutes, seconds };
    }

    applyCurve(normalizedDistance) {
        // normalizedDistance is 0-1, where 0 is current tick, 1 is edge of affected radius
        switch (this.debugSettings.curve) {
            case 'linear':
                return 1 - normalizedDistance;
            case 'easeOut':
                return 1 - (normalizedDistance * normalizedDistance);
            case 'easeIn':
                return 1 - Math.sqrt(normalizedDistance);
            case 'sine':
                return Math.cos(normalizedDistance * Math.PI / 2);
            case 'exponential':
                return Math.pow(1 - normalizedDistance, 3);
            default:
                return 1 - normalizedDistance;
        }
    }

    getTickLengthMultiplier(tickIndex, currentTickIndex, totalTicks) {
        // If scaling is disabled, always return 1.0
        if (!this.debugSettings.scalingEnabled) return 1.0;

        if (currentTickIndex === -1) return 1.0; // No current tick

        // Calculate base multipliers for active state
        const affectedRadius = Math.floor(totalTicks * (this.debugSettings.radiusPercent / 100));
        let distance = Math.abs(tickIndex - currentTickIndex);
        const wrapDistance = totalTicks - distance;
        distance = Math.min(distance, wrapDistance);

        let activeMultiplier = 1.0;
        if (distance === 0) {
            activeMultiplier = this.debugSettings.currentLength;
        } else if (distance <= affectedRadius) {
            const falloffAmount = (this.debugSettings.currentLength - 1.0) * (this.debugSettings.adjacentFalloff / 100);
            const adjacentLength = this.debugSettings.currentLength - falloffAmount;
            const normalizedDistance = (distance - 1) / (affectedRadius - 1);
            const curveValue = this.applyCurve(normalizedDistance);
            const falloffRange = adjacentLength - 1.0;
            activeMultiplier = 1.0 + (falloffRange * curveValue);
        }

        // Handle auto reset and animation states
        if (!this.debugSettings.autoReset) {
            // No auto reset - use active multiplier if scaling is active, otherwise 1.0
            return this.scalingActive ? activeMultiplier : 1.0;
        }

        // Auto reset is enabled
        if (!this.scalingActive && this.animationStartTime === null) {
            return 1.0; // Inactive and not animating
        }

        if (this.scalingActive && this.animationStartTime === null) {
            return activeMultiplier; // Active and not animating
        }

        // Currently animating
        if (this.animationStartTime !== null && this.animationProgress !== null) {
            if (this.animatingToState === 'active') {
                // Animating from 1.0 to activeMultiplier
                return 1.0 + (activeMultiplier - 1.0) * this.animationProgress;
            } else {
                // Animating from activeMultiplier to 1.0
                return activeMultiplier + (1.0 - activeMultiplier) * this.animationProgress;
            }
        }

        return activeMultiplier;
    }

    drawWrapTick(angle, isFilled, isCurrent, currentLap, lengthMultiplier = 1.0, showAsGray = false, tickIndex = -1, currentTickIndex = -1, totalTicks = 0) {
        // Base tick dimensions
        const baseLength = 15;
        const actualLength = baseLength * lengthMultiplier;

        let innerRadius, outerRadius;
        const lineWidth = 3;

        // Calculate positions based on alignment
        switch (this.debugSettings.alignment) {
            case 'inward':
                innerRadius = this.radius - 5 - actualLength;
                outerRadius = this.radius - 5;
                break;
            case 'outward':
                innerRadius = this.radius - 20;
                outerRadius = this.radius - 20 + actualLength;
                break;
            case 'center':
                const centerPoint = this.radius - 12.5;
                const halfLength = actualLength / 2;
                innerRadius = centerPoint - halfLength;
                outerRadius = centerPoint + halfLength;
                break;
        }

        // Calculate positions
        const x1 = this.centerX + Math.cos(angle) * innerRadius;
        const y1 = this.centerY + Math.sin(angle) * innerRadius;
        const x2 = this.centerX + Math.cos(angle) * outerRadius;
        const y2 = this.centerY + Math.sin(angle) * outerRadius;

        // Use standard coloring system
        let strokeColor;

        // Handle animated trail mode first
        if (this.debugSettings.trailMode === 'animated' && tickIndex >= 0) {
            const trailColor = this.getAnimatedTrailColor(tickIndex, currentTickIndex, totalTicks);
            strokeColor = isCurrent ? '#FA4947' : trailColor;
        } else if (this.debugSettings.gradientColorMode === 'seamless') {
            // Seamless mode: apply gradient regardless of fill status or showAsGray
            if (isCurrent) {
                strokeColor = '#FA4947';
            } else {
                strokeColor = this.getConicGradientColor(angle, currentTickIndex, totalTicks, this.debugSettings.gradientColorMode);
            }
        } else if (showAsGray) {
            strokeColor = BASE_GRAY;
        } else if (this.debugSettings.gradientColorMode === 'standard') {
            strokeColor = isFilled ? '#FA4947' : BASE_GRAY;
        } else {
            // Regular gradient mode: only apply to filled ticks
            strokeColor = isFilled
                ? (isCurrent ? '#FA4947' : this.getConicGradientColor(angle, currentTickIndex, totalTicks, this.debugSettings.gradientColorMode))
                : BASE_GRAY;
        }

        // Draw the tick
        this.ctx.save();

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();

        this.ctx.restore();
    }

    getConicGradientColor(angle, currentTickIndex, totalTicks, mode = 'gradient') {
        // If we don't have a valid current tick, fall back to plain white for that tick only
        if (currentTickIndex < 0 || totalTicks <= 0) return 'rgb(255,255,255)';

        // Normalize: 12 o'clock = 0, increases clockwise [0, 2π)
        let normalizedAngle = (angle + Math.PI / 2) % (2 * Math.PI);
        if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;

        // Current tick position in radians, 12 o'clock = 0, clockwise
        const currentTickAngle = (currentTickIndex * 2 * Math.PI) / totalTicks;

        if (mode === 'seamless') {
            // Seamless mode: 20% gradient trail that follows the current position
            const trailLength = 2 * Math.PI * 0.2; // 20% of full circle

            // Calculate the start of the gradient trail with animation support
            const isAnimating = this.trailDirectionAnimationStart !== null;
            const currentTrailDirection = this.trailDirection;
            const targetTrailDirection = this.trailDirectionTarget;

            let animationProgress = 0;
            if (isAnimating && this.debugSettings.trailMode === 'stay') {
                const elapsed = Date.now() - this.trailDirectionAnimationStart;
                animationProgress = Math.min(elapsed / this.trailDirectionAnimationDuration, 1);
                // Ease function for smooth transition
                animationProgress = 1 - Math.pow(1 - animationProgress, 3);
            }

            const shouldRenderOpposite = this.debugSettings.trailMode === 'stay' && 
                (currentTrailDirection === 'opposite' || 
                 (isAnimating && targetTrailDirection === 'opposite'));


            // Calculate both trail positions for potential blending
            const normalTrailStart = currentTickAngle - trailLength;
            const oppositeTrailStart = currentTickAngle;

            let trailStartAngle;
            if (isAnimating && this.debugSettings.trailMode === 'stay') {
                // Animate between normal and opposite positions
                if (currentTrailDirection === 'normal' && targetTrailDirection === 'opposite') {
                    // Animating from normal to opposite
                    trailStartAngle = normalTrailStart + (oppositeTrailStart - normalTrailStart) * animationProgress;
                } else if (currentTrailDirection === 'opposite' && targetTrailDirection === 'normal') {
                    // Animating from opposite to normal
                    trailStartAngle = oppositeTrailStart + (normalTrailStart - oppositeTrailStart) * animationProgress;
                } else {
                    trailStartAngle = shouldRenderOpposite ? oppositeTrailStart : normalTrailStart;
                }
            } else if (shouldRenderOpposite) {
                // Trail on opposite side: 20% after current position
                trailStartAngle = oppositeTrailStart;
            } else {
                // Normal trail: 20% before current position
                trailStartAngle = normalTrailStart;
            }

            // Normalize angle
            if (trailStartAngle < 0) trailStartAngle += 2 * Math.PI;
            if (trailStartAngle > 2 * Math.PI) trailStartAngle -= 2 * Math.PI;


            // Check if this tick is within the 20% trail
            let isInTrail = false;
            let trailProgress = 0;

            const tolerance = 0.001; // Small tolerance for floating point comparisons

            // Calculate trail end angle based on current configuration
            let trailEndAngle;
            if (isAnimating && this.debugSettings.trailMode === 'stay') {
                // During animation, calculate the appropriate end angle
                if (currentTrailDirection === 'normal' && targetTrailDirection === 'opposite') {
                    // Transitioning from normal (ending at current) to opposite (ending at current + length)
                    const normalEnd = currentTickAngle;
                    const oppositeEnd = (currentTickAngle + trailLength) % (2 * Math.PI);
                    trailEndAngle = normalEnd + (oppositeEnd - normalEnd) * animationProgress;
                } else if (currentTrailDirection === 'opposite' && targetTrailDirection === 'normal') {
                    // Transitioning from opposite (ending at current + length) to normal (ending at current)
                    const oppositeEnd = (currentTickAngle + trailLength) % (2 * Math.PI);
                    const normalEnd = currentTickAngle;
                    trailEndAngle = oppositeEnd + (normalEnd - oppositeEnd) * animationProgress;
                } else {
                    trailEndAngle = shouldRenderOpposite ? 
                        (trailStartAngle + trailLength) % (2 * Math.PI) : 
                        currentTickAngle;
                }
            } else {
                trailEndAngle = shouldRenderOpposite ? 
                    (trailStartAngle + trailLength) % (2 * Math.PI) : 
                    currentTickAngle;
            }

            // Normalize trail end angle
            if (trailEndAngle < 0) trailEndAngle += 2 * Math.PI;
            if (trailEndAngle > 2 * Math.PI) trailEndAngle -= 2 * Math.PI;

            // Check if this tick is within the trail
            if (trailStartAngle <= trailEndAngle) {
                // Normal case: trail doesn't wrap around
                isInTrail = normalizedAngle >= trailStartAngle - tolerance && normalizedAngle <= trailEndAngle + tolerance;
                if (isInTrail) {
                    trailProgress = Math.max(0, Math.min(1, (normalizedAngle - trailStartAngle) / trailLength));
                }
            } else {
                // Wrap case: trail wraps around 0/2π boundary
                isInTrail = normalizedAngle >= trailStartAngle - tolerance || normalizedAngle <= trailEndAngle + tolerance;
                if (isInTrail) {
                    if (normalizedAngle >= trailStartAngle - tolerance) {
                        trailProgress = Math.max(0, Math.min(1, (normalizedAngle - trailStartAngle) / trailLength));
                    } else {
                        trailProgress = Math.max(0, Math.min(1, (normalizedAngle + 2 * Math.PI - trailStartAngle) / trailLength));
                    }
                }
            }

            if (isInTrail) {
                // Interpolate within the trail
                const start = 67;  // BASE_GRAY channel value
                const end = 255;   // white

                let r, g, b;
                if (isAnimating && this.debugSettings.trailMode === 'stay') {
                    // During animation, blend between gradient directions
                    const normalValue = Math.round(start + (end - start) * trailProgress);
                    const oppositeValue = Math.round(end - (end - start) * trailProgress);

                    if (currentTrailDirection === 'normal' && targetTrailDirection === 'opposite') {
                        // Blend from normal to opposite
                        r = Math.round(normalValue + (oppositeValue - normalValue) * animationProgress);
                    } else if (currentTrailDirection === 'opposite' && targetTrailDirection === 'normal') {
                        // Blend from opposite to normal  
                        r = Math.round(oppositeValue + (normalValue - oppositeValue) * animationProgress);
                    } else {
                        r = shouldRenderOpposite ? oppositeValue : normalValue;
                    }
                } else if (shouldRenderOpposite) {
                    // Opposite trail: white next to current (start), fade to gray (end)
                    r = Math.round(end - (end - start) * trailProgress);
                } else {
                    // Normal trail: gray at start, white near current (end)
                    r = Math.round(start + (end - start) * trailProgress);
                }
                g = r;
                b = r;
                return `rgb(${r}, ${g}, ${b})`;
            } else {
                // Outside the trail: unaffected gray
                return BASE_GRAY;
            }
        } else {
            // Original gradient mode logic
            // If current is exactly 12 o'clock, only that tick should be white; others unaffected gray.
            if (currentTickAngle === 0) {
                // Only the tick at 12 o'clock should be white (current position).
                return normalizedAngle === 0 ? 'rgb(255,255,255)' : BASE_GRAY;
            }

            // If the tick's angle lies within the sweep [0, currentTickAngle] (clockwise),
            // map it from BASE_GRAY (start at 12 o'clock) → white (end at current). Outside: unaffected BASE_GRAY.
            if (normalizedAngle <= currentTickAngle) {
                const progress = normalizedAngle / currentTickAngle; // 0 → 1

                // Interpolate from BASE_GRAY (#434343 → 67) to white (255)
                const start = 67;           // #434343 channel value
                const end = 255;            // white
                const r = Math.round(start + (end - start) * progress);
                const g = r;
                const b = r;
                return `rgb(${r}, ${g}, ${b})`;
            }

            // Outside the sweep (i.e., after the current tick): unaffected gray
            return BASE_GRAY;
        }
    }

    drawTick(angle, isFilled, isCurrent, isPhaseB, lengthMultiplier = 1.0, isNext = false, progress = 0, tickIndex = -1, currentTickIndex = -1, totalTicks = 0) {
        // Base tick dimensions
        const baseLength = 15; // Base tick length
        const actualLength = baseLength * lengthMultiplier;

        let innerRadius, outerRadius;

        // Set line width based on phase and tick mode
        let lineWidth;
        if (isPhaseB && this.debugSettings.tickMode === '15min') {
            lineWidth = 1.5; // Thinner for 15-min mode (285 ticks)
        } else {
            lineWidth = 3; // Normal thickness for other modes
        }

        // Calculate positions based on alignment
        switch (this.debugSettings.alignment) {
            case 'inward':
                // Grows inward from outer edge
                innerRadius = this.radius - 5 - actualLength;
                outerRadius = this.radius - 5;
                break;
            case 'outward':
                // Grows outward from inner edge
                innerRadius = this.radius - 20;
                outerRadius = this.radius - 20 + actualLength;
                break;
            case 'center':
                // Grows from center point
                const centerPoint = this.radius - 12.5; // Middle of normal tick
                const halfLength = actualLength / 2;
                innerRadius = centerPoint - halfLength;
                outerRadius = centerPoint + halfLength;
                break;
        }

        // Calculate positions
        const x1 = this.centerX + Math.cos(angle) * innerRadius;
        const y1 = this.centerY + Math.sin(angle) * innerRadius;
        const x2 = this.centerX + Math.cos(angle) * outerRadius;
        const y2 = this.centerY + Math.sin(angle) * outerRadius;

        // Determine color
        let strokeColor;

        // Handle animated trail mode first
        if (this.debugSettings.trailMode === 'animated' && tickIndex >= 0) {
            const trailColor = this.getAnimatedTrailColor(tickIndex, currentTickIndex, totalTicks);
            strokeColor = isCurrent ? '#FA4947' : trailColor;
        } else if (this.debugSettings.gradientColorMode === 'standard') {
            // Standard color mode
            if (isFilled) {
                strokeColor = '#FA4947'; // Filled ticks are red
            } else if (isNext && isPhaseB && this.debugSettings.tickMode === 'hourly') {
                // Next tick in hourly mode cycles through opacity based on progress
                // Starts grey, then progressively becomes red
                if (progress === 0) {
                    strokeColor = BASE_GRAY; // Grey when exactly on the hour
                } else {
                    // Map progress to 25%, 50%, 75%, 100% opacity at quarter intervals
                    let opacity;
                    if (progress < 0.25) {
                        opacity = 0.25 * (progress / 0.25); // 0 to 25%
                    } else if (progress < 0.5) {
                        opacity = 0.25 + 0.25 * ((progress - 0.25) / 0.25); // 25% to 50%
                    } else if (progress < 0.75) {
                        opacity = 0.5 + 0.25 * ((progress - 0.5) / 0.25); // 50% to 75%
                    } else {
                        opacity = 0.75 + 0.25 * ((progress - 0.75) / 0.25); // 75% to 100%
                    }

                    // Create rgba color with calculated opacity
                    const red = 255;
                    const green = 0;
                    const blue = 0;
                    strokeColor = `rgba(${red}, ${green}, ${blue}, ${opacity})`;
                }
            } else {
                strokeColor = BASE_GRAY; // Unfilled ticks are gray
            }
        } else {
            // Gradient color modes: current = red, others use conic gradient
            if (this.debugSettings.gradientColorMode === 'seamless') {
                // Seamless mode: apply gradient regardless of fill status
                if (isCurrent) {
                    strokeColor = '#FA4947';
                } else {
                    strokeColor = this.getConicGradientColor(angle, currentTickIndex, totalTicks, this.debugSettings.gradientColorMode);
                }
            } else {
                // Regular gradient mode: only apply to filled ticks
                if (isFilled) {
                    strokeColor = isCurrent ? '#FA4947' : this.getConicGradientColor(angle, currentTickIndex, totalTicks, this.debugSettings.gradientColorMode);
                } else {
                    strokeColor = BASE_GRAY;
                }
            }
        }

        // Draw the tick with smooth transition
        this.ctx.save();

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();

        this.ctx.restore();
    }
}

export { CircularTimeDial };
export { BASE_GRAY };
export default CircularTimeDial;
