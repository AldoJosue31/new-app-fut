const GESTURE_IDLE_MS = 180;
const VERTICAL_STEP_PX = 48;
const SLIDE_SPACING = 0.36;
const HORIZONTAL_SENSITIVITY = 0.8;

export function getCarouselSlideStyle(slot, width) {
    const distance = Math.abs(slot);
    return {
        transform: `translate(-50%, -50%) translateX(${slot * width * SLIDE_SPACING}px) scale(${1 - 0.08 * Math.min(distance, 1)})`,
        opacity: distance <= 1 ? 1 - distance * 0.28 : Math.max(0, (2 - distance) * 0.72),
        zIndex: distance < 0.5 ? 3 : distance < 1.5 ? 2 : 1
    };
}

const wrap = (value, count) => ((value % count) + count) % count;

// WheelEvent does not identify the device. Horizontal deltas are direct motion;
// vertical deltas are discrete navigation, regardless of mouse/trackpad model.
export function createStandingsWheelNavigation({ viewport, slides, selectedIndex, width, reducedMotion, onNavigate, scheduler = window }) {
    const count = slides.length;
    const spacing = Math.max(1, width * SLIDE_SPACING);
    let selected = selectedIndex;
    let expectedSelection = null;
    let axis = null;
    let pendingX = 0;
    let pendingY = 0;
    let progress = 0;
    let verticalDistance = 0;
    let verticalDirection = 0;
    let verticalNavigated = false;
    let frame = 0;
    let idleTimer = 0;

    const paint = (position, instant) => {
        slides.forEach((slide, index) => {
            const offset = wrap(index - selected - position, count);
            const slot = offset > count / 2 ? offset - count : offset;
            const style = getCarouselSlideStyle(slot, width);
            slide.style.transitionDuration = instant || reducedMotion ? "0ms" : "250ms, 180ms";
            slide.style.transform = style.transform;
            slide.style.opacity = String(style.opacity);
            slide.style.zIndex = String(style.zIndex);
            slide.style.pointerEvents = position === 0 && Math.abs(slot) === 1 ? "auto" : "none";
        });
    };

    const readVisualProgress = () => {
        if (!scheduler.getComputedStyle || !scheduler.DOMMatrixReadOnly) return 0;
        const transform = scheduler.getComputedStyle(slides[selected]).transform;
        if (!transform || transform === "none") return 0;
        const matrix = new scheduler.DOMMatrixReadOnly(transform);
        // Read once when a gesture starts, including an interrupted snap.
        // translate(-50%) contributes -width/2 to the computed translation.
        return -(matrix.m41 + width / 2) / spacing;
    };

    const clearGesture = () => {
        scheduler.clearTimeout(idleTimer);
        scheduler.cancelAnimationFrame(frame);
        idleTimer = 0;
        frame = 0;
        axis = null;
        pendingX = 0;
        pendingY = 0;
        progress = 0;
        verticalDistance = 0;
        verticalDirection = 0;
        verticalNavigated = false;
    };

    const navigate = (steps, instant) => {
        expectedSelection = wrap(selected + steps, count);
        onNavigate(steps, instant);
    };

    const finish = () => {
        const wasHorizontal = axis === "horizontal";
        // Native wheel events already include trackpad momentum. Adding another
        // velocity projection here would overshoot the user's actual movement.
        const steps = Math.sign(progress) * Math.round(Math.abs(progress));
        clearGesture();
        if (!wasHorizontal) return;
        paint(steps, reducedMotion);
        if (steps && wrap(selected + steps, count) !== selected) navigate(steps, reducedMotion);
        else paint(0, reducedMotion);
    };

    const cancel = () => {
        const wasHorizontal = axis === "horizontal";
        clearGesture();
        expectedSelection = null;
        if (wasHorizontal) paint(0, false);
    };

    const onWheel = (event) => {
        // Preserve pinch-to-zoom and browser shortcuts.
        if (event.ctrlKey || event.metaKey || event.defaultPrevented) return;
        const unitX = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientWidth : 1;
        const unitY = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
        const x = (event.deltaX || (event.shiftKey ? event.deltaY : 0)) * unitX;
        const y = event.shiftKey ? 0 : event.deltaY * unitY;
        if (!Number.isFinite(x) || !Number.isFinite(y) || (!x && !y)) return;
        if (event.cancelable) event.preventDefault();

        scheduler.clearTimeout(idleTimer);
        idleTimer = scheduler.setTimeout(finish, GESTURE_IDLE_MS);
        pendingX += x;
        pendingY += y;
        if (!axis) {
            if (Math.max(Math.abs(pendingX), Math.abs(pendingY)) < 4) return;
            axis = Math.abs(pendingX) >= Math.abs(pendingY) ? "horizontal" : "vertical";
            if (axis === "horizontal" && !reducedMotion) progress = readVisualProgress();
        }

        if (axis === "horizontal") {
            progress += (pendingX * HORIZONTAL_SENSITIVITY) / spacing;
            if (!reducedMotion && !frame) {
                frame = scheduler.requestAnimationFrame(() => {
                    frame = 0;
                    // Only compositor properties change, once per frame. The
                    // cached tables and their React props never rerender here.
                    paint(progress, true);
                });
            }
        } else {
            const direction = Math.sign(pendingY);
            if (direction && direction !== verticalDirection) {
                verticalDirection = direction;
                verticalDistance = 0;
                verticalNavigated = false;
            }
            verticalDistance += pendingY;
            if (!verticalNavigated && Math.abs(verticalDistance) >= VERTICAL_STEP_PX) {
                verticalNavigated = true;
                navigate(verticalDirection, reducedMotion);
            }
        }
        pendingX = 0;
        pendingY = 0;
    };

    const onKeyDown = (event) => {
        if (["ArrowLeft", "ArrowRight", "Enter", " "].includes(event.key)) cancel();
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("pointerdown", cancel, true);
    viewport.addEventListener("keydown", onKeyDown, true);

    return {
        syncSelection(index, instant) {
            // Keep the vertical gesture latched across its own React selection
            // update, so the inertia tail cannot select another design.
            if (index !== expectedSelection) clearGesture();
            expectedSelection = null;
            selected = index;
            paint(0, instant);
        },
        destroy() {
            clearGesture();
            paint(0, true);
            viewport.removeEventListener("wheel", onWheel);
            viewport.removeEventListener("pointerdown", cancel, true);
            viewport.removeEventListener("keydown", onKeyDown, true);
        }
    };
}
