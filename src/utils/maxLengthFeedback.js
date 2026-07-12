const feedbackTimers = new WeakMap();

const showLimitFeedback = (input) => {
  if (!input) return;

  const previousTimer = feedbackTimers.get(input);
  if (previousTimer) window.clearTimeout(previousTimer);

  input.classList.remove("input-limit-reached");
  // Reinicia la animación aunque el usuario vuelva a intentar escribir enseguida.
  void input.offsetWidth;
  input.classList.add("input-limit-reached");
  input.setAttribute("aria-invalid", "true");

  const timer = window.setTimeout(() => {
    input.classList.remove("input-limit-reached");
    input.removeAttribute("aria-invalid");
    feedbackTimers.delete(input);
  }, 520);

  feedbackTimers.set(input, timer);
};

const selectedLength = (input) =>
  Math.max(0, (input.selectionEnd ?? 0) - (input.selectionStart ?? 0));

export const maxLengthFeedback = (maxLength) => ({
  maxLength,
  onBeforeInput: (event) => {
    const input = event.currentTarget;
    if (event.nativeEvent?.isComposing || event.nativeEvent?.inputType?.startsWith("delete")) {
      return;
    }

    const insertedText = event.nativeEvent?.data ?? "";
    const nextLength = input.value.length - selectedLength(input) + insertedText.length;
    if (input.value.length >= maxLength || nextLength > maxLength) {
      showLimitFeedback(input);
    }
  },
  onPaste: (event) => {
    const input = event.currentTarget;
    const pastedText = event.clipboardData?.getData("text") ?? "";
    const nextLength = input.value.length - selectedLength(input) + pastedText.length;
    if (nextLength > maxLength) showLimitFeedback(input);
  },
});
