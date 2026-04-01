// 🆕 Section-wise Refresh Function (Admin Panel Polish)
window.refreshDepartments = async function() {
    try {
        await App.refreshData();
        if (App.state.currentView === 'departments') {
            App.render();
        }
        // Visual feedback on button
        const btn = document.getElementById('refresh-depts-btn');
        if (btn) {
            const originalBg = btn.style.background;
            btn.style.background = '#059669';
            setTimeout(() => { 
                btn.style.background = originalBg || '#10b981'; 
            }, 1000);
        }
        console.log('✅ Section-wise departments refreshed successfully!');
    } catch (error) {
        console.error('Refresh failed:', error);
        alert('🔄 Refresh failed - ensure backend server running (port 8000)');
    }
};
