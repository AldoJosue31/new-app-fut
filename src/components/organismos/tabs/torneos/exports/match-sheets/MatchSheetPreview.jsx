import { useLayoutEffect, useState } from "react";
import styled from "styled-components";

// A4 portrait in CSS pixels (96dpi).
export const A4_WIDTH = 210 * 96 / 25.4;
export const A4_HEIGHT = 297 * 96 / 25.4;

export function MatchSheetPreview({ width, height, maxScale = 1, fitHeight = false, children }) {
    const [stage, setStage] = useState(null);
    const [scale, setScale] = useState(0);

    useLayoutEffect(() => {
        if (!stage) return;

        const resize = () => {
            const widthScale = stage.clientWidth / width;
            const heightScale = fitHeight ? stage.clientHeight / height : maxScale;
            setScale(Math.min(widthScale, heightScale, maxScale));
        };

        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(stage);
        return () => observer.disconnect();
    }, [stage, width, height, maxScale, fitHeight]);

    return (
        <PreviewStage ref={setStage} $fitHeight={fitHeight}>
            <PreviewFrame style={{ width: width * scale, height: height * scale }}>
                <PreviewDocument style={{ width, height, transform: `scale(${scale})` }}>
                    {children}
                </PreviewDocument>
            </PreviewFrame>
        </PreviewStage>
    );
}

const PreviewStage = styled.div`
    display: grid;
    place-items: center;
    flex: ${({ $fitHeight }) => $fitHeight ? "1 1 0" : "1 0 auto"};
    min-height: 0;
    min-width: 0;
`;

const PreviewFrame = styled.div`
    position: relative;
    overflow: hidden;
    box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.4);
`;

const PreviewDocument = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: top left;
`;
