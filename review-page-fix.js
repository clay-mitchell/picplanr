(() => {
  'use strict';

  const get = (id) => document.getElementById(id);

  function currentStep() {
    const activeNav = document.querySelector('.nav.active[data-step]');
    if (activeNav?.dataset?.step) return activeNav.dataset.step;

    const activeView = document.querySelector('.view.active');
    return activeView?.id || 'onboarding';
  }

  function placeReviewInsideAudit() {
    const auditView = get('audit');
    const auditResult = get('auditResult');

    if (!auditView || !auditResult) return;

    // The review result must always be a child of the Account Review page.
    if (!auditView.contains(auditResult)) {
      auditView.appendChild(auditResult);
    }
  }

  function isolatePages(step = currentStep()) {
    const target = get(step);

    document.querySelectorAll('.view').forEach((view) => {
      const active = view === target;
      view.classList.toggle('active', active);
      view.hidden = !active;
      view.setAttribute('aria-hidden', active ? 'false' : 'true');
      view.style.setProperty('display', active ? 'block' : 'none', 'important');
    });

    document.querySelectorAll('.nav[data-step]').forEach((button) => {
      button.classList.toggle('active', button.dataset.step === step);
    });

    placeReviewInsideAudit();

    const auditResult = get('auditResult');
    if (auditResult) {
      const onReviewPage = step === 'audit';
      auditResult.hidden = !onReviewPage;
      auditResult.setAttribute('aria-hidden', onReviewPage ? 'false' : 'true');
      auditResult.style.setProperty(
        'display',
        onReviewPage
          ? (auditResult.classList.contains('account-strength-results') ? 'grid' : 'block')
          : 'none',
        'important'
      );
    }

    const statusPill = get('statusPill');
    if (statusPill && step !== 'audit' && /account strength/i.test(statusPill.textContent || '')) {
      statusPill.textContent = 'Workspace ready';
    }
  }

  function installNavigationGuard() {
    document.querySelectorAll('.nav[data-step]').forEach((button) => {
      button.addEventListener('click', () => {
        const step = button.dataset.step;
        requestAnimationFrame(() => isolatePages(step));
        setTimeout(() => isolatePages(step), 50);
      }, true);
    });
  }

  function installMutationGuard() {
    const observer = new MutationObserver(() => {
      const step = currentStep();
      const auditResult = get('auditResult');
      const auditView = get('audit');

      if (auditResult && auditView && !auditView.contains(auditResult)) {
        auditView.appendChild(auditResult);
      }

      if (step !== 'audit' && auditResult && auditResult.style.display !== 'none') {
        isolatePages(step);
      }
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden']
    });
  }

  function start() {
    placeReviewInsideAudit();
    installNavigationGuard();
    installMutationGuard();
    isolatePages(currentStep());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();