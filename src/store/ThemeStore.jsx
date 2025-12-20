import { create } from 'zustand';
import { Dark, Light } from "../styles/themes"

export const useThemeStore = create((set, get) =>({
    // 1. Inicializamos buscando en localStorage o por defecto 'light'
    theme: localStorage.getItem("theme") || 'light',
    
    // 2. Asignamos el objeto de estilos correcto según lo encontrado
    themeStyle: localStorage.getItem("theme") === "dark" ? Dark : Light,
    
    setTheme:()=>{
        const { theme } = get();
        
        // Calculamos el nuevo tema
        const newTheme = theme === "light" ? "dark" : "light";
        const newThemeStyle = newTheme === "light" ? Light : Dark;
        
        // 3. Guardamos la preferencia en el navegador
        localStorage.setItem("theme", newTheme);
        
        // Actualizamos el estado de Zustand
        set({ 
            theme: newTheme, 
            themeStyle: newThemeStyle 
        });
    }
}))