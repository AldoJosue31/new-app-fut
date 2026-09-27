import React, { memo, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import styled from "styled-components";
import StandingsExportLayout from "./StandingsExportLayout";
import { createStandingsWheelNavigation, getCarouselSlideStyle } from "./standingsCarouselWheel";

const MemoizedStandingsExportLayout = memo(StandingsExportLayout);
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const readReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;
const serverReducedMotion = () => false;
const subscribeReducedMotion = (notify) => {
    const preference = window.matchMedia(REDUCED_MOTION_QUERY);
    preference.addEventListener("change", notify);
    return () => preference.removeEventListener("change", notify);
};

function DesignSlide({ design, slot, scale, exportHeight, instantNavigation, reducedMotion, layoutProps, exportRef, onNavigate, disabled }) {
    const isCurrent = slot === 0;
    const isNeighbor = Math.abs(slot) === 1;
    const width = 1080 * scale;
    const instant = reducedMotion || instantNavigation;

    // The caption and buttons describe selection; cached, read-only tables stay out of the accessibility tree.
    return (
        <Slide
            data-standings-slide={design.id}
            data-current={isCurrent ? "true" : "false"}
            data-slot={slot}
            style={{
                width,
                height: exportHeight * scale,
                ...getCarouselSlideStyle(slot, width),
                transitionDuration: instant ? "0ms" : "250ms, 180ms",
                pointerEvents: isNeighbor ? "auto" : "none"
            }}
            role={isCurrent ? "group" : undefined}
            aria-roledescription={isCurrent ? "diapositiva" : undefined}
            aria-label={isCurrent ? design.name : undefined}
        >
            <div className="slide-image" style={{ filter: isCurrent ? "brightness(1)" : "brightness(0.8)" }}>
                <div
                    ref={isCurrent ? exportRef : undefined}
                    aria-hidden="true"
                    style={{ width: 1080, height: exportHeight, transform: `scale(${scale})`, transformOrigin: "top left" }}
                >
                    <MemoizedStandingsExportLayout
                        {...layoutProps}
                        tableDesign={design.tableDesign}
                        backgroundDesign={design.backgroundDesign}
                    />
                </div>
            </div>
            {isNeighbor && (
                <button
                    type="button"
                    className="side-select"
                    aria-label={`${slot < 0 ? "Diseño anterior" : "Diseño siguiente"}: ${design.name}`}
                    title={design.name}
                    disabled={disabled}
                    onClick={(event) => onNavigate(slot < 0 ? -1 : 1, event.detail === 0)}
                />
            )}
        </Slide>
    );
}

export default function StandingsDesignCarousel({ designs, selectedIndex, scale, exportHeight, instantNavigation, layoutProps, exportRef, stageRef, onNavigate, disabled }) {
    const reducedMotion = useSyncExternalStore(subscribeReducedMotion, readReducedMotion, serverReducedMotion);
    const wheelNavigation = useRef(null);
    const count = designs.length;

    useLayoutEffect(() => {
        const stage = stageRef.current;
        const viewport = stage?.closest(".preview-viewport");
        if (!viewport || disabled || count < 3) return;
        const slides = [...stage.querySelectorAll("[data-standings-slide]")];
        const controller = createStandingsWheelNavigation({
            viewport,
            slides,
            selectedIndex: slides.findIndex((slide) => slide.dataset.current === "true"),
            width: 1080 * scale,
            reducedMotion,
            onNavigate
        });
        wheelNavigation.current = controller;
        return () => {
            controller.destroy();
            wheelNavigation.current = null;
        };
    }, [stageRef, count, scale, reducedMotion, disabled, onNavigate]);

    useLayoutEffect(() => {
        wheelNavigation.current?.syncSelection(selectedIndex, instantNavigation || reducedMotion);
    }, [selectedIndex, instantNavigation, reducedMotion, count, scale, disabled, onNavigate]);
    // Keep the bounded design collection mounted: cycling reuses tables and logos.
    // Only the selected design and its two neighbors are visible or interactive.
    return (
        <>
            {designs.map((design, index) => {
                const offset = (index - selectedIndex + designs.length) % designs.length;
                const slot = offset > designs.length / 2 ? offset - designs.length : offset;
                return (
                    <DesignSlide
                        key={design.id}
                        design={design}
                        slot={slot}
                        scale={scale}
                        exportHeight={exportHeight}
                        instantNavigation={instantNavigation}
                        reducedMotion={reducedMotion}
                        layoutProps={layoutProps}
                        exportRef={exportRef}
                        onNavigate={onNavigate}
                        disabled={disabled}
                    />
                );
            })}
        </>
    );
}

const Slide = styled.div`
    position: absolute;
    left: 50%;
    top: 50%;
    border-radius: 8px;
    box-shadow: 0 10px 26px -10px rgba(0, 0, 0, 0.4);
    contain: layout;
    will-change: transform, opacity;
    transition-property: transform, opacity;
    transition-timing-function: cubic-bezier(0.23, 1, 0.32, 1);

    .slide-image {
        width: 100%;
        height: 100%;
        overflow: hidden;
        border-radius: inherit;
        pointer-events: none;
        will-change: filter;
    }

    .side-select {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
        border-radius: inherit;
        padding: 0;
        background: transparent;
        cursor: pointer;
    }

    .side-select:focus-visible {
        outline: 3px solid ${({ theme }) => theme.tournamentDashboard?.primary || theme.primary};
        outline-offset: -3px;
    }

    .side-select:disabled { pointer-events: none; }
`;
