(function () {
  let currentSlideIndex = 0;

  function getSlides() {
    return Array.from(document.querySelectorAll('#p19 [data-entry-slide]'));
  }

  function playSlideReveal(slide) {
    if (!slide) return;

    const revealTargets = Array.from(slide.querySelectorAll('[data-entry-reveal]'));
    slide.classList.remove('is-revealing');

    revealTargets.forEach((target, targetIndex) => {
      target.style.setProperty('--entry-reveal-delay', `${160 + targetIndex * 250}ms`);
    });

    void slide.offsetWidth;
    slide.classList.add('is-revealing');
  }

  function setEntrySlide(index) {
    const slides = getSlides();
    const dots = Array.from(document.querySelectorAll('#p19 .entry-intro-dots span'));
    const prevButton = document.querySelector('#p19 [data-entry-prev]');
    const nextButton = document.querySelector('#p19 [data-entry-next]');

    if (!slides.length) return;

    currentSlideIndex = Math.max(0, Math.min(index, slides.length - 1));

    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle('is-active', slideIndex === currentSlideIndex);
      slide.classList.toggle('is-before', slideIndex < currentSlideIndex);
      slide.classList.toggle('is-after', slideIndex > currentSlideIndex);
      slide.classList.remove('is-revealing');
    });

    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === currentSlideIndex);
    });

    if (prevButton) {
      prevButton.disabled = currentSlideIndex === 0;
      prevButton.classList.toggle('is-disabled', currentSlideIndex === 0);
    }

    const nextChevron = document.querySelector('#p19 [data-entry-next-chevron]');
    const skipButton = document.querySelector('#p19 .entry-intro-skip');
    const isLast = currentSlideIndex === slides.length - 1;

    if (nextButton) {
      nextButton.textContent = isLast ? '시작하기' : '다음';
    }

    if (nextChevron) {
      nextChevron.classList.toggle('is-hidden', isLast);
    }

    if (skipButton) {
      skipButton.classList.toggle('is-hidden', isLast);
    }

    window.requestAnimationFrame(() => {
      playSlideReveal(slides[currentSlideIndex]);
    });
  }

  window.p19PrevSlide = function () {
    setEntrySlide(currentSlideIndex - 1);
  };

  window.p19NextSlide = function () {
    const slides = getSlides();

    if (currentSlideIndex >= slides.length - 1) {
      goTo('p2');
      return;
    }

    setEntrySlide(currentSlideIndex + 1);
  };

  function renderPreviewGrid(attempt) {
    const previewGrid = document.getElementById('p19-preview-grid');
    if (!previewGrid) return;

    if (typeof window.renderKnitPreviewGrid === 'function') {
      window.renderKnitPreviewGrid(previewGrid);
      return;
    }

    if (attempt < 8) {
      setTimeout(() => renderPreviewGrid(attempt + 1), 120);
    }
  }

  window.page_S19 = {
    render: function () {
      setEntrySlide(0);
      renderPreviewGrid(0);
    }
  };
}());
