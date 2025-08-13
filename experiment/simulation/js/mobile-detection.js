// Mobile Detection and Overlay Script
// This script detects mobile devices and shows a desktop optimization warning

class MobileDetection {
  constructor() {
    console.log('MobileDetection constructor called');
    this.isMobile = this.detectMobile();
    this.overlayShown = false;
    console.log('MobileDetection initialized, isMobile:', this.isMobile);
    this.init();
  }

  detectMobile() {
    console.log('detectMobile() called');
    
    // Check for mobile user agents
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // Mobile device patterns
    const mobilePatterns = [
      /Android/i,
      /webOS/i,
      /iPhone/i,
      /iPad/i,
      /iPod/i,
      /BlackBerry/i,
      /Windows Phone/i,
      /Opera Mini/i,
      /IEMobile/i,
      /Mobile/i
    ];

    // Check screen size (primary check)
    const isSmallScreen = window.innerWidth <= 1200; // Lower threshold for testing
    
    // Check touch capability
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Return true if any mobile pattern matches OR if it's a small screen
    const result = mobilePatterns.some(pattern => pattern.test(userAgent)) || isSmallScreen;
    
    // Debug logging
    console.log('Mobile Detection Debug:', {
      userAgent: userAgent,
      isSmallScreen: isSmallScreen,
      isTouchDevice: isTouchDevice,
      result: result,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight
    });
    
    return result;
  }

  init() {
    console.log('init() called, isMobile:', this.isMobile, 'overlayShown:', this.overlayShown);
    
    if (this.isMobile && !this.overlayShown) {
      console.log('Should show overlay');
      this.showOverlay();
    } else {
      console.log('Not showing overlay');
    }
  }

  showOverlay() {
    console.log('showOverlay() called');
    
    if (this.overlayShown) {
      console.log('Overlay already shown, returning');
      return;
    }
    
    this.overlayShown = true;
    console.log('Creating overlay...');

    // Create overlay HTML
    const overlay = document.createElement('div');
    overlay.id = 'mobile-warning-overlay';
    overlay.innerHTML = `
      <div class="mobile-overlay-backdrop">
        <div class="mobile-overlay-content">
          <div class="mobile-overlay-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7V10C2 16 6 20.5 12 22C18 20.5 22 16 22 10V7L12 2Z" stroke="#f59e0b" stroke-width="2" fill="#fef3c7"/>
              <path d="M12 8V13M12 16H12.01" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <h2 class="mobile-overlay-title">Desktop Experience Recommended</h2>
          <p class="mobile-overlay-description">
            This word generation experiment is optimized for desktop computers with larger screens and mouse interaction. 
            While you can continue on mobile, you may experience:
          </p>
          <ul class="mobile-overlay-list">
            <li>• Difficulty interacting with complex word forms</li>
            <li>• Limited screen space for morphological features</li>
            <li>• Reduced functionality for feature selection</li>
            <li>• Suboptimal user experience</li>
          </ul>
          <div class="mobile-overlay-actions">
            <button class="mobile-overlay-btn mobile-overlay-btn-primary" id="continueBtn">
              Continue Anyway
            </button>
            <button class="mobile-overlay-btn mobile-overlay-btn-secondary" id="goBackBtn">
              Use Desktop Instead
            </button>
          </div>
          <p class="mobile-overlay-footer">
            For the best learning experience, please access this on a desktop or laptop computer.
          </p>
        </div>
      </div>
    `;

    // Add event listeners to buttons
    overlay.addEventListener('click', (e) => {
      if (e.target.id === 'continueBtn') {
        this.continueAnyway();
      } else if (e.target.id === 'goBackBtn') {
        this.goBack();
      }
    });

    // Add to body
    document.body.appendChild(overlay);
    console.log('Overlay added to body');
    
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
  }

  continueAnyway() {
    console.log('continueAnyway() called');
    this.hideOverlay();
  }

  goBack() {
    console.log('goBack() called');
    // Try to go back in history, or redirect to a homepage if available
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // You can customize this to redirect to your main page
      alert('Please bookmark this page and open it on a desktop computer for the best experience.');
    }
  }

  hideOverlay() {
    console.log('hideOverlay() called');
    const overlay = document.getElementById('mobile-warning-overlay');
    if (overlay) {
      overlay.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => {
        overlay.remove();
        document.body.style.overflow = '';
        console.log('Overlay removed');
      }, 300);
    }
  }
}

// Wait for DOM to be ready
console.log('DOM ready state:', document.readyState);

if (document.readyState === 'loading') {
  console.log('DOM still loading, adding event listener');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired');
    initializeMobileDetection();
  });
} else {
  console.log('DOM already loaded, initializing immediately');
  initializeMobileDetection();
}

function initializeMobileDetection() {
  console.log('Initializing mobile detection...');
  
  try {
    const mobileDetection = new MobileDetection();
    window.mobileDetection = mobileDetection;
    console.log('✓ Mobile detection initialized successfully');
    console.log('Global object set:', window.mobileDetection);
  } catch (error) {
    console.error('✗ Error initializing mobile detection:', error);
  }
}

// Test function for debugging
window.testMobileDetection = function() {
  console.log('=== Manual Test ===');
  console.log('window.mobileDetection:', window.mobileDetection);
  
  if (window.mobileDetection) {
    console.log('Testing overlay...');
    window.mobileDetection.showOverlay();
  } else {
    console.log('Mobile detection not available');
  }
};

console.log('=== Mobile Detection Script Loaded ==='); 