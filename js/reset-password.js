// Reset password page specific JavaScript
document.addEventListener('DOMContentLoaded', () => {
    const resetForm = document.getElementById('reset-form');
    
    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form data
            const email = document.getElementById('email').value;
            
            // Validate form data
            if (!email) {
                showMessage('error', 'Please enter your email address.');
                return;
            }
            
            // Show loading message
            showMessage('info', 'Sending password reset link...');
            
            // Send password reset email
            const { error } = await resetPassword(email);
            
            if (error) {
                showMessage('error', error.message);
                return;
            }
            
            // Password reset email sent
            showMessage('success', 'Password reset link has been sent to your email.');
            
            // Clear form
            resetForm.reset();
        });
    }
}); 