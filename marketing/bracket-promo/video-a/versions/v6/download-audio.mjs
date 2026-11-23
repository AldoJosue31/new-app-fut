// Acquire the selected recordings for this local project only. Read LICENCE-REVIEW.md first.
import fs from 'node:fs';
const inputs=[
 ['https://assets.mixkit.co/music/130/130.mp3','mixkit-130-tech-house-vibes.mp3'],
 ['https://assets.mixkit.co/active_storage/sfx/1392/1392-preview.mp3','mixkit-1392-typing.mp3'],
];
for(const[url,name]of inputs){const output=new URL('../assets/audio/'+name,import.meta.url);if(fs.existsSync(output))continue;const result=await fetch(url);if(!result.ok)throw new Error(`Audio acquisition failed: ${result.status}`);fs.writeFileSync(output,Buffer.from(await result.arrayBuffer()));console.log('Downloaded licensed project input:',name);}
