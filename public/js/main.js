document.addEventListener('DOMContentLoaded', () => {
  // Mobile Sidebar Drawer toggles
  const sidebarToggler = document.getElementById('sidebarToggler');
  const appSidebar = document.getElementById('appSidebar');

  if (sidebarToggler && appSidebar) {
    sidebarToggler.addEventListener('click', (e) => {
      e.stopPropagation();
      appSidebar.classList.toggle('show');
    });

    // Tap outside to close sidebar drawer
    document.addEventListener('click', (e) => {
      if (appSidebar.classList.contains('show')) {
        const isClickInside = appSidebar.contains(e.target) || sidebarToggler.contains(e.target);
        if (!isClickInside) {
          appSidebar.classList.remove('show');
        }
      }
    });
  }

  // Theme Toggler Coordinator
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('sms-theme') || 'light';

  // Apply cached theme settings
  document.documentElement.setAttribute('data-theme', savedTheme);
  setThemeIcon(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-theme', targetTheme);
      localStorage.setItem('sms-theme', targetTheme);
      setThemeIcon(targetTheme);

      // Notify other listeners (e.g. Chart layouts) of theme change
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: targetTheme } }));
    });
  }

  function setThemeIcon(theme) {
    if (!themeToggleBtn) return;
    const icon = themeToggleBtn.querySelector('i');
    if (icon) {
      if (theme === 'dark') {
        icon.className = 'fa-solid fa-sun';
      } else {
        icon.className = 'fa-solid fa-moon';
      }
    }
  }

  // Auto-expire success/error toast alerts
  const alerts = document.querySelectorAll('.alert-dismiss');
  alerts.forEach(alert => {
    setTimeout(() => {
      alert.style.opacity = '0';
      alert.style.transform = 'translateY(-10px)';
      alert.style.transition = 'all 0.4s ease';
      setTimeout(() => {
        alert.remove();
      }, 400);
    }, 4500);
  });
});
