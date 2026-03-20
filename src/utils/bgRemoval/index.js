import { removePersonBackground } from "./personEngine";
import { removeLogoBackground } from "./logoEngine";

export const removeBackground = async (imageFile, type = 'person') => {
  if (type === 'logo') {
    return await removeLogoBackground(imageFile);
  }
  return await removePersonBackground(imageFile);
};