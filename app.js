const days = [
  { name: 'Monday', date: '15 Jun' },
  { name: 'Tuesday', date: '16 Jun' },
  { name: 'Wednesday', date: '17 Jun' },
  { name: 'Thursday', date: '18 Jun' },
  { name: 'Friday', date: '19 Jun' },
  { name: 'Saturday', date: '20 Jun' },
  { name: 'Sunday', date: '21 Jun' }
];

const gradients = {
  venue: 'linear-gradient(135deg,#4b2e24,#c98a55 48%,#1a2437)',
  crowd: 'linear-gradient(145deg,#1f2948,#7d4f8c 44%,#d67a52)',
  detail: 'linear-gradient(135deg,#17243f,#446c68 48%,#d5b37b)',
  people: 'linear-gradient(135deg,#40303d,#d47d7d 45%,#283b64)',
  business: 'linear-gradient(145deg,#173f63,#3aa9ff 45%,#0f1731)',
  night: 'linear-gradient(135deg,#11162f,#6f49a6 48%,#2c1844)',
  story: 'linear-gradient(135deg,#2f2144,#c45cff 45%,#ef9a58)',
  setup: 'linear-gradient(135deg,#2b3b32,#7ba48f 48%,#d6c9aa)'
};

let posts = [
  { id: 1, day: 0, time: '10:30am', title: 'Behind the scenes setup', platform: 'Instagram', type: 'Story set', status: 'Approved', theme: 'setup', caption: 'A quick look behind the scenes before the room fills up. The transformation is always one of our favourite parts.', reason: 'Morning Stories perform well for process-led content.' },
  { id: 2, day: 1, time: '7:00pm', title: 'Event atmosphere carousel', platform: 'Instagram', type: 'Carousel', status: 'Approved', theme: 'crowd', caption: 'A full room, a brilliant crowd and exactly the kind of atmosphere we love to see.', reason: 'Your strongest carousel window is Tuesday evening.' },
  { id: 3, day: 2, time: '9:15am', title: 'Corporate event case study', platform: 'LinkedIn', type: 'Carousel', status: 'Awaiting approval', theme: 'business', caption: 'A recent corporate event delivered with a flexible room layout, clear presentation setup and smooth guest experience from start to finish.', reason: 'LinkedIn business updates usually perform best on weekday mornings.' },
  { id: 4, day: 3, time: '6:45pm', title: 'A closer look at the venue', platform: 'Instagram', type: 'Single post', status: 'Approved', theme: 'venue', caption: 'A closer look at one of the spaces that can be shaped around your event.', reason: 'Evening browsing time suits venue inspiration content.' },
  { id: 5, day: 5, time: '11:00am', title: 'People-focused event moment', platform: 'Instagram', type: 'Carousel', status: 'Awaiting approval', theme: 'people', caption: 'The room matters, but the people and the atmosphere are what bring it to life.', reason: 'Late Saturday morning is a strong lifestyle-content slot.' },
  { id: 6, day: 6, time: '6:30pm', title: 'Booking-focused venue post', platform: 'Instagram', type: 'Single post', status: 'Awaiting approval', theme: 'night', caption: 'Planning an event in Glasgow? Our team can help you shape the space around the occasion.', reason: 'Sunday evening is a useful planning and enquiry window.' }
];

let unscheduled = [
  { id: 7, title: 'Venue details carousel', platform: 'Instagram', type: 'Carousel', status: 'Approved', theme: 'detail', caption: 'The smaller details make a big difference when the whole room comes together.', reason: 'PicPlanr recommends Thursday evening.' },
  { id: 8, title: 'Team and preparation post', platform: 'LinkedIn', type: 'Single post', status: 'Approved', theme: 'business', caption: 'A look at the planning and preparation that happens before guests arrive.', reason: 'PicPlanr recommends Wednesday morning.' }
];

let activePost = null;
let draggedPostId = null;
let draggedSource = null;

const weekGrid = document.getElementById('weekGrid');
const monthGrid = document.getElementById('monthGrid');
const unscheduledList = document.getElementById('unscheduledList');
const modalBackdrop = document.getElementById('modalBackdrop');

function renderAll() {
  renderWeek();
  renderMonth();
  renderUnscheduled();
  updateCounts();
}

function renderWeek() {
  weekGrid.innerHTML = '';
  days.forEach((day, index) => {
    const col = document.createElement('div');
    col.className = `day-column ${index === 4 ? 'today' : ''}`;
    col.innerHTML = `<div class="day-header"><strong>${day.name}</strong><span>${day.date}</span></div><div class="drop-zone" data-day="${index}"></div>`;
    const zone = col.querySelector('.drop-zone');
    posts.filter(post => post.day === index).sort((a,b) => a.time.localeCompare(b.time)).forEach(post => zone.appendChild(createPostCard(post)));
    addDropHandlers(zone, index);
    weekGrid.appendChild(col);
  });
}

function createPostCard(post) {
  const card = document.createElement('article');
  card.className = 'post-card';
  card.draggable = true;
  card.dataset.id = post.id;
  card.innerHTML = `
    <div class="post-thumb" style="background:${gradients[post.theme]}">
      <span class="platform-chip ${post.platform.toLowerCase()}">${post.platform}</span>
    </div>
    <div class="post-body">
      <div class="post-time">${post.time}</div>
      <div class="post-title">${post.title}</div>
      <div class="post-meta">
        <span class="status ${post.status === 'Approved' ? 'approved' : 'awaiting'}">${post.status}</span>
        <span class="type-label">${post.type}</span>
      </div>
    </div>`;
  card.addEventListener('click', () => openModal(post));
  card.addEventListener('dragstart', event => {
    draggedPostId = post.id;
    draggedSource = 'calendar';
    event.dataTransfer.effectAllowed = 'move';
  });
  return card;
}

function addDropHandlers(zone, dayIndex) {
  zone.addEventListener('dragover', event => {
    event.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', event => {
    event.preventDefault();
    zone.classList.remove('drag-over');
    if (draggedSource === 'calendar') {
      const post = posts.find(p => p.id === draggedPostId);
      if (post) post.day = dayIndex;
    } else if (draggedSource === 'unscheduled') {
      const index = unscheduled.findIndex(p => p.id === draggedPostId);
      if (index > -1) {
        const [post] = unscheduled.splice(index, 1);
        posts.push({ ...post, day: dayIndex, time: suggestedTime(dayIndex) });
      }
    }
    renderAll();
  });
}

function suggestedTime(dayIndex) {
  return ['10:00am','7:00pm','9:00am','6:30pm','12:30pm','11:00am','6:30pm'][dayIndex];
}

function renderUnscheduled() {
  unscheduledList.innerHTML = '';
  unscheduled.forEach(post => {
    const card = document.createElement('div');
    card.className = 'unscheduled-card';
    card.draggable = true;
    card.innerHTML = `
      <div class="unscheduled-inner">
        <div class="unscheduled-thumb" style="background:${gradients[post.theme]}"></div>
        <div class="unscheduled-copy">
          <strong>${post.title}</strong>
          <span>${post.platform} · ${post.type}</span>
          <button class="quick-btn">Quick schedule</button>
        </div>
      </div>`;
    card.addEventListener('dragstart', event => {
      draggedPostId = post.id;
      draggedSource = 'unscheduled';
      event.dataTransfer.effectAllowed = 'move';
    });
    card.querySelector('.quick-btn').addEventListener('click', event => {
      event.stopPropagation();
      quickSchedule(post.id);
    });
    card.addEventListener('click', () => openModal(post));
    unscheduledList.appendChild(card);
  });
}

function quickSchedule(id) {
  const index = unscheduled.findIndex(p => p.id === id);
  if (index === -1) return;
  const [post] = unscheduled.splice(index, 1);
  const counts = days.map((_, d) => posts.filter(p => p.day === d).length);
  const recommendedDay = counts.indexOf(Math.min(...counts));
  posts.push({ ...post, day: recommendedDay, time: suggestedTime(recommendedDay) });
  renderAll();
}

function renderMonth() {
  monthGrid.innerHTML = '';
  const monthDates = Array.from({ length: 30 }, (_, i) => i + 1);
  monthDates.forEach(date => {
    const cell = document.createElement('div');
    cell.className = 'month-cell';
    cell.innerHTML = `<strong>${date}</strong>`;
    const weekday = (date - 15);
    posts.filter(p => p.day === weekday).forEach(post => {
      const mini = document.createElement('div');
      mini.className = 'month-mini';
      mini.textContent = `${post.time} · ${post.title}`;
      mini.addEventListener('click', () => openModal(post));
      cell.appendChild(mini);
    });
    monthGrid.appendChild(cell);
  });
}

function updateCounts() {
  document.getElementById('scheduledCount').textContent = posts.length;
  document.getElementById('approvalCount').textContent = posts.filter(p => p.status !== 'Approved').length;
  document.getElementById('unscheduledCount').textContent = unscheduled.length;
  document.getElementById('unscheduledPill').textContent = unscheduled.length;
}

function openModal(post) {
  activePost = post;
  document.getElementById('modalPreview').style.background = gradients[post.theme];
  document.getElementById('modalTitle').textContent = post.title;
  document.getElementById('modalCaption').textContent = post.caption;
  document.getElementById('modalMeta').innerHTML = `<span>${post.platform}</span><span>${post.type}</span><span>${post.status}</span>`;
  const scheduledCopy = typeof post.day === 'number' ? `${days[post.day].name} at ${post.time}` : 'Not scheduled yet';
  document.getElementById('modalInfo').innerHTML = `<strong>Schedule:</strong> ${scheduledCopy}<br><strong>Why this slot:</strong> ${post.reason}`;
  document.getElementById('approvePostBtn').textContent = post.status === 'Approved' ? 'Approved' : 'Approve post';
  modalBackdrop.classList.remove('hidden');
}

function closeModal() {
  modalBackdrop.classList.add('hidden');
  activePost = null;
}

document.getElementById('modalClose').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', event => { if (event.target === modalBackdrop) closeModal(); });

document.getElementById('approvePostBtn').addEventListener('click', () => {
  if (!activePost) return;
  activePost.status = 'Approved';
  renderAll();
  openModal(activePost);
});

document.getElementById('editCaptionBtn').addEventListener('click', () => {
  if (!activePost) return;
  const updated = prompt('Edit the selected caption:', activePost.caption);
  if (updated !== null && updated.trim()) {
    activePost.caption = updated.trim();
    openModal(activePost);
  }
});

document.getElementById('movePostBtn').addEventListener('click', () => {
  if (!activePost) return;
  const day = prompt('Move to day number 1–7 (Monday to Sunday):');
  const dayIndex = Number(day) - 1;
  if (dayIndex >= 0 && dayIndex <= 6) {
    activePost.day = dayIndex;
    if (!activePost.time) activePost.time = suggestedTime(dayIndex);
    if (!posts.some(p => p.id === activePost.id)) {
      unscheduled = unscheduled.filter(p => p.id !== activePost.id);
      posts.push(activePost);
    }
    renderAll();
    closeModal();
  }
});

document.getElementById('approveAllBtn').addEventListener('click', () => {
  posts.forEach(post => post.status = 'Approved');
  renderAll();
  alert('The full schedule has been approved for this test.');
});

document.querySelectorAll('.view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const isWeek = btn.dataset.view === 'week';
    weekGrid.classList.toggle('hidden', !isWeek);
    monthGrid.classList.toggle('hidden', isWeek);
  });
});

document.getElementById('todayBtn').addEventListener('click', () => {
  document.querySelectorAll('.day-column').forEach((col, i) => col.classList.toggle('today', i === 4));
});

document.getElementById('prevWeek').addEventListener('click', () => {
  document.getElementById('weekLabel').textContent = '8–14 June 2026';
});
document.getElementById('nextWeek').addEventListener('click', () => {
  document.getElementById('weekLabel').textContent = '22–28 June 2026';
});

renderAll();
