// Home page specific JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS animation library with enhanced settings
    AOS.init({
        duration: 1000,
        easing: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
        once: false,
        mirror: true,
        anchorPlacement: 'center-bottom'
    });

    // Initialize Three.js scene for 3D effects
    let scene, camera, renderer;
    const init3DEffects = () => {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.querySelector('.features-section').appendChild(renderer.domElement);
        
        // Add pixelated geometry
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ff00,
            wireframe: true,
            transparent: true,
            opacity: 0.5
        });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        
        // Add lighting
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(0, 0, 5);
        scene.add(light);
        
        camera.position.z = 5;
        
        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;
            renderer.render(scene, camera);
        };
        animate();
    };
    
    // Initialize if WebGL is supported
    if (window.WebGLRenderingContext) {
        init3DEffects();
    }

    // Enhanced parallax effect with pixelation
    const parallaxSections = document.querySelectorAll('.parallax-section');
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        
        parallaxSections.forEach(section => {
            const speed = section.dataset.speed || 0.5;
            const yPos = -(scrolled * speed);
            const pixelSize = Math.max(2, Math.abs(scrolled - section.offsetTop) / 100);
            section.style.transform = `translate3d(0, ${yPos}px, 0)`;
            section.style.filter = `pixelate(${pixelSize}px)`;
        });

        // Enhanced hero hologram effect with combined parallax
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            const distortion = Math.sin(scrolled * 0.002) * 5;
            const parallaxOffset = scrolled * 0.3;
            heroContent.style.transform = `
                translateY(${parallaxOffset}px)
                skew(0deg, ${distortion}deg)
            `;
            heroContent.style.filter = `
                hue-rotate(${scrolled * 0.1}deg)
                brightness(${1 + Math.sin(scrolled * 0.001) * 0.2})
            `;
        }

        // Features parallax effect
        const featuresSection = document.querySelector('.features-section');
        if (featuresSection) {
            const featureOffset = featuresSection.offsetTop;
            const featureParallax = (scrolled - featureOffset) * 0.4;
            if (scrolled > featureOffset - window.innerHeight && scrolled < featureOffset + featuresSection.offsetHeight) {
                featuresSection.querySelector('.features-parallax-bg').style.transform = 
                    `translateY(${featureParallax}px) translateZ(-1px) scale(2)`;
            }
        }

        // CTA parallax effect
        const ctaSection = document.querySelector('.cta-section');
        if (ctaSection) {
            const ctaOffset = ctaSection.offsetTop;
            const ctaParallax = (scrolled - ctaOffset) * 0.5;
            if (scrolled > ctaOffset - window.innerHeight && scrolled < ctaOffset + ctaSection.offsetHeight) {
                ctaSection.querySelector('.cta-parallax-bg').style.transform = 
                    `translateY(${ctaParallax}px) translateZ(-1.5px) scale(2.5)`;
            }
        }
    });
    
    // Hologram glitch effect
    const applyGlitchEffect = (element) => {
        setInterval(() => {
            if (Math.random() > 0.95) {
                const intensity = Math.random() * 10;
                element.style.transform = `
                    translate(${Math.random() * intensity - intensity/2}px, 
                    ${Math.random() * intensity - intensity/2}px)
                    scale(${1 + Math.random() * 0.1})
                `;
                element.style.filter = `
                    hue-rotate(${Math.random() * 360}deg)
                    brightness(${1.5 + Math.random() * 0.5})
                `;
                
                setTimeout(() => {
                    element.style.transform = 'none';
                    element.style.filter = 'none';
                }, 50);
            }
        }, 100);
    };

    // Apply hologram effects to feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        applyGlitchEffect(card);
        
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px) scale(1.05)';
            card.style.boxShadow = '0 15px 30px rgba(0, 255, 255, 0.2)';
            card.classList.add('hologram-active');
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'none';
            card.style.boxShadow = 'none';
            card.classList.remove('hologram-active');
        });
    });

    // Header scroll effect
    const header = document.querySelector('.main-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
    
    // Get DOM elements
    const getStartedBtn = document.querySelector('.hero-buttons .primary-btn');
    const getStartedCtaBtn = document.querySelector('.cta-section .primary-btn');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.getElementById('nav-menu');
    const featureCards = document.querySelectorAll('.feature-card');
    
    // Function to update Get Started buttons based on auth state
    function updateGetStartedButtons(user) {
        const buttons = [getStartedBtn, getStartedCtaBtn];
        
        buttons.forEach(button => {
            if (!button) return;
            
            if (user) {
                button.classList.remove('disabled');
                button.href = 'editor.html';
                button.title = '';
            } else {
                button.classList.add('disabled');
                button.href = 'signin.html';
                button.title = 'Please sign in to start designing';
            }
        });
    }
    
    // Mobile menu toggle
    if (mobileMenuToggle && mainNav) {
        mobileMenuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
        });
    }
    
    // Mobile dropdown toggle
    const dropdowns = document.querySelectorAll('.dropdown');
    
    dropdowns.forEach(dropdown => {
        const link = dropdown.querySelector('.nav-link');
        
        link.addEventListener('click', (e) => {
            // Only for mobile view
            if (window.innerWidth <= 768) {
                e.preventDefault();
                dropdown.classList.toggle('active');
            }
        });
    });
    
    // Template category buttons
    const categoryButtons = document.querySelectorAll('.category-btn');
    
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Here you would typically filter the templates
            // For now, we'll just add a simple animation
            const templates = document.querySelectorAll('.template-card');
            templates.forEach(template => {
                template.style.opacity = '0';
                template.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    template.style.opacity = '1';
                    template.style.transform = 'translateY(0)';
                }, 300);
            });
        });
    });
    
    // Pricing toggle
    const pricingToggle = document.getElementById('pricing-toggle');
    const monthlyPrices = ['0', '12.99', '30.99'];
    const yearlyPrices = ['0', '9.99', '24.99'];
    const priceElements = document.querySelectorAll('.amount');
    
    if (pricingToggle) {
        pricingToggle.addEventListener('change', () => {
            const isYearly = pricingToggle.checked;
            
            priceElements.forEach((element, index) => {
                // Animate price change
                element.style.transform = 'translateY(-10px)';
                element.style.opacity = '0';
                
                setTimeout(() => {
                    element.textContent = isYearly ? yearlyPrices[index] : monthlyPrices[index];
                    element.style.transform = 'translateY(0)';
                    element.style.opacity = '1';
                }, 200);
            });
            
            // Update period text
            const periodElements = document.querySelectorAll('.period');
            periodElements.forEach(element => {
                element.textContent = isYearly ? '/year' : '/month';
            });
        });
    }
    
    // Floating elements animation enhancement
    const floatingElements = document.querySelectorAll('.floating-element');
    
    floatingElements.forEach(element => {
        // Random movement
        setInterval(() => {
            const randomX = Math.random() * 10 - 5; // -5 to 5
            const randomY = Math.random() * 10 - 5; // -5 to 5
            
            element.style.transform = `translate(${randomX}px, ${randomY}px)`;
        }, 2000);
    });
    
    // Smooth parallax scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Highlight text animation
    const highlightText = document.querySelector('.hero-title .highlight');
    
    if (highlightText) {
        // Add a subtle pulse animation
        setInterval(() => {
            highlightText.style.transform = 'scale(1.05)';
            setTimeout(() => {
                highlightText.style.transform = 'scale(1)';
            }, 500);
        }, 3000);
    }
    
    // Template hover effect enhancement
    const templateCards = document.querySelectorAll('.template-card');
    
    templateCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px) scale(1.02)';
            card.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.1)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.boxShadow = '';
        });
    });
    
    // Feature cards hover effect enhancement
    featureCards.forEach(card => {
        const icon = card.querySelector('.feature-icon');
        
        card.addEventListener('mouseenter', () => {
            icon.style.transform = 'scale(1.1) rotate(5deg)';
            icon.style.backgroundColor = 'rgba(62, 207, 142, 0.2)';
        });
        
        card.addEventListener('mouseleave', () => {
            icon.style.transform = '';
            icon.style.backgroundColor = '';
        });
    });
    
    // Initialize Supabase and check auth state
    initializeSupabase().then(() => {
        // Subscribe to auth state changes
        supabase.auth.onAuthStateChange((event, session) => {
            updateGetStartedButtons(session?.user);
        });
        
        // Initial check for auth state
        supabase.auth.getUser().then(({ data: { user } }) => {
            updateGetStartedButtons(user);
        });
    });
    
    // This will be called after auth.js has initialized Supabase
    // and checked if the user is logged in
    console.log('Home page loaded');
}); 