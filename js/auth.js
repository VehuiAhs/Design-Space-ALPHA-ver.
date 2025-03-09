// Initialize Supabase client
let supabase;

// Function to initialize Supabase client
async function initializeSupabase() {
    try {
        // Make sure SUPABASE_CONFIG is defined
        if (typeof SUPABASE_CONFIG === 'undefined') {
            throw new Error('SUPABASE_CONFIG is not defined. Make sure config.js is loaded before auth.js');
        }
        
        // Get Supabase credentials from config
        const SUPABASE_URL = SUPABASE_CONFIG.SUPABASE_URL;
        const SUPABASE_KEY = SUPABASE_CONFIG.SUPABASE_KEY;
        
        // Validate credentials
        if (!SUPABASE_URL || !SUPABASE_KEY) {
            throw new Error('Supabase credentials are missing. Please check your config.js file.');
        }
        
        // Create Supabase client
        supabase = supabaseJs.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );
        
        console.log('Supabase client initialized successfully');
        
        // Check if user is already logged in
        checkUser();
        
        return supabase;
    } catch (error) {
        console.error('Error initializing Supabase client:', error);
        showMessage('error', 'Failed to initialize authentication. Please check your Supabase configuration.');
    }
}

// Function to check if user is logged in
async function checkUser() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            // User is logged in
            updateUIForLoggedInUser(user);
        } else {
            // User is not logged in
            updateUIForLoggedOutUser();
        }
    } catch (error) {
        console.error('Error checking user:', error);
    }
}

// Function to update UI for logged in user
function updateUIForLoggedInUser(user) {
    // Update navigation
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.style.display = 'block';
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Hide Sign In and Sign Up links in navigation
    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => {
        if (link.href.includes('signin.html') || link.href.includes('signup.html')) {
            link.parentElement.style.display = 'none';
        }
    });
    
    // Update user content if on home page
    const userContent = document.getElementById('user-content');
    const publicContent = document.getElementById('public-content');
    
    if (userContent && publicContent) {
        userContent.style.display = 'block';
        publicContent.style.display = 'none';
        
        // Update user information
        document.getElementById('user-email').textContent = user.email;
        document.getElementById('display-email').textContent = user.email;
        document.getElementById('user-id').textContent = user.id;
        document.getElementById('last-sign-in').textContent = new Date(user.last_sign_in_at).toLocaleString();
    }
    
    // Hide auth buttons if on home page
    const ctaButtons = document.querySelector('.cta-buttons');
    if (ctaButtons) {
        ctaButtons.style.display = 'none';
    }
}

// Function to update UI for logged out user
function updateUIForLoggedOutUser() {
    // Update navigation
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.style.display = 'none';
    }
    
    // Show Sign In and Sign Up links in navigation
    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => {
        if (link.href.includes('signin.html') || link.href.includes('signup.html')) {
            link.parentElement.style.display = 'list-item';
        }
    });
    
    // Update content if on home page
    const userContent = document.getElementById('user-content');
    const publicContent = document.getElementById('public-content');
    
    if (userContent && publicContent) {
        userContent.style.display = 'none';
        publicContent.style.display = 'block';
    }
    
    // Show auth buttons if on home page
    const ctaButtons = document.querySelector('.cta-buttons');
    if (ctaButtons) {
        ctaButtons.style.display = 'flex';
    }
}

// Function to handle user sign up
async function signUp(email, password) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error signing up:', error);
        return { data: null, error };
    }
}

// Function to handle user sign in
async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error signing in:', error);
        return { data: null, error };
    }
}

// Function to handle user logout
async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        // Redirect to home page
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error signing out:', error);
        showMessage('error', 'Failed to sign out. Please try again.');
    }
}

// Function to handle password reset request
async function resetPassword(email) {
    try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password-confirm.html',
        });
        
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error requesting password reset:', error);
        return { data: null, error };
    }
}

// Function to update password
async function updatePassword(newPassword) {
    try {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (error) throw error;
        
        return { data, error: null };
    } catch (error) {
        console.error('Error updating password:', error);
        return { data: null, error };
    }
}

// Function to show message
function showMessage(type, text, elementId = null) {
    // Default message elements based on page
    const messageElements = {
        'signup-message': document.getElementById('signup-message'),
        'signin-message': document.getElementById('signin-message'),
        'reset-message': document.getElementById('reset-message'),
        'confirm-message': document.getElementById('confirm-message')
    };
    
    // Get the message element
    let messageElement;
    
    if (elementId) {
        messageElement = document.getElementById(elementId);
    } else {
        // Try to find a message element on the current page
        for (const [id, element] of Object.entries(messageElements)) {
            if (element) {
                messageElement = element;
                break;
            }
        }
    }
    
    if (!messageElement) return;
    
    // Set message content and style
    messageElement.textContent = text;
    messageElement.className = `message ${type}`;
    messageElement.style.display = 'block';
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 5000);
    }
}

// Initialize Supabase when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure config.js is fully loaded
    setTimeout(initializeSupabase, 100);
}); 