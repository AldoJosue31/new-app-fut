import test from "node:test";
import assert from "node:assert/strict";
import { createStandingsWheelNavigation } from "../src/components/organismos/tabs/torneos/exports/standings/standingsCarouselWheel.js";

function fixture({ selectedIndex = 0, reducedMotion = false } = {}) {
    const listeners = new Map();
    const timers = new Map();
    const frames = new Map();
    let nextId = 1;
    const scheduler = {
        setTimeout(callback) { const id = nextId++; timers.set(id, callback); return id; },
        clearTimeout(id) { timers.delete(id); },
        requestAnimationFrame(callback) { const id = nextId++; frames.set(id, callback); return id; },
        cancelAnimationFrame(id) { frames.delete(id); }
    };
    const viewport = {
        clientWidth: 1000,
        clientHeight: 600,
        addEventListener(type, callback) { listeners.set(type, callback); },
        removeEventListener(type) { listeners.delete(type); }
    };
    const slides = Array.from({ length: 6 }, () => ({ style: {} }));
    const navigations = [];
    let index = selectedIndex;
    const controller = createStandingsWheelNavigation({
        viewport, slides, selectedIndex, width: 500, reducedMotion, scheduler,
        onNavigate(steps, instant) {
            index = ((index + steps) % slides.length + slides.length) % slides.length;
            navigations.push({ steps, instant, index });
        }
    });
    controller.syncSelection(index, true);
    return {
        slides, navigations, controller, listeners, timers, frames, scheduler,
        wheel(options) {
            const event = { deltaX: 0, deltaY: 0, deltaMode: 0, cancelable: true, ...options };
            event.preventDefault = () => { event.defaultPrevented = true; };
            listeners.get("wheel")?.(event);
            return event;
        },
        frame() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); },
        finish() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); },
        sync() { controller.syncSelection(index, reducedMotion); }
    };
}

const translateX = (slide) => Number(slide.style.transform.match(/translateX\(([^p]+)px\)/)[1]);

test("horizontal input follows the gesture proportionally and requires more travel to select", () => {
    const f = fixture();
    const first = f.wheel({ deltaX: 18, deltaY: 1 });
    f.frame();
    assert.equal(first.defaultPrevented, true);
    assert.ok(Math.abs(translateX(f.slides[0]) + 14.4) < 0.001);
    assert.equal(f.slides[0].style.transitionDuration, "0ms");
    assert.equal(f.navigations.length, 0);
    f.wheel({ deltaX: 36, deltaY: 2 });
    f.frame();
    assert.ok(Math.abs(translateX(f.slides[0]) + 43.2) < 0.001);
    f.wheel({ deltaX: 45 });
    f.frame();
    f.finish();
    assert.equal(f.navigations.length, 0);
    f.wheel({ deltaX: 120 });
    f.frame();
    f.finish();
    assert.deepEqual(f.navigations, [{ steps: 1, instant: false, index: 1 }]);
    f.sync();
    assert.equal(translateX(f.slides[1]), 0);
});

test("short gestures and a direction reversal return to the same design", () => {
    const f = fixture();
    f.wheel({ deltaX: 72 });
    f.frame();
    f.wheel({ deltaX: -54 });
    f.frame();
    assert.ok(Math.abs(translateX(f.slides[0]) + 14.4) < 0.001);
    f.finish();
    assert.equal(f.navigations.length, 0);
    assert.equal(translateX(f.slides[0]), 0);
});

test("a new gesture picks up the actual position of an interrupted snap", () => {
    const f = fixture();
    f.scheduler.getComputedStyle = () => ({ transform: "matrix(1, 0, 0, 1, -205, 0)" });
    f.scheduler.DOMMatrixReadOnly = class { constructor() { this.m41 = -205; } };
    // Current slide is still 45px to the right during its previous snap.
    f.wheel({ deltaX: 18 });
    f.frame();
    assert.ok(Math.abs(translateX(f.slides[0]) - 30.6) < 0.001);
    f.finish();
    assert.equal(f.navigations.length, 0);
});

test("native momentum is counted once, and tiny momentum tails cannot add a slide", () => {
    const f = fixture();
    for (const deltaX of [85, 25, 8, 3, 1, 0.5, 0.1]) { f.wheel({ deltaX }); f.frame(); }
    f.finish();
    assert.equal(f.navigations.length, 1);
    assert.equal(f.navigations[0].steps, 1);
});

test("long swipes can cross several designs and wrap in both directions", () => {
    const f = fixture({ selectedIndex: 5 });
    f.wheel({ deltaX: 360 });
    f.frame();
    f.finish();
    f.sync();
    assert.equal(f.navigations[0].index, 1);
    assert.equal(translateX(f.slides[1]), 0);
    f.wheel({ deltaX: -1575 });
    f.frame();
    f.finish();
    f.sync();
    assert.equal(f.navigations[1].steps, -7);
    assert.equal(f.navigations[1].index, 0);
    assert.equal(translateX(f.slides[0]), 0);
});

test("vertical wheel selects once per gesture even after React acknowledges the change", () => {
    const f = fixture();
    f.wheel({ deltaY: 120 });
    f.sync();
    for (const deltaY of [80, 50, 20, 10, 3, 1]) f.wheel({ deltaY });
    assert.equal(f.navigations.length, 1);
    f.finish();
    f.wheel({ deltaY: -120 });
    assert.equal(f.navigations[1].steps, -1);
});

test("vertical reversal requires intentional distance, and horizontal jitter cannot change the locked axis", () => {
    const f = fixture();
    f.wheel({ deltaY: 60, deltaX: 1 });
    f.sync();
    f.wheel({ deltaY: -1, deltaX: 20 });
    assert.equal(f.navigations.length, 1);
    f.wheel({ deltaY: -47 });
    assert.equal(f.navigations[1].steps, -1);
});

test("line/page wheel units normalize and Shift-wheel supports horizontal navigation", () => {
    const line = fixture();
    line.wheel({ deltaY: 3, deltaMode: 1 });
    assert.equal(line.navigations[0].steps, 1);
    const page = fixture();
    page.wheel({ deltaY: -1, deltaMode: 2 });
    assert.equal(page.navigations[0].steps, -1);
    const shift = fixture();
    shift.wheel({ deltaY: 120, shiftKey: true });
    shift.frame();
    assert.ok(Math.abs(translateX(shift.slides[0]) + 96) < 0.001);
    shift.finish();
    assert.equal(shift.navigations[0].steps, 1);
});

test("pinch/browser zoom, empty events and invalid deltas are left alone", () => {
    const f = fixture();
    for (const options of [{ ctrlKey: true, deltaX: 120 }, { metaKey: true, deltaY: 120 }, { deltaX: NaN }, {}, { deltaY: Infinity }]) {
        assert.equal(f.wheel(options).defaultPrevented, undefined);
    }
    assert.equal(f.navigations.length, 0);
    assert.equal(f.timers.size, 0);
});

test("reduced motion selects on release without moving previews under the fingers", () => {
    const f = fixture({ reducedMotion: true });
    f.wheel({ deltaX: 120 });
    f.frame();
    assert.equal(translateX(f.slides[0]), 0);
    f.finish();
    assert.equal(f.navigations[0].instant, true);
    f.sync();
    assert.equal(translateX(f.slides[1]), 0);
    assert.equal(f.slides[1].style.transitionDuration, "0ms");
});

test("other navigation and unmount cancel queued work and detach all listeners", () => {
    const f = fixture();
    f.wheel({ deltaX: 120 });
    f.frame();
    f.listeners.get("keydown")({ key: "ArrowRight" });
    f.finish();
    assert.equal(f.navigations.length, 0);
    f.wheel({ deltaX: 120 });
    f.controller.destroy();
    assert.equal(f.frames.size, 0);
    assert.equal(f.timers.size, 0);
    assert.equal(f.listeners.size, 0);
    f.finish();
    assert.equal(f.navigations.length, 0);
});
