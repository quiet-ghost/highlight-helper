const input = document.getElementById('cartInput');
const resetButton = document.getElementById('resetButton');
const darkModeToggle = document.getElementById('darkModeToggle');
// Select all list items under any ul within the container
const items = document.querySelectorAll('.container ul li');

// Initialize each item's original text and counter
items.forEach(item => {
  if (!item.dataset.originalText) {
    item.dataset.originalText = item.textContent.trim();
    item.dataset.count = 0;
  }
});

function updateDisplay(item) {
  const count = parseInt(item.dataset.count);
  // Append multiplier text only if count > 1
  item.textContent = item.dataset.originalText + (count > 1 ? " x" + count : "");
}

input.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const query = input.value.trim();
    items.forEach(item => {
      if (item.getAttribute('data-cart') === query || item.dataset.originalText === query) {
        if (!item.classList.contains('selected')) {
          item.classList.add('selected');
          item.dataset.count = 1;
          updateDisplay(item);
          item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // Already selected — increment counter
          item.dataset.count = parseInt(item.dataset.count) + 1;
          updateDisplay(item);
          item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
    input.value = '';
  }
});

items.forEach(item => {
  item.addEventListener('click', function() {
    if (!item.classList.contains('selected')) {
      item.classList.add('selected');
      item.dataset.count = 1;
    } else {
      // Increment counter if already selected
      item.dataset.count = parseInt(item.dataset.count) + 1;
    }
    updateDisplay(item);
  });
});

// New: Right-click (contextmenu) event to deselect an individual cart
items.forEach(item => {
  item.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    // Remove selection and reset counter & text
    item.classList.remove('selected');
    item.dataset.count = 0;
    item.textContent = item.dataset.originalText;
  });
});

// Improved long press support for mobile with movement threshold
items.forEach(item => {
  let timer = null;
  let startX = 0;
  let startY = 0;
  
  item.addEventListener('touchstart', function(e) {
    e.preventDefault();
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    timer = setTimeout(() => {
      if (item.classList.contains('selected')) {
        item.classList.remove('selected');
        item.dataset.count = 0;
        updateDisplay(item);
      }
    }, 800);
  }, false);
  
  item.addEventListener('touchmove', function(e) {
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - startX);
    const deltaY = Math.abs(touch.clientY - startY);
    if (deltaX > 10 || deltaY > 10) {
      clearTimeout(timer);
    }
  }, false);
  
  item.addEventListener('touchend', function() {
    clearTimeout(timer);
  }, false);
});

resetButton.addEventListener('click', function() {
  input.value = '';
  items.forEach(item => {
    item.classList.remove('selected');
    item.dataset.count = 0;
    // Reset text to original
    item.textContent = item.dataset.originalText;
  });
});

darkModeToggle.addEventListener('click', function() {
  document.body.classList.toggle('dark-mode');
});
