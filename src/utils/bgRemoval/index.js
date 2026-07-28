import "client-only";

export const removeBackground = async (imageFile, type = 'person') => {
  if (type === 'logo') {
    const { removeLogoBackground } = await import("./logoEngine");
    return removeLogoBackground(imageFile);
  }

  const { removePersonBackground } = await import("./personEngine");
  return removePersonBackground(imageFile);
};
