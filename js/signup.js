// Sign-up page specific JavaScript
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    
    // Add password strength meter
    const passwordStrengthMeter = document.createElement('div');
    passwordStrengthMeter.className = 'password-strength-meter';
    passwordStrengthMeter.innerHTML = `
        <div class="strength-bar">
            <div class="strength-level" id="strength-level"></div>
        </div>
        <div class="strength-text" id="strength-text">Password strength</div>
    `;
    
    // Insert password strength meter after password input
    if (passwordInput) {
        passwordInput.parentNode.insertBefore(passwordStrengthMeter, passwordInput.nextSibling);
    }
    
    // Function to check password strength
    function checkPasswordStrength(password) {
        // Initialize variables
        let strength = 0;
        let feedback = '';
        
        // Check password length
        if (password.length >= 8) {
            strength += 1;
        }
        
        // Check for mixed case
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) {
            strength += 1;
        }
        
        // Check for numbers
        if (password.match(/\d/)) {
            strength += 1;
        }
        
        // Check for special characters
        if (password.match(/[^a-zA-Z\d]/)) {
            strength += 1;
        }
        
        // Determine strength text and color
        let strengthLevel = document.getElementById('strength-level');
        let strengthText = document.getElementById('strength-text');
        
        if (password.length === 0) {
            strengthLevel.style.width = '0%';
            strengthLevel.style.backgroundColor = '#e2e8f0';
            strengthText.textContent = 'Password strength';
            strengthText.style.color = '#666';
        } else if (strength < 2) {
            strengthLevel.style.width = '25%';
            strengthLevel.style.backgroundColor = '#e53e3e';
            strengthText.textContent = 'Weak';
            strengthText.style.color = '#e53e3e';
            feedback = 'Try adding numbers, symbols, and mixed case letters.';
        } else if (strength === 2) {
            strengthLevel.style.width = '50%';
            strengthLevel.style.backgroundColor = '#dd6b20';
            strengthText.textContent = 'Fair';
            strengthText.style.color = '#dd6b20';
            feedback = 'Try adding more types of characters.';
        } else if (strength === 3) {
            strengthLevel.style.width = '75%';
            strengthLevel.style.backgroundColor = '#38a169';
            strengthText.textContent = 'Good';
            strengthText.style.color = '#38a169';
        } else {
            strengthLevel.style.width = '100%';
            strengthLevel.style.backgroundColor = '#3ecf8e';
            strengthText.textContent = 'Strong';
            strengthText.style.color = '#3ecf8e';
        }
        
        return { strength, feedback };
    }
    
    // Add real-time validation
    if (emailInput) {
        emailInput.addEventListener('blur', () => {
            validateEmail(emailInput.value);
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            const { strength, feedback } = checkPasswordStrength(passwordInput.value);
            
            // Update feedback small text
            let feedbackElement = document.getElementById('password-feedback');
            if (!feedbackElement && feedback) {
                feedbackElement = document.createElement('small');
                feedbackElement.id = 'password-feedback';
                passwordInput.parentNode.appendChild(feedbackElement);
            }
            
            if (feedbackElement) {
                feedbackElement.textContent = feedback;
            }
        });
    }
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', () => {
            if (passwordInput.value !== confirmPasswordInput.value) {
                confirmPasswordInput.setCustomValidity("Passwords don't match");
            } else {
                confirmPasswordInput.setCustomValidity('');
            }
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
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form data
            const email = emailInput.value;
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            
            // Validate form data
            if (!email || !password || !confirmPassword) {
                showMessage('error', 'Please fill in all fields.');
                return;
            }
            
            if (!validateEmail(email)) {
                showMessage('error', 'Please enter a valid email address.');
                return;
            }
            
            if (password !== confirmPassword) {
                showMessage('error', 'Passwords do not match.');
                return;
            }
            
            if (password.length < 6) {
                showMessage('error', 'Password must be at least 6 characters long.');
                return;
            }
            
            // Disable form submission while processing
            const submitButton = signupForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner"></span> Creating account...';
            
            // Show loading message
            showMessage('info', 'Creating your account...');
            
            // Sign up user
            const { data, error } = await signUp(email, password);
            
            // Re-enable form submission
            submitButton.disabled = false;
            submitButton.textContent = 'Create Account';
            
            if (error) {
                showMessage('error', error.message);
                return;
            }
            
            // Check if email confirmation is required
            if (data?.user && data?.session) {
                // Auto sign-in (email confirmation not required)
                showMessage('success', 'Account created successfully! Redirecting to home page...');
                
                // Redirect to home page after 2 seconds
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                // Email confirmation required
                showMessage('success', 'Account created! Please check your email to confirm your account.');
                
                // Clear form
                signupForm.reset();
            }
        });
    }
}); 