"""Export cues from the actual spoken timeline, without hard-coded V4 gaps."""
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
a=json.loads((root/'assets/voice/narration-v5-alignment.json').read_text(encoding='utf-8'));t=a['markers']
c=[]
def cue(at,kind,desc,dur=None):
    q={'t':round(at,4),'type':kind,'desc':desc}
    if dur:q['dur']=dur
    c.append(q)
cue(.18,'movement','Dani, papel y Excel')
cue(.85,'typing','Dani transcribe una cédula',.65)
cue(t['requests'],'appear','Piden el rol de la jornada')
cue((t['requests']+t['playerRequests'])/2,'appear','Piden la tabla de posiciones')
for i,desc in enumerate(['Goles','Partidos jugados','Tarjetas amarillas']):
    cue(t['playerRequests']+i*(t['intro']-t['playerRequests'])/3,'appear','Pregunta del jugador: '+desc)
cue(t['introReveal'],'reveal','Bracket conecta la información de la liga')
cue(t['schedule'],'movement','Vista móvil de la jornada')
cue(t['adjust'],'click','Ajustar hora del partido')
cue(t['scheduleConfirm'],'click','Confirmar jornada')
cue(t['roleOpen'],'click','Abrir Exportar Rol')
cue(t['roleDownload'],'click','Descargar rol de juegos')
cue(t['result'],'movement','Definir Resultado: planteles')
cue(t['playerSelected'],'click','Registrar participación')
cue(t['goalRegistered'],'click','Goles de Mateo Ruiz')
cue(t['cardRegistered'],'click','Amarilla de Diego Luna')
cue(t['photo'],'click','Abrir carga de cédula')
cue(t['scanStart']+(t['review']-t['scanStart'])*1.3/3,'click','Escanear la foto')
cue(t['review'],'success','Lectura ilustrativa lista para revisar')
cue(t['review']+(t['confirm']-t['review'])*2.3/3,'click','Aplicar escaneo')
cue(t['confirm']+(t['stats']-t['confirm'])*.9/3.5,'click','Guardar Marcador')
cue(t['confirm']+(t['stats']-t['confirm'])*2.45/3.5,'click','Confirmar Sí guardar')
cue(t['resultSaved'],'success','Resultado registrado')
cue(t['stats'],'movement','Rendimiento Individual del equipo')
cue(t['scorers'],'movement','Goleadores del torneo')
cue(t['scorersExport']-.07,'click','Preparar imagen de goleadores')
cue(t['standings']-.5,'click','Descargar imagen de goleadores')
cue(t['standings'],'movement','Clasificación del mismo torneo')
cue(t['tableExport'],'click','Abrir exportación de tabla')
cue(t['tableExport']+(t['public']-t['tableExport'])*.7/4.3,'click','Elegir Historia 9:16')
cue(t['tableExport']+(t['public']-t['tableExport'])*3.1/4.3,'click','Descargar imagen de clasificación')
cue(t['public'],'movement','Controles de consulta pública')
cue(t['public']+(t['publicView']-t['public'])*.65/2.2,'click','Habilitar consulta pública')
cue(t['public']+(t['publicView']-t['public'])*1.5/2.2,'click','Copiar enlace')
cue(t['publicView'],'movement','Consultar clasificación pública')
cue(max(t['closing'],t['logoReveal']-1.55),'build_up','Preparar cierre de marca',min(1.55,t['logoReveal']-t['closing']))
cue(t['logoReveal'],'reveal','Logo oficial y Más allá del amateur')
c.sort(key=lambda x:x['t'])
(root/'video-a/cues.json').write_text(json.dumps(c,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'video-a/beat-sheet.json').write_text(json.dumps([{'start':s['start'],'end':s['end'],'id':s['id'],'text':s['text']} for s in a['segments']],ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'cues':len(c),'timeline':t,'speech_end':a['speech_end'],'max_interword_gap_s':a['max_interword_gap_s'],'silent_cuts':a['silent_cuts']},ensure_ascii=False,indent=2))
