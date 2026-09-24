let v = await p.see();
out('banner visible on mainland?', v.objectiveVisible, v.objective, 'arrow', v.arrow);
if (v.objectiveVisible && /Board the skiff/.test(v.objective || '')) await p.note('low', 'Veyhollow Commons arrival 0,18', 'After landing on the mainland the objective banner still reads "Board the skiff at Departure Dock."', 'The banner should clear or show the first mainland objective.');
await look('mainland-final');
// EXIT
