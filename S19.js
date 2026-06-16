(function () {
  let currentSlideIndex = 0;

  function getSlides() {
    return Array.from(document.querySelectorAll('#p19 [data-entry-slide]'));
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
    });

    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === currentSlideIndex);
    });

    if (prevButton) {
      prevButton.disabled = currentSlideIndex === 0;
      prevButton.classList.toggle('is-disabled', currentSlideIndex === 0);
    }

    if (nextButton) {
      nextButton.textContent = currentSlideIndex === slides.length - 1 ? '입장하기' : '다음';
    }
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
