// Reset password confirmation page specific JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    const resetConfirmForm = document.getElementById('reset-confirm-form');
    const resetConfirmMessage = document.getElementById('reset-confirm-message');
    const invalidLinkMessage = document.getElementById('invalid-link-message');
    const successMessage = document.getElementById('success-message');
    
    // Function to show appropriate content
    function showContent(type) {
        resetConfirmForm.style.display = 'none';
        invalidLinkMessage.style.display = 'none';
        successMessage.style.display = 'none';
        
        if (type === 'form') {
            resetConfirmForm.style.display = 'block';
        } else if (type === 'invalid') {
            invalidLinkMessage.style.display = 'block';
        } else if (type === 'success') {
            successMessage.style.display = 'block';
        }
    }
    
    try {
        // Get URL parameters
        const url = new URL(window.location.href);
        const token = url.searchParams.get('token');
        const type = url.searchParams.get('type');
        
        // Check if token and type exist
        if (!token || type !== 'recovery') {
            showContent('invalid');
            return;
        }
        
        // Show the form
        showContent('form');
        
        // Handle form submission
        if (resetConfirmForm) {
            resetConfirmForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Get form data
                const newPassword = document.getElementById('new-password').value;
                const confirmPassword = document.getElementById('confirm-password').value;
                
                // Validate form data
                if (!newPassword || !confirmPassword) {
                    showMessage('error', 'Please fill in all fields.', 'reset-confirm-message');
                    return;
                }
                
                if (newPassword !== confirmPassword) {
                    showMessage('error', 'Passwords do not match.', 'reset-confirm-message');
                    return;
                }
                
                if (newPassword.length < 6) {
                    showMessage('error', 'Password must be at least 6 characters long.', 'reset-confirm-message');
                    return;
                }
                
                // Show loading message
                showMessage('info', 'Updating your password...', 'reset-confirm-message');
                
                try {
                    // Verify the token with Supabase
                    const { error: verifyError } = await supabase.auth.verifyOtp({
                        token_hash: token,
                        type: 'recovery'
                    });
                    
                    if (verifyError) {
                        console.error('Error verifying token:', verifyError);
                        showMessage('error', 'The password reset link is invalid or has expired.', 'reset-confirm-message');
                        return;
                    }
                    
                    // Update the password
                    const { error: updateError } = await updatePassword(newPassword);
                    
                    if (updateError) {
                        console.error('Error updating password:', updateError);
                        showMessage('error', updateError.message, 'reset-confirm-message');
                        return;
                    }
                    
                    // Password updated successfully
                    showContent('success');
                } catch (error) {
                    console.error('Error in password reset:', error);
                    showMessage('error', 'An error occurred. Please try again.', 'reset-confirm-message');
                }
            });
        }
    } catch (error) {
        console.error('Error in password reset confirmation:', error);
        showContent('invalid');
    }
}); 