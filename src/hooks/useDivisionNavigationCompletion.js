import { useEffect } from "react";

import { useNavigationProgress } from "../components/app/NavigationProgress.jsx";

export const useDivisionNavigationCompletion = ({
  divisionId,
  isReady,
}) => {
  const { completeNavigation, transition } = useNavigationProgress();

  useEffect(() => {
    const isMatchingDivision =
      String(divisionId || "") === String(transition.targetDivisionId || "");

    if (
      transition.kind !== "division" ||
      !transition.isVisible ||
      transition.isDone ||
      !isMatchingDivision ||
      !isReady
    ) {
      return undefined;
    }

    let firstFrame = 0;
    let secondFrame = 0;

    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        completeNavigation();
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [
    completeNavigation,
    divisionId,
    isReady,
    transition.isDone,
    transition.isVisible,
    transition.kind,
    transition.targetDivisionId,
  ]);
};
