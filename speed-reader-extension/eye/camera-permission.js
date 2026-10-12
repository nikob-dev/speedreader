// Offscreen documents can't show a permission prompt, so this visible
// extension page asks once; the grant then applies to the whole extension origin.
document.getElementById('allow').addEventListener('click', async () => {
  const status = document.getElementById('status');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
    status.textContent = 'Camera allowed. Returning to the reader…';
    await chrome.runtime.sendMessage({ type: 'eye:permission-granted' });
    window.close();
  } catch (err) {
    console.error('Speed Reader attention: camera permission request failed', err);
    status.textContent = `Camera access was not granted (${err.name}). Attention tracking stays off.`;
  }
});
