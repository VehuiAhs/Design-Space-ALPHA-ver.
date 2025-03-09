// Sign-in page specific JavaScript
document.addEventListener('DOMContentLoaded', () => {
    const signinForm = document.getElementById('signin-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('remember-me');
    
    // Check for saved email in localStorage
    if (emailInput && localStorage.getItem('rememberedEmail')) {
        emailInput.value = localStorage.getItem('rememberedEmail');
        if (rememberMeCheckbox) {
            rememberMeCheckbox.checked = true;
        }
    }
    
    // Add real-time validation
    if (emailInput) {
        emailInput.addEventListener('blur', () => {
            validateEmail(emailInput.value);
        });
    }
    
    // Email validation function
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            emailInput.setCustomValidity('Please enter a valid email address');
            return false;
        } else {
            emailInput.setCustomValidity('');
            return true;
        }
    }
    
    // Form submission
    if (signinForm) {
        signinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form data
            const email = emailInput.value;
            const password = passwordInput.value;
            
            // Validate form data
            if (!email || !password) {
                showMessage('error', 'Please fill in all fields.');
                return;
            }
            
            if (!validateEmail(email)) {
                showMessage('error', 'Please enter a valid email address.');
                return;
            }
            
            // Save email to localStorage if remember me is checked
            if (rememberMeCheckbox && rememberMeCheckbox.checked) {
                localStorage.setItem('rememberedEmail', email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }
            
            // Disable form submission while processing
            const submitButton = signinForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner"></span> Signing in...';
            
            // Show loading message
            showMessage('info', 'Signing in...');
            
            // Sign in user
            const { data, error } = await signIn(email, password);
            
            // Re-enable form submission
            submitButton.disabled = false;
            submitButton.textContent = 'Sign In';
            
            if (error) {
                showMessage('error', error.message);
                return;
            }
            
            // Sign in successful
            showMessage('success', 'Sign in successful! Redirecting to home page...');
            
            // Redirect to home page after 1 second
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        });
    }
}); 