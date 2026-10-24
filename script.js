/* Native controls work without JavaScript. Respect reduced motion before autoplay. */
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const animatedVideo = document.querySelector('video[data-animate]');

if (animatedVideo) {
  if (!motionPreference.matches) {
    animatedVideo.play().catch(() => {
      // If autoplay is blocked, the poster and native play control remain available.
    });
  }
  motionPreference.addEventListener('change', (event) => {
    if (event.matches) animatedVideo.pause();
  });
}
