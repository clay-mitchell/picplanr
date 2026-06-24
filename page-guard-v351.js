(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);

  function activeStep() {
    const activeButton = document.querySelector('.nav.active[data-step]');
    if (activeButton?.dataset?.step) return activeButton.dataset.step;

    const activeView = document.querySelector('.view.active');
    return activeView?.id || document.body.dataset.page || 'onboarding';
  }

  function keepScoreOnReviewOnly() {
    const auditPage = byId('audit');
    const auditResult = byId('auditResult');
    const step = activeStep();
    const onReview = step === 'audit';

    document.body.dataset.page = step;

    if (auditPage && auditResult && !auditPage.contains(auditResult)) {
      auditPage.appendChild(auditResult);
    }

    if (auditResult) {
      auditResult.hidden = !onReview;
      auditResult.setAttribute('aria-hidden', onReview ? 'false' : 'true');
      auditResult.style.setProperty(
        'display',
        onReview
          ? (auditResult.classList.contains('account-strength-results') ? 'grid' : 'block')
          : 'none',
        'important'
      );
    }

    document.querySelectorAll('.account-strength-results').forEach((panel) => {
      if (panel !== auditResult) {
        panel.hidden = !onReview;
        panel.style.setProperty('display', onReview ? 'grid' : 'none', 'important');
      }
    });

    const pill = byId('statusPill');
    if (pill && !onReview && /^Account strength/i.test(pill.textContent || '')) {
      pill.textContent = 'Workspace ready';
    }
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('.nav[data-step]');
    if (!button) return;

    document.body.dataset.page = button.dataset.step;
    requestAnimationFrame(keepScoreOnReviewOnly);
    setTimeout(keepScoreOnReviewOnly, 50);
    setTimeout(keepScoreOnReviewOnly, 250);
  }, true);

  const observer = new MutationObserver(() => {
    keepScoreOnReviewOnly();
  });

  function start() {
    keepScoreOnReviewOnly();

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden']
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();