const state = {
  files: [],
  previews: [],
  analyses: [],
  groups: []
};

const fileInput = document.getElementById('fileInput');
const previewGrid = document.getElementById('previewGrid');
const analyzeBtn = document.getElementById('analyzeBtn');
const statusText = document.getElementById('statusText');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const analysisList = document.getElementById('analysisList');
const groupResults = document.getElementById('groupResults');
const analysisTemplate = document.getElementById('analysisTemplate');
const groupTemplate = document.getElementById('groupTemplate');

fileInput.addEventListener('change', async (event) => {
  const selected = [...event.target.files].filter(file => file.type.startsWith('image/')).slice(0, 50);
  state.files = selected;
  state.previews = await Promise.all(selected.map(fileToDataUrl));
  renderPreviews();
  statusText.textContent = `${selected.length} image${selected.length === 1 ? '' : 's'} ready to analyse.`;
});

analyzeBtn.addEventListener('click', async () => {
  if (!state.files.length) {
    alert('Please upload at least one image first.');
    return;
  }

  state.analyses = [];
  state.groups = [];
  analysisList.innerHTML = '';
  groupResults.className = 'group-results';
  groupResults.innerHTML = '';

  const accountContext = getAccountContext();
  progressFill.style.width = '0%';
  progressText.textContent = `Analysing ${state.files.length} image${state.files.length === 1 ? '' : 's'} one by one...`;

  for (let i = 0; i < state.files.length; i++) {
    const file = state.files[i];
    const compressed = await compressImage(file);
    const preview = state.previews[i];

    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: compressed,
          fileName: file.name,
          accountContext,
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Analysis failed (${response.status})`);
      state.analyses.push({ ...data, fileName: file.name, preview, index: i });
      renderAnalysisItem({ ...data, fileName: file.name, preview, index: i });
    } catch (error) {
      alert(error.message);
      progressText.textContent = 'Analysis stopped because of an error.';
      return;
    }

    const percentage = Math.round(((i + 1) / state.files.length) * 100);
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `Analysed ${i + 1} of ${state.files.length} images.`;
  }

  try {
    progressText.textContent = 'Building smart post groups and writing captions...';
    const response = await fetch('/api/group-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountContext,
        analyses: state.analyses.map(({ preview, ...rest }) => rest)
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Grouping failed (${response.status})`);
    state.groups = data.groups || [];
    renderGroups();
    progressText.textContent = `Done. Created ${state.groups.length} post group${state.groups.length === 1 ? '' : 's'}.`;
  } catch (error) {
    alert(error.message);
    progressText.textContent = 'Grouping stopped because of an error.';
  }
});

function getAccountContext() {
  return {
    accountType: document.getElementById('accountType').value,
    brandName: document.getElementById('brandName').value.trim(),
    platform: document.getElementById('platform').value,
    instagramHandle: document.getElementById('instagramHandle').value.trim(),
    linkedinHandle: document.getElementById('linkedinHandle').value.trim(),
    website: document.getElementById('website').value.trim(),
    competitors: document.getElementById('competitors').value.trim(),
    avoidWords: document.getElementById('avoidWords').value.trim()
  };
}

function renderPreviews() {
  previewGrid.innerHTML = '';
  state.previews.forEach(src => {
    const wrap = document.createElement('div');
    wrap.className = 'preview-item';
    const img = document.createElement('img');
    img.src = src;
    wrap.appendChild(img);
    previewGrid.appendChild(wrap);
  });
}

function renderAnalysisItem(item) {
  const node = analysisTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('.analysis-thumb').style.backgroundImage = `url(${item.preview})`;
  node.querySelector('.filename').textContent = item.fileName;
  const badge = node.querySelector('.confidence-badge');
  badge.textContent = `${item.overall_confidence || 'medium'} confidence`;
  badge.classList.add(`confidence-${(item.overall_confidence || 'medium').toLowerCase()}`);
  node.querySelector('.fact-summary').textContent = item.fact_summary;

  const factsWrap = node.querySelector('.visible-facts');
  (item.visible_facts || []).slice(0, 6).forEach(fact => {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = fact.detail;
    factsWrap.appendChild(span);
  });

  const dangerWrap = node.querySelector('.do-not-claim');
  (item.do_not_claim || []).slice(0, 4).forEach(claim => {
    const span = document.createElement('span');
    span.className = 'danger-tag';
    span.textContent = `Avoid: ${claim}`;
    dangerWrap.appendChild(span);
  });

  analysisList.appendChild(node);
}

function renderGroups() {
  groupResults.innerHTML = '';
  if (!state.groups.length) {
    groupResults.className = 'group-results empty-state';
    groupResults.textContent = 'No groups were created.';
    return;
  }

  groupResults.className = 'group-results';
  state.groups.forEach((group, groupIndex) => {
    const node = groupTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('.post-type').textContent = group.post_type;
    node.querySelector('.image-count').textContent = `${group.image_indexes.length} image${group.image_indexes.length === 1 ? '' : 's'}`;
    node.querySelector('.safe-angle').textContent = group.safe_angle || 'Safe angle';
    node.querySelector('.group-title').textContent = group.title;
    node.querySelector('.safe-summary').textContent = group.safe_summary;
    node.querySelector('.timing').textContent = `Recommended time: ${group.recommended_time.day} at ${group.recommended_time.time} — ${group.recommended_time.reason}`;
    node.querySelector('.reason').textContent = `Grouped because: ${group.reason}`;
    node.querySelector('.caption-natural').textContent = group.captions.natural;
    node.querySelector('.caption-engagement').textContent = group.captions.engagement;
    node.querySelector('.caption-goal').textContent = group.captions.goal_led;

    const imageWrap = node.querySelector('.group-images');
    group.image_indexes.forEach(index => {
      const img = document.createElement('img');
      img.src = state.previews[index];
      imageWrap.appendChild(img);
    });

    node.querySelector('.incorrect-btn').addEventListener('click', () => {
      alert('Thanks — in the real product, this would let you flag the angle as wrong and ask PicPlanr to regroup or regenerate more cautiously.');
    });
    node.querySelector('.regenerate-btn').addEventListener('click', () => {
      alert('For this test build, regenerate is a planned next step. The core upgrade here is the new stricter analysis flow.');
    });

    groupResults.appendChild(node);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressImage(file, maxWidth = 1400, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (event) => {
      img.src = event.target.result;
    };
    reader.onerror = reject;
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}
