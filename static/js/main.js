/**
 * VisaPredict AI - Main JavaScript
 * Handles animations, form interactions, and visual effects
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all modules
    initParticles();
    initFormValidation();
    initFormSubmission();
    initScrollAnimations();
});

/**
 * Floating Particles Animation
 * Creates an AI-themed animated background
 */
function initParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;

    const particleCount = 50;
    const colors = ['#06b6d4', '#8b5cf6', '#3b82f6'];

    for (let i = 0; i < particleCount; i++) {
        createParticle(particlesContainer, colors);
    }
}

function createParticle(container, colors) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random properties
    const size = Math.random() * 4 + 2;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 15;
    const duration = Math.random() * 10 + 15;
    
    particle.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        left: ${left}%;
        bottom: -10px;
        animation-delay: ${delay}s;
        animation-duration: ${duration}s;
        box-shadow: 0 0 ${size * 2}px ${color};
    `;
    
    container.appendChild(particle);
}

/**
 * Form Validation
 * Real-time validation with visual feedback
 */
function initFormValidation() {
    const form = document.getElementById('visaForm');
    if (!form) return;

    const inputs = form.querySelectorAll('.form-control');
    
    inputs.forEach(input => {
        // Add focus effects
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
            validateInput(this);
        });
        
        // Real-time validation for number inputs
        if (input.type === 'number') {
            input.addEventListener('input', function() {
                validateNumberInput(this);
            });
        }
    });
}

function validateInput(input) {
    const value = input.value.trim();
    const isValid = value !== '' && input.checkValidity();
    
    input.classList.remove('valid', 'invalid');
    
    if (value !== '') {
        input.classList.add(isValid ? 'valid' : 'invalid');
    }
}

function validateNumberInput(input) {
    const value = parseFloat(input.value);
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    
    input.classList.remove('valid', 'invalid');
    
    if (input.value !== '') {
        if (value >= min && value <= max) {
            input.classList.add('valid');
        } else {
            input.classList.add('invalid');
        }
    }
}

/**
 * Form Submission
 * Loading animation during processing
 */
function initFormSubmission() {
    const form = document.getElementById('visaForm');
    const submitBtn = document.getElementById('submitBtn');
    
    if (!form || !submitBtn) return;
    
    form.addEventListener('submit', function(e) {
        // Add loading state
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        
        // Allow form to submit normally
        // The loading state provides visual feedback during the POST request
    });
}

/**
 * Scroll Animations
 * Animate elements as they enter viewport
 */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        observer.observe(card);
    });
}

// Add CSS for animation classes dynamically
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    .form-control.valid {
        border-color: #10b981 !important;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
    }
    
    .form-control.invalid {
        border-color: #ef4444 !important;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
    }
    
    .animate-in {
        animation: fadeInUp 0.6s ease forwards;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .select-wrapper.focused .form-control {
        border-color: #06b6d4;
        box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
    }
`;
document.head.appendChild(animationStyles);

/**
 * Utility: Smooth scroll to result
 * Auto-scrolls to result section after prediction
 */
function scrollToResult() {
    const resultSection = document.querySelector('.result-section');
    if (resultSection) {
        setTimeout(() => {
            resultSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }, 300);
    }
}

// Auto-scroll to result if present on page load
if (document.querySelector('.result-section')) {
    scrollToResult();
}
