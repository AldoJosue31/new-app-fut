export const generateTeamLogo = (teamName, primaryColor) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const size = 500; // Alta resolución
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject("No se pudo iniciar el generador de imagen");
      return;
    }

    // 1. Fondo (Transparente por defecto, dibujamos el escudo)
    const centerX = size / 2;
    const centerY = size / 2;

    // --- FORMA DE ESCUDO (Shield) ---
    ctx.beginPath();
    ctx.moveTo(centerX - 200, centerY - 180);
    ctx.lineTo(centerX + 200, centerY - 180); // Top
    ctx.bezierCurveTo(centerX + 200, centerY + 50, centerX + 150, centerY + 180, centerX, centerY + 240); // Curve Right to Bottom
    ctx.bezierCurveTo(centerX - 150, centerY + 180, centerX - 200, centerY + 50, centerX - 200, centerY - 180); // Curve Left to Top
    ctx.closePath();

    // Relleno principal (Color del equipo)
    ctx.fillStyle = primaryColor || '#000000';
    ctx.fill();
    
    // Borde blanco interno
    ctx.lineWidth = 15;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Borde exterior suave
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.stroke();

    // 2. Efecto de Brillo (Gradiente superior)
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // 3. Texto (Iniciales)
    // Extraer iniciales: "Rayados de Monterrey" -> "RM"
    const words = teamName.trim().split(' ');
    let initials = "";
    if (words.length === 1) {
        initials = words[0].substring(0, 2).toUpperCase();
    } else {
        initials = (words[0][0] + words[1][0]).toUpperCase();
    }
    if(words.length > 2) initials = (words[0][0] + words[1][0] + words[2][0]).toUpperCase();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 180px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Sombra del texto
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    // Ajuste vertical óptico
    ctx.fillText(initials, centerX, centerY - 10);

    // 4. Icono decorativo simple (Balón abajo) - Opcional
    ctx.font = '50px sans-serif';
    ctx.shadowBlur = 0; // Quitar sombra
    ctx.fillText("⚽", centerX, centerY + 140);

    // 5. Convertir a Archivo (File Object)
    canvas.toBlob((blob) => {
        if (blob) {
            const file = new File([blob], "generated-logo.png", { type: "image/png" });
            resolve({ file, preview: URL.createObjectURL(blob) });
        } else {
            reject("Error al generar blob");
        }
    }, 'image/png');
  });
};