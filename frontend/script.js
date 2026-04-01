// JAN SAMADHAN - Frontend JavaScript

// Global variables
let currentUser = null;
let authToken = null;
let uploadedImages = []; // Store uploaded images
let homeMap = null;
let mapMarkers = [];
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    // Initialize chatbot first to ensure it works even if other parts fail
    try { initChatbot(); } catch (e) { console.error("Chatbot init error:", e); }
    
    checkAuthStatus();
    setupEventListeners();
    initializeDynamicHomepage();

    // Hide admin panel link by default for regular users
    const adminPanelLink = document.getElementById('adminPanelLink');
    if (adminPanelLink) {
        adminPanelLink.style.display = 'none';
    }
});

// Initialize dynamic homepage
function initializeDynamicHomepage() {
    loadHomepageStats();
    loadRecentActivity();
    // Initialize Google Maps after a short delay to ensure API is loaded
    setTimeout(() => {
        if (typeof initMap === 'function') {
            initMap();
        } else {
            initializeGoogleMap();
        }
    }, 1000);

    // Fallback: If map doesn't load after 5 seconds, show error
    setTimeout(() => {
        if (!homeMap) {
            console.log('Map failed to load, showing fallback');
            showMapError();
        }
    }, 5000);

    startRealTimeUpdates();
}

// Load homepage statistics
async function loadHomepageStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`);
        if (response.ok) {
            const stats = await response.json();
            updateHomepageStats(stats);
        }
    } catch (error) {
        console.error('Error loading homepage stats:', error);
    }
}

// Update homepage statistics
function updateHomepageStats(stats) {
    // Update hero section stats
    const totalElement = document.getElementById('totalComplaintsCount');
    const resolvedElement = document.getElementById('resolvedComplaintsCount');
    const activeUsersElement = document.getElementById('activeUsersCount');

    if (totalElement) totalElement.textContent = stats.total_complaints || 0;
    if (resolvedElement) resolvedElement.textContent = stats.resolved_complaints || 0;
    if (activeUsersElement) activeUsersElement.textContent = Math.floor(Math.random() * 100) + 50; // Demo active users

    // Update quick stats
    const todayComplaintsElement = document.getElementById('todayComplaints');
    const resolutionRateElement = document.getElementById('resolutionRate');
    const avgResponseTimeElement = document.getElementById('avgResponseTime');

    if (todayComplaintsElement) todayComplaintsElement.textContent = Math.floor(Math.random() * 10) + 5;
    if (resolutionRateElement) {
        const rate = stats.total_complaints > 0 ?
            Math.round((stats.resolved_complaints / stats.total_complaints) * 100) : 0;
        resolutionRateElement.textContent = rate + '%';
    }
    if (avgResponseTimeElement) avgResponseTimeElement.textContent = Math.floor(Math.random() * 24) + 2 + 'h';
}

// Load recent activity feed
async function loadRecentActivity() {
    const activityFeed = document.getElementById('recentActivityFeed');
    if (!activityFeed) return;

    try {
        const response = await fetch(`${API_BASE_URL}/complaints`);
        if (response.ok) {
            const complaints = await response.json();
            displayRecentActivity(complaints.slice(0, 5));
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
        activityFeed.innerHTML = '<p class="text-muted">Unable to load recent activity</p>';
    }
}

// Display recent activity
function displayRecentActivity(complaints) {
    const activityFeed = document.getElementById('recentActivityFeed');
    if (!activityFeed) return;

    if (complaints.length === 0) {
        activityFeed.innerHTML = '<p class="text-muted">No recent activity</p>';
        return;
    }

    const activityHTML = complaints.map(complaint => `
        <div class="activity-item">
            <div class="activity-header">
                <span class="activity-title">${complaint.title}</span>
                <span class="activity-time">${formatDate(complaint.created_at)}</span>
            </div>
            <p class="activity-description">${complaint.description.substring(0, 100)}${complaint.description.length > 100 ? '...' : ''}</p>
            <div class="activity-meta">
                <span class="badge bg-secondary">${complaint.category}</span>
                <span class="badge bg-${getPriorityColor(complaint.priority)}">${complaint.priority}</span>
                <span class="badge bg-${getStatusColor(complaint.status)}">${complaint.status.replace('_', ' ')}</span>
            </div>
        </div>
    `).join('');

    activityFeed.innerHTML = activityHTML;
}

// Initialize Google Maps
function initializeGoogleMap() {
    const mapElement = document.getElementById('homeMap');
    if (!mapElement) return;

    // Check if Google Maps API is loaded
    if (typeof google === 'undefined' || !google.maps) {
        console.log('Google Maps API not loaded yet, retrying...');
        setTimeout(initializeGoogleMap, 1000);
        return;
    }

    try {
        // Initialize map centered on India
        const mapOptions = {
            center: { lat: 20.5937, lng: 78.9629 },
            zoom: 5,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'geometry',
                    stylers: [{ visibility: 'off' }]
                },
                {
                    featureType: 'administrative',
                    elementType: 'geometry',
                    stylers: [{ visibility: 'simplified' }]
                }
            ]
        };

        homeMap = new google.maps.Map(mapElement, mapOptions);

        // Load complaint markers
        loadComplaintMarkers();

        // Add map controls
        addMapControls();

        console.log('Google Maps initialized successfully');
    } catch (error) {
        console.error('Error initializing Google Maps:', error);
        showMapError();
    }
}

// Global callback function for Google Maps
function initMap() {
    console.log('Google Maps API loaded, initializing map...');
    initializeGoogleMap();
}

// Show map error message
function showMapError() {
    const mapElement = document.getElementById('homeMap');
    if (mapElement) {
        mapElement.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f8f9fa; border-radius: 15px;">
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-map-marked-alt fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">Map Loading Error</h5>
                    <p class="text-muted">Unable to load Google Maps. Showing static complaint data instead.</p>
                    <button class="btn btn-primary btn-sm" onclick="loadStaticComplaintView()">Show Complaint List</button>
                </div>
            </div>
        `;
    }
}

// Load static complaint view when map fails
function loadStaticComplaintView() {
    const mapElement = document.getElementById('homeMap');
    if (mapElement) {
        mapElement.innerHTML = `
            <div style="height: 100%; overflow-y: auto; padding: 1rem; background: #f8f9fa; border-radius: 15px;">
                <h5 class="mb-3">Recent Complaints</h5>
                <div id="staticComplaintList">
                    <div class="text-center">
                        <div class="spinner-border spinner-border-sm" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        loadStaticComplaints();
    }
}

// Load static complaints
async function loadStaticComplaints() {
    try {
        const response = await fetch(`${API_BASE_URL}/complaints`);
        if (response.ok) {
            const complaints = await response.json();
            displayStaticComplaints(complaints);
        }
    } catch (error) {
        console.error('Error loading complaints:', error);
    }
}

// Display static complaints
function displayStaticComplaints(complaints) {
    const listElement = document.getElementById('staticComplaintList');
    if (!listElement) return;

    const complaintsHTML = complaints.map(complaint => `
        <div class="card mb-2">
            <div class="card-body p-3">
                <h6 class="card-title mb-1">${complaint.title}</h6>
                <p class="card-text small text-muted mb-2">${complaint.description.substring(0, 100)}${complaint.description.length > 100 ? '...' : ''}</p>
                <div class="d-flex gap-2">
                    <span class="badge bg-${getPriorityColor(complaint.priority)}">${complaint.priority}</span>
                    <span class="badge bg-${getStatusColor(complaint.status)}">${complaint.status.replace('_', ' ')}</span>
                    <span class="badge bg-secondary">${complaint.category}</span>
                </div>
            </div>
        </div>
    `).join('');

    listElement.innerHTML = complaintsHTML;
}

// Load complaint markers on map
async function loadComplaintMarkers() {
    if (!homeMap) return;

    try {
        const response = await fetch(`${API_BASE_URL}/complaints`);
        if (response.ok) {
            const complaints = await response.json();
            addComplaintMarkers(complaints);
        }
    } catch (error) {
        console.error('Error loading complaint markers:', error);
    }
}

// Add complaint markers to map
function addComplaintMarkers(complaints) {
    // Clear existing markers
    mapMarkers.forEach(marker => marker.setMap(null));
    mapMarkers = [];

    complaints.forEach(complaint => {
        // Geocode location (for demo, use approximate coordinates)
        const location = geocodeLocation(complaint.location || complaint.category);

        if (location) {
            const marker = new google.maps.Marker({
                position: { lat: location.lat, lng: location.lng },
                map: homeMap,
                title: complaint.title,
                icon: getMarkerIcon(location.dept, complaint.status),
                animation: google.maps.Animation.DROP
            });

            // Create info window
            const infoWindow = new google.maps.InfoWindow({
                content: createInfoWindowContent(complaint)
            });

            // Add click listener
            marker.addListener('click', () => {
                infoWindow.open(homeMap, marker);
            });

            mapMarkers.push(marker);
        }
    });
}

// Geocode location (simplified for demo with 3 departments)
function geocodeLocation(locationText) {
    // For demo purposes, return approximate coordinates for 3 departments
    const locations = {
        'water': { lat: 28.6139, lng: 77.2090, dept: 'water' },
        'delhi': { lat: 28.6139, lng: 77.2090, dept: 'water' },
        'mumbai': { lat: 19.0760, lng: 72.8777, dept: 'road' },
        'bangalore': { lat: 12.9716, lng: 77.5946, dept: 'road' },
        'chennai': { lat: 13.0827, lng: 80.2707, dept: 'light' },
        'kolkata': { lat: 22.5726, lng: 88.3639, dept: 'road' },
        'hyderabad': { lat: 17.3850, lng: 78.4867, dept: 'water' },
        'pune': { lat: 18.5204, lng: 73.8567, dept: 'road' },
        'street light': { lat: 13.0827, lng: 80.2707, dept: 'light' },
        'light': { lat: 13.0827, lng: 80.2707, dept: 'light' },
        'road': { lat: 12.9716, lng: 77.5946, dept: 'road' },
        'water supply': { lat: 28.6139, lng: 77.2090, dept: 'water' },
        'general administration': { lat: 22.5726, lng: 88.3639, dept: 'road' }
    };

    const locationLower = locationText.toLowerCase();
    for (const [key, coords] of Object.entries(locations)) {
        if (locationLower.includes(key)) {
            return coords;
        }
    }

    // Default location for unknown addresses - rotate through 3 departments
    const departments = ['water', 'light', 'road'];
    const randomDept = departments[Math.floor(Math.random() * departments.length)];
    const baseLocations = {
        'water': { lat: 28.6139, lng: 77.2090 },
        'light': { lat: 13.0827, lng: 80.2707 },
        'road': { lat: 12.9716, lng: 77.5946 }
    };

    const baseLoc = baseLocations[randomDept];
    return {
        lat: baseLoc.lat + (Math.random() - 0.5) * 2,
        lng: baseLoc.lng + (Math.random() - 0.5) * 2,
        dept: randomDept
    };
}

// Get marker icon based on department and status
function getMarkerIcon(dept, status) {
    const colors = {
        'water': status === 'resolved' ? '#6c757d' : '#007bff',
        'light': status === 'resolved' ? '#6c757d' : '#ffc107',
        'road': status === 'resolved' ? '#6c757d' : '#28a745'
    };

    const color = colors[dept] || '#6c757d';

    return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="8" fill="${color}" stroke="white" stroke-width="2"/>
            </svg>
        `)}`,
        scaledSize: new google.maps.Size(24, 24),
        anchor: new google.maps.Point(12, 12)
    };
}

// Create info window content
function createInfoWindowContent(complaint) {
    return `
        <div class="info-window">
            <h6>${complaint.title}</h6>
            <p>${complaint.description.substring(0, 100)}${complaint.description.length > 100 ? '...' : ''}</p>
            <div class="info-status">
                <span class="badge bg-${getPriorityColor(complaint.priority)}">${complaint.priority}</span>
                <span class="badge bg-${getStatusColor(complaint.status)}">${complaint.status.replace('_', ' ')}</span>
            </div>
            <p><small>Location: ${complaint.location || 'Not specified'}</small></p>
        </div>
    `;
}

// Add map controls
function addMapControls() {
    if (!homeMap) return;

    // Add custom zoom controls
    const zoomControlDiv = document.createElement('div');
    zoomControlDiv.style.marginTop = '10px';
    zoomControlDiv.style.marginRight = '10px';
    zoomControlDiv.innerHTML = `
        <button onclick="zoomIn()" class="btn btn-sm btn-primary">+</button>
        <button onclick="zoomOut()" class="btn btn-sm btn-primary">-</button>
        <button onclick="resetMap()" class="btn btn-sm btn-secondary">Reset</button>
    `;
    homeMap.controls[google.maps.ControlPosition.TOP_RIGHT].push(zoomControlDiv);
}

// Map control functions
function zoomIn() {
    if (homeMap) homeMap.setZoom(homeMap.getZoom() + 1);
}

function zoomOut() {
    if (homeMap) homeMap.setZoom(homeMap.getZoom() - 1);
}

function resetMap() {
    if (homeMap) {
        homeMap.setCenter({ lat: 20.5937, lng: 78.9629 });
        homeMap.setZoom(5);
    }
}

// Start real-time updates
function startRealTimeUpdates() {
    // Update stats every 30 seconds
    setInterval(loadHomepageStats, 30000);

    // Update activity feed every 60 seconds
    setInterval(loadRecentActivity, 60000);

    // Update map markers every 2 minutes
    setInterval(loadComplaintMarkers, 120000);
}

// Show different sections with map awareness
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }

    // Handle map visibility
    if (sectionId === 'home') {
        setTimeout(() => {
            if (homeMap) {
                google.maps.event.trigger(homeMap, 'resize');
            }
        }, 100);
    }

    // Load data based on section
    switch (sectionId) {
        case 'complaints':
            loadComplaints();
            break;
        case 'dashboard':
            loadDashboardStats();
            break;
        case 'profile':
            loadProfileData();
            break;
        case 'notifications':
            loadUserNotifications();
            break;
        case 'reports':
            loadUserReports();
            break;
        case 'leaderboard':
            loadLeaderboard();
            break;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);

    // Register form
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);

    // Complaint form
    document.getElementById('complaintForm')?.addEventListener('submit', function (e) {
        e.preventDefault();
        submitComplaint();
    });

    // Image upload functionality
    setupImageUpload();
}

// Setup image upload functionality
function setupImageUpload() {
    const imageInput = document.getElementById('complaintImages');
    const uploadArea = document.getElementById('imageUploadArea');

    if (imageInput && uploadArea) {
        // File input change event
        imageInput.addEventListener('change', handleImageSelect);

        // Drag and drop events
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleImageDrop);
    }
}

// Check authentication status
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');

    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        updateUIForAuthenticatedUser(currentUser);
        return true;
    }

    updateUIForUnauthenticatedUser();
    return false;
}

// Update UI for authenticated user
function updateUIForAuthenticatedUser(user) {
    // Show user-specific navigation items
    const userNavItems = ['complaints', 'dashboard', 'profile', 'notifications', 'reports'];
    userNavItems.forEach(item => {
        const navItem = document.querySelector(`a[onclick="showSection('${item}')"]`);
        if (navItem) {
            navItem.style.display = 'block';
        }
    });

    // Hide login/register
    const loginLink = document.querySelector('a[onclick="showSection(\'login\')"]');
    const registerLink = document.querySelector('a[onclick="showSection(\'register\')"]');
    if (loginLink) loginLink.style.display = 'none';
    if (registerLink) registerLink.style.display = 'none';

    // Show logout button
    const logoutLink = document.querySelector('a[onclick="handleLogout()"]');
    if (logoutLink) logoutLink.style.display = 'block';

    // Update user info
    if (document.getElementById('profileUsername')) {
        document.getElementById('profileUsername').textContent = user.username;
    }
    if (document.getElementById('profileEmail')) {
        document.getElementById('profileEmail').textContent = user.email;
    }

    // Load user data
    loadUserDashboard();
    loadUserProfile();
    loadUserNotifications();
    loadUserReports();
}

// Update UI for unauthenticated user
function updateUIForUnauthenticatedUser() {
    // Hide user-specific navigation items
    const userNavItems = ['complaints', 'dashboard', 'profile', 'notifications', 'reports'];
    userNavItems.forEach(item => {
        const navItem = document.querySelector(`a[onclick="showSection('${item}')"]`);
        if (navItem) {
            navItem.style.display = 'none';
        }
    });

    // Show login/register
    const loginLink = document.querySelector('a[onclick="showSection(\'login\')"]');
    const registerLink = document.querySelector('a[onclick="showSection(\'register\')"]');
    if (loginLink) loginLink.style.display = 'block';
    if (registerLink) registerLink.style.display = 'block';

    // Hide logout button
    const logoutLink = document.querySelector('a[onclick="handleLogout()"]');
    if (logoutLink) logoutLink.style.display = 'none';

    // Hide admin panel link
    const adminPanelLink = document.getElementById('adminPanelLink');
    if (adminPanelLink) {
        adminPanelLink.style.display = 'none';
    }
}

// Show different sections
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }

    // Load data based on section
    switch (sectionId) {
        case 'complaints':
            loadComplaints();
            break;
        case 'dashboard':
            loadDashboardStats();
            break;
        case 'profile':
            loadProfileData();
            break;
        case 'notifications':
            loadUserNotifications();
            break;
        case 'reports':
            loadUserReports();
            break;
    }
}

// Handle login
async function handleLogin(e) {
    if (e) e.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showNotification('Please enter username and password', 'danger');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.access_token;
            currentUser = data.user;

            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            updateUIForAuthenticatedUser(currentUser);
            showNotification('Login successful! Welcome back!', 'success');

            // Redirect to dashboard
            setTimeout(() => {
                showSection('dashboard');
            }, 1000);
        } else {
            showNotification(data.error || 'Login failed', 'danger');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Network error. Please try again.', 'danger');
    }
}

// Handle registration
async function handleRegister(e) {
    if (e) e.preventDefault();

    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const fullName = document.getElementById('registerFullName').value;

    if (!username || !email || !password || !fullName) {
        showNotification('Please fill all required fields', 'danger');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'danger');
        return;
    }

    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'danger');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                email,
                password,
                full_name: fullName,
                phone: document.getElementById('registerPhone').value || '',
                address: document.getElementById('registerAddress').value || ''
            })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.access_token;
            currentUser = data.user;

            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            updateUIForAuthenticatedUser(currentUser);
            showNotification('Registration successful! Welcome to JAN SAMADHAN!', 'success');

            // Redirect to dashboard
            setTimeout(() => {
                showSection('dashboard');
            }, 1000);
        } else {
            showNotification(data.error || 'Registration failed', 'danger');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Network error. Please try again.', 'danger');
    }
}

// Logout
function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;

    updateUIForUnauthenticatedUser();
    showNotification('Logged out successfully', 'info');

    // Redirect to home
    setTimeout(() => {
        showSection('home');
    }, 1000);
}

// Load user dashboard
async function loadUserDashboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const stats = await response.json();
            if (document.getElementById('totalComplaints')) {
                document.getElementById('totalComplaints').textContent = stats.total_complaints;
            }
            if (document.getElementById('pendingComplaints')) {
                document.getElementById('pendingComplaints').textContent = stats.pending_complaints;
            }
            if (document.getElementById('resolvedComplaints')) {
                document.getElementById('resolvedComplaints').textContent = stats.resolved_complaints;
            }
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load user profile
async function loadUserProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const user = data.user;

            if (document.getElementById('profileUsername')) {
                document.getElementById('profileUsername').textContent = user.username;
            }
            if (document.getElementById('profileEmail')) {
                document.getElementById('profileEmail').textContent = user.email;
            }
            if (document.getElementById('profileFullName')) {
                document.getElementById('profileFullName').textContent = user.full_name;
            }
            if (document.getElementById('profileLevel')) {
                document.getElementById('profileLevel').textContent = user.level;
            }
            if (document.getElementById('profileBadge')) {
                document.getElementById('profileBadge').textContent = user.badge;
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Load user notifications
async function loadUserNotifications() {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayNotifications(data.notifications);
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Display notifications
function displayNotifications(notifications) {
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;

    if (notifications.length === 0) {
        notificationsList.innerHTML = '<p class="text-muted text-center">No notifications</p>';
        return;
    }

    const notificationsHTML = notifications.map(notification => `
        <div class="card mb-2 ${notification.is_read ? 'bg-light' : 'bg-white'}">
            <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${notification.title}</h6>
                        <p class="mb-1">${notification.message}</p>
                        <small class="text-muted">${new Date(notification.created_at).toLocaleDateString()}</small>
                    </div>
                    <span class="badge bg-${notification.type}">${notification.type}</span>
                </div>
            </div>
        </div>
    `).join('');

    notificationsList.innerHTML = notificationsHTML;
}

// Load user reports
async function loadUserReports() {
    try {
        const response = await fetch(`${API_BASE_URL}/complaints`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            createReportCharts(data.complaints);
        }
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

// Create report charts
function createReportCharts(complaints) {
    // Category chart
    const categoryCtx = document.getElementById('categoryChart');
    if (categoryCtx) {
        const categoryData = {};
        complaints.forEach(complaint => {
            categoryData[complaint.category] = (categoryData[complaint.category] || 0) + 1;
        });

        new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryData),
                datasets: [{
                    data: Object.values(categoryData),
                    backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

// Load leaderboard
// Leaderboard functionality has been removed

// Load complaints
async function loadComplaints() {
    const complaintsList = document.getElementById('complaintsList');

    try {
        const headers = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/complaints`, {
            headers: headers
        });

        if (response.ok) {
            const complaints = await response.json();
            displayComplaints(complaints);
        } else {
            complaintsList.innerHTML = '<div class="alert alert-danger">Error loading complaints</div>';
        }
    } catch (error) {
        console.error('Error loading complaints:', error);
        complaintsList.innerHTML = '<div class="alert alert-danger">Network error. Please try again.</div>';
    }
}

// Display complaints
function displayComplaints(complaints) {
    const complaintsList = document.getElementById('complaintsList');

    if (complaints.length === 0) {
        complaintsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h4>No complaints found</h4>
                <p>Start by filing your first complaint.</p>
                <button class="btn btn-primary" onclick="showComplaintModal()">File Complaint</button>
            </div>
        `;
        return;
    }

    const complaintsHTML = complaints.map(complaint => `
        <div class="card complaint-card ${complaint.status}">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <h5 class="card-title">${complaint.title}</h5>
                        <p class="card-text">${complaint.description}</p>
                        <div class="d-flex flex-wrap gap-2 mb-2">
                            <span class="badge bg-secondary">${complaint.category}</span>
                            <span class="badge priority-${complaint.priority}">${complaint.priority}</span>
                            <span class="status-badge status-${complaint.status}">${complaint.status.replace('_', ' ')}</span>
                        </div>
                        ${complaint.location ? `<p class="mb-1"><i class="fas fa-map-marker-alt me-2"></i>${complaint.location}</p>` : ''}
                        ${complaint.contact_info ? `<p class="mb-1"><i class="fas fa-phone me-2"></i>${complaint.contact_info}</p>` : ''}
                        
                        <!-- Display images if available -->
                        ${complaint.images && complaint.images.length > 0 ? `
                            <div class="complaint-images">
                                ${complaint.images.map(image => `
                                    <img src="${image.dataUrl}" alt="${image.name}" onclick="viewFullImage('${image.dataUrl}', '${image.name}')" title="Click to view full size">
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="col-md-4 text-end">
                        <small class="text-muted">Created: ${formatDate(complaint.created_at)}</small><br>
                        <small class="text-muted">Updated: ${formatDate(complaint.updated_at)}</small>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-primary me-1" onclick="editComplaint(${complaint.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteComplaint(${complaint.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                            ${complaint.status === 'resolved' ? `
                                <button class="btn btn-sm btn-outline-success ms-1" onclick="showFeedbackModal(${complaint.id})">
                                    <i class="fas fa-star"></i> Feedback
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    complaintsList.innerHTML = complaintsHTML;
}

// Show complaint modal
function showComplaintModal() {
    const modal = new bootstrap.Modal(document.getElementById('complaintModal'));
    document.getElementById('complaintForm').reset();
    clearUploadedImages(); // Clear previous images
    modal.show();
}

// Image handling functions
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
}

function handleImageDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');

    const files = e.dataTransfer.files;
    handleFiles(files);
}

function handleImageSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

function handleFiles(files) {
    const validFiles = Array.from(files).filter(file => {
        // Check file type
        if (!file.type.startsWith('image/')) {
            showNotification(`${file.name} is not an image file`, 'warning');
            return false;
        }

        // Check file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            showNotification(`${file.name} is larger than 5MB`, 'warning');
            return false;
        }

        return true;
    });

    validFiles.forEach(file => {
        processImage(file);
    });
}

function processImage(file) {
    const reader = new FileReader();

    reader.onload = function (e) {
        const imageData = {
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: e.target.result,
            id: Date.now() + Math.random()
        };

        uploadedImages.push(imageData);
        displayImagePreview(imageData);
    };

    reader.readAsDataURL(file);
}

function displayImagePreview(imageData) {
    const previewContainer = document.getElementById('imagePreviewContainer');

    const previewDiv = document.createElement('div');
    previewDiv.className = 'image-preview';
    previewDiv.dataset.imageId = imageData.id;

    previewDiv.innerHTML = `
        <img src="${imageData.dataUrl}" alt="${imageData.name}">
        <button type="button" class="remove-image" onclick="removeImage(${imageData.id})">
            <i class="fas fa-times"></i>
        </button>
    `;

    previewContainer.appendChild(previewDiv);
}

function removeImage(imageId) {
    // Remove from array
    uploadedImages = uploadedImages.filter(img => img.id !== imageId);

    // Remove from DOM
    const previewElement = document.querySelector(`[data-image-id="${imageId}"]`);
    if (previewElement) {
        previewElement.remove();
    }

    showNotification('Image removed', 'info');
}

function clearUploadedImages() {
    uploadedImages = [];
    const previewContainer = document.getElementById('imagePreviewContainer');
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }
}

// Image viewing functions
function viewFullImage(imageSrc, imageAlt) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');

    modalImage.src = imageSrc;
    modalImage.alt = imageAlt;
    modal.style.display = 'flex';
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = 'none';
}

// Load leaderboard data
async function loadLeaderboard() {
    try {
        // Load user points
        const pointsResponse = await fetch(`${API_BASE_URL}/points/${currentUser.id}`);
        if (pointsResponse.ok) {
            const userPoints = await pointsResponse.json();
            document.getElementById('userPoints').textContent = userPoints.total_points;
            document.getElementById('userLevel').textContent = userPoints.level;
            document.getElementById('userBadge').textContent = userPoints.badge;
        }

        // Load leaderboard
        const leaderboardResponse = await fetch(`${API_BASE_URL}/leaderboard`);
        if (leaderboardResponse.ok) {
            const data = await leaderboardResponse.json();
            displayLeaderboard(data.leaderboard);
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

// Display leaderboard
function displayLeaderboard(leaderboard) {
    const leaderboardList = document.getElementById('leaderboardList');

    if (leaderboard.length === 0) {
        leaderboardList.innerHTML = '<p class="text-muted text-center">No data available</p>';
        return;
    }

    const leaderboardHTML = leaderboard.map((user, index) => {
        const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
        const medalIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;

        return `
            <div class="card mb-2 ${rankClass}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <span class="me-3 fs-4">${medalIcon}</span>
                            <div>
                                <h6 class="mb-1">${user.username}</h6>
                                <small class="text-muted">${user.level}</small>
                            </div>
                        </div>
                        <div class="text-end">
                            <h5 class="mb-0">${user.total_points}</h5>
                            <small class="text-muted">points</small>
                        </div>
                    </div>
                    <div class="mt-2">
                        <small class="text-muted">
                            ${user.complaints_filed || 0} complaints filed • 
                            ${user.complaints_resolved || 0} resolved • 
                            ${user.feedback_given || 0} feedback given
                        </small>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    leaderboardList.innerHTML = leaderboardHTML;
}

// Enhanced feedback submission
async function submitFeedback(complaintId, rating, comment) {
    try {
        const response = await fetch(`${API_BASE_URL}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                complaint_id: complaintId,
                user_id: currentUser.id,
                rating: rating,
                comment: comment
            })
        });

        if (response.ok) {
            showNotification('Thank you for your feedback! +10 points earned', 'success');
            // Refresh user points
            loadLeaderboard();
        } else {
            showNotification('Failed to submit feedback', 'danger');
        }
    } catch (error) {
        console.error('Submit feedback error:', error);
        showNotification('Network error. Please try again.', 'danger');
    }
}

// Submit complaint
async function submitComplaint() {
    const title = document.getElementById('complaintTitle').value;
    const description = document.getElementById('complaintDescription').value;
    const category = document.getElementById('complaintCategory').value;
    const priority = document.getElementById('complaintPriority').value;
    const location = document.getElementById('complaintLocation').value;
    const contactInfo = document.getElementById('complaintContact').value;

    if (!title || !description || !category) {
        showNotification('Please fill all required fields', 'danger');
        return;
    }

    if (!authToken) {
        showNotification('Please login to submit a complaint', 'warning');
        showSection('login');
        return;
    }

    try {
        const complaintData = {
            title,
            description,
            category,
            priority,
            location,
            contact_info: contactInfo,
            images: uploadedImages
        };

        const response = await fetch(`${API_BASE_URL}/complaints`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(complaintData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Complaint submitted successfully!', 'success');

            // Clear form
            document.getElementById('complaintForm').reset();
            uploadedImages = [];
            clearImagePreview();

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('complaintModal'));
            modal.hide();

            // Refresh complaints list
            loadComplaints();
            loadUserDashboard();
        } else {
            showNotification(data.error || 'Failed to submit complaint', 'danger');
        }
    } catch (error) {
        console.error('Error submitting complaint:', error);
        showNotification('Network error. Please try again.', 'danger');
    }
}

// Edit complaint
function editComplaint(complaintId) {
    showNotification('Edit functionality coming soon!', 'info');
}

// Delete complaint
async function deleteComplaint(complaintId) {
    if (!confirm('Are you sure you want to delete this complaint?')) {
        return;
    }

    showNotification('Delete functionality coming soon!', 'info');
}

// Show feedback modal
function showFeedbackModal(complaintId) {
    const rating = prompt('Please rate your satisfaction (1-5):');
    if (rating && rating >= 1 && rating <= 5) {
        const comment = prompt('Additional comments (optional):');
        submitFeedback(complaintId, parseInt(rating), comment);
    }
}

// Submit feedback
async function submitFeedback(complaintId, rating, comment) {
    showNotification('Feedback functionality coming soon!', 'info');
}

// Show notification
function showNotification(message, type = 'info') {
    const toastElement = document.getElementById('notificationToast');
    const toastMessage = document.getElementById('toastMessage');

    toastMessage.textContent = message;

    // Update toast class based on type
    toastElement.className = `toast bg-${type} text-white`;

    const toast = new bootstrap.Toast(toastElement);
    toast.show();
}

// Load profile data
async function loadProfileData() {
    try {
        // Update profile information
        document.getElementById('profileUsername').textContent = currentUser.username;
        document.getElementById('profileEmail').textContent = currentUser.email;
        document.getElementById('profileMemberSince').textContent = formatDate(currentUser.created_at || new Date());

        // Load statistics
        const statsResponse = await fetch(`${API_BASE_URL}/stats`);

        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            document.getElementById('profileTotalComplaints').textContent = stats.total_complaints;
            document.getElementById('profileResolvedComplaints').textContent = stats.resolved_complaints;
        }

        // Load recent activity
        const complaintsResponse = await fetch(`${API_BASE_URL}/complaints`);

        if (complaintsResponse.ok) {
            const complaints = await complaintsResponse.json();
            const recentActivity = document.getElementById('recentActivity');

            if (complaints.length === 0) {
                recentActivity.innerHTML = '<p class="text-muted">No recent activity</p>';
            } else {
                const activityHTML = complaints.slice(0, 3).map(complaint => `
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div>
                            <strong>${complaint.title}</strong>
                            <br>
                            <small class="text-muted">${complaint.category} - ${complaint.status.replace('_', ' ')}</small>
                        </div>
                        <small class="text-muted">${formatDate(complaint.created_at)}</small>
                    </div>
                `).join('');
                recentActivity.innerHTML = activityHTML;
            }
        }
    } catch (error) {
        console.error('Error loading profile data:', error);
    }
}

// Load user notifications
async function loadUserNotifications() {
    const notificationsList = document.getElementById('notificationsList');

    try {
        // For demo purposes, create some sample notifications
        const sampleNotifications = [
            {
                id: 1,
                title: 'Complaint Status Updated',
                message: 'Your complaint "Water Supply Issue" has been marked as in progress',
                type: 'info',
                is_read: false,
                created_at: new Date().toISOString()
            },
            {
                id: 2,
                title: 'New Feature Available',
                message: 'You can now track your complaints in real-time',
                type: 'success',
                is_read: false,
                created_at: new Date(Date.now() - 86400000).toISOString()
            }
        ];

        if (sampleNotifications.length === 0) {
            notificationsList.innerHTML = '<p class="text-muted text-center">No notifications</p>';
            return;
        }

        const unreadCount = sampleNotifications.filter(n => !n.is_read).length;
        const notificationBadge = document.getElementById('userNotificationCount');
        notificationBadge.textContent = unreadCount;
        notificationBadge.style.display = unreadCount > 0 ? 'inline' : 'none';

        const notificationsHTML = sampleNotifications.map(notification => `
            <div class="card mb-2 ${!notification.is_read ? 'border-primary' : ''}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="card-title mb-1">${notification.title}</h6>
                            <p class="card-text">${notification.message}</p>
                        </div>
                        <span class="badge bg-${notification.type === 'info' ? 'primary' : 'success'}">
                            ${notification.type}
                        </span>
                    </div>
                    <small class="text-muted">${formatDate(notification.created_at)}</small>
                </div>
            </div>
        `).join('');

        notificationsList.innerHTML = notificationsHTML;
    } catch (error) {
        notificationsList.innerHTML = '<div class="alert alert-danger">Error loading notifications</div>';
    }
}

// Load user reports
async function loadUserReports() {
    try {
        // Load statistics
        const statsResponse = await fetch(`${API_BASE_URL}/stats`);

        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            document.getElementById('reportTotalComplaints').textContent = stats.total_complaints;
            document.getElementById('reportResolvedComplaints').textContent = stats.resolved_complaints;
            document.getElementById('reportPendingComplaints').textContent = stats.pending_complaints;
        }

        // Load complaints for charts
        const complaintsResponse = await fetch(`${API_BASE_URL}/complaints`);

        if (complaintsResponse.ok) {
            const complaints = await complaintsResponse.json();
            createReportCharts(complaints);
        }
    } catch (error) {
        console.error('Error loading user reports:', error);
    }
}

// Create report charts
function createReportCharts(complaints) {
    // Category chart
    const categoryCtx = document.getElementById('categoryChart');
    if (categoryCtx) {
        const categoryData = {};
        complaints.forEach(complaint => {
            categoryData[complaint.category] = (categoryData[complaint.category] || 0) + 1;
        });

        new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryData),
                datasets: [{
                    data: Object.values(categoryData),
                    backgroundColor: [
                        '#007bff', '#28a745', '#ffc107', '#dc3545',
                        '#17a2b8', '#6f42c1', '#fd7e14', '#20c997'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Status chart
    const statusCtx = document.getElementById('statusChart');
    if (statusCtx) {
        const statusData = {
            pending: 0,
            in_progress: 0,
            resolved: 0,
            rejected: 0
        };

        complaints.forEach(complaint => {
            statusData[complaint.status]++;
        });

        new Chart(statusCtx, {
            type: 'bar',
            data: {
                labels: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
                datasets: [{
                    label: 'Complaints',
                    data: [statusData.pending, statusData.in_progress, statusData.resolved, statusData.rejected],
                    backgroundColor: ['#ffc107', '#17a2b8', '#28a745', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Timeline chart
    const timelineCtx = document.getElementById('timelineChart');
    if (timelineCtx) {
        const timelineData = {};
        complaints.forEach(complaint => {
            const date = new Date(complaint.created_at).toLocaleDateString();
            timelineData[date] = (timelineData[date] || 0) + 1;
        });

        const sortedDates = Object.keys(timelineData).sort((a, b) => new Date(a) - new Date(b));

        new Chart(timelineCtx, {
            type: 'line',
            data: {
                labels: sortedDates,
                datasets: [{
                    label: 'Complaints Filed',
                    data: sortedDates.map(date => timelineData[date]),
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Edit profile function
function editProfile() {
    showNotification('Profile editing coming soon!', 'info');
}

// Utility functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusBadgeClass(status) {
    const statusClasses = {
        'pending': 'status-pending',
        'in_progress': 'status-in_progress',
        'resolved': 'status-resolved',
        'rejected': 'status-rejected'
    };
    return statusClasses[status] || 'status-pending';
}

function getPriorityBadgeClass(priority) {
    const priorityClasses = {
        'low': 'priority-low',
        'medium': 'priority-medium',
        'high': 'priority-high',
        'urgent': 'priority-urgent'
    };
    return priorityClasses[priority] || 'priority-medium';
}

// Error handling
window.addEventListener('unhandledrejection', function (event) {
    console.error('Unhandled promise rejection:', event.reason);
    showNotification('An unexpected error occurred', 'danger');
});

// Service Worker registration (for PWA support)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js')
            .then(function (registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function (err) {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// ── Chatbot Logic ──
let recognition;
let synth = window.speechSynthesis;

function initChatbot() {
    console.log("Initializing chatbot...");
    const chatbotToggler = document.querySelector(".chatbot-toggler");
    const chatbox = document.querySelector(".chatbox");
    const chatInput = document.querySelector(".chat-input textarea");
    const sendChatBtn = document.querySelector("#send-btn");
    const voiceBtn = document.querySelector("#voice-btn");

    console.log("Elements found:", { chatbotToggler, chatbox, chatInput, sendChatBtn, voiceBtn });

    if (!chatbotToggler || !chatbox || !chatInput || !sendChatBtn) {
        console.warn("Chatbot elements missing, skipping init.");
        return;
    }

    chatbotToggler.addEventListener("click", () => {
        console.log("Chatbot toggler clicked!");
        document.body.classList.toggle("show-chatbot");
    });
    
    const createChatLi = (message, className) => {
        const chatLi = document.createElement("li");
        chatLi.classList.add("chat", className);
        let chatContent = className === "outgoing" ? `<p></p>` : `<span class="fas fa-robot"></span><p></p>`;
        chatLi.innerHTML = chatContent;
        chatLi.querySelector("p").textContent = message;
        return chatLi;
    };

    const handleChat = async () => {
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        chatInput.value = "";
        chatInput.style.height = "auto";

        chatbox.appendChild(createChatLi(userMessage, "outgoing"));
        chatbox.scrollTo(0, chatbox.scrollHeight);

        setTimeout(async () => {
            const incomingChatLi = createChatLi("Thinking...", "incoming");
            chatbox.appendChild(incomingChatLi);
            chatbox.scrollTo(0, chatbox.scrollHeight);
            
            const response = await getChatbotResponse(userMessage);
            // Use innerHTML for chatbot responses to support formatting and tracking cards
            incomingChatLi.querySelector("p").innerHTML = response;
            chatbox.scrollTo(0, chatbox.scrollHeight);
            
            // For speech, use a simplified text version if it's HTML
            const speechText = response.includes("tracking-card") ? 
                `Status of Complaint id ${userMessage.match(/\d+/)?.[0] || 'requested'} is currently being displayed.` : response;
            speak(speechText);
        }, 600);
    };

    sendChatBtn.addEventListener("click", handleChat);
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
            e.preventDefault();
            handleChat();
        }
    });

    // Voice Input (STT)
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';

        voiceBtn.addEventListener("click", () => {
            if (voiceBtn.classList.contains("listening")) {
                recognition.stop();
            } else {
                try {
                    recognition.start();
                    voiceBtn.classList.add("listening");
                } catch (err) { console.error("Speech recognition error:", err); }
            }
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            chatInput.value = transcript;
            voiceBtn.classList.remove("listening");
            handleChat();
        };

        recognition.onend = () => voiceBtn.classList.remove("listening");
        recognition.onerror = () => voiceBtn.classList.remove("listening");
    } else {
        voiceBtn.style.display = "none";
    }
}

async function getChatbotResponse(msg) {
    msg = msg.toLowerCase();
    
    // Status Check logic
    const statusMatch = msg.match(/(?:status|complaint|id)\s*#?(\d+)/) || msg.match(/^#?(\d+)$/);
    if (statusMatch) {
        const id = statusMatch[1];
        try {
            const res = await fetch(`${API_BASE_URL}/complaints/status/${id}`);
            if (res.ok) {
                const data = await res.json();
                const status = data.status.toLowerCase();
                
                // Determine step classes
                const isPending = status === 'pending';
                const isProgress = status === 'in_progress' || status === 'assigned';
                const isResolved = status === 'resolved';

                let steps = `
                    <div class="step ${isPending || isProgress || isResolved ? 'completed' : ''} ${isPending ? 'active' : ''}">
                        <div class="step-dot"></div><div class="step-label">Pending</div>
                    </div>
                    <div class="step ${isProgress || isResolved ? 'completed' : ''} ${isProgress ? 'active' : ''}">
                        <div class="step-dot"></div><div class="step-label">Processing</div>
                    </div>
                    <div class="step ${isResolved ? 'completed' : ''} ${isResolved ? 'active' : ''}">
                        <div class="step-dot"></div><div class="step-label">Resolved</div>
                    </div>
                `;
                
                return `
                <div class="tracking-card">
                    <div class="tracking-header">
                        <span class="tracking-id">Complaint #${id}</span>
                        <span class="tracking-status-label status-${status}">${status.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <div class="tracking-category">Category: ${data.category}</div>
                    <div class="tracking-stepper">
                        ${steps}
                    </div>
                    <div class="tracking-footer">
                        <i class="fas fa-clock"></i> Last updated: ${new Date(data.updated_at).toLocaleString()}
                    </div>
                </div>
            `;
            } else {
                return `I couldn't find details for Complaint #${id}. Please check the ID and try again.`;
            }
        } catch (e) { return "Error connecting to service. Please try again later."; }
    }

    // Contact/About info
    if (msg.includes("contact") || msg.includes("email") || msg.includes("phone") || msg.includes("help") || msg.includes("support")) {
        return "You can reach us at:\n📧 Email: help@jansamadhan.gov\n📞 Phone: +91-1800-123-456\nOur support team is available 24/7!";
    }

    // Filing Guide
    if (msg.includes("how to") || msg.includes("file") || msg.includes("complaint") || msg.includes("steps") || msg.includes("filiup")) {
        return "Filing a complaint is easy:\n1. <b>Login</b> to your account.\n2. Click <b>'Create Complaint'</b> in the sidebar.\n3. Fill in the location and details.\n4. Attach <b>photos</b> if needed.\n5. Select <b>Category</b> and <b>Priority</b>.\n6. Click <b>Submit</b>.\n7. Your complaint is registered!\n8. View status in <b>'My Complaints'</b>!";
    }

    if (msg.includes("photo") || msg.includes("image") || msg.includes("upload")) {
        return "Absolutely! Adding photos to your complaint helps our team identify the problem quickly. Highly recommended!";
    }

    if (msg.includes("time") || msg.includes("long") || msg.includes("duration")) {
        return "We strive for quick resolutions. Most issues are addressed within 3-5 working days. You'll get real-time updates as we progress.";
    }

    // Greeting
    if (msg.includes("hi") || msg.includes("hello") || msg.includes("namaste")) {
        return "Namaste! 🙏 How can I assist you with Jan Samadhan today?";
    }

    return "How can I assist you with the Jan Samadhan portal today?";
}

function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    // Select a female voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('google us english')) && v.lang.startsWith('en'));
    if (femaleVoice) utter.voice = femaleVoice;
    window.speechSynthesis.speak(utter);
}
