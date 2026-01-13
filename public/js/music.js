// Professional Music Player with Controls
document.addEventListener('DOMContentLoaded', () => {
  const audio = new Audio('/path/to/your/music.mp3'); // Add your music file
  const playBtn = document.createElement('button');
  playBtn.className = 'music-btn';
  playBtn.innerHTML = '<i class="fas fa-play"></i> Play Music';
  playBtn.style.position = 'fixed';
  playBtn.style.bottom = '20px';
  playBtn.style.left = '20px';
  playBtn.style.background = 'linear-gradient(45deg, #ff69b4, #00ced1)';
  playBtn.style.color = 'white';
  playBtn.style.border = 'none';
  playBtn.style.padding = '15px';
  playBtn.style.borderRadius = '30px';
  playBtn.style.cursor = 'pointer';
  playBtn.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
  playBtn.style.transition = 'all 0.3s';
  playBtn.style.zIndex = '20';
  document.body.appendChild(playBtn);

  playBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play();
      playBtn.innerHTML = '<i class="fas fa-pause"></i> Pause Music';
    } else {
      audio.pause();
      playBtn.innerHTML = '<i class="fas fa-play"></i> Play Music';
    }
  });

  playBtn.addEventListener('mouseover', () => playBtn.style.transform = 'scale(1.1)');
  playBtn.addEventListener('mouseout', () => playBtn.style.transform = 'scale(1)');
});
