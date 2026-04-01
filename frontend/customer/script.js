// ── Global Variables ──
const API_BASE_URL = 'http://127.0.0.1:8000/api';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
let pageUploadedImages = [];
let uploadedImages = [];
let selectedRating = 0;
let currentComplaintId = null;
let currentComplaintIdForFeedback = null;
let leafMap = null;
let leafMarker = null;
let autoRefreshInterval = null;

// ── Initialization ──
document.addEventListener('DOMContentLoaded', () => {
    initChatbot(); // Initialize chatbot
    checkAuthStatus();
    setupEventListeners();
    startAutoRefresh();
});

// ── Authentication ──
function checkAuthStatus() {
    if (authToken && currentUser) {
        showAuthenticatedView();
        loadUserDashboard();
        loadUserComplaints();
        loadUserProfile();
        loadUserNotifications();
    } else {
        showUnauthenticatedView();
    }
}

function showAuthenticatedView() {
    document.getElementById('loginLink').style.display = 'none';
    document.getElementById('registerLink').style.display = 'none';
    document.getElementById('logoutLink').style.display = 'block';
    document.getElementById('createComplaintLink').style.display = 'block';
    document.getElementById('complaintsLink').style.display = 'block';
    document.getElementById('profileNavLink').style.display = 'block';
}

function showUnauthenticatedView() {
    document.getElementById('loginLink').style.display = 'block';
    document.getElementById('registerLink').style.display = 'block';
    document.getElementById('logoutLink').style.display = 'none';
    document.getElementById('createComplaintLink').style.display = 'none';
    document.getElementById('complaintsLink').style.display = 'none';
    document.getElementById('profileNavLink').style.display = 'none';
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!username || !password) return;
    setButtonLoading('loginBtn', true);
    try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok && data.access_token) {
            authToken = data.access_token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showNotification('Login successful!', 'success');
            showAuthenticatedView();
            showSection('complaints');
            loadUserDashboard();
            loadUserComplaints();
            loadUserProfile();
            loadUserNotifications();
        } else {
            showNotification(data.error || 'Invalid credentials', 'danger');
        }
    } catch (err) {
        showNotification('Network error. Please try again.', 'danger');
    } finally {
        setButtonLoading('loginBtn', false, '<i class="fas fa-sign-in-alt me-2"></i>Login');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const fullName = document.getElementById('registerFullName').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const phone = document.getElementById('registerPhone').value.trim();
    const address = document.getElementById('registerAddress').value.trim();
    if (!username || !email || !fullName || !password || !phone) return;
    if (password.length < 8) { showNotification('Password must be at least 8 characters long', 'danger'); return; }
    if (!/^\d{10}$/.test(phone)) { showNotification('Phone number must be exactly 10 digits', 'danger'); return; }
    if (password !== confirmPassword) { showNotification('Passwords do not match', 'danger'); return; }
    setButtonLoading('registerBtn', true);
    try {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, full_name: fullName, password, phone, address })
        });
        const data = await res.json();
        if (res.ok) {
            showNotification('Registration successful! Please login.', 'success');
            document.getElementById('registerForm').reset();
            showSection('login');
        } else {
            showNotification(data.error || 'Registration failed', 'danger');
        }
    } catch (err) {
        showNotification('Network error. Please try again.', 'danger');
    } finally {
        setButtonLoading('registerBtn', false, '<i class="fas fa-user-plus me-2"></i>Create Account');
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    showUnauthenticatedView();
    showSection('home');
    showNotification('Logged out successfully', 'info');
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
}

// ── Navigation ──
function showSection(sectionId, updateHash = true) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        window.scrollTo(0, 0);
    }
    if (updateHash) {
        const nextHash = `#${sectionId}`;
        history.replaceState(null, '', nextHash);
    }
    if (sectionId === 'home' && authToken) {
        loadHomeStats();
    } else if (sectionId === 'complaints' && authToken) {
        loadUserComplaints();
    } else if (sectionId === 'profile' && authToken) {
        loadUserProfile();
    }
}

function syncSectionFromHash() {
    const hash = window.location.hash.replace('#', '') || 'home';
    showSection(hash, false);
}

window.addEventListener('hashchange', syncSectionFromHash);
document.addEventListener('DOMContentLoaded', syncSectionFromHash);

// ── Auto Refresh ──
function startAutoRefresh() {
    if (authToken && currentUser?.id) {
        autoRefreshInterval = setInterval(() => refreshCustomerData(), 5000);
    }
}

async function refreshCustomerData() {
    if (!authToken || !currentUser?.id) return;
    const visible = Array.from(document.querySelectorAll('.content-section')).find(s => s.style.display !== 'none');
    if (!visible) return;
    if (visible.id === 'complaints') await loadUserComplaints();
}

// ── Stats ──
async function loadHomeStats() {
    try {
        const res = await fetch(`${API_BASE_URL}/stats`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        if (res.ok) {
            const s = await res.json();
            if (document.getElementById('totalStats')) document.getElementById('totalStats').textContent = s.total_complaints || 0;
            if (document.getElementById('resolvedStats')) document.getElementById('resolvedStats').textContent = s.resolved_complaints || 0;
            if (document.getElementById('usersStats')) document.getElementById('usersStats').textContent = s.active_users || 0;
        }
    } catch (e) { }
}

// ── Profile ──
async function loadUserProfile() {
    try {
        const res = await fetch(`${API_BASE_URL}/user/profile`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        if (res.ok) {
            const { user } = await res.json();
            if (document.getElementById('profileUsernameMain')) document.getElementById('profileUsernameMain').textContent = user.username || '';
            if (document.getElementById('profileEmailMain')) document.getElementById('profileEmailMain').textContent = user.email || '';
            if (document.getElementById('profileFullName')) document.getElementById('profileFullName').value = user.full_name || '';
            if (document.getElementById('profileUsernameEdit')) document.getElementById('profileUsernameEdit').value = user.username || '';
            if (document.getElementById('profileEmailEdit')) document.getElementById('profileEmailEdit').value = user.email || '';
            if (document.getElementById('profilePhone')) document.getElementById('profilePhone').value = user.phone || '';
            if (document.getElementById('profileAddress')) document.getElementById('profileAddress').value = user.address || '';
        }
    } catch (e) { }
}

function editProfile() {
    const fields = ['profileFullName', 'profilePhone', 'profileAddress', 'profileUsernameEdit', 'profileEmailEdit'];
    const btn = document.getElementById('editProfileBtn');
    if (btn.textContent.includes('Edit')) {
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.removeAttribute('readonly'); el.classList.remove('bg-light', 'border-0'); el.style.border = '1px solid #ced4da'; }
        });
        btn.innerHTML = '<i class="fas fa-save me-2"></i>Save Changes';
        btn.className = 'btn btn-success px-5 rounded-pill py-2';
    } else { saveProfileChanges(); }
}

async function saveProfileChanges() {
    setButtonLoading('editProfileBtn', true);
    try {
        const res = await fetch(`${API_BASE_URL}/user/profile`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify({
                full_name: document.getElementById('profileFullName').value,
                phone: document.getElementById('profilePhone').value,
                address: document.getElementById('profileAddress').value
            })
        });
        if (res.ok) {
            showNotification('Profile updated successfully', 'success');
            const fields = ['profileFullName', 'profilePhone', 'profileAddress', 'profileUsernameEdit', 'profileEmailEdit'];
            fields.forEach(id => {
                const el = document.getElementById(id);
                if (el) { el.setAttribute('readonly', true); el.classList.add('bg-light', 'border-0'); el.style.border = 'none'; }
            });
            const btn = document.getElementById('editProfileBtn');
            btn.innerHTML = '<i class="fas fa-edit me-2"></i>Edit My Profile';
            btn.className = 'btn btn-primary text-white px-4 rounded-pill py-1 fw-bold';
        }
    } catch (e) { showNotification('Network error.', 'danger'); }
    finally { setButtonLoading('editProfileBtn', false, '<i class="fas fa-edit me-2"></i>Edit My Profile'); }
}

// ── Load Complaints ──
async function loadUserComplaints() {
    if (!authToken) return;
    const list = document.getElementById('complaintsList');
    if (!list) return;
    try {
        const res = await fetch(`${API_BASE_URL}/complaints`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        if (res.ok) {
            const data = await res.json();
            displayComplaints(data.complaints);
        } else if (res.status === 401) {
            localStorage.clear(); authToken = null; currentUser = null; checkAuthStatus();
        }
    } catch (e) {
        list.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>Network error. Please check your connection.</div>`;
    }
}

// ── Display Complaints ──
function displayComplaints(complaints) {
    const list = document.getElementById('complaintsList');
    if (!list) return;

    if (!complaints.length) {
        list.innerHTML = `
            <div class="empty-state text-white">
                <i class="fas fa-inbox fa-3x mb-3 d-block"></i>
                <h4>No complaints yet</h4>
                <p class="mb-4">You haven't filed any complaints yet.</p>
                <button class="btn btn-primary rounded-pill px-4" onclick="showSection('create-complaint')">
                    <i class="fas fa-plus me-2"></i>File Your First Complaint
                </button>
            </div>`;
        return;
    }

    list.innerHTML = complaints.map(c => {
        const imgs = safeParseJSON(c.images);
        const isEdited = c.updated_at && (new Date(c.updated_at) - new Date(c.created_at) > 1000);

        // Assign info from admin (department, assigned_to, admin_notes)
        const hasAssign = c.department_name || c.assigned_to || c.admin_notes;

        return `
        <div class="complaint-card ${c.status}">

            <!-- Meta strip: ID, created date, updated -->
            <div class="complaint-meta-strip">
                <span class="meta-item"><i class="fas fa-hashtag"></i><strong>#${c.id}</strong></span>
                <span class="meta-divider">|</span>
                <span class="meta-item"><i class="fas fa-calendar-plus"></i> Created: ${new Date(c.created_at).toLocaleString()}</span>
                ${isEdited ? `<span class="meta-divider">|</span><span class="meta-item text-warning"><i class="fas fa-pencil-alt"></i> Updated: ${new Date(c.updated_at).toLocaleString()}</span>` : ''}
                ${c.assigned_to ? `<span class="meta-divider">|</span><span class="meta-item"><i class="fas fa-user-check"></i> Assigned: ${sanitizeHTML(c.assigned_to)}</span>` : ''}
            </div>

            <div class="card-body p-3 p-md-4">
                <div class="row">
                    <div class="col-md-9">

                        <!-- Title -->
                        <h5 class="fw-bold mb-2 text-dark">
                            ${sanitizeHTML(c.title)}
                            ${isEdited ? '<span class="edited-badge"><i class="fas fa-pencil-alt me-1"></i>EDITED</span>' : ''}
                            ${c.status === 'deleted' ? '<span class="badge bg-secondary ms-2 small">DELETED</span>' : ''}
                        </h5>

                        <!-- Description -->
                        <p class="text-secondary mb-3" style="font-size:0.9rem;line-height:1.6;">
                            ${sanitizeHTML(c.description.substring(0, 200))}${c.description.length > 200 ? '...' : ''}
                        </p>

                        <!-- Badges row -->
                        <div class="d-flex flex-wrap gap-2 mb-3">
                            <span class="dept-badge"><i class="fas fa-building me-1"></i>${sanitizeHTML(c.category)}</span>
                            <span class="priority-badge priority-${c.priority}"><i class="fas fa-flag me-1"></i>${c.priority}</span>
                            <span class="status-badge status-${c.status}">
                                <i class="fas fa-${c.status === 'resolved' ? 'check-circle' : c.status === 'in_progress' ? 'spinner' : 'clock'} me-1"></i>
                                ${c.status.replace('_', ' ')}
                            </span>
                        </div>

                        <!-- Location -->
                        ${c.location ? `
                        <p class="mb-2" style="font-size:0.85rem;">
                            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.location)}"
                               target="_blank" class="text-decoration-none text-info">
                                <i class="fas fa-map-marker-alt me-1"></i>${sanitizeHTML(c.location)}
                                <i class="fas fa-external-link-alt ms-1" style="font-size:0.7rem;"></i>
                            </a>
                        </p>` : ''}

                        <!-- Admin Assignment Info Banner -->
                        ${hasAssign ? `
                        <div class="assign-info-banner">
                            <span style="font-size:0.8rem;font-weight:700;color:#1b5e20;width:100%;"><i class="fas fa-user-shield me-1"></i>Admin Assignment Details</span>
                            ${c.department_name ? `<span class="aib-item"><i class="fas fa-building"></i><span>Dept: <strong>${sanitizeHTML(c.department_name)}</strong></span></span>` : ''}
                            ${c.assigned_to ? `<span class="aib-item"><i class="fas fa-user-check"></i><span>Staff: <strong>${sanitizeHTML(c.assigned_to)}</strong></span></span>` : ''}
                            ${c.admin_notes ? `<span class="aib-item"><i class="fas fa-sticky-note"></i><span>Notes: <strong>${sanitizeHTML(c.admin_notes)}</strong></span></span>` : ''}
                        </div>` : ''}

                        <!-- Images -->
                        ${imgs.length ? `
                        <div class="complaint-images mt-3">
                            ${imgs.map(img => `
                                <img src="${img.dataUrl}" class="complaint-image-thumb"
                                    onclick="viewFullImage('${img.dataUrl}')" alt="Photo">
                            `).join('')}
                        </div>` : ''}

                        <!-- Action Buttons -->
                        <div class="complaint-actions">
                            ${c.status === 'pending' ? `
                                <button class="btn-action btn-edit-c" onclick="enableEditMode(${c.id})">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn-action btn-delete-c" onclick="deleteComplaint(${c.id})">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            ` : ''}
                            ${c.status === 'in_progress' ? `
                                <span style="font-size:0.82rem;color:#0277bd;font-weight:600;">
                                    <i class="fas fa-spinner fa-spin me-1"></i> Being processed by admin
                                </span>
                            ` : ''}
                            ${c.status === 'resolved' ? `
                                <button class="btn-action btn-feedback-c" onclick="showFeedbackModal(${c.id})">
                                    <i class="fas fa-star"></i> Give Feedback
                                </button>
                                <span style="font-size:0.82rem;color:#2e7d32;font-weight:600;">
                                    <i class="fas fa-check-circle me-1"></i> Resolved
                                </span>
                            ` : ''}
                            ${c.status === 'deleted' ? `
                                <span style="font-size:0.82rem;color:#6c757d;font-weight:600;">
                                    <i class="fas fa-trash-alt me-1"></i> This complaint was deleted
                                </span>
                            ` : ''}
                        </div>

                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ── Complaint CRUD ──
async function submitComplaintFromPage() {
    const title = document.getElementById('pageComplaintTitle').value.trim();
    const description = document.getElementById('pageComplaintDescription').value.trim();
    const category = document.getElementById('pageComplaintCategory').value;
    const priority = document.getElementById('pageComplaintPriority').value;
    const location = document.getElementById('pageComplaintLocation').value.trim();
    const editId = document.getElementById('editingComplaintId').value;
    const isUpdate = editId !== '';

    if (!title || !description || !category) {
        showNotification('Please fill all required fields', 'danger'); return;
    }
    setButtonLoading('submitComplaintBtn', true);
    try {
        const res = await fetch(isUpdate ? `${API_BASE_URL}/complaints/${editId}` : `${API_BASE_URL}/complaints`, {
            method: isUpdate ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify({ title, description, category, priority, location, images: pageUploadedImages })
        });
        const data = await res.json();
        if (res.ok) {
            showNotification(isUpdate ? 'Complaint updated successfully!' : 'Complaint submitted successfully!', 'success');
            resetComplaintForm();
            setTimeout(() => showSection('complaints'), 500);
        } else {
            showNotification(data.error || 'Failed to submit complaint', 'danger');
        }
    } catch (e) { showNotification('Network error. Please try again.', 'danger'); }
    finally { setButtonLoading('submitComplaintBtn', false, '<i class="fas fa-paper-plane me-2"></i>Submit Your Complaint'); }
}

async function enableEditMode(complaintId) {
    try {
        const res = await fetch(`${API_BASE_URL}/complaints`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        const data = await res.json();
        const c = data.complaints.find(x => x.id == complaintId);
        if (!c) return;

        document.getElementById('editingComplaintId').value = c.id;
        document.getElementById('pageComplaintTitle').value = c.title;
        document.getElementById('pageComplaintDescription').value = c.description;
        document.getElementById('pageComplaintCategory').value = c.category;
        document.getElementById('pageComplaintPriority').value = c.priority;
        document.getElementById('pageComplaintLocation').value = c.location || '';

        if (c.images) { pageUploadedImages = JSON.parse(c.images); updateImagePreviewGeneral('pageImagePreview', pageUploadedImages); }

        document.getElementById('createComplaintHeaderTitle').innerHTML = '<i class="fas fa-edit me-2"></i>Update Your Complaint';
        document.getElementById('createComplaintHeaderSubtitle').textContent = 'Review and modify your existing complaint details';
        document.getElementById('submitComplaintBtn').innerHTML = '<i class="fas fa-save me-2"></i>Update Complaint';
        document.getElementById('cancelEditBtn').style.display = 'block';

        showSection('create-complaint');
        window.scrollTo(0, 0);
    } catch (e) { showNotification('Failed to load complaint details', 'danger'); }
}

function cancelEdit() {
    resetComplaintForm();
    showSection('complaints');
}

function resetComplaintForm() {
    document.getElementById('complaintPageForm').reset();
    document.getElementById('editingComplaintId').value = '';
    document.getElementById('createComplaintHeaderTitle').innerHTML = '<i class="fas fa-file-signature me-2"></i>Submit a New Complaint';
    document.getElementById('createComplaintHeaderSubtitle').textContent = 'Provide details about the issue you are facing';
    document.getElementById('submitComplaintBtn').innerHTML = '<i class="fas fa-paper-plane me-2"></i>Submit Your Complaint';
    document.getElementById('cancelEditBtn').style.display = 'none';
    pageUploadedImages = [];
    updateImagePreviewGeneral('pageImagePreview', pageUploadedImages);
}

async function deleteComplaint(id) {
    if (!confirm('Are you sure you want to delete this complaint? This cannot be undone.')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/complaints/${id}`, {
            method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) { showNotification('Complaint deleted successfully', 'success'); loadUserComplaints(); }
        else { const d = await res.json(); showNotification(d.error || 'Failed to delete', 'danger'); }
    } catch (e) { showNotification('Network error.', 'danger'); }
}

// ── Feedback ──
function showFeedbackModal(complaintId) {
    currentComplaintIdForFeedback = complaintId;
    currentComplaintId = complaintId;
    selectedRating = 0;
    updateStarRating(0);
    document.getElementById('feedbackComment').value = '';
    new bootstrap.Modal(document.getElementById('feedbackModal')).show();
}

function updateStarRating(rating) {
    document.querySelectorAll('#starRating i').forEach((s, i) => {
        s.classList.toggle('text-warning', i < rating);
        s.classList.toggle('text-muted', i >= rating);
    });
}

async function submitFeedback() {
    const comment = document.getElementById('feedbackComment').value.trim();
    if (!selectedRating) { showNotification('Please select a rating', 'warning'); return; }
    if (comment.length < 10) { showNotification('Comment must be at least 10 characters', 'warning'); return; }
    setButtonLoading('submitFeedbackBtn', true);
    try {
        const res = await fetch(`${API_BASE_URL}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify({ complaint_id: currentComplaintId, rating: selectedRating, comment })
        });
        const data = await res.json();
        if (res.ok) {
            showNotification('Feedback submitted successfully!', 'success');
            const m = bootstrap.Modal.getInstance(document.getElementById('feedbackModal'));
            if (m) m.hide();
            loadUserComplaints();
        } else { showNotification(data.error || 'Failed to submit feedback', 'danger'); }
    } catch (e) { showNotification('Network error.', 'danger'); }
    finally { setButtonLoading('submitFeedbackBtn', false, '<i class="fas fa-paper-plane me-2"></i>Submit Feedback'); }
}

// ── Image Upload ──
function handleImageUploadGeneral(e, previewId, storageVarName) {
    const files = Array.from(e.target.files);
    const store = storageVarName === 'pageUploadedImages' ? pageUploadedImages : uploadedImages;
    if (store.length + files.length > 5) { showNotification('Maximum 5 images allowed', 'warning'); return; }
    files.forEach(file => {
        if (file.size > 5 * 1024 * 1024) { showNotification(`${file.name} is too large (max 5MB)`, 'warning'); return; }
        const reader = new FileReader();
        reader.onload = e2 => { store.push({ name: file.name, dataUrl: e2.target.result, size: file.size }); updateImagePreviewGeneral(previewId, store); };
        reader.readAsDataURL(file);
    });
}

function updateImagePreviewGeneral(previewId, store) {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    preview.innerHTML = store.map((img, i) => `
        <div class="image-preview-item">
            <img src="${img.dataUrl}" alt="${img.name}">
            <button type="button" class="remove-btn" onclick="removeImageGeneral('${previewId}', ${i})">
                <i class="fas fa-times"></i>
            </button>
        </div>`).join('');
}

function removeImageGeneral(previewId, index) {
    const store = previewId === 'pageImagePreview' ? pageUploadedImages : uploadedImages;
    store.splice(index, 1);
    updateImagePreviewGeneral(previewId, store);
}

function viewFullImage(dataUrl) {
    const v = document.createElement('div');
    v.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;z-index:9999;cursor:pointer;';
    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.cssText = 'max-width:90%;max-height:90%;border-radius:10px;box-shadow:0 0 40px rgba(0,0,0,0.5);';
    v.appendChild(img);
    v.onclick = () => document.body.removeChild(v);
    document.body.appendChild(v);
}

// ── Map ──
function openMapPicker() {
    const modal = new bootstrap.Modal(document.getElementById('mapPickerModal'));
    modal.show();
    document.getElementById('mapPickerModal').addEventListener('shown.bs.modal', () => {
        if (!leafMap) {
            leafMap = L.map('modalMap').setView([20.5937, 78.9629], 5);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(leafMap);
            leafMarker = L.marker([20.5937, 78.9629], { draggable: true }).addTo(leafMap);
            leafMap.on('click', e => leafMarker.setLatLng(e.latlng));
        } else { leafMap.invalidateSize(); }
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(p => {
                leafMap.setView([p.coords.latitude, p.coords.longitude], 15);
                leafMarker.setLatLng([p.coords.latitude, p.coords.longitude]);
            }, error => {
                console.log('Geolocation error:', error);
                // Default to India center if geolocation fails
            });
        }
    }, { once: true });
}

async function confirmMapSelection() {
    const { lat, lng } = leafMarker.getLatLng();
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
            headers: {
                'User-Agent': 'JAN_SAMADHAN/1.0'
            }
        });
        const data = await res.json();
        if (data && data.display_name) {
            document.getElementById('pageComplaintLocation').value = data.display_name;
        } else {
            document.getElementById('pageComplaintLocation').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
    } catch (e) {
        console.log('Reverse geocoding error:', e);
        document.getElementById('pageComplaintLocation').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
    bootstrap.Modal.getInstance(document.getElementById('mapPickerModal')).hide();
}

// ── Notifications ──
async function loadUserNotifications() {
    try {
        const res = await fetch(`${API_BASE_URL}/notifications`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        if (res.ok) { const data = await res.json(); displayNotifications(data.notifications || []); }
    } catch (e) { }
}

function displayNotifications(notifications) {
    const el = document.getElementById('notificationsList');
    if (!el) return;
    if (!notifications.length) { el.innerHTML = '<p class="text-white-50 text-center">No notifications</p>'; return; }
    el.innerHTML = notifications.slice(0, 10).map(n => `
        <div class="notification-item ${n.is_read ? '' : 'unread'}">
            <div class="d-flex justify-content-between">
                <div>
                    <h6 class="mb-1">${sanitizeHTML(n.title)}</h6>
                    <p class="mb-1 small">${sanitizeHTML(n.message)}</p>
                </div>
                <span class="badge bg-primary">${n.type}</span>
            </div>
            <small class="text-muted">${new Date(n.created_at).toLocaleDateString()}</small>
        </div>`).join('');
}

// ── Dashboard stats helper ──
async function loadUserDashboard() {
    if (!authToken) return;
    try {
        const res = await fetch(`${API_BASE_URL}/complaints`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        if (res.ok) {
            const data = await res.json();
            if (document.getElementById('complaintTotalHeader')) document.getElementById('complaintTotalHeader').textContent = data.complaints.length;
            if (document.getElementById('complaintActiveHeader')) document.getElementById('complaintActiveHeader').textContent = data.complaints.filter(c => c.status === 'pending' || c.status === 'in_progress').length;
        }
    } catch (e) { }
}

// ── Utilities ──
function sanitizeHTML(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function safeParseJSON(json, fallback = []) {
    try { return json ? JSON.parse(json) : fallback; } catch (e) { return fallback; }
}

function setButtonLoading(btnId, loading, defaultHTML = 'Submit') {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.dataset.orig = btn.innerHTML;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>Processing...`;
    } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.orig || defaultHTML;
    }
}

function showNotification(message, type) {
    const n = document.createElement('div');
    n.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    n.style.cssText = 'top:20px;right:20px;z-index:9999;min-width:300px;max-width:420px;';
    n.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    document.body.appendChild(n);
    setTimeout(() => { if (n.parentNode) n.parentNode.removeChild(n); }, 5000);
}

// ── Event Listeners ──
function setupEventListeners() {
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
    document.getElementById('pageImageUpload')?.addEventListener('change', e => handleImageUploadGeneral(e, 'pageImagePreview', 'pageUploadedImages'));

    // Star ratings
    document.querySelectorAll('#starRating i').forEach(s => {
        s.addEventListener('click', function () { selectedRating = parseInt(this.dataset.rating); updateStarRating(selectedRating); });
    });
    document.querySelectorAll('#generalStarRating i').forEach(s => {
        s.addEventListener('mouseenter', function () { updateGeneralStars(parseInt(this.dataset.rating)); });
        s.addEventListener('click', function () { updateGeneralStars(parseInt(this.dataset.rating)); });
    });

    // Contact form
    document.getElementById('contactForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE_URL}/contact`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: document.getElementById('contactName').value,
                    category: document.getElementById('contactCategory').value,
                    message: document.getElementById('contactMessage').value,
                    email: currentUser?.email || ''
                })
            });
            if (res.ok) { showNotification('Message sent! We will get back to you soon.', 'success'); e.target.reset(); }
            else showNotification('Failed to send message.', 'danger');
        } catch (err) { showNotification('Network error.', 'danger'); }
    });

    // General feedback form
    document.getElementById('generalFeedbackForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        const stars = document.querySelectorAll('#generalStarRating i');
        let rating = 0;
        stars.forEach((s, i) => { if (s.classList.contains('fas')) rating = i + 1; });
        const comment = document.getElementById('generalFeedbackComment').value.trim();
        if (!rating) { showNotification('Please select a rating', 'warning'); return; }
        if (comment.length < 5) { showNotification('Please share a comment (at least 5 characters)', 'warning'); return; }
        try {
            const res = await fetch(`${API_BASE_URL}/feedback`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify({ complaint_id: null, rating, comment })
            });
            if (res.ok) { showNotification('Thank you for your valuable feedback!', 'success'); e.target.reset(); updateGeneralStars(0); }
            else showNotification('Failed to submit feedback.', 'danger');
        } catch (err) { showNotification('Network error.', 'danger'); }
    });
}

function updateGeneralStars(rating) {
    document.querySelectorAll('#generalStarRating i').forEach((s, i) => {
        s.classList.toggle('fas', i < rating);
        s.classList.toggle('far', i >= rating);
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

    if (!chatbotToggler || !chatbox || !chatInput || !sendChatBtn) {
        console.warn("Chatbot elements missing.");
        return;
    }

    let hasGreeted = false;
    chatbotToggler.addEventListener("click", () => {
        const isOpening = !document.body.classList.contains("show-chatbot");
        document.body.classList.toggle("show-chatbot");
        if (isOpening && !hasGreeted) {
            speak("Hello! I am your Jan Samadhan Portal assistant. How can I help you today?");
            hasGreeted = true;
        }
    });

    const createChatLi = (message, className) => {
        const chatLi = document.createElement("li");
        chatLi.classList.add("chat", className);
        let chatContent = className === "outgoing" ? `<p></p>` : `<span class="fas fa-user-tie"></span><p></p>`;
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
                `Status of Complaint ${userMessage.match(/\d+/)[0]} is currently being displayed.` : response;
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
    if (msg.includes("contact") || msg.includes("help") || msg.includes("support")) {
        return "You can reach our 24/7 support line at help@jansamadhan.gov or call +91-1800-123-456. We're here to help!";
    }
    if (msg.includes("how to") || msg.includes("file") || msg.includes("submit") || msg.includes("filiup")) {
        return "To file a complaint, follow these steps:\n1. <b>Login</b> to your account.\n2. Click on the <b>'Create Complaint'</b> tab.\n3. Enter the <b>Location</b> of the issue.\n4. Provide a detailed <b>Description</b>.\n5. Select the <b>Category</b> and <b>Priority</b>.\n6. You can <b>Upload Photos</b> of the issue.\n7. Click <b>Submit</b>.\n8. Go to <b>'My Complaints'</b> to see your status!";
    }
    if (msg.includes("photo") || msg.includes("image") || msg.includes("upload")) {
        return "Yes! You can upload images while filing a complaint. This helps the technicians understand the problem better and leads to faster resolution.";
    }
    if (msg.includes("time") || msg.includes("long") || msg.includes("duration")) {
        return "Most complaints are acknowledged within 24 hours. The resolution time depends on the category and priority, but we aim to resolve all issues within 3-5 working days.";
    }
    if (msg.includes("track") || msg.includes("check status")) {
        return "To track your complaint, just type 'status' followed by your ID (e.g., 'status 33'). I'll show you a live progress card!";
    }
    return "How can I assist you with the Jan Samadhan portal today?";
}

function speak(text) {
    if (!synth) return;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    // Select a female voice if available
    const voices = synth.getVoices();
    const femaleVoice = voices.find(v => (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('google us english')) && v.lang.startsWith('en'));
    if (femaleVoice) utter.voice = femaleVoice;
    synth.speak(utter);
}
