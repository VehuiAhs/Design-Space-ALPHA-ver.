// Email confirmation page specific JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    // Get the confirmation message element
    const confirmMessage = document.getElementById('confirm-message');
    const successContent = document.getElementById('success-content');
    const errorContent = document.getElementById('error-content');
    
    // Function to show appropriate content
    function showContent(isSuccess) {
        confirmMessage.style.display = 'none';
        
        if (isSuccess) {
            successContent.style.display = 'block';
            errorContent.style.display = 'none';
        } else {
            successContent.style.display = 'none';
            errorContent.style.display = 'block';
        }
    }
    
    try {
        // Get URL parameters
        const url = new URL(window.location.href);
        const token = url.searchParams.get('token');
        const type = url.searchParams.get('type');
        
        // Check if token and type exist
        if (!token || type !== 'signup') {
            showContent(false);
            return;
        }
        
        // Verify the token with Supabase
        const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
        });
        
        if (error) {
            console.error('Error verifying email:', error);
            showContent(false);
            return;
        }
        
        // Email verified successfully
        showContent(true);
    } catch (error) {
        console.error('Error in email confirmation:', error);
        showContent(false);
    }
}); 