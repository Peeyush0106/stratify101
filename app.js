// Global variables
let currentUser = null;
let userActivities = [];

// DOM Elements
const authSection = document.getElementById('auth-section');
const profileSetup = document.getElementById('profile-setup');
const dashboard = document.getElementById('dashboard');
const googleSigninBtn = document.getElementById('google-signin');
const profileForm = document.getElementById('profile-form');
const activityForm = document.getElementById('activity-form');
const logoutBtn = document.getElementById('logout-btn');

// Initialize the app
function init() {
    updateTime();
    setInterval(updateTime, 1000);

    // Auth state listener
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            checkUserProfile();
        } else {
            currentUser = null;
            showAuthSection();
        }
    });

    // Event listeners
    googleSigninBtn.addEventListener('click', signInWithGoogle);
    profileForm.addEventListener('submit', handleProfileSetup);
    activityForm.addEventListener('submit', handleActivitySubmit);
    logoutBtn.addEventListener('click', logout);
}

// Update current time display
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const timeDisplay = document.getElementById('current-time');
    if (timeDisplay) {
        timeDisplay.textContent = timeString;
    }
}

// Google Sign In
async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
    } catch (error) {
        console.error('Error signing in with Google:', error);
        showError('auth-error', 'Failed to sign in with Google. Please try again.');
    }
}

// Check if user profile is complete
function checkUserProfile() {
    const userRef = database.ref(`users/${currentUser.uid}`);
    userRef.once('value', (snapshot) => {
        const userData = snapshot.val();
        if (userData && userData.profileComplete) {
            showDashboard();
            loadUserData();
        } else {
            showProfileSetup();
        }
    });
}

// Handle profile setup
async function handleProfileSetup(e) {
    e.preventDefault();

    const displayName = document.getElementById('display-name').value;
    const birthdate = document.getElementById('birthdate').value;

    if (!displayName || !birthdate) {
        showError('setup-error', 'Please fill in all fields.');
        return;
    }

    try {
        const userRef = database.ref(`users/${currentUser.uid}`);
        await userRef.set({
            displayName: displayName,
            birthdate: birthdate,
            email: currentUser.email,
            profileComplete: true,
            joinedDate: firebase.database.ServerValue.TIMESTAMP
        });

        showDashboard();
        loadUserData();
    } catch (error) {
        console.error('Error saving profile:', error);
        showError('setup-error', 'Failed to save profile. Please try again.');
    }
}

// Handle activity submission
async function handleActivitySubmit(e) {
    e.preventDefault();

    const description = document.getElementById('activity-description').value;
    const duration = parseInt(document.getElementById('activity-duration').value);

    if (!description || !duration) {
        showError('activity-error', 'Please fill in all fields.');
        return;
    }

    try {
        const activityRef = database.ref(`activities/${currentUser.uid}`).push();
        const now = new Date();

        await activityRef.set({
            description: description,
            duration: duration,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            date: now.toDateString(),
            time: now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            })
        });

        // Reset form
        activityForm.reset();
        showSuccess('activity-success', 'Activity logged successfully!');

        // Reload activities
        loadUserActivities();

        // Hide success message after 3 seconds
        setTimeout(() => {
            hideMessage('activity-success');
        }, 3000);

    } catch (error) {
        console.error('Error logging activity:', error);
        showError('activity-error', 'Failed to log activity. Please try again.');
    }
}

// Load user data and activities
function loadUserData() {
    // Load user profile
    const userRef = database.ref(`users/${currentUser.uid}`);
    userRef.once('value', (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            document.getElementById('user-name').textContent = userData.displayName;
            document.getElementById('user-email').textContent = userData.email;
            document.getElementById('user-avatar').textContent = userData.displayName.charAt(0).toUpperCase();
        }
    });

    // Load activities
    loadUserActivities();
}

// Load user activities
function loadUserActivities() {
    const activitiesRef = database.ref(`activities/${currentUser.uid}`);
    activitiesRef.on('value', (snapshot) => {
        const activities = snapshot.val();
        userActivities = [];

        if (activities) {
            Object.keys(activities).forEach(key => {
                userActivities.push({
                    id: key,
                    ...activities[key]
                });
            });
        }

        // Sort by timestamp (newest first)
        userActivities.sort((a, b) => b.timestamp - a.timestamp);

        updateActivityDisplay();
        updateStats();
    });
}

// Update activity display
function updateActivityDisplay() {
    const activitiesList = document.getElementById('activities-list');
    const today = new Date().toDateString();
    const todayActivities = userActivities.filter(activity => activity.date === today);

    if (todayActivities.length === 0) {
        activitiesList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No activities logged today. Start by adding your first activity!</p>';
        return;
    }

    activitiesList.innerHTML = todayActivities.map(activity => `
                <div class="activity-item">
                    <div class="activity-details">
                        <h4>${activity.description}</h4>
                        <p>Logged at ${activity.time}</p>
                    </div>
                    <div class="activity-time">${activity.duration} min</div>
                </div>
            `).join('');
}

// Update statistics
function updateStats() {
    const today = new Date().toDateString();
    const todayActivities = userActivities.filter(activity => activity.date === today);
    const uniqueDays = [...new Set(userActivities.map(activity => activity.date))].length;

    document.getElementById('activities-today').textContent = todayActivities.length;
    document.getElementById('total-activities').textContent = userActivities.length;
    document.getElementById('active-days').textContent = uniqueDays;
}

// Show/Hide sections
function showAuthSection() {
    authSection.classList.remove('hidden');
    profileSetup.classList.add('hidden');
    dashboard.classList.add('hidden');
}

function showProfileSetup() {
    authSection.classList.add('hidden');
    profileSetup.classList.remove('hidden');
    dashboard.classList.add('hidden');
}

function showDashboard() {
    authSection.classList.add('hidden');
    profileSetup.classList.add('hidden');
    dashboard.classList.remove('hidden');
}

// Utility functions
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }
}

function showSuccess(elementId, message) {
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = message;
        successElement.classList.remove('hidden');
    }
}

function hideMessage(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('hidden');
    }
}

// Logout function
async function logout() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Error signing out:', error);
    }
}

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', init);