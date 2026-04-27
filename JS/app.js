// Terra Scenik - Frontend JavaScript (app.js)
// Student ID: M01049109 | CST3340 Coursework 2

const STUDENT_ID = 'M01049109'; // used as prefix for all API endpoints
const API_BASE = `/${STUDENT_ID}`; // base URL for API calls
let currentUser = null; // stores logged-in user data (id, name, email, bio, profilePicture)

// === UTILITY FUNCTIONS ===

// Sleep disclaimer dismiss handler — only shows once per session
(function() {
    const disclaimer = document.getElementById('sleepDisclaimer');
    const dismissBtn = document.getElementById('dismissDisclaimer');
    
    if (sessionStorage.getItem('sleepDismissed')) {
        if (disclaimer) disclaimer.classList.add('hidden');
    }
    
    if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
            disclaimer.classList.add('hidden');
            sessionStorage.setItem('sleepDismissed', 'true');
        });
    }
})();

// displays error message in element, auto-hides after 5 seconds
function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 5000); // auto-hide
    }
}

// displays success message in element, auto-hides after 5 seconds
function showSuccess(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 5000); // auto-hide
    }
}

// converts date to relative time (e.g., "5 minutes ago")
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date; // difference in milliseconds
    const diffMins = Math.floor(diffMs / 60000); // convert to minutes
    const diffHours = Math.floor(diffMs / 3600000); // convert to hours
    const diffDays = Math.floor(diffMs / 86400000); // convert to days

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString(); // fallback to full date
}

// === UNSPLASH IMAGE SEARCH ===

let selectedUnsplashImage = null; // stores URL of selected Unsplash image

// searches Unsplash API and displays results in grid
async function searchUnsplash(query) {
    const resultsContainer = document.getElementById('unsplashResults');

    if (!query || query.trim() === '') {
        resultsContainer.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Enter a search term</p>';
        return;
    }

    resultsContainer.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Searching Unsplash...</p>';

    try {
        const res = await fetch(`/M01049109/unsplash?q=${encodeURIComponent(query)}`); // call backend proxy
        const data = await res.json();

        if (data.results && data.results.length > 0) {
            // render each photo as clickable grid item
            resultsContainer.innerHTML = data.results.map(photo => `
                <div class="unsplash-item" onclick="selectUnsplashImage('${photo.urls.regular}', '${photo.id}')">
                    <img src="${photo.urls.small}" alt="${photo.alt_description || 'Photo'}">
                    <div class="unsplash-credit">Photo by ${photo.user.name}</div>
                </div>
            `).join('');
        } else {
            resultsContainer.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">No results found. Try a different search term.</p>';
        }
    } catch (err) {
        console.error('Unsplash search error:', err);
        resultsContainer.innerHTML = '<p style="color:#e74c3c;text-align:center;padding:20px;">Failed to search images. Please try again.</p>';
    }
}

// handles selection of an Unsplash image from search results
function selectUnsplashImage(imageUrl, photoId) {
    selectedUnsplashImage = imageUrl; // store for post creation

    const previewContainer = document.getElementById('unsplashSelectedPreview');
    previewContainer.innerHTML = `
        <img src="${imageUrl}" alt="Selected image">
        <button type="button" class="remove-image-btn" onclick="clearUnsplashSelection()">Remove</button>
    `;
    previewContainer.style.display = 'block';

    document.getElementById('postImage').value = ''; // clear file upload
    document.getElementById('postImagePreview').innerHTML = '';

    showNotification('success', 'Image Selected', 'Unsplash image has been selected for your post');
}

// clears the currently selected Unsplash image
function clearUnsplashSelection() {
    selectedUnsplashImage = null;
    document.getElementById('unsplashSelectedPreview').innerHTML = '';
    document.getElementById('unsplashSelectedPreview').style.display = 'none';
}

// === NOTIFICATION SYSTEM ===

// displays toast notification (type: 'success', 'error', 'warning')
function showNotification(type, title, message) {
    const existing = document.querySelector('.inline-notification');
    if (existing) existing.remove(); // remove any existing notification

    const notification = document.createElement('div');
    notification.className = `inline-notification ${type}`;

    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : '⚠'; // pick icon based on type

    notification.innerHTML = `
        <div class="inline-notification-icon">${icon}</div>
        <div class="inline-notification-content">
            <div class="inline-notification-title">${title}</div>
            <div class="inline-notification-message">${message}</div>
        </div>
        <button class="inline-notification-close">×</button>
    `;

    document.body.appendChild(notification);

    notification.querySelector('.inline-notification-close').addEventListener('click', () => {
        notification.remove();
    });

    setTimeout(() => {
        if (notification.parentElement) notification.remove(); // auto-dismiss after 5s
    }, 5000);
}

// === CONFIRMATION DIALOG ===

// shows confirmation dialog, returns Promise<boolean>
function showConfirmation(title, message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirmation-overlay';

        overlay.innerHTML = `
            <div class="confirmation-dialog">
                <div class="confirmation-title">
                    <span>⚠️</span>
                    <span>${title}</span>
                </div>
                <div class="confirmation-message">${message}</div>
                <div class="confirmation-buttons">
                    <button class="confirmation-btn confirmation-btn-cancel">Cancel</button>
                    <button class="confirmation-btn confirmation-btn-confirm">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('.confirmation-btn-cancel').addEventListener('click', () => {
            overlay.remove();
            resolve(false); // user cancelled
        });

        overlay.querySelector('.confirmation-btn-confirm').addEventListener('click', () => {
            overlay.remove();
            resolve(true); // user confirmed
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) { // clicked outside dialog
                overlay.remove();
                resolve(false);
            }
        });
    });
}

// === NAVIGATION & VIEW SWITCHING ===
// ============================================

/**
 * Shows the authentication section (login/register forms)
 * Hides the main application section and sidebar
 * Called when user logs out or is not authenticated
 */
function showAuthSection() {
    document.getElementById('authSection').classList.add('active');
    document.getElementById('appSection').classList.remove('active');
    // Hide sidebar on auth pages
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.remove('show');
    }
    const appSection = document.getElementById('appSection');
    if (appSection) {
        appSection.classList.remove('with-sidebar');
    }
    
    // Hide chatbot when logged out
    hideChatbot();
}

/**
 * Shows the main application section after successful authentication
 * Hides the authentication section and updates the navbar profile picture
 * The sidebar is not automatically shown - it appears on hover over the logo
 */
function showAppSection() {
    // Hide auth section and show main app
    document.getElementById('authSection').classList.remove('active');
    document.getElementById('appSection').classList.add('active');
    // Don't automatically show sidebar - only on hover for cleaner UI

    // Update navbar profile picture with current user's image
    updateNavbarProfilePic();
    
    // Show chatbot when logged in
    showChatbot();
    
    // Refresh search history for the logged-in user
    if (typeof displaySearchHistory === 'function') {
        displaySearchHistory();
    }
}

/**
 * Updates the profile picture displayed in the navigation bar
 * Shows the user's profile picture if available, otherwise shows empty circle
 * Also adds click handler to navigate to user's profile page
 */
function updateNavbarProfilePic() {
    // Get references to navbar profile picture elements
    const navProfilePic = document.getElementById('navProfilePic');
    const navProfilePicImg = document.getElementById('navProfilePicImg');

    if (currentUser && navProfilePic) {
        // Show profile picture if user has one, otherwise show empty circle
        if (currentUser.profilePicture && navProfilePicImg) {
            navProfilePicImg.src = currentUser.profilePicture;
            navProfilePicImg.style.display = 'block';
        } else if (navProfilePicImg) {
            navProfilePicImg.style.display = 'none';
        }

        navProfilePic.classList.add('show');

        // Add click event to navigate to profile
        navProfilePic.onclick = () => {
            switchView('profile');
        };
    } else if (navProfilePic) {
        navProfilePic.classList.remove('show');
    }
}

/**
 * Switches between different views within the main application section
 * Available views: feed, profile, search, create, userProfile
 * Updates navigation highlighting and loads appropriate content
 * @param {string} viewName - The name of the view to switch to
 */
function switchView(viewName) {
    // Hide all views by removing 'active' class
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    // Show the selected view by adding 'active' class
    document.getElementById(`${viewName}View`).classList.add('active');

    // Save current view to sessionStorage so it persists on page refresh
    sessionStorage.setItem('currentView', viewName);

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.view === viewName) {
            link.classList.add('active');
        }
    });

    // Update sidebar links
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === viewName) {
            item.classList.add('active');
        }
    });

    // Load content for the view
    if (viewName === 'feed') loadFeed();
    if (viewName === 'profile') loadProfile();
    if (viewName === 'userProfile') {
        // Profile will be loaded by navigateToUserProfile
    }
}

// ============================================
// AUTHENTICATION - TOGGLE FORMS
// ============================================
// Event handlers for switching between login and
// registration forms on the authentication page.
// Uses DOM manipulation to show/hide form containers.
// ============================================

// Event listener to show registration form when "Create Account" link is clicked
document.getElementById('showRegister').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginBox').classList.add('hidden');
    document.getElementById('registerBox').classList.remove('hidden');
});

document.getElementById('showLogin').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('registerBox').classList.add('hidden');
    document.getElementById('loginBox').classList.remove('hidden');
});

// Password Visibility Toggle
document.querySelectorAll('.show-password-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = e.target.dataset.target;
        const passwordInput = document.getElementById(targetId);
        
        if (passwordInput) {
            // Show password
            passwordInput.type = 'text';
            e.target.textContent = 'Hide';
            
            // Hide after 800ms (less than 1 second)
            setTimeout(() => {
                if (passwordInput) {
                    passwordInput.type = 'password';
                    e.target.textContent = 'Show';
                }
            }, 800);
        }
    });
});

// ============================================
// REGISTRATION
// ============================================
// Handles new user registration using AJAX (Fetch API)
// Sends user data to POST /M01049109/users endpoint
// On success, automatically logs in the user and shows the app
// ============================================

// Form submission handler for user registration
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    // Prevent default form submission (no page reload - using AJAX instead)
    e.preventDefault();

    // Extract form field values
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    // Password validation logic
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*_=+-]/.test(password);
    
    if (password.length < 8 || !hasNumber || !hasSpecial) {
        showError('registerError', 'Password must be at least 8 characters long and include a number and special character.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            showAppSection();
            switchView('feed');
        } else {
            showError('registerError', data.error || 'Registration failed');
        }
    } catch (err) {
        console.error('Registration error:', err);
        showError('registerError', 'Network error. Please try again.');
    }
});

// ============================================
// LOGIN
// ============================================
// Handles user authentication using AJAX (Fetch API)
// Sends credentials to POST /M01049109/login endpoint
// On success, stores user data and shows the main app
// ============================================

// Form submission handler for user login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    // Prevent default form submission (no page reload - using AJAX instead)
    e.preventDefault();

    // Extract login credentials from form
    const name = document.getElementById('loginName').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, password })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            showAppSection();
            switchView('feed');
        } else {
            showError('loginError', data.error || 'Login failed');
        }
    } catch (err) {
        console.error('Login error:', err);
        showError('loginError', 'Network error. Please try again.');
    }
});

// ============================================
// LOGOUT
// ============================================
// Handles user logout using AJAX (Fetch API)
// Sends DELETE request to /M01049109/login endpoint
// On success, clears user data and shows auth section
// ============================================

// Click handler for logout button
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            currentUser = null;
            showAuthSection();
            // Clear forms
            document.getElementById('loginForm').reset();
            document.getElementById('registerForm').reset();
        }
    } catch (err) {
        console.error('Logout error:', err);
    }
});

// ============================================
// LOAD FEED
// ============================================
// Fetches and displays the personalized feed for the logged-in user
// Feed contains posts ONLY from users that the current user follows
// Uses AJAX to call GET /M01049109/feed endpoint
// ============================================

/**
 * Loads and displays the personalized feed for the current user
 * Fetches posts from followed users via AJAX
 * Renders posts with images, likes, and user information
 */
async function loadFeed() {
    // Get reference to the feed container element
    const container = document.getElementById('feedContainer');
    container.innerHTML = '<p style="text-align:center;color:#999;">Loading feed...</p>';

    try {
        const response = await fetch(`${API_BASE}/feed`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.success) {
            if (data.posts.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <h3>Your feed is empty</h3>
                        <p>${data.message || 'Follow users to see their posts here!'}</p>
                    </div>
                `;
            } else {
                container.innerHTML = data.posts.map(post => renderPost(post)).join('');
                attachPostEventListeners();
            }
        } else {
            container.innerHTML = `<p style="text-align:center;color:#e74c3c;">${data.error}</p>`;
        }
    } catch (err) {
        console.error('Load feed error:', err);
        container.innerHTML = '<p style="text-align:center;color:#e74c3c;">Error loading feed</p>';
    }
}

// ============================================
// RENDER POST FUNCTION
// ============================================
// Generates HTML markup for displaying a single post card
// Used in feed, search results, and user profiles
// Handles profile pictures, images, likes, and location display
// ============================================

/**
 * Renders a single post as an HTML card element
 * Includes user avatar, post image, caption, location, and like button
 * @param {Object} post - The post object containing all post data
 * @param {string} post.id - Unique identifier for the post
 * @param {string} post.userName - Name of the user who created the post
 * @param {string} post.userEmail - Email of the post creator (used for navigation)
 * @param {string} post.caption - Post caption/description text
 * @param {string} post.location - Location where photo was taken
 * @param {string} post.image_url - URL of the post's image
 * @param {string} post.profilePicture - URL of the creator's profile picture
 * @param {number} post.likeCount - Number of likes on the post
 * @param {boolean} post.isLiked - Whether current user has liked this post
 * @param {boolean} isSearchResult - If true, clicking image navigates to feed
 * @returns {string} HTML string for the post card
 */
function renderPost(post, isSearchResult = false) {
    const userEmail = post.userEmail || '';
    const searchClass = isSearchResult ? 'search-result-post' : '';
    const imageClickHandler = isSearchResult ? `onclick="navigateToFeedWithPost('${post.id}')"` : '';
    const avatarContent = post.profilePicture
        ? `<img src="${post.profilePicture}" alt="${post.userName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
        : '';

    return `
        <div class="post-card ${searchClass}" data-post-id="${post.id}">
            <div class="post-header" data-user-email="${userEmail}" onclick="navigateToUserProfile('${userEmail}')">
                <div class="post-avatar">${avatarContent}</div>
                <div class="post-user-info">
                    <h4>${post.userName}</h4>
                    <p>${formatDate(post.createdAt)}</p>
                </div>
            </div>
            ${post.image_url ? `
                <div class="post-image-container" ${imageClickHandler}>
                    <img src="${post.image_url}" alt="Nature photo" class="post-image show">
                </div>
            ` : ''}
            <div class="post-content">
                <div class="post-info-row">
                    <div class="post-location">
                        <img src="/Style/icons/location.svg" alt="Location" class="location-icon">
                        ${post.location}
                    </div>
                    <div class="post-likes">
                        <button class="btn-like ${post.isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}', this)">
                            <img src="/Style/icons/heart.svg" alt="Like" class="like-icon">
                            <span class="like-count">${post.likeCount || 0}</span>
                        </button>
                    </div>
                </div>
                <p class="post-caption">${post.caption}</p>
            </div>
        </div>
    `;
}

// ============================================
// NAVIGATE TO FEED WITH SPECIFIC POST
// ============================================
// Navigates to feed view and scrolls to a specific post
// Used when clicking on a post in search results
// ============================================

/**
 * Navigates to the feed view and scrolls to a specific post
 * Used when user clicks on a post from search results
 * Includes a brief highlight animation to draw attention
 * @param {string} postId - The ID of the post to scroll to
 */
function navigateToFeedWithPost(postId) {
    // Switch to the feed view first
    switchView('feed');

    // Scroll to the post if it exists
    setTimeout(() => {
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        if (postElement) {
            postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Briefly highlight the post
            postElement.style.opacity = '0.6';
            setTimeout(() => {
                postElement.style.transition = 'opacity 0.5s ease';
                postElement.style.opacity = '1';
            }, 200);
        }
    }, 100);
}

// ============================================
// ATTACH POST EVENT LISTENERS
// ============================================

function attachPostEventListeners() {
    // Event listeners are now inline in HTML for user navigation
}

// ============================================
// POST IMAGE PREVIEW
// ============================================

let postImageInput;
let postImagePreview;

function initPostImagePreview() {
    postImageInput = document.getElementById('postImage');
    postImagePreview = document.getElementById('postImagePreview');

    if (postImageInput) {
        postImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Check file size (limit to 15MB)
                if (file.size > 15 * 1024 * 1024) {
                    showNotification('error', 'File Too Large', 'Please select an image smaller than 15MB');
                    postImageInput.value = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    postImagePreview.innerHTML = `
                        <img src="${e.target.result}" alt="Preview">
                        <div class="image-preview-actions">
                            <button type="button" class="btn-remove-image" onclick="removePostImage()">Remove Image</button>
                        </div>
                    `;
                    postImagePreview.classList.add('show');
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

function removePostImage() {
    if (postImageInput) {
        postImageInput.value = '';
    }
    if (postImagePreview) {
        postImagePreview.innerHTML = '';
        postImagePreview.classList.remove('show');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPostImagePreview);
} else {
    initPostImagePreview();
}

// ============================================
// CREATE POST
// ============================================
// Handles creation of new posts with optional image uploads
// Supports two image sources:
// 1. Local file upload from user's device
// 2. Unsplash image selection from API search
// Posts are created via AJAX POST to /M01049109/contents
// ============================================

// Form submission handler for creating new posts
document.getElementById('createPostForm').addEventListener('submit', async (e) => {
    // Prevent default form submission (using AJAX instead)
    e.preventDefault();

    // Extract post data from form fields
    const caption = document.getElementById('postCaption').value;
    const location = document.getElementById('postLocation').value;
    const imageInput = document.getElementById('postImage');
    const imageFile = imageInput ? imageInput.files[0] : null;

    // Upload image to server file system
    let image_url = '';

    // Check if Unsplash image is selected
    if (selectedUnsplashImage) {
        // Fetch the Unsplash image, convert to blob, then upload to server
        try {
            const response = await fetch(selectedUnsplashImage);
            const blob = await response.blob();

            // Convert blob to file for upload
            const unsplashFile = new File([blob], `unsplash-${Date.now()}.jpg`, { type: blob.type });

            // Upload to server
            const formData = new FormData();
            formData.append('image', unsplashFile);

            const uploadResponse = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const uploadData = await uploadResponse.json();

            if (uploadData.success) {
                image_url = uploadData.path;
            } else {
                showError('createPostError', uploadData.error || 'Failed to upload Unsplash image');
                return;
            }
        } catch (err) {
            console.error('Unsplash image upload error:', err);
            showError('createPostError', 'Failed to upload Unsplash image. Please try again.');
            return;
        }
    } else if (imageFile) {
        try {
            // Check file size
            if (imageFile.size > 15 * 1024 * 1024) {
                showError('createPostError', 'Image file is too large. Please select an image smaller than 15MB.');
                return;
            }

            // Upload file to server
            const formData = new FormData();
            formData.append('image', imageFile);

            const uploadResponse = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const uploadData = await uploadResponse.json();

            if (uploadData.success) {
                image_url = uploadData.path;
            } else {
                showError('createPostError', uploadData.error || 'Failed to upload image');
                return;
            }
        } catch (err) {
            console.error('Image upload error:', err);
            showError('createPostError', 'Failed to upload image. Please try again.');
            return;
        }
    }

    try {
        const response = await fetch(`${API_BASE}/contents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ caption, location, image_url })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('createPostSuccess', 'Post created successfully!');
            document.getElementById('createPostForm').reset();
            removePostImage();
            clearUnsplashSelection();
            selectedUnsplashImage = null;
            // Switch to feed view
            setTimeout(() => {
                switchView('feed');
            }, 1500);
        } else {
            showError('createPostError', data.error || 'Failed to create post');
        }
    } catch (err) {
        console.error('Create post error:', err);
        showError('createPostError', 'Network error. Please try again.');
    }
});

// ============================================
// HELPER: CONVERT FILE TO BASE64
// ============================================
// Utility function to convert image files to base64 format
// Used for storing images as data URIs in the database
// ============================================

/**
 * Converts a File object to a base64-encoded data URI string
 * Uses FileReader API to read the file asynchronously
 * Returns a Promise for use with async/await
 * @param {File} file - The File object to convert
 * @returns {Promise<string>} Base64-encoded data URI of the file
 * @throws {Error} If no file is provided or reading fails
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No file provided'));
            return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => {
            console.error('FileReader error:', error);
            reject(error);
        };
        reader.readAsDataURL(file);
    });
}







// ============================================
// NAVIGATE TO USER PROFILE
// ============================================
// Handles navigation to view another user's profile
// Loads user data and their posts via AJAX
// ============================================

/**
 * Navigates to and displays another user's profile page
 * Loads user information and their posts from the server
 * @param {string} userEmail - Email address of the user to view
 */
async function navigateToUserProfile(userEmail) {
    // Guard clause - do nothing if no email provided
    if (!userEmail) return;

    // Switch to the user profile view
    switchView('userProfile');

    // Load user profile data
    await loadUserProfile(userEmail);
}

// ============================================
// LOAD USER PROFILE
// ============================================
// Fetches and displays a specific user's profile data
// Includes their posts, follow status, and profile info
// Uses GET /M01049109/users/:email/profile endpoint
// ============================================

/**
 * Loads and displays a user's complete profile
 * Fetches user data, posts, and follow status via AJAX
 * Updates UI with user information and renders their posts
 * @param {string} userEmail - Email of the user whose profile to load
 */
async function loadUserProfile(userEmail) {
    // Get references to profile display elements
    const nameEl = document.getElementById('userProfileName');
    const emailEl = document.getElementById('userProfileEmail');
    const bioEl = document.getElementById('userProfileBio');
    const postsContainer = document.getElementById('userProfilePosts');
    const followBtn = document.getElementById('followUserProfileBtn');

    // Show loading state
    nameEl.textContent = 'Loading...';
    emailEl.textContent = '';
    bioEl.textContent = '';
    postsContainer.innerHTML = '<p style="text-align:center;color:#999;">Loading posts...</p>';

    try {
        const response = await fetch(`${API_BASE}/users/${encodeURIComponent(userEmail)}/profile`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.success) {
            // Display user info
            nameEl.textContent = data.user.name;
            emailEl.textContent = data.user.email;
            bioEl.textContent = data.user.bio || 'No bio added yet';

            // Display profile picture
            const avatarImg = document.getElementById('userProfileAvatar');
            if (avatarImg) {
                if (data.user.profilePicture) {
                    avatarImg.src = data.user.profilePicture;
                    avatarImg.classList.add('show');
                } else {
                    avatarImg.classList.remove('show');
                }
            }

            // Update follow button
            if (data.isFollowing) {
                followBtn.textContent = 'Following';
                followBtn.classList.add('btn-following');
                followBtn.disabled = false;
                followBtn.onclick = () => unfollowUserFromProfile(data.user.email, followBtn);
            } else {
                followBtn.textContent = 'Follow';
                followBtn.classList.remove('btn-following');
                followBtn.disabled = false;
                followBtn.onclick = () => followUserFromProfile(data.user.email, followBtn);
            }

            // Display posts
            if (data.posts.length === 0) {
                postsContainer.innerHTML = `
                    <div class="empty-state">
                        <h3>No posts yet</h3>
                        <p>This user hasn't shared any posts yet.</p>
                    </div>
                `;
            } else {
                postsContainer.innerHTML = data.posts.map(post => renderPost(post)).join('');
            }
        } else {
            showNotification('error', 'Error', data.error || 'Failed to load user profile');
            switchView('feed');
        }
    } catch (err) {
        console.error('Load user profile error:', err);
        showNotification('error', 'Network Error', 'Unable to load user profile');
        switchView('feed');
    }
}

// ============================================
// FOLLOW USER FROM PROFILE
// ============================================
// Handles following a user from their profile page
// Updates button state and shows notification
// Uses POST /M01049109/follow endpoint
// ============================================

/**
 * Follows a user from their profile page view
 * Sends follow request via AJAX and updates button UI
 * @param {string} userEmail - Email of the user to follow
 * @param {HTMLElement} button - The follow button element to update
 */
async function followUserFromProfile(userEmail, button) {
    try {
        const response = await fetch(`${API_BASE}/follow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userEmail })
        });

        const data = await response.json();

        if (data.success) {
            button.textContent = 'Following';
            button.classList.add('btn-following');
            button.disabled = false;
            button.onclick = () => unfollowUserFromProfile(userEmail, button);
            showNotification('success', 'Success!', data.message || 'You are now following this user');
        } else {
            showNotification('error', 'Failed to Follow', data.error || 'Failed to follow user');
        }
    } catch (err) {
        console.error('Follow user error:', err);
        showNotification('error', 'Network Error', 'Unable to connect. Please try again.');
    }
}

// ============================================
// UNFOLLOW USER FROM PROFILE
// ============================================
// Handles unfollowing a user from their profile page
// Updates button state and shows notification
// Uses DELETE /M01049109/follow endpoint
// ============================================

/**
 * Unfollows a user from their profile page view
 * Sends unfollow request via AJAX and updates button UI
 * @param {string} userEmail - Email of the user to unfollow
 * @param {HTMLElement} button - The follow button element to update
 */
async function unfollowUserFromProfile(userEmail, button) {
    try {
        const response = await fetch(`${API_BASE}/follow`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userEmail })
        });

        const data = await response.json();

        if (data.success) {
            button.textContent = 'Follow';
            button.classList.remove('btn-following');
            button.disabled = false;
            button.onclick = () => followUserFromProfile(userEmail, button);
            showNotification('success', 'Unfollowed', data.message || 'You have unfollowed this user');
        } else {
            showNotification('error', 'Failed to Unfollow', data.error || 'Failed to unfollow user');
        }
    } catch (err) {
        console.error('Unfollow user error:', err);
        showNotification('error', 'Network Error', 'Unable to connect. Please try again.');
    }
}

// ============================================
// FOLLOW USER (from search results)
// ============================================
// Handles following a user from search results
// Disables button after successful follow to prevent duplicates
// Uses POST /M01049109/follow endpoint
// ============================================

/**
 * Follows a user from the search results
 * Disables the button after successful follow
 * @param {string} userEmail - Email of the user to follow
 * @param {HTMLElement} button - The follow button element to update
 */
async function followUser(userEmail, button) {
    try {
        const response = await fetch(`${API_BASE}/follow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userEmail })
        });

        const data = await response.json();

        if (data.success) {
            button.textContent = 'Following';
            button.classList.add('btn-following');
            button.disabled = true;
            showNotification('success', 'Success!', data.message || 'You are now following this user');
        } else {
            showNotification('error', 'Failed to Follow', data.error || 'Failed to follow user');
        }
    } catch (err) {
        console.error('Follow user error:', err);
        showNotification('error', 'Network Error', 'Unable to connect. Please try again.');
    }
}

// ============================================
// LOAD PROFILE
// ============================================
// Loads the current user's own profile page
// Displays their info, following list, and posts
// Uses multiple AJAX calls to gather all data
// ============================================

/**
 * Loads and displays the current user's profile page
 * Fetches fresh user data, following list, and user's posts
 * Updates all profile UI elements with current data
 */
async function loadProfile() {
    // Fetch fresh user data from server to ensure we have latest info
    try {
        const response = await fetch(`${API_BASE}/login`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.success && data.loggedIn) {
            currentUser = data.user;

            // Display current user info
            document.getElementById('profileName').textContent = currentUser.name;
            document.getElementById('profileEmail').textContent = currentUser.email;
            document.getElementById('profileBio').textContent = currentUser.bio || 'No bio added yet';

            // Display profile picture if available
            const profileAvatarImg = document.getElementById('profileAvatar');
            if (currentUser.profilePicture) {
                profileAvatarImg.src = currentUser.profilePicture;
                profileAvatarImg.classList.add('show');
            } else {
                profileAvatarImg.classList.remove('show');
            }

            // Update navbar profile picture
            updateNavbarProfilePic();
        }
    } catch (err) {
        console.error('Failed to refresh user data:', err);
    }

    // Load following list
    const followingContainer = document.getElementById('followingList');
    followingContainer.innerHTML = '<p style="color:#999;text-align:center;">Loading...</p>';

    try {
        const response = await fetch(`${API_BASE}/following`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.success) {
            if (data.following.length === 0) {
                followingContainer.innerHTML = `
                    <p style="color:#999;text-align:center;padding:20px;">
                        You are not following anyone yet.<br>
                        Use the Search tab to find and follow users!
                    </p>
                `;
            } else {
                followingContainer.innerHTML = data.following.map(user => `
                    <div class="following-item">
                        <div>
                            <span>${user.name}</span>
                            <p style="font-size:0.85rem;color:#999;margin-top:3px;">${user.email}</p>
                        </div>
                        <button class="btn-unfollow" onclick="unfollowUser('${user.email}', this)">Unfollow</button>
                    </div>
                `).join('');
            }
        } else {
            followingContainer.innerHTML = `<p style="color:#e74c3c;text-align:center;">${data.error}</p>`;
        }
    } catch (err) {
        console.error('Load following error:', err);
        followingContainer.innerHTML = '<p style="color:#e74c3c;text-align:center;">Error loading following list</p>';
    }

    // Load user's posts
    loadMyPosts();
}

// ============================================
// UNFOLLOW USER
// ============================================
// Handles unfollowing a user from the following list
// Shows confirmation dialog before unfollowing
// Uses DELETE /M01049109/follow endpoint
// ============================================

/**
 * Unfollows a user from the following list on profile page
 * Shows confirmation dialog before proceeding
 * Removes user from the UI list on success
 * @param {string} userEmail - Email of the user to unfollow
 * @param {HTMLElement} button - The unfollow button element
 */
async function unfollowUser(userEmail, button) {
    // Show confirmation dialog before unfollowing
    const confirmed = await showConfirmation(
        'Unfollow User',
        'Are you sure you want to unfollow this user? You will no longer see their posts in your feed.'
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/follow`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userEmail })
        });

        const data = await response.json();

        if (data.success) {
            // Remove the item from the list
            button.closest('.following-item').remove();

            showNotification('success', 'Unfollowed', data.message || 'You have unfollowed this user');

            // Check if list is now empty
            const followingList = document.getElementById('followingList');
            if (followingList.children.length === 0) {
                followingList.innerHTML = `
                    <p style="color:#999;text-align:center;padding:20px;">
                        You are not following anyone yet.<br>
                        Use the Search tab to find and follow users!
                    </p>
                `;
            }
        } else {
            showNotification('error', 'Failed to Unfollow', data.error || 'Failed to unfollow user');
        }
    } catch (err) {
        console.error('Unfollow user error:', err);
        showNotification('error', 'Network Error', 'Unable to connect. Please try again.');
    }
}

// ============================================
// TOGGLE LIKE ON POST
// ============================================
// Handles liking/unliking posts with optimistic UI updates
// Uses POST/DELETE /M01049109/contents/:postId/like endpoints
// ============================================

/**
 * Toggles the like status of a post
 * If currently liked, sends unlike request; if not liked, sends like request
 * Updates the UI with new like count on success
 * @param {string} postId - The ID of the post to like/unlike
 * @param {HTMLElement} button - The like button element containing the count
 */
async function toggleLike(postId, button) {
    // Check current like status from button's class
    const isLiked = button.classList.contains('liked');
    const likeCountSpan = button.querySelector('.like-count');
    const currentCount = parseInt(likeCountSpan.textContent) || 0;

    try {
        const response = await fetch(`${API_BASE}/contents/${postId}/like`, {
            method: isLiked ? 'DELETE' : 'POST',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            // Update UI
            button.classList.toggle('liked');
            likeCountSpan.textContent = data.likeCount;
        } else {
            showNotification('error', 'Error', data.error || 'Failed to update like');
        }
    } catch (err) {
        console.error('Toggle like error:', err);
        showNotification('error', 'Network Error', 'Unable to connect. Please try again.');
    }
}

// ============================================
// NAVIGATION CLICK HANDLERS
// ============================================

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.dataset.view;
        switchView(view);
    });
});

// ============================================
// CHECK LOGIN STATUS ON PAGE LOAD
// ============================================

window.addEventListener('DOMContentLoaded', async () => {
    // Initialize Unsplash tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;

            // Update active tab button
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update active tab content
            document.querySelectorAll('.image-tab').forEach(t => t.classList.remove('active'));
            if (tab === 'upload') {
                document.getElementById('uploadTab').classList.add('active');
                clearUnsplashSelection();
            } else {
                document.getElementById('unsplashTab').classList.add('active');
                // Clear file input when switching to Unsplash
                document.getElementById('postImage').value = '';
                document.getElementById('postImagePreview').innerHTML = '';
            }
        });
    });

    // Initialize Unsplash search
    document.getElementById('unsplashSearchBtn').addEventListener('click', () => {
        const query = document.getElementById('unsplashSearchInput').value.trim();
        searchUnsplash(query);
    });

    // Allow Enter key for Unsplash search
    document.getElementById('unsplashSearchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = document.getElementById('unsplashSearchInput').value.trim();
            searchUnsplash(query);
        }
    });

    try {
        const response = await fetch(`${API_BASE}/login`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.success && data.loggedIn) {
            currentUser = data.user;
            showAppSection();
            
            // Restore previous view from sessionStorage or default to feed
            const savedView = sessionStorage.getItem('currentView') || 'feed';
            switchView(savedView);
        } else {
            showAuthSection();
        }
    } catch (err) {
        console.error('Check login status error:', err);
        showAuthSection();
    }
});

// ============================================
// NAVBAR SEARCH FUNCTIONALITY
// ============================================

document.getElementById('navSearchBtn').addEventListener('click', async () => {
    const searchQuery = document.getElementById('navSearchInput').value.trim();
    const searchType = document.getElementById('navSearchType').value;
    const resultsContainer = document.getElementById('navSearchResults');

    if (!searchQuery) {
        showNotification('warning', 'Empty Search', 'Please enter a search term');
        return;
    }

    resultsContainer.innerHTML = '<p style="color:#999;text-align:center;">Searching...</p>';
    resultsContainer.classList.add('show');

    try {
        if (searchType === 'users') {
            // Search users
            const response = await fetch(`${API_BASE}/users?q=${encodeURIComponent(searchQuery)}`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.success) {
                if (data.users.length === 0) {
                    resultsContainer.innerHTML = '<p style="color:#999;text-align:center;">User not found</p>';
                } else {
                    resultsContainer.innerHTML = data.users.map(user => `
                        <div class="user-result" onclick="navigateToUserProfile('${user.email}')">
                            <div class="user-info">
                                <h4>${user.name}</h4>
                                <p>${user.email}</p>
                                ${user.bio ? `<p style="font-size:0.85rem;color:#999;">${user.bio}</p>` : ''}
                            </div>
                            <button class="btn-follow" onclick="event.stopPropagation(); followUser('${user.email}', this)">Follow</button>
                        </div>
                    `).join('');
                }
            } else {
                resultsContainer.innerHTML = `<p style="color:#e74c3c;text-align:center;">${data.error}</p>`;
            }
        } else {
            // Search posts
            const response = await fetch(`${API_BASE}/contents?q=${encodeURIComponent(searchQuery)}`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.success) {
                if (data.posts.length === 0) {
                    resultsContainer.innerHTML = '<p style="color:#999;text-align:center;">Post not found</p>';
                } else {
                    resultsContainer.innerHTML = data.posts.map(post => renderPost(post, true)).join('');
                    resultsContainer.classList.add('show');
                }
            } else {
                resultsContainer.innerHTML = `<p style="color:#e74c3c;text-align:center;">${data.error}</p>`;
            }
        }
    } catch (err) {
        console.error('Navbar search error:', err);
        resultsContainer.innerHTML = '<p style="color:#e74c3c;text-align:center;">Search error. Please try again.</p>';
    }
});

// Close search results when clicking outside
document.addEventListener('click', (e) => {
    const resultsContainer = document.getElementById('navSearchResults');
    const searchContainer = document.querySelector('.nav-search');
    if (resultsContainer && !resultsContainer.contains(e.target) && !searchContainer.contains(e.target)) {
        resultsContainer.classList.remove('show');
    }
});

// Allow Enter key to search in navbar
document.getElementById('navSearchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('navSearchBtn').click();
    }
});



// ============================================
// SIDEBAR NAVIGATION HANDLERS
// ============================================

document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;

        // Update sidebar active state
        document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // Switch view
        switchView(view);
    });
});

// ============================================
// SIDEBAR LOGO HOME NAVIGATION
// ============================================

const sidebarLogoHome = document.querySelector('.sidebar-logo-home');
if (sidebarLogoHome) {
    sidebarLogoHome.addEventListener('click', () => {
        switchView('feed');
    });
}

// ============================================
// BACK BUTTON FROM USER PROFILE
// ============================================

const backFromUserProfileBtn = document.getElementById('backFromUserProfile');
if (backFromUserProfileBtn) {
    backFromUserProfileBtn.addEventListener('click', () => {
        switchView('feed');
    });
}

// ============================================
// SIDEBAR HOVER TOGGLE (on navbar logo)
// ============================================

const navbarLogo = document.querySelector('.navbar-logo');
const sidebar = document.querySelector('.sidebar');
const appSection = document.getElementById('appSection');

if (navbarLogo && sidebar) {
    // Click on logo to go to feed
    navbarLogo.addEventListener('click', () => {
        switchView('feed');
    });

    // Expand sidebar on hover over navbar logo
    navbarLogo.addEventListener('mouseenter', () => {
        if (appSection.classList.contains('active')) {
            sidebar.classList.add('show');
            sidebar.classList.add('expanded');
            appSection.classList.add('with-sidebar');
        }
    });

    // Collapse sidebar when cursor leaves sidebar boundaries
    sidebar.addEventListener('mouseleave', () => {
        sidebar.classList.remove('show');
        sidebar.classList.remove('expanded');
        appSection.classList.remove('with-sidebar');
    });
}

// ============================================
// SEARCH PAGE - MAIN SEARCH WITH HISTORY
// ============================================
// Full-featured search page with search history persistence
// Supports searching for both users and posts
// History is stored in localStorage for persistence across sessions
// ============================================

// Load search history from localStorage or initialize empty array
// History persists across browser sessions using Web Storage API
// Load search history from localStorage or initialize empty array
// History persists across browser sessions using Web Storage API
function getSearchHistoryKey() {
    return currentUser ? `searchHistory_${currentUser._id}` : 'searchHistory';
}

function getSearchHistory() {
    return JSON.parse(localStorage.getItem(getSearchHistoryKey())) || [];
}

function saveSearchHistoryList(history) {
    localStorage.setItem(getSearchHistoryKey(), JSON.stringify(history));
}

/**
 * Saves a search query to the search history
 * Removes duplicates and keeps only the 5 most recent searches
 * Persists to localStorage for cross-session persistence
 * @param {string} query - The search query text
 * @param {string} type - The search type: 'users' or 'posts'
 */
function saveSearchHistory(query, type) {
    let history = getSearchHistory();
    // Remove any existing duplicate entries (same query and type)
    history = history.filter(item => !(item.query === query && item.type === type));
    history.unshift({ query, type, timestamp: Date.now() });

    // Keep only last 5 searches
    if (history.length > 5) {
        history = history.slice(0, 5);
    }

    saveSearchHistoryList(history);
    displaySearchHistory();
}

/**
 * Removes a search history entry by its index
 * Updates localStorage and refreshes the history display
 * @param {number} index - The index of the history item to remove
 */
function removeSearchHistory(index) {
    let history = getSearchHistory();
    // Remove the item at the specified index
    history.splice(index, 1);
    saveSearchHistoryList(history);
    displaySearchHistory();
}

/**
 * Renders the search history list in the UI
 * Shows each history item with type badge, query text, and remove button
 * Displays empty state message if no history exists
 */
function displaySearchHistory() {
    // Get reference to the history list container
    const historyList = document.getElementById('searchHistoryList');
    const history = getSearchHistory();

    if (history.length === 0) {
        historyList.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">No recent searches</p>';
        return;
    }

    historyList.innerHTML = history.map((item, index) => `
        <div class="history-item" onclick="performSearchFromHistory('${item.query.replace(/'/g, "\\'")}', '${item.type}')" style="cursor:pointer;">
            <div class="history-item-content">
                <span class="history-type">${item.type === 'users' ? 'User' : 'Post'}</span>
                <span class="history-query">${item.query}</span>
            </div>
            <button class="history-remove" onclick="event.stopPropagation(); removeSearchHistory(${index})">×</button>
        </div>
    `).join('');
}

/**
 * Performs a search using a query from the search history
 * Populates the search form and triggers the search
 * @param {string} query - The search query from history
 * @param {string} type - The search type from history ('users' or 'posts')
 */
function performSearchFromHistory(query, type) {
    // Populate the search form with history values
    document.getElementById('mainSearchInput').value = query;
    document.getElementById('mainSearchType').value = type;
    performMainSearch();
}

/**
 * Performs the main search on the search page
 * Searches for either users or posts based on selected type
 * Saves successful searches to history
 * Uses GET /M01049109/users or /M01049109/contents endpoints
 */
async function performMainSearch() {
    // Get search parameters from form
    const searchQuery = document.getElementById('mainSearchInput').value.trim();
    const searchType = document.getElementById('mainSearchType').value;
    const resultsContainer = document.getElementById('mainSearchResults');

    if (!searchQuery) {
        showNotification('warning', 'Empty Search', 'Please enter a search term');
        return;
    }

    // Save to history
    saveSearchHistory(searchQuery, searchType);

    resultsContainer.innerHTML = '<p style="color:#999;text-align:center;">Searching...</p>';

    try {
        if (searchType === 'users') {
            const response = await fetch(`${API_BASE}/users?q=${encodeURIComponent(searchQuery)}`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.success) {
                if (data.users.length === 0) {
                    resultsContainer.innerHTML = '<p style="color:#999;text-align:center;">No users found</p>';
                } else {
                    resultsContainer.innerHTML = data.users.map(user => `
                        <div class="user-result" onclick="navigateToUserProfile('${user.email}')">
                            <div class="user-info">
                                <h4>${user.name}</h4>
                                <p>${user.email}</p>
                                ${user.bio ? `<p style="font-size:0.85rem;color:#999;">${user.bio}</p>` : ''}
                            </div>
                            <button class="btn-follow" onclick="event.stopPropagation(); followUser('${user.email}', this)">Follow</button>
                        </div>
                    `).join('');
                }
            } else {
                resultsContainer.innerHTML = `<p style="color:#e74c3c;text-align:center;">${data.error}</p>`;
            }
        } else {
            const response = await fetch(`${API_BASE}/contents?q=${encodeURIComponent(searchQuery)}`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.success) {
                if (data.posts.length === 0) {
                    resultsContainer.innerHTML = '<p style="color:#999;text-align:center;">No posts found</p>';
                } else {
                    resultsContainer.innerHTML = `<div class="posts-container">` +
                        data.posts.map(post => renderPost(post, true)).join('') +
                        `</div>`;
                }
            } else {
                resultsContainer.innerHTML = `<p style="color:#e74c3c;text-align:center;">${data.error}</p>`;
            }
        }
    } catch (err) {
        console.error('Main search error:', err);
        resultsContainer.innerHTML = '<p style="color:#e74c3c;text-align:center;">Search error. Please try again.</p>';
    }
}

// Enter key to search on main search
document.addEventListener('DOMContentLoaded', () => {
    const mainSearchInput = document.getElementById('mainSearchInput');
    if (mainSearchInput) {
        mainSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performMainSearch();
            }
        });

        // Display history on load
        displaySearchHistory();
    }
});

// ============================================
// EDIT PROFILE MODAL HANDLERS
// ============================================

const editProfileModal = document.getElementById('editProfileModal');
const editProfileBtn = document.getElementById('editProfileBtn');
const closeEditProfileModal = document.getElementById('closeEditProfileModal');
const cancelEditProfile = document.getElementById('cancelEditProfile');
const editProfileForm = document.getElementById('editProfileForm');

// Open modal
if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
        // Populate form with current user data
        if (currentUser) {
            document.getElementById('editProfileName').value = currentUser.name;
            document.getElementById('editProfileEmail').value = currentUser.email;
            document.getElementById('editProfileBio').value = currentUser.bio || '';
        }
        editProfileModal.classList.add('show');
    });
}

// Close modal
function closeEditModal() {
    editProfileModal.classList.remove('show');
    editProfileForm.reset();
    document.getElementById('editProfileError').classList.remove('show');
    document.getElementById('editProfileSuccess').classList.remove('show');
}

if (closeEditProfileModal) {
    closeEditProfileModal.addEventListener('click', closeEditModal);
}

if (cancelEditProfile) {
    cancelEditProfile.addEventListener('click', closeEditModal);
}

// Close modal when clicking outside
editProfileModal.addEventListener('click', (e) => {
    if (e.target === editProfileModal) {
        closeEditModal();
    }
});

// Handle form submission
if (editProfileForm) {
    editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('editProfileName').value.trim();
        const email = document.getElementById('editProfileEmail').value.trim();
        const bio = document.getElementById('editProfileBio').value.trim();

        try {
            const response = await fetch(`${API_BASE}/users/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, email, bio })
            });

            const data = await response.json();

            if (data.success) {
                // Update current user data
                currentUser = data.user;

                // Update profile display
                document.getElementById('profileName').textContent = data.user.name;
                document.getElementById('profileEmail').textContent = data.user.email;
                document.getElementById('profileBio').textContent = data.user.bio || 'No bio added yet';

                // Show success notification
                showNotification('success', 'Profile Updated!', 'Your profile has been updated successfully');

                // Close modal after short delay
                setTimeout(() => {
                    closeEditModal();
                }, 1500);
            } else {
                showError('editProfileError', data.error || 'Failed to update profile');
            }
        } catch (err) {
            console.error('Update profile error:', err);
            showError('editProfileError', 'Network error. Please try again.');
        }
    });
}

// ============================================
// PROFILE PICTURE UPLOAD
// ============================================

function initProfilePictureUpload() {
    const uploadProfilePicBtn = document.getElementById('uploadProfilePicBtn');
    const profilePicInput = document.getElementById('profilePicInput');
    const profileAvatarImg = document.getElementById('profileAvatar');

    if (uploadProfilePicBtn && profilePicInput) {
        uploadProfilePicBtn.addEventListener('click', () => {
            profilePicInput.click();
        });

        profilePicInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Check file size (limit to 15MB for profile pictures)
            if (file.size > 15 * 1024 * 1024) {
                showNotification('error', 'File Too Large', 'Please select an image smaller than 15MB');
                profilePicInput.value = '';
                return;
            }

            try {
                // Upload file to server using FormData (not base64)
                const formData = new FormData();
                formData.append('profilePicture', file);

                const response = await fetch(`${API_BASE}/users/profile-picture`, {
                    method: 'PUT',
                    credentials: 'include',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    // Update the image display with returned URL
                    if (profileAvatarImg) {
                        profileAvatarImg.src = data.profilePicture;
                        profileAvatarImg.classList.add('show');
                    }

                    // Update current user data
                    if (currentUser) {
                        currentUser.profilePicture = data.profilePicture;
                    }

                    // Update navbar profile picture
                    updateNavbarProfilePic();

                    showNotification('success', 'Success!', 'Profile picture updated successfully');
                } else {
                    showNotification('error', 'Failed', data.error || 'Failed to update profile picture');
                }
            } catch (err) {
                console.error('Upload profile picture error:', err);
                showNotification('error', 'Error', 'Failed to upload profile picture. Please try again.');
            }
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfilePictureUpload);
} else {
    initProfilePictureUpload();
}

// ============================================
// MY POSTS FUNCTIONALITY
// ============================================
// Displays and manages the current user's own posts
// Includes edit and delete functionality
// Uses GET /M01049109/contents/my endpoint
// ============================================

/**
 * Loads and displays all posts created by the current user
 * Shows posts with edit and delete options
 * Used on the profile page's "My Posts" section
 */
async function loadMyPosts() {
    // Get reference to the posts container
    const container = document.getElementById('myPostsContainer');
    container.innerHTML = '<p style="text-align:center;color:#999;">Loading your posts...</p>';

    try {
        const response = await fetch(`${API_BASE}/contents/my`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.success) {
            if (data.posts.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <h3>No posts yet</h3>
                        <p>Create your first post to share with the community!</p>
                    </div>
                `;
            } else {
                container.innerHTML = data.posts.map(post => renderMyPost(post)).join('');
            }
        } else {
            container.innerHTML = `<p style="color:#e74c3c;">${data.error || 'Failed to load posts'}</p>`;
        }
    } catch (err) {
        console.error('Load my posts error:', err);
        container.innerHTML = '<p style="color:#e74c3c;">Network error. Please try again.</p>';
    }
}

/**
 * Renders a single post card for the "My Posts" section
 * Includes edit and delete buttons not shown in regular feed posts
 * @param {Object} post - The post object to render
 * @returns {string} HTML string for the post card with edit/delete options
 */
function renderMyPost(post) {
    // Generate avatar content - show profile picture if available
    const avatarContent = currentUser?.profilePicture
        ? `<img src="${currentUser.profilePicture}" alt="${post.userName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
        : '';

    return `
        <div class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-avatar">${avatarContent}</div>
                <div class="post-user-info">
                    <h4>${post.userName}</h4>
                    <p>${formatDate(post.createdAt)}</p>
                </div>
                <div class="post-actions">
                    <button class="btn-edit-post" onclick="openEditPostModal('${post.id}', '${escapeHtml(post.caption)}', '${escapeHtml(post.location)}', '${post.image_url || ''}')">Edit</button>
                    <button class="btn-delete-post" onclick="deletePost('${post.id}')">Delete</button>
                </div>
            </div>
            ${post.image_url ? `
                <div class="post-image-container">
                    <img src="${post.image_url}" alt="Nature photo" class="post-image show">
                </div>
            ` : ''}
            <div class="post-content">
                <div class="post-info-row">
                    <div class="post-location">
                        <img src="/Style/icons/location.svg" alt="Location" class="location-icon">
                        ${post.location}
                    </div>
                </div>
                <p class="post-caption">${post.caption}</p>
            </div>
        </div>
    `;
}

/**
 * Escapes HTML special characters to prevent XSS attacks
 * Converts characters like <, >, &, ", ' to HTML entities
 * Used when inserting user-generated content into HTML
 * @param {string} text - The text to escape
 * @returns {string} The escaped text safe for HTML insertion
 */
function escapeHtml(text) {
    // Map of characters to their HTML entity equivalents
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ============================================
// EDIT POST MODAL
// ============================================
// Modal dialog for editing existing posts
// Allows updating caption, location, and image
// Uses PUT /M01049109/contents/:postId endpoint
// ============================================

// Get references to edit post modal elements
const editPostModal = document.getElementById('editPostModal');
const closeEditPostModal = document.getElementById('closeEditPostModal');
const cancelEditPost = document.getElementById('cancelEditPost');
const editPostForm = document.getElementById('editPostForm');
const editPostImageInput = document.getElementById('editPostImage');
const editPostImagePreview = document.getElementById('editPostImagePreview');

// Track which post is currently being edited
let currentEditingPostId = null;
// Store the current image URL for the post being edited
let currentEditingPostImage = null;

/**
 * Opens the edit post modal and populates it with existing post data
 * @param {string} postId - The ID of the post to edit
 * @param {string} caption - The current caption text
 * @param {string} location - The current location text
 * @param {string} imageUrl - The current image URL (if any)
 */
function openEditPostModal(postId, caption, location, imageUrl) {
    currentEditingPostId = postId;
    currentEditingPostImage = imageUrl;

    document.getElementById('editPostId').value = postId;
    document.getElementById('editPostCaption').value = caption;
    document.getElementById('editPostLocation').value = location;

    // Clear the file input
    editPostImageInput.value = '';

    // Show current image if exists
    if (imageUrl) {
        editPostImagePreview.innerHTML = `
            <img src="${imageUrl}" alt="Current image">
            <p style="font-size: 0.85rem; color: #999; margin-top: 10px;">Current image (upload new to replace)</p>
        `;
        editPostImagePreview.classList.add('show');
    } else {
        editPostImagePreview.innerHTML = '';
        editPostImagePreview.classList.remove('show');
    }

    editPostModal.classList.add('show');
}

closeEditPostModal.addEventListener('click', () => {
    editPostModal.classList.remove('show');
    editPostForm.reset();
    editPostImageInput.value = '';
    editPostImagePreview.innerHTML = '';
    editPostImagePreview.classList.remove('show');
});

cancelEditPost.addEventListener('click', () => {
    editPostModal.classList.remove('show');
    editPostForm.reset();
    editPostImageInput.value = '';
    editPostImagePreview.innerHTML = '';
    editPostImagePreview.classList.remove('show');
});

// Preview new image if selected
editPostImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 15 * 1024 * 1024) {
            showNotification('error', 'File Too Large', 'Please select an image smaller than 15MB');
            editPostImageInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            editPostImagePreview.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <p style="font-size: 0.85rem; color: #999; margin-top: 10px;">New image preview</p>
            `;
            editPostImagePreview.classList.add('show');
        };
        reader.readAsDataURL(file);
    }
});

editPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const caption = document.getElementById('editPostCaption').value;
    const location = document.getElementById('editPostLocation').value;
    const imageFile = editPostImageInput.files[0];

    try {
        let image_url = currentEditingPostImage;

        // Upload new image to server filesystem if provided (not base64)
        if (imageFile) {
            if (imageFile.size > 15 * 1024 * 1024) {
                showNotification('error', 'File Too Large', 'Please select an image smaller than 15MB');
                return;
            }
            try {
                const formData = new FormData();
                formData.append('image', imageFile);

                const uploadResponse = await fetch(`${API_BASE}/upload`, {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                });

                const uploadData = await uploadResponse.json();

                if (uploadData.success) {
                    image_url = uploadData.path;
                } else {
                    showNotification('error', 'Error', uploadData.error || 'Failed to upload image');
                    return;
                }
            } catch (err) {
                console.error('Failed to upload image:', err);
                showNotification('error', 'Error', 'Failed to upload image. Please try again.');
                return;
            }
        }

        const response = await fetch(`${API_BASE}/contents/${currentEditingPostId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ caption, location, image_url })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('success', 'Success!', 'Post updated successfully');
            editPostModal.classList.remove('show');
            editPostForm.reset();
            editPostImageInput.value = '';
            editPostImagePreview.innerHTML = '';
            editPostImagePreview.classList.remove('show');
            loadMyPosts();
        } else {
            showNotification('error', 'Failed', data.error || 'Failed to update post');
        }
    } catch (err) {
        console.error('Edit post error:', err);
        showNotification('error', 'Error', 'Network error. Please try again.');
    }
});

// ============================================
// DELETE POST
// ============================================
// Handles permanent deletion of user's own posts
// Shows confirmation dialog before deleting
// Uses DELETE /M01049109/contents/:postId endpoint
// ============================================

/**
 * Deletes a post after user confirmation
 * Only allows deletion of user's own posts (server validates ownership)
 * @param {string} postId - The ID of the post to delete
 */
async function deletePost(postId) {
    // Show custom confirmation dialog
    const confirmed = await showConfirmation(
        'Delete Post',
        'Are you sure you want to delete this post? This action cannot be undone.'
    );
    
    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/contents/${postId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            showNotification('success', 'Deleted', 'Post deleted successfully');
            loadMyPosts();
        } else {
            showNotification('error', 'Failed', data.error || 'Failed to delete post');
        }
    } catch (err) {
        console.error('Delete post error:', err);
        showNotification('error', 'Error', 'Network error. Please try again.');
    }
}

// ============================================
// AI CHATBOT - TERRA DEVELOPER ASSISTANT
// ============================================
// Floating chatbot widget that helps users navigate the app
// Uses OpenAI API via server-side endpoint
// Maintains conversation history for context
// ============================================

// Conversation history for context-aware responses
let chatConversationHistory = [];

/**
 * Shows the chatbot widget (only when user is logged in)
 */
function showChatbot() {
    const chatbotWidget = document.getElementById('chatbotWidget');
    if (chatbotWidget) {
        chatbotWidget.style.display = 'block';
    }
}

/**
 * Hides the chatbot widget (when user is logged out)
 */
function hideChatbot() {
    const chatbotWidget = document.getElementById('chatbotWidget');
    if (chatbotWidget) {
        chatbotWidget.style.display = 'none';
        // Also close the chat window if it's open
        chatbotWidget.classList.remove('open');
    }
}

/**
 * Initializes the chatbot widget and event listeners
 */
function initChatbot() {
    const chatbotToggle = document.getElementById('chatbotToggle');
    const chatbotWindow = document.getElementById('chatbotWindow');
    const chatbotMinimize = document.getElementById('chatbotMinimize');
    const chatbotInput = document.getElementById('chatbotInput');
    const chatbotSend = document.getElementById('chatbotSend');
    const chatbotWidget = document.getElementById('chatbotWidget');

    if (!chatbotToggle || !chatbotWindow) return;
    
    // Hide chatbot initially (will be shown after login)
    hideChatbot();

    // Toggle chat window
    chatbotToggle.addEventListener('click', () => {
        chatbotWidget.classList.toggle('open');
        if (chatbotWidget.classList.contains('open')) {
            chatbotInput.focus();
        }
    });

    // Minimize button
    if (chatbotMinimize) {
        chatbotMinimize.addEventListener('click', () => {
            chatbotWidget.classList.remove('open');
        });
    }

    // Send message on button click
    if (chatbotSend) {
        chatbotSend.addEventListener('click', sendChatMessage);
    }

    // Send message on Enter key
    if (chatbotInput) {
        chatbotInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
}

/**
 * Sends a message to the chatbot and displays the response
 */
async function sendChatMessage() {
    const chatbotInput = document.getElementById('chatbotInput');
    const chatbotMessages = document.getElementById('chatbotMessages');
    const chatbotSend = document.getElementById('chatbotSend');

    const message = chatbotInput.value.trim();
    if (!message) return;

    // Clear input
    chatbotInput.value = '';

    // Add user message to UI
    addChatMessage(message, 'user');

    // Add to conversation history
    chatConversationHistory.push({ role: 'user', content: message });

    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'chat-message bot-message typing-indicator';
    typingIndicator.innerHTML = `
        <div class="message-content">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        </div>
    `;
    chatbotMessages.appendChild(typingIndicator);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;

    // Disable send button
    chatbotSend.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                message: message,
                conversationHistory: chatConversationHistory.slice(-10) // Send last 10 messages for context
            })
        });

        const data = await response.json();

        // Remove typing indicator
        typingIndicator.remove();

        if (data.success) {
            // Add bot response to UI
            addChatMessage(data.reply, 'bot');
            
            // Add to conversation history
            chatConversationHistory.push({ role: 'assistant', content: data.reply });
        } else {
            addChatMessage(data.error || 'Sorry, I encountered an error. Please try again.', 'bot');
        }

    } catch (err) {
        console.error('Chatbot error:', err);
        // Remove typing indicator
        typingIndicator.remove();
        addChatMessage('Sorry, I\'m having trouble connecting. Please try again.', 'bot');
    } finally {
        // Re-enable send button
        chatbotSend.disabled = false;
        chatbotInput.focus();
    }
}

/**
 * Adds a message to the chat window
 * @param {string} content - The message content
 * @param {string} sender - 'user' or 'bot'
 */
function addChatMessage(content, sender) {
    const chatbotMessages = document.getElementById('chatbotMessages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;
    messageDiv.innerHTML = `<div class="message-content">${escapeHtmlChat(content)}</div>`;
    
    chatbotMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

/**
 * Escapes HTML to prevent XSS in chat messages
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtmlChat(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize chatbot when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
} else {
    initChatbot();
}