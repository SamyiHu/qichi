/* =========================================================
   栖迟 QICHI — application logic (vanilla ES modules)
   ========================================================= */
import { profiles, events, stories, quizQuestions, quizResults, currentUser } from "./data.js";

const view = document.querySelector("#view");
const modalRoot = document.querySelector("#modal-root");
const toastEl = document.querySelector("#toast");
const boot = document.querySelector("#boot");
const header = document.querySelector("#site-header");
const mobileMenu = document.querySelector("#mobile-menu");

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const KEYS = {
  favorites: "qichi:favorites",
  likes: "qichi:likes",
  rsvps: "qichi:rsvps",
  application: "qichi:application",
  newsletter: "qichi:newsletter"
};

function read(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const state = {
  route: "home",
  filters: {
    query: "",
    city: "all",
    gender: "all",
    age: "all",
    intent: "all",
    favoritesOnly: false,
    sort: "match"
  },
  favorites: read(KEYS.favorites, []),
  likes: read(KEYS.likes, []),
  rsvps: read(KEYS.rsvps, []),
  application: read(KEYS.application, null),
  activeStory: 0,
  applicationStep: 0,
  selectedPlan: "",
  quiz: { step: 0, answers: [] },
  lastFocused: null
};

const I = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  arrowUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>',
  arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
  quote: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10.7 5.2c-3.8 1.7-5.9 4.5-5.9 8.3 0 3.2 1.9 5.3 4.5 5.3 2.2 0 3.8-1.6 3.8-3.7 0-2-1.4-3.5-3.4-3.5-.4 0-.8.1-1 .1.3-1.9 1.7-3.6 3.7-4.7l-1.7-1.8Zm9.2 0c-3.8 1.7-5.9 4.5-5.9 8.3 0 3.2 1.9 5.3 4.5 5.3 2.2 0 3.8-1.6 3.8-3.7 0-2-1.4-3.5-3.4-3.5-.4 0-.8.1-1 .1.3-1.9 1.7-3.6 3.7-4.7l-1.7-1.8Z"/></svg>'
};

const quoteIcon = I.quote;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function pad(n) { return String(n).padStart(2, "0"); }

function compatibility(profile) {
  const shared = profile.tags.filter((tag) =>
    currentUser.interests.some((interest) => tag.includes(interest) || interest.includes(tag))
  );
  let score = 70 + shared.length * 4;
  if (profile.city === currentUser.city) score += 5;
  if (Math.abs(profile.age - currentUser.age) <= 5) score += 4;
  if (profile.intent === "以结婚为前提") score += 3;
  score = Math.max(78, Math.min(96, score));
  return { score, shared };
}

function matchReason(profile) {
  const { shared } = compatibility(profile);
  if (shared.length) return "你们都喜欢 " + shared.slice(0, 3).join("、") + "。";
  if (profile.city === currentUser.city) return "你们生活在同一座城市，也都在认真寻找长久关系。";
  return "你们对关系有着相似的认真，也都愿意为彼此留出时间。";
}

const navActive = () => {
  $$(".main-nav [data-route]").forEach((el) => {
    el.classList.toggle("active", el.dataset.route === state.route);
  });
};

function updateFavCount() {
  $$("[data-fav-count]").forEach((el) => {
    el.textContent = state.favorites.length;
    el.hidden = state.favorites.length === 0;
  });
}

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastEl._timer);
  toastEl._timer = setTimeout(() => toastEl.classList.remove("show"), 2800);
}

/* ---------- shared card markup ---------- */
function memberCard(profile, index = 0, options = {}) {
  const { score } = compatibility(profile);
  const active = state.favorites.includes(profile.id);
  const quote = options.quote === false ? "" : `<p class="member-quote">${escapeHtml(profile.quote)}</p>`;
  return `
    <article class="member-card reveal" data-profile-id="${profile.id}" tabindex="0" role="button" aria-label="查看 ${profile.name} 的会员档案" style="--delay:${Math.min(index * 55, 330)}ms">
      <div class="member-media">
        <img src="${profile.image}" alt="${profile.name}，${profile.job}" loading="lazy">
        <span class="member-index">NO. ${profile.no}</span>
        <button class="fav-btn ${active ? "is-active" : ""}" type="button" data-fav="${profile.id}" aria-label="收藏 ${profile.name}" aria-pressed="${active}">${I.heart}</button>
        <div class="member-hover"><span>查看完整档案</span><span class="round-arrow">${I.arrowUp}</span></div>
      </div>
      <div class="member-info">
        <div>
          <h3 class="member-name">${profile.name}<span>${profile.age}</span></h3>
          <p class="member-role">${profile.job} · ${profile.city}</p>
        </div>
        <span class="member-arrow">${I.arrowUp}</span>
      </div>
      ${quote}
    </article>
  `;
}

function memberFeature(profile) {
  const { score } = compatibility(profile);
  const active = state.favorites.includes(profile.id);
  return `
    <article class="member-feature reveal" data-profile-id="${profile.id}" tabindex="0" role="button" aria-label="查看编辑引荐 ${profile.name}">
      <div class="feature-media">
        <img src="${profile.image}" alt="${profile.name}，${profile.job}" loading="eager">
        <span class="member-index">NO. ${profile.no} · 编辑引荐</span>
        <button class="fav-btn ${active ? "is-active" : ""}" type="button" data-fav="${profile.id}" aria-label="收藏 ${profile.name}" aria-pressed="${active}">${I.heart}</button>
      </div>
      <div class="feature-content">
        <span class="feature-kicker">EDITOR&rsquo;S INTRODUCTION · 本周</span>
        <h2>${profile.name}<span>${profile.age}</span></h2>
        <p class="feature-role">${profile.job} · ${profile.city} · ${profile.height}cm</p>
        <p class="feature-quote">&ldquo;${escapeHtml(profile.quote)}&rdquo;</p>
        <div class="feature-tags">${profile.tags.slice(0, 4).map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
        <div class="feature-foot">
          <span class="compat"><strong>${score}%</strong> 契合可能</span>
          <span class="text-link">阅读完整档案 <span class="arr">${I.arrow}</span></span>
        </div>
      </div>
    </article>
  `;
}

/* ---------- home ---------- */
function homeTemplate() {
  const homeFeatured = profiles.filter((profile) => profile.featured).slice(0, 4);
  const marqueeItems = ["认真遇见", "缓慢相爱", "面对面交谈", "少而深", "不将就", "长久关系", "QICHI", "SINCE 2019"];
  const marquee = marqueeItems.map((item) => `<span class="marquee-item">${item}</span>`).join("");
  const storySlides = stories.map((story, index) => `
    <div class="story-image ${index === 0 ? "active" : ""}" data-story-image="${index}">
      <img src="${story.image}" alt="栖迟会员故事" loading="lazy">
    </div>
  `).join("");
  const event = events[0];
  const nextEvent = events[1];

  return `
    <section class="hero">
      <div class="wrap">
        <div class="hero-grid">
          <div class="hero-copy">
            <div class="hero-kicker"><span class="dot"></span><span>为认真关系而生</span><span class="rule"></span><span>PRIVATE MATCHMAKING · 2019</span></div>
            <h1 class="hero-title">
              <span class="line"><span class="line-inner">认真遇见，</span></span>
              <span class="line"><span class="line-inner"><span class="accent">缓慢相爱。</span></span></span>
            </h1>
            <p class="hero-lead"><strong>栖迟</strong>是一个为认真关系而生的小型婚恋俱乐部。我们不替你寻找完美，只替你在一次次真实的交谈里，辨认那个愿意留下来的人。</p>
            <div class="hero-actions">
              <a href="#/membership" class="btn btn-primary" data-route="membership">申请加入 <span class="btn-ico">${I.arrowUp}</span></a>
              <a href="#/discover" class="text-link" data-route="discover">先看看会员 <span class="arr">${I.arrow}</span></a>
            </div>
            <div class="hero-proof">
              <div class="avatar-stack">
                <span><img src="${profiles[0].image}" alt="" loading="lazy"></span>
                <span><img src="${profiles[6].image}" alt="" loading="lazy"></span>
                <span><img src="${profiles[1].image}" alt="" loading="lazy"></span>
              </div>
              <p><strong>1,284 位认真会员</strong><span>他们都在寻找一段可以慢慢发生的关系</span></p>
            </div>
          </div>
          <div class="hero-visual">
            <figure class="hero-photo">
              <img src="assets/images/hero-couple.jpg" alt="一对在自然光下相拥的伴侣" fetchpriority="high">
              <figcaption class="hero-photo-cap"><span>Shanghai · Spring 2026</span><span>a quiet beginning</span></figcaption>
            </figure>
            <figure class="hero-small"><img src="assets/images/small-portrait.jpg" alt="栖迟会员肖像" loading="lazy"></figure>
            <div class="hero-quote">我们不制造心动，<br>只让相遇更接近真实。</div>
            <div class="hero-seal"><span class="seal-cn">认真</span><span class="seal-en">QICHI · EST. 2019</span></div>
          </div>
        </div>
      </div>
      <div class="hero-scroll">SCROLL TO DISCOVER</div>
    </section>

    <div class="marquee" aria-hidden="true"><div class="marquee-track">${marquee}${marquee}</div></div>

    <section class="manifesto" id="philosophy">
      <div class="wrap">
        <div class="section-label">
          <span class="label-left"><span class="label-no">01</span> 我们的理念</span>
          <span class="label-right">OUR PHILOSOPHY</span>
        </div>
        <div class="manifesto-top">
          <h2 class="section-title manifesto-title">不是选择更多，<br>而是看见<span class="accent">更深。</span></h2>
          <div class="manifesto-copy">
            <p class="lead">好的关系不是被算法算出来的。它发生在两个具体的人，愿意放下一点防备、拿出一点时间的时候。</p>
            <p class="body-copy">所以我们把速度慢下来。先理解你现在的生活，再认真描述你想去的未来。然后把那个人的名字，放进你的故事里。</p>
          </div>
        </div>
        <div class="principles">
          <article class="principle reveal"><span class="principle-no">01 / FEWER</span><h3>少，但更深</h3><p>我们拒绝无限选择。每一期只保留少量真正合适的档案，把注意力还给一个人。</p></article>
          <article class="principle reveal" style="--delay:100ms"><span class="principle-no">02 / SEEN</span><h3>先被看见</h3><p>比起条件清单，我们更在意你如何生活、因什么发亮，以及在关系里真正需要什么。</p></article>
          <article class="principle reveal" style="--delay:200ms"><span class="principle-no">03 / SLOWLY</span><h3>慢一点，久一点</h3><p>不催促确认，不制造焦虑。让喜欢有时间变成理解，让理解慢慢长成关系。</p></article>
        </div>
        <div class="manifesto-visual">
          <div class="manifesto-note reveal">
            <span class="big-quote">&ldquo;</span>
            <p>好的相遇，不是两个完美的人互相展示，而是两个真实的人，愿意彼此靠近。</p>
            <span class="mini">A NOTE FROM QICHI</span>
          </div>
          <figure class="manifesto-image reveal-img">
            <img src="assets/images/manifesto.jpg" alt="一对伴侣在自然光下相拥" loading="lazy">
            <figcaption><span>Real connection, not performance</span><span>QICHI / 2026</span></figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section class="members-preview">
      <div class="wrap">
        <div class="section-label">
          <span class="label-left"><span class="label-no">02</span> 本周引荐</span>
          <span class="label-right">THE CIRCLE · 12 MEMBERS</span>
        </div>
        <div class="section-title-row">
          <h2 class="section-title">值得认识的人，<br>不必很多。</h2>
          <p class="side-copy">每一份档案都经过至少 90 分钟的深度访谈。我们关心的不只是条件，还有你如何爱、如何生活。</p>
        </div>
        <div class="preview-grid">${homeFeatured.map((profile, index) => memberCard(profile, index)).join("")}</div>
        <div class="preview-cta"><a href="#/discover" class="btn btn-outline" data-route="discover">查看全部会员 <span class="btn-ico">${I.arrow}</span></a></div>
      </div>
    </section>

    <section class="process" id="process">
      <div class="wrap">
        <div class="process-grid">
          <div class="process-intro">
            <div class="section-label on-dark">
              <span class="label-left"><span class="label-no">03</span> 相遇的方式</span>
              <span class="label-right">HOW IT WORKS</span>
            </div>
            <h2 class="section-title">从一次坦诚的<br><span class="accent">对话</span>开始。</h2>
            <p class="lead">没有问卷海洋，没有左滑右滑。我们只做一件笨一点、但更可靠的事：先认识你，再介绍他。</p>
            <a href="#/membership" class="btn btn-light" data-route="membership">开始申请 <span class="btn-ico">${I.arrowUp}</span></a>
          </div>
          <div class="steps">
            <article class="step"><span class="step-no">01</span><div><h3>申请与面谈</h3><p>一份简短的申请，一次 45 分钟的线下或视频交谈。我们想知道你真实的生活，而不只是你的简历。</p></div><span class="step-time">45 MIN</span></article>
            <article class="step"><span class="step-no">02</span><div><h3>建立深度档案</h3><p>由专属顾问整理你的关系观、生活节奏与期待。我们记录细节，也尊重边界。</p></div><span class="step-time">1–2 DAYS</span></article>
            <article class="step"><span class="step-no">03</span><div><h3>人工引荐</h3><p>每次只介绍一个人。先征得双方同意，再交换资料。没有群发，也没有被挑选的焦虑。</p></div><span class="step-time">WEEKLY</span></article>
            <article class="step"><span class="step-no">04</span><div><h3>线下初见</h3><p>我们替你订好一张安静的桌子。剩下的，交给你们自己。需要时，顾问一直在旁边。</p></div><span class="step-time">AT YOUR PACE</span></article>
          </div>
        </div>
      </div>
    </section>

    <section class="quiz-cta">
      <div class="wrap">
        <div class="quiz-band">
          <div>
            <span class="eyebrow">A SMALL TEST · 契合度测试</span>
            <h2>你是哪一种<br><em>相遇者？</em></h2>
            <p>5 个问题，关于你如何靠近一个人。没有标准答案，只有更接近自己的那一种。</p>
          </div>
          <button class="btn btn-light" type="button" data-open-quiz>开始测试 <span class="btn-ico">${I.arrowUp}</span></button>
        </div>
      </div>
    </section>

    <section class="events" id="events">
      <div class="wrap">
        <div class="section-label">
          <span class="label-left"><span class="label-no">04</span> 线下相遇</span>
          <span class="label-right">SALONS &amp; DINNERS</span>
        </div>
        <div class="section-title-row">
          <h2 class="section-title">真实的关系，<br>发生在真实的空间。</h2>
          <p class="side-copy">我们不组织大型相亲。只有长桌、散步、展览和一些足够长的对话。</p>
        </div>
        <div class="event-grid">
          <figure class="event-visual reveal-img">
            <img src="${event.image}" alt="会员围坐在长桌旁共进晚餐" loading="lazy">
            <span class="event-badge">MEMBERS ONLY · 12 SEATS</span>
            <figcaption class="event-visual-caption"><span>${event.location}</span><span>QICHI SALON NO. 018</span></figcaption>
          </figure>
          <div class="event-card">
            <div class="event-card-top">
              <span class="eyebrow">${event.kicker}</span>
              <div class="event-date"><span class="day">${event.day}</span><span class="month">${event.month}<br>${event.date.slice(0, 4)}</span></div>
            </div>
            <div>
              <h3 class="event-title">${event.title}</h3>
              <p class="event-sub">${event.subtitle}</p>
              <p class="event-desc">${event.description}</p>
              <div class="event-meta">
                <span>${I.calendar} ${event.date} · ${event.time}</span>
                <span>${I.pin} ${event.city} · ${event.location}</span>
                <span>${I.users} ${event.seats} 位会员</span>
              </div>
            </div>
            <div class="event-foot">
              <button class="text-link on-dark" type="button" data-open-event="${event.id}">预约席位 <span class="arr">${I.arrow}</span></button>
              <span class="event-seats">仅余 4 席 · 审核制</span>
            </div>
          </div>
        </div>
        <button class="event-next" type="button" data-open-event="${nextEvent.id}">
          <span class="mini">NEXT · ${nextEvent.date}</span>
          <span>${nextEvent.city} · ${nextEvent.title}</span>
          <span class="arr">${I.arrow}</span>
        </button>
      </div>
    </section>

    <section class="stories">
      <div class="story-visual">${storySlides}<span class="story-stamp">REAL STORIES · QICHI MEMBERS</span></div>
      <div class="story-content">
        <div class="section-label">
          <span class="label-left"><span class="label-no">05</span> 真实故事</span>
          <span class="label-right">LOVE, SLOWLY</span>
        </div>
        <blockquote class="story-quote" id="story-quote" aria-live="polite">${escapeHtml(stories[0].quote)}</blockquote>
        <div class="story-cite">
          <span class="cite-rule"></span>
          <div><strong id="story-names">${stories[0].names}</strong><span id="story-meta">${stories[0].meta}</span></div>
        </div>
        <div class="story-controls">
          <button class="story-btn" type="button" data-story-prev aria-label="上一个故事">${I.arrowLeft}</button>
          <span class="story-count"><strong id="story-index">01</strong> / ${pad(stories.length)}</span>
          <button class="story-btn" type="button" data-story-next aria-label="下一个故事">${I.arrow}</button>
        </div>
      </div>
    </section>

    <section class="cta">
      <div class="cta-bg"><img src="assets/images/cta-couple.jpg" alt="黄昏中的一对伴侣" loading="lazy"></div>
      <div class="cta-content">
        <span class="eyebrow">MEMBERSHIP · 每月开放 20 个申请名额</span>
        <h2>下一次相遇，<br>从你<em>愿意开始。</em></h2>
        <p>如果你也相信关系值得被认真对待，我们想听听你的故事。</p>
        <a href="#/membership" class="btn btn-light" data-route="membership">填写会员申请 <span class="btn-ico">${I.arrowUp}</span></a>
      </div>
      <span class="cta-vertical">MAKE ROOM FOR SOMETHING REAL</span>
    </section>
  `;
}

/* ---------- discover ---------- */
function discoverTemplate() {
  const cities = ["all", ...new Set(profiles.map((profile) => profile.city))];
  const cityOptions = cities.map((city) => `<option value="${city}" ${state.filters.city === city ? "selected" : ""}>${city === "all" ? "全部城市" : city}</option>`).join("");
  const ageOptions = [
    ["all", "全部年龄"],
    ["25-28", "25–28 岁"],
    ["29-32", "29–32 岁"],
    ["33+", "33 岁以上"]
  ].map(([value, label]) => `<option value="${value}" ${state.filters.age === value ? "selected" : ""}>${label}</option>`).join("");
  const intentOptions = [
    ["all", "全部期待"],
    ["以结婚为前提", "以结婚为前提"],
    ["认真恋爱", "认真恋爱"]
  ].map(([value, label]) => `<option value="${value}" ${state.filters.intent === value ? "selected" : ""}>${label}</option>`).join("");

  return `
    <section class="page-hero discover-hero">
      <div class="wrap">
        <div class="section-label">
          <span class="label-left"><span class="label-no">02</span> 会员名录</span>
          <span class="label-right">THE CIRCLE · VOL. 07</span>
        </div>
        <div class="page-hero-grid">
          <div><h1>人海之中，<br><span class="accent">先认识这些人。</span></h1></div>
          <div class="page-hero-aside">
            <p>每一期，我们只呈现一小部分通过审核的会员。照片、职业与故事都来自真实的深度访谈。你可以慢慢看，也可以先做一次契合度测试。</p>
            <div class="page-hero-meta">
              <div><strong>${profiles.length}</strong><span>本期会员</span></div>
              <div><strong>17</strong><span>覆盖城市</span></div>
              <div><strong>90<span style="font-size:13px">min</span></strong><span>每位访谈</span></div>
            </div>
            <div class="page-collage">
              <figure><img src="${profiles[0].image}" alt="${profiles[0].name}" loading="lazy"></figure>
              <figure><img src="${profiles[6].image}" alt="${profiles[6].name}" loading="lazy"></figure>
              <figure><img src="${profiles[2].image}" alt="${profiles[2].name}" loading="lazy"></figure>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="toolbar-sticky">
      <div class="wrap">
        <div class="toolbar">
          <label class="search-box">${I.search}<input id="member-search" type="search" placeholder="搜索名字、职业或兴趣" value="${escapeHtml(state.filters.query)}" autocomplete="off"></label>
          <span class="filter-select-wrap"><select class="filter-select" id="filter-city" aria-label="按城市筛选">${cityOptions}</select></span>
          <span class="filter-select-wrap"><select class="filter-select" id="filter-age" aria-label="按年龄筛选">${ageOptions}</select></span>
          <span class="filter-select-wrap"><select class="filter-select" id="filter-intent" aria-label="按关系期待筛选">${intentOptions}</select></span>
          <div class="gender-switch" role="group" aria-label="按性别筛选">
            <button type="button" data-filter-gender="all" class="${state.filters.gender === "all" ? "active" : ""}">全部</button>
            <button type="button" data-filter-gender="female" class="${state.filters.gender === "female" ? "active" : ""}">女士</button>
            <button type="button" data-filter-gender="male" class="${state.filters.gender === "male" ? "active" : ""}">男士</button>
          </div>
          <button class="fav-filter ${state.filters.favoritesOnly ? "active" : ""}" type="button" data-toggle-favorites aria-pressed="${state.filters.favoritesOnly}">${I.heart} 我的收藏</button>
          <span class="toolbar-spacer"></span>
          <span class="toolbar-result"><strong id="result-count">${profiles.length}</strong> 位会员</span>
          <div class="toolbar-sort"><label for="sort-select">排序</label><select id="sort-select" aria-label="排序方式">
            <option value="match" ${state.filters.sort === "match" ? "selected" : ""}>契合度</option>
            <option value="newest" ${state.filters.sort === "newest" ? "selected" : ""}>最新加入</option>
            <option value="age" ${state.filters.sort === "age" ? "selected" : ""}>年龄</option>
          </select></div>
        </div>
      </div>
    </div>

    <section class="discover-body">
      <div class="wrap">
        <div class="match-banner">
          <div><span class="eyebrow">NOT SURE WHERE TO START?</span><h3>不确定从谁开始？</h3><p>用 5 个问题，找到你的关系原型和更适合你的两个人。</p></div>
          <button class="text-link on-dark" type="button" data-open-quiz>开始契合度测试 <span class="arr">${I.arrow}</span></button>
        </div>
        <div id="member-results"></div>
      </div>
    </section>
  `;
}

/* ---------- membership ---------- */
function applicationFormTemplate() {
  const interests = ["建筑", "摄影", "徒步", "咖啡", "阅读", "旅行", "电影", "烹饪", "艺术", "运动"];
  const cityOptions = ["上海", "北京", "杭州", "深圳", "成都", "广州", "其他"].map((city) => `<option value="${city}">${city}</option>`).join("");
  return `
    <form class="application-form" id="application-form" novalidate>
      <div class="form-top">
        <span class="form-step-label" data-app-step-label>STEP <strong>01</strong> / 03</span>
        <div class="form-progress" aria-hidden="true"><span class="active"></span><span></span><span></span></div>
      </div>
      <div class="form-step active" data-app-step="0">
        <h3>先认识你。</h3>
        <p class="step-desc">不需要完美的自我介绍，真实就好。</p>
        <div class="form-grid">
          <div class="field" data-field="name"><label for="app-name">你的称呼 <span class="req">*</span></label><input id="app-name" name="name" type="text" placeholder="我们如何称呼你" autocomplete="name"><span class="field-error"></span></div>
          <div class="field" data-field="age"><label for="app-age">年龄 <span class="req">*</span></label><input id="app-age" name="age" type="number" min="22" max="55" placeholder="例如 30"><span class="field-error"></span></div>
          <div class="field" data-field="city"><label for="app-city">所在城市 <span class="req">*</span></label><div class="field-select-wrap"><select id="app-city" name="city"><option value="">请选择</option>${cityOptions}</select></div><span class="field-error"></span></div>
          <div class="field" data-field="job"><label for="app-job">职业 / 身份 <span class="req">*</span></label><input id="app-job" name="job" type="text" placeholder="例如 建筑设计师"><span class="field-error"></span></div>
          <div class="field full" data-field="gender"><label>性别 <span class="req">*</span></label><div class="radio-row">
            <label class="radio-pill"><input type="radio" name="gender" value="女士"><span>女士</span></label>
            <label class="radio-pill"><input type="radio" name="gender" value="男士"><span>男士</span></label>
            <label class="radio-pill"><input type="radio" name="gender" value="其他"><span>其他 / 不愿透露</span></label>
          </div><span class="field-error"></span></div>
        </div>
        <div class="form-actions"><span class="form-step-label">大约需要 3 分钟</span><button class="btn btn-primary" type="button" data-app-next>下一步 <span class="btn-ico">${I.arrow}</span></button></div>
      </div>
      <div class="form-step" data-app-step="1">
        <h3>关于你的生活。</h3>
        <p class="step-desc">没有正确答案，只有更接近你的描述。</p>
        <div class="form-grid">
          <div class="field" data-field="education"><label for="app-education">教育背景</label><div class="field-select-wrap"><select id="app-education" name="education"><option value="">请选择</option><option>本科</option><option>硕士</option><option>博士</option><option>海外留学</option><option>其他</option></select></div><span class="field-error"></span></div>
          <div class="field" data-field="relationship"><label for="app-relationship">当前状态 <span class="req">*</span></label><div class="field-select-wrap"><select id="app-relationship" name="relationship"><option value="">请选择</option><option>单身，准备好开始一段关系</option><option>单身，想先认识新朋友</option><option>离异</option></select></div><span class="field-error"></span></div>
          <div class="field full" data-field="interests"><label>让你发光的事（可多选） <span class="req">*</span></label><div class="chip-field">${interests.map((interest) => `<label class="chip-check"><input type="checkbox" name="interests" value="${interest}"><span>${interest}</span></label>`).join("")}</div><span class="field-error"></span></div>
          <div class="field full" data-field="bio"><label for="app-bio">用几句话介绍你自己 <span class="req">*</span></label><textarea id="app-bio" name="bio" placeholder="最近在做什么？什么会让你感到开心？"></textarea><span class="field-error"></span></div>
        </div>
        <div class="form-actions"><button class="form-back" type="button" data-app-back>${I.arrowLeft} 上一步</button><button class="btn btn-primary" type="button" data-app-next>继续 <span class="btn-ico">${I.arrow}</span></button></div>
      </div>
      <div class="form-step" data-app-step="2">
        <h3>你期待的相遇。</h3>
        <p class="step-desc">这会帮助我们判断，谁值得被介绍给你。</p>
        <div class="form-grid">
          <div class="field" data-field="intent"><label for="app-intent">关系期待 <span class="req">*</span></label><div class="field-select-wrap"><select id="app-intent" name="intent"><option value="">请选择</option><option>以结婚为前提</option><option>认真恋爱</option><option>先认识，顺其自然</option></select></div><span class="field-error"></span></div>
          <div class="field" data-field="plan"><label for="app-plan">意向会籍</label><div class="field-select-wrap"><select id="app-plan" name="plan"><option value="相识会籍">相识会籍 · ¥6,800 / 年</option><option value="私人订制">私人订制 · ¥28,000 / 年</option><option value="尚未确定">尚未确定</option></select></div><span class="field-error"></span></div>
          <div class="field full" data-field="ideal"><label for="app-ideal">你理想中的关系是什么样？ <span class="req">*</span></label><textarea id="app-ideal" name="ideal" placeholder="例如：可以一起安静，也可以一起胡说八道。"></textarea><span class="field-error"></span></div>
          <div class="field full" data-field="contact"><label for="app-contact">微信 / 手机 <span class="req">*</span></label><input id="app-contact" name="contact" type="text" placeholder="仅用于顾问与你联系" autocomplete="tel"><span class="field-error"></span></div>
        </div>
        <div class="field full" data-field="consent"><label class="consent"><input type="checkbox" name="consent"><span>我同意栖迟基于本次申请与我联系，并理解这是一个设计演示，提交信息仅保存在本地浏览器。</span></label><span class="field-error"></span></div>
        <div class="form-actions"><button class="form-back" type="button" data-app-back>${I.arrowLeft} 上一步</button><button class="btn btn-primary" type="submit">提交申请 <span class="btn-ico">${I.arrowUp}</span></button></div>
      </div>
    </form>
  `;
}

function applicationSuccessTemplate(application) {
  return `
    <div class="form-success">
      <div class="success-mark">${I.check}</div>
      <h3>你的申请，我们收到了。</h3>
      <p>谢谢你把真实的一面交给我们。顾问会在两个工作日内与你联系，安排一次不赶时间的面谈。</p>
      <div class="success-no"><span>APPLICATION NUMBER</span><strong>${escapeHtml(application.id)}</strong></div>
      <p style="font-size:10px">这是一份设计演示申请，资料仅保存在你的浏览器本地。</p>
      <button class="btn btn-outline" type="button" data-reset-application>重新填写 <span class="btn-ico">${I.arrow}</span></button>
    </div>
  `;
}

function membershipTemplate() {
  return `
    <section class="membership-hero">
      <div class="wrap">
        <div class="membership-grid">
          <div class="membership-copy">
            <div class="section-label">
              <span class="label-left"><span class="label-no">04</span> 会员会籍</span>
              <span class="label-right">BY APPLICATION ONLY</span>
            </div>
            <h1>不是注册，<br><span class="accent">是一次相互选择。</span></h1>
            <p class="lead">我们每个月只接受有限数量的申请。不是为了制造稀缺，而是为了确保每一段被介绍的关系，都经过足够的理解与准备。</p>
            <span class="membership-badge"><span></span> 本月剩余 7 个申请名额</span>
          </div>
          <div class="membership-visual">
            <div class="membership-image"><img src="assets/images/hero-couple.jpg" alt="一对在自然中相拥的伴侣" loading="eager"></div>
            <div class="membership-note"><strong>90<small style="font-family:var(--sans);font-size:11px"> min</small></strong><span>每位会员的深度访谈起点。我们相信，理解一个人需要时间。</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="value-strip-section">
      <div class="wrap">
        <div class="value-strip">
      <article><span class="mini">01 / CURATED</span><h3>人工筛选，不靠算法</h3><p>每一位会员都由顾问亲自访谈、审核。我们不做无限供给，只做值得发生的相遇。</p></article>
      <article><span class="mini">02 / PRIVATE</span><h3>低调、私密、有边界</h3><p>资料只在双方同意后交换。你的故事不会被展示给无关的人，也不会成为谈资。</p></article>
      <article><span class="mini">03 / LONG-TERM</span><h3>为长久关系而来</h3><p>我们欢迎认真，也允许谨慎。关系可以慢，但期待需要清晰。</p></article>
        </div>
      </div>
    </section>

    <section class="plans-section">
      <div class="wrap">
        <div class="section-label">
          <span class="label-left"><span class="label-no">05</span> 两种会籍</span>
          <span class="label-right">MEMBERSHIP</span>
        </div>
        <div class="plans-head"><h2 class="section-title">选择适合你的<br>靠近方式。</h2><p>所有会籍均需通过申请与面谈。我们保留拒绝申请的权利，也会在第一次交谈后，诚实告诉你是否适合。</p></div>
        <div class="plans">
          <article class="plan">
            <div class="plan-top"><span class="plan-no">I.</span><span class="mini">FOR THE INTENTIONAL</span></div>
            <h3>相识</h3>
            <p class="plan-sub">A thoughtful beginning.</p>
            <p class="plan-desc">适合准备好认真开始，但希望保持自然节奏的你。</p>
            <div class="plan-price"><strong>¥6,800</strong><span>/ 年</span></div>
            <ul class="plan-list"><li>一次 90 分钟深度访谈</li><li>每月 2 位人工引荐</li><li>全年会员活动优先预约</li><li>专属顾问关系咨询</li></ul>
            <button class="btn btn-outline btn-block" type="button" data-plan="相识会籍">申请相识会籍 <span class="btn-ico">${I.arrow}</span></button>
          </article>
          <article class="plan featured">
            <div class="plan-top"><span class="plan-no">II.</span><span class="plan-badge">MOST CONSIDERED</span></div>
            <h3>私人订制</h3>
            <p class="plan-sub">A quieter, closer attention.</p>
            <p class="plan-desc">适合对关系有清晰期待，希望拥有更深度陪伴与更广选择的人。</p>
            <div class="plan-price"><strong>¥28,000</strong><span>/ 年</span></div>
            <ul class="plan-list"><li>专属顾问一对一服务</li><li>不限次人工引荐</li><li>跨城市会员活动邀请</li><li>关系节奏与沟通陪伴</li></ul>
            <button class="btn btn-light btn-block" type="button" data-plan="私人订制">申请私人订制 <span class="btn-ico">${I.arrow}</span></button>
          </article>
        </div>
      </div>
    </section>

    <section class="application" id="apply">
      <div class="wrap">
        <div class="application-grid">
          <div class="application-aside">
            <div class="section-label">
              <span class="label-left"><span class="label-no">06</span> 开始申请</span>
              <span class="label-right">A CONVERSATION</span>
            </div>
            <h2 class="section-title">先聊聊，<br>不着急决定。</h2>
            <p class="body-copy">填写下面的申请，让我们有机会认识你。提交后，顾问会在两个工作日内与你联系。</p>
            <div class="aside-facts">
              <div class="aside-fact"><span>01</span><span>约 3 分钟完成</span></div>
              <div class="aside-fact"><span>02</span><span>所有信息仅用于本次申请</span></div>
              <div class="aside-fact"><span>03</span><span>面谈不收取任何费用</span></div>
            </div>
          </div>
          <div class="application-form-wrap" id="application-form-wrap">
            ${state.application ? applicationSuccessTemplate(state.application) : applicationFormTemplate()}
          </div>
        </div>
      </div>
    </section>
  `;
}


/* ---------- profile modal ---------- */
function profileModalTemplate(profile) {
  const { score, shared } = compatibility(profile);
  const active = state.favorites.includes(profile.id);
  const liked = state.likes.includes(profile.id);
  return `
    <div class="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
      <button class="modal-close" type="button" data-close-modal aria-label="关闭档案">${I.close}</button>
      <div class="profile-modal-media">
        <img src="${profile.image}" alt="${profile.name}，${profile.job}">
        <span class="photo-cap">QICHI MEMBER · NO. ${profile.no}</span>
      </div>
      <div class="profile-modal-body">
        <span class="modal-kicker">MEMBER PROFILE · ${profile.en}</span>
        <div class="modal-heading"><h2 id="profile-title">${profile.name}</h2><span>${profile.age}</span></div>
        <p class="modal-role">${profile.job} · ${profile.city} · ${profile.height}cm</p>
        <blockquote class="modal-quote">${escapeHtml(profile.quote)}</blockquote>
        <p class="modal-bio">${escapeHtml(profile.bio)}</p>
        <div class="detail-grid">
          <div class="detail-item"><span>所在城市</span><strong>${profile.city}</strong></div>
          <div class="detail-item"><span>家乡</span><strong>${profile.hometown}</strong></div>
          <div class="detail-item"><span>教育背景</span><strong>${profile.education}</strong></div>
          <div class="detail-item"><span>关系期待</span><strong>${profile.intent}</strong></div>
          <div class="detail-item"><span>周末通常</span><strong>${profile.weekend}</strong></div>
          <div class="detail-item"><span>加入栖迟</span><strong>${profile.since} 年</strong></div>
        </div>
        <p class="modal-section-title">TA 喜欢</p>
        <div class="modal-tags">${profile.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
        <p class="modal-section-title">关于理想关系</p>
        <p class="modal-bio" style="margin-top:0">${escapeHtml(profile.ideal)}</p>
        <div class="match-box">
          <div class="match-ring" style="--score:${score}"><strong>${score}</strong></div>
          <div class="match-copy"><strong>你们的契合可能</strong>${matchReason(profile)}</div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" type="button" data-send-like="${profile.id}" ${liked ? "disabled" : ""}>${liked ? "心意已送达" : "送出心动"} <span class="btn-ico">${liked ? I.check : I.arrowUp}</span></button>
          <button class="fav-detail ${active ? "is-active" : ""}" type="button" data-fav-detail="${profile.id}" aria-label="收藏 ${profile.name}" aria-pressed="${active}">${I.heart}</button>
        </div>
        <p class="modal-privacy">为保护会员隐私，完整资料与联系方式将在双方确认意向后，由顾问协助交换。</p>
      </div>
    </div>
  `;
}

function openProfile(id) {
  const profile = profiles.find((item) => item.id === id);
  if (!profile) return;
  mountModal(profileModalTemplate(profile));
}

/* ---------- quiz ---------- */
function quizModalTemplate() {
  return `
    <div class="quiz-modal" role="dialog" aria-modal="true" aria-labelledby="quiz-title">
      <button class="modal-close" type="button" data-close-modal aria-label="关闭测试">${I.close}</button>
      <div class="quiz-head">
        <div class="quiz-progress"><span data-quiz-step-label>QUESTION 01 / 05</span><div class="quiz-progress-line"><span data-quiz-progress></span></div></div>
        <span class="mini">QICHI · COMPATIBILITY</span>
      </div>
      <div class="quiz-body" id="quiz-body"></div>
    </div>
  `;
}

function openQuiz() {
  state.quiz = { step: 0, answers: [] };
  mountModal(quizModalTemplate());
  renderQuiz();
}

function renderQuiz() {
  const body = $("#quiz-body");
  if (!body) return;
  const stepLabel = $("[data-quiz-step-label]");
  const progress = $("[data-quiz-progress]");
  const total = quizQuestions.length;

  if (state.quiz.step < total) {
    const question = quizQuestions[state.quiz.step];
    if (stepLabel) stepLabel.textContent = `QUESTION ${pad(state.quiz.step + 1)} / ${pad(total)}`;
    if (progress) progress.style.width = `${((state.quiz.step + 1) / total) * 100}%`;
    body.innerHTML = `
      <div class="quiz-kicker">QUESTION ${pad(state.quiz.step + 1)} · 跟随直觉</div>
      <h2 class="quiz-question" id="quiz-title">${question.q}</h2>
      <div class="quiz-options">
        ${question.options.map((option, index) => `
          <button class="quiz-option" type="button" data-quiz-option="${index}">
            <span class="opt-mark">${["A", "B", "C", "D"][index]}</span>
            <span><span class="opt-label">${option.label}</span><span class="opt-sub">${option.sub}</span></span>
            <span class="opt-arrow">${I.arrow}</span>
          </button>
        `).join("")}
      </div>
      <div class="quiz-foot">
        ${state.quiz.step > 0 ? `<button class="form-back" type="button" data-quiz-back>${I.arrowLeft} 上一题</button>` : "<span></span>"}
        <span class="mini">没有标准答案 · 跟随直觉</span>
      </div>
    `;
    return;
  }

  const counts = { depth: 0, explore: 0, spark: 0 };
  state.quiz.answers.forEach((answer) => { if (answer in counts) counts[answer] += 1; });
  const priority = ["depth", "explore", "spark"];
  const resultKey = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || priority.indexOf(a) - priority.indexOf(b))[0];
  const result = quizResults[resultKey];
  const recommended = result.recommended.map((id) => profiles.find((profile) => profile.id === id)).filter(Boolean);
  if (stepLabel) stepLabel.textContent = "RESULT · YOUR ARCHETYPE";
  if (progress) progress.style.width = "100%";
  body.innerHTML = `
    <div class="quiz-result">
      <div class="quiz-result-copy">
        <div class="quiz-orbit">
          <div class="orbit-core"><strong>${result.type}</strong><span>${result.en}</span></div>
          <span class="orbit-dot"></span><span class="orbit-dot"></span>
        </div>
        <span class="result-en">${result.en}</span>
        <h2 id="quiz-title">${result.type}</h2>
        <p class="result-title">${result.title}</p>
        <p>${result.description}</p>
        <div class="result-traits">${result.traits.map((trait) => `<span class="tag">${trait}</span>`).join("")}</div>
      </div>
      <div>
        <div class="result-recs">
          <h4>为你选出的两个可能</h4>
          ${recommended.map((profile) => `
            <button class="result-rec" type="button" data-quiz-rec="${profile.id}">
              <img src="${profile.image}" alt="${profile.name}" loading="lazy">
              <span><h5>${profile.name}，${profile.age}</h5><span>${profile.job} · ${profile.city}</span></span>
              <strong>${compatibility(profile).score}%</strong>
            </button>
          `).join("")}
        </div>
        <div class="quiz-result-actions">
          <button class="btn btn-primary" type="button" data-quiz-discover>查看完整名录 <span class="btn-ico">${I.arrow}</span></button>
          <button class="form-back" type="button" data-quiz-restart>重新测试</button>
        </div>
      </div>
    </div>
  `;
}

/* ---------- event / RSVP ---------- */
function rsvpSuccessTemplate(event) {
  return `
    <div class="rsvp-success">
      <div class="success-mark">${I.check}</div>
      <h3>席位已为你保留。</h3>
      <p>${event.date} · ${event.time}<br>${event.city} · ${event.location}<br><br>活动前三天，顾问会与你确认具体安排。</p>
      <button class="btn btn-outline" type="button" data-close-modal style="margin-top:22px">好的 <span class="btn-ico">${I.arrow}</span></button>
    </div>
  `;
}

function openEvent(id) {
  const event = events.find((item) => item.id === id);
  if (!event) return;
  const attending = state.rsvps.includes(id);
  mountModal(`
    <div class="small-modal" role="dialog" aria-modal="true" aria-labelledby="event-title">
      <button class="modal-close" type="button" data-close-modal aria-label="关闭活动详情">${I.close}</button>
      <span class="modal-kicker">${event.kicker} · ${event.date}</span>
      <h2 id="event-title">${event.title}</h2>
      <p class="event-sub">${event.subtitle}</p>
      <p class="event-description">${event.description}</p>
      <div class="event-info">
        <div><span>时间</span><strong>${event.date} · ${event.time}</strong></div>
        <div><span>地点</span><strong>${event.city} · ${event.location}</strong></div>
        <div><span>席位</span><strong>${event.seats} 位会员</strong></div>
        <div><span>备注</span><strong>${event.note}</strong></div>
      </div>
      <div id="rsvp-area">
        ${attending ? rsvpSuccessTemplate(event) : `
          <form class="rsvp-form" data-rsvp-form data-event="${event.id}" novalidate>
            <div class="field" data-field="name"><label for="rsvp-name">你的称呼 <span class="req">*</span></label><input id="rsvp-name" name="name" type="text" placeholder="如何称呼你" required><span class="field-error"></span></div>
            <div class="field" data-field="contact"><label for="rsvp-contact">微信 / 手机 <span class="req">*</span></label><input id="rsvp-contact" name="contact" type="text" placeholder="用于确认席位" required><span class="field-error"></span></div>
            <button class="btn btn-primary" type="submit">确认预约 <span class="btn-ico">${I.arrowUp}</span></button>
          </form>
        `}
      </div>
    </div>
  `);
}

/* ---------- filters & discover results ---------- */
function filteredProfiles() {
  const f = state.filters;
  let list = profiles.filter((profile) => {
    if (f.gender !== "all" && profile.gender !== f.gender) return false;
    if (f.city !== "all" && profile.city !== f.city) return false;
    if (f.intent !== "all" && profile.intent !== f.intent) return false;
    if (f.favoritesOnly && !state.favorites.includes(profile.id)) return false;
    if (f.age === "25-28" && (profile.age < 25 || profile.age > 28)) return false;
    if (f.age === "29-32" && (profile.age < 29 || profile.age > 32)) return false;
    if (f.age === "33+" && profile.age < 33) return false;
    if (f.query.trim()) {
      const haystack = [profile.name, profile.en, profile.job, profile.city, profile.hometown, profile.intent, ...profile.tags].join(" ").toLowerCase();
      if (!haystack.includes(f.query.trim().toLowerCase())) return false;
    }
    return true;
  });
  if (f.sort === "age") list = list.sort((a, b) => a.age - b.age);
  else if (f.sort === "newest") list = list.sort((a, b) => Number(b.since) - Number(a.since));
  else list = list.sort((a, b) => compatibility(b).score - compatibility(a).score);
  return list;
}

function emptyState() {
  return `
    <div class="empty-state">
      <div class="empty-mark">✳</div>
      <h3>这里暂时还没有人。</h3>
      <p>换一个筛选条件，或者先把喜欢的会员收藏起来。</p>
      <button class="btn btn-outline" type="button" data-clear-filters>清除筛选 <span class="btn-ico">${I.arrow}</span></button>
    </div>
  `;
}

function renderDiscoverResults() {
  const root = $("#member-results");
  if (!root) return;
  const list = filteredProfiles();
  const count = $("#result-count");
  if (count) count.textContent = list.length;
  if (!list.length) {
    root.innerHTML = emptyState();
    observeReveals(root);
    return;
  }
  const feature = list[0];
  const rest = list.slice(1);
  root.innerHTML = `
    ${memberFeature(feature)}
    ${rest.length ? `<div class="discover-grid">${rest.map((profile, index) => memberCard(profile, index)).join("")}</div>` : ""}
    <div class="discover-foot"><a href="#/membership" class="text-link" data-route="membership">成为会员，获得专属人工引荐 <span class="arr">${I.arrow}</span></a></div>
  `;
  observeReveals(root);
  syncFavoritesUI();
}

function syncToolbarState() {
  $$("[data-filter-gender]").forEach((button) => button.classList.toggle("active", button.dataset.filterGender === state.filters.gender));
  const favButton = $("[data-toggle-favorites]");
  if (favButton) {
    favButton.classList.toggle("active", state.filters.favoritesOnly);
    favButton.setAttribute("aria-pressed", String(state.filters.favoritesOnly));
  }
}

function syncFavoritesUI() {
  $$("[data-fav]").forEach((button) => {
    const active = state.favorites.includes(button.dataset.fav);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  $$("[data-fav-detail]").forEach((button) => {
    const active = state.favorites.includes(button.dataset.favDetail);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  updateFavCount();
}

function toggleFavorite(id) {
  const index = state.favorites.indexOf(id);
  const profile = profiles.find((item) => item.id === id);
  if (index >= 0) {
    state.favorites.splice(index, 1);
    toast("已从收藏中移除");
  } else {
    state.favorites.push(id);
    toast(`已收藏 ${profile ? profile.name : "这位会员"}`);
  }
  write(KEYS.favorites, state.favorites);
  syncFavoritesUI();
  if (state.route === "discover" && state.filters.favoritesOnly) renderDiscoverResults();
}

function sendLike(id) {
  if (state.likes.includes(id)) return;
  state.likes.push(id);
  write(KEYS.likes, state.likes);
  const profile = profiles.find((item) => item.id === id);
  const button = document.querySelector(`[data-send-like="${id}"]`);
  if (button) {
    button.disabled = true;
    button.innerHTML = `心意已送达 <span class="btn-ico">${I.check}</span>`;
  }
  toast(`心意已送达。期待 ${profile ? profile.name : "对方"} 的回应。`);
}

/* ---------- story slider ---------- */
function changeStory(direction) {
  state.activeStory = (state.activeStory + direction + stories.length) % stories.length;
  updateStoryDom();
}

function updateStoryDom() {
  $$("[data-story-image]").forEach((slide, index) => slide.classList.toggle("active", index === state.activeStory));
  const story = stories[state.activeStory];
  const quote = $("#story-quote");
  const names = $("#story-names");
  const meta = $("#story-meta");
  const indexEl = $("#story-index");
  if (quote) quote.textContent = story.quote;
  if (names) names.textContent = story.names;
  if (meta) meta.textContent = story.meta;
  if (indexEl) indexEl.textContent = pad(state.activeStory + 1);
}

/* ---------- modal helpers ---------- */
function mountModal(content) {
  state.lastFocused = document.activeElement;
  modalRoot.innerHTML = `<div class="modal-layer" data-modal-layer>${content}</div>`;
  document.body.classList.add("modal-open");
  requestAnimationFrame(() => {
    const focusable = $(".modal-close, .quiz-option, [data-send-like], [data-quiz-option]", modalRoot);
    if (focusable && !reducedMotion) focusable.focus({ preventScroll: true });
  });
}

function closeModal() {
  if (!modalRoot.innerHTML) return;
  modalRoot.innerHTML = "";
  document.body.classList.remove("modal-open");
  if (state.lastFocused && typeof state.lastFocused.focus === "function") {
    try { state.lastFocused.focus({ preventScroll: true }); } catch {}
  }
  state.lastFocused = null;
}

function trapFocus(event) {
  if (event.key !== "Tab") return;
  const layer = $(".modal-layer");
  if (!layer) return;
  const focusable = $$('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', layer)
    .filter((el) => el.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/* ---------- application ---------- */
function setApplicationError(form, fieldName, message) {
  const field = form.querySelector(`[data-field="${fieldName}"]`);
  if (!field) return;
  field.classList.toggle("has-error", Boolean(message));
  const error = field.querySelector(".field-error");
  if (error) error.textContent = message || "";
}

function clearApplicationErrors(form) {
  $$("[data-field]", form).forEach((field) => {
    field.classList.remove("has-error");
    const error = field.querySelector(".field-error");
    if (error) error.textContent = "";
  });
}

function validateApplicationStep(form, step) {
  clearApplicationErrors(form);
  let valid = true;
  const fail = (field, message) => { setApplicationError(form, field, message); valid = false; };
  if (step === 0) {
    const name = form.querySelector('[name="name"]').value.trim();
    const age = Number(form.querySelector('[name="age"]').value);
    const city = form.querySelector('[name="city"]').value;
    const job = form.querySelector('[name="job"]').value.trim();
    const gender = form.querySelector('input[name="gender"]:checked');
    if (name.length < 1) fail("name", "请留下你的称呼");
    if (!age || age < 22 || age > 55) fail("age", "请输入 22–55 之间的年龄");
    if (!city) fail("city", "请选择所在城市");
    if (!job) fail("job", "请简单介绍你的职业");
    if (!gender) fail("gender", "请选择性别");
  } else if (step === 1) {
    const relationship = form.querySelector('[name="relationship"]').value;
    const interests = $$('input[name="interests"]:checked', form);
    const bio = form.querySelector('[name="bio"]').value.trim();
    if (!relationship) fail("relationship", "请选择当前状态");
    if (!interests.length) fail("interests", "至少选择一件让你发光的事");
    if (bio.length < 5) fail("bio", "再多写一点点，让我们认识你");
  } else {
    const intent = form.querySelector('[name="intent"]').value;
    const ideal = form.querySelector('[name="ideal"]').value.trim();
    const contact = form.querySelector('[name="contact"]').value.trim();
    const consent = form.querySelector('[name="consent"]').checked;
    if (!intent) fail("intent", "请选择关系期待");
    if (ideal.length < 5) fail("ideal", "请简单描述你理想中的关系");
    if (contact.length < 4) fail("contact", "请留下有效的联系方式");
    if (!consent) fail("consent", "请确认同意后再提交");
  }
  if (!valid) {
    const firstError = form.querySelector(".field.has-error");
    if (firstError) firstError.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
  }
  return valid;
}

function updateApplicationStep(form) {
  $$("[data-app-step]", form).forEach((stepEl, index) => stepEl.classList.toggle("active", index === state.applicationStep));
  const label = form.querySelector("[data-app-step-label]");
  if (label) label.innerHTML = `STEP <strong>0${state.applicationStep + 1}</strong> / 03`;
  $$(".form-progress span", form).forEach((bar, index) => bar.classList.toggle("active", index <= state.applicationStep));
}

/* ---------- routing ---------- */
function currentRoute() {
  const raw = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return ["discover", "membership"].includes(raw) ? raw : "home";
}

function navigate(route) {
  closeModal();
  const next = ["home", "discover", "membership"].includes(route) ? route : "home";
  if (currentRoute() === next) {
    render();
    if (next === "home") window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    return;
  }
  window.location.hash = next === "home" ? "#/" : "#/" + next;
}

function scrollToSection(id) {
  const section = document.getElementById(id);
  if (!section) return;
  const top = section.getBoundingClientRect().top + window.scrollY - 76;
  window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
}

let pendingScroll = null;

function render() {
  const route = currentRoute();
  const previous = state.route;
  const changed = route !== previous;
  state.route = route;
  if (route === "home") state.activeStory = 0;
  if (route === "membership" && previous !== "membership") state.applicationStep = 0;

  if (route === "home") view.innerHTML = homeTemplate();
  else if (route === "discover") view.innerHTML = discoverTemplate();
  else view.innerHTML = membershipTemplate();

  navActive();
  updateFavCount();
  syncFavoritesUI();
  if (route === "discover") renderDiscoverResults();
  requestAnimationFrame(() => observeReveals());
  document.body.classList.remove("menu-open");
  const menuButton = $("[data-menu-toggle]");
  if (menuButton) menuButton.setAttribute("aria-expanded", "false");
  mobileMenu.setAttribute("aria-hidden", "true");

  document.title = route === "discover"
    ? "会员名录 — 栖迟 QICHI"
    : route === "membership"
      ? "申请会籍 — 栖迟 QICHI"
      : "栖迟 QICHI — 认真遇见，缓慢相爱";

  if (changed) window.scrollTo({ top: 0, behavior: "auto" });
  if (pendingScroll) {
    const id = pendingScroll;
    pendingScroll = null;
    setTimeout(() => scrollToSection(id), 350);
  }
}

/* ---------- reveal observer ---------- */
let revealObserver;
if ("IntersectionObserver" in window && !reducedMotion) {
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
}

function observeReveals(root = document) {
  const items = $$(".reveal:not(.is-in), .reveal-img:not(.is-in)", root);
  if (reducedMotion || !revealObserver) {
    items.forEach((el) => el.classList.add("is-in"));
    return;
  }
  items.forEach((el) => revealObserver.observe(el));
}

/* ---------- menu ---------- */
function toggleMenu() {
  const open = document.body.classList.toggle("menu-open");
  const button = $("[data-menu-toggle]");
  if (button) button.setAttribute("aria-expanded", String(open));
  mobileMenu.setAttribute("aria-hidden", String(!open));
}
function closeMenu() {
  document.body.classList.remove("menu-open");
  const button = $("[data-menu-toggle]");
  if (button) button.setAttribute("aria-expanded", "false");
  mobileMenu.setAttribute("aria-hidden", "true");
}

/* ---------- global events ---------- */
document.addEventListener("click", (event) => {
  const target = event.target;

  const backdrop = target.closest("[data-modal-layer]");
  if (backdrop && target === backdrop) { closeModal(); return; }

  if (target.closest("[data-close-modal]")) { closeModal(); return; }

  const quizRec = target.closest("[data-quiz-rec]");
  if (quizRec) {
    closeModal();
    openProfile(quizRec.dataset.quizRec);
    return;
  }

  const quizOption = target.closest("[data-quiz-option]");
  if (quizOption) {
    const question = quizQuestions[state.quiz.step];
    if (question) {
      const option = question.options[Number(quizOption.dataset.quizOption)];
      if (option) {
        state.quiz.answers[state.quiz.step] = option.type;
        state.quiz.step += 1;
        renderQuiz();
      }
    }
    return;
  }
  if (target.closest("[data-quiz-back]")) {
    state.quiz.step = Math.max(0, state.quiz.step - 1);
    renderQuiz();
    return;
  }
  if (target.closest("[data-quiz-restart]")) {
    state.quiz = { step: 0, answers: [] };
    renderQuiz();
    return;
  }
  if (target.closest("[data-quiz-discover]")) {
    closeModal();
    navigate("discover");
    return;
  }

  const routeLink = target.closest("[data-route]");
  if (routeLink) {
    event.preventDefault();
    closeMenu();
    navigate(routeLink.dataset.route);
    return;
  }

  const scrollLink = target.closest("[data-scroll]");
  if (scrollLink) {
    event.preventDefault();
    closeMenu();
    const id = scrollLink.dataset.scroll;
    if (state.route === "home") scrollToSection(id);
    else { pendingScroll = id; navigate("home"); }
    return;
  }

  if (target.closest("[data-menu-toggle]")) { toggleMenu(); return; }
  if (target.closest("[data-open-favorites]")) {
    state.filters.favoritesOnly = true;
    if (state.route === "discover") {
      syncToolbarState();
      renderDiscoverResults();
      window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    } else {
      navigate("discover");
    }
    return;
  }

  if (target.closest("[data-open-quiz]")) { openQuiz(); return; }

  const favButton = target.closest("[data-fav]");
  if (favButton) { toggleFavorite(favButton.dataset.fav); return; }

  const favDetail = target.closest("[data-fav-detail]");
  if (favDetail) { toggleFavorite(favDetail.dataset.favDetail); return; }

  const likeButton = target.closest("[data-send-like]");
  if (likeButton) { sendLike(likeButton.dataset.sendLike); return; }

  const profileCard = target.closest("[data-profile-id]");
  if (profileCard) { openProfile(profileCard.dataset.profileId); return; }

  const eventButton = target.closest("[data-open-event]");
  if (eventButton) { openEvent(eventButton.dataset.openEvent); return; }

  const genderButton = target.closest("[data-filter-gender]");
  if (genderButton) {
    state.filters.gender = genderButton.dataset.filterGender;
    syncToolbarState();
    renderDiscoverResults();
    return;
  }

  if (target.closest("[data-toggle-favorites]")) {
    state.filters.favoritesOnly = !state.filters.favoritesOnly;
    syncToolbarState();
    renderDiscoverResults();
    return;
  }

  if (target.closest("[data-clear-filters]")) {
    state.filters = { query: "", city: "all", gender: "all", age: "all", intent: "all", favoritesOnly: false, sort: "match" };
    render();
    return;
  }

  const planButton = target.closest("[data-plan]");
  if (planButton) {
    const plan = planButton.dataset.plan;
    state.selectedPlan = plan;
    const select = $("#app-plan");
    if (select) select.value = plan;
    toast(`已记录你的意向：${plan}会籍`);
    scrollToSection("apply");
    return;
  }

  if (target.closest("[data-app-next]")) {
    const form = $("#application-form");
    if (!form) return;
    if (validateApplicationStep(form, state.applicationStep)) {
      state.applicationStep = Math.min(2, state.applicationStep + 1);
      updateApplicationStep(form);
      form.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    }
    return;
  }
  if (target.closest("[data-app-back]")) {
    const form = $("#application-form");
    if (!form) return;
    state.applicationStep = Math.max(0, state.applicationStep - 1);
    updateApplicationStep(form);
    form.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    return;
  }
  if (target.closest("[data-reset-application]")) {
    localStorage.removeItem(KEYS.application);
    state.application = null;
    state.applicationStep = 0;
    render();
    setTimeout(() => scrollToSection("apply"), 200);
    return;
  }

  if (target.closest("[data-story-next]")) { changeStory(1); return; }
  if (target.closest("[data-story-prev]")) { changeStory(-1); return; }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "member-search") {
    state.filters.query = event.target.value;
    renderDiscoverResults();
    return;
  }
  const field = event.target.closest("#application-form [data-field]");
  if (field) field.classList.remove("has-error");
});

document.addEventListener("change", (event) => {
  if (["filter-city", "filter-age", "filter-intent"].includes(event.target.id)) {
    const key = event.target.id.replace("filter-", "");
    state.filters[key] = event.target.value;
    renderDiscoverResults();
  }
  if (event.target.id === "sort-select") {
    state.filters.sort = event.target.value;
    renderDiscoverResults();
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target;

  if (form.matches("[data-newsletter]")) {
    event.preventDefault();
    const email = form.querySelector('input[name="email"]').value.trim();
    if (!email.includes("@")) { toast("请填写有效的邮箱地址"); return; }
    write(KEYS.newsletter, { email, at: new Date().toISOString() });
    form.reset();
    toast("已订阅。下一封信，很快见。");
    return;
  }

  if (form.id === "application-form") {
    event.preventDefault();
    if (!validateApplicationStep(form, 2)) return;
    const data = new FormData(form);
    const application = {
      id: "Q-2026-" + String(Date.now()).slice(-5),
      name: String(data.get("name") || "").trim(),
      gender: String(data.get("gender") || ""),
      age: data.get("age"),
      city: data.get("city"),
      job: String(data.get("job") || "").trim(),
      education: data.get("education"),
      relationship: data.get("relationship"),
      interests: data.getAll("interests"),
      bio: String(data.get("bio") || "").trim(),
      intent: data.get("intent"),
      plan: data.get("plan") || state.selectedPlan || "尚未确定",
      ideal: String(data.get("ideal") || "").trim(),
      contact: String(data.get("contact") || "").trim(),
      createdAt: new Date().toISOString()
    };
    state.application = application;
    write(KEYS.application, application);
    const wrap = $("#application-form-wrap");
    if (wrap) {
      wrap.innerHTML = applicationSuccessTemplate(application);
      wrap.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    }
    toast("申请已提交，谢谢你愿意认真开始。");
    return;
  }

  if (form.matches("[data-rsvp-form]")) {
    event.preventDefault();
    const name = form.querySelector('[name="name"]').value.trim();
    const contact = form.querySelector('[name="contact"]').value.trim();
    let valid = true;
    if (!name) { setApplicationError(form, "name", "请留下你的称呼"); valid = false; }
    if (!contact) { setApplicationError(form, "contact", "请留下联系方式"); valid = false; }
    if (!valid) return;
    const eventId = form.dataset.event;
    if (!state.rsvps.includes(eventId)) state.rsvps.push(eventId);
    write(KEYS.rsvps, state.rsvps);
    const currentEvent = events.find((item) => item.id === eventId);
    const area = $("#rsvp-area");
    if (area && currentEvent) area.innerHTML = rsvpSuccessTemplate(currentEvent);
    toast("席位已保留，期待与你见面。");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (modalRoot.innerHTML) closeModal();
    else closeMenu();
    return;
  }
  trapFocus(event);
  const card = event.target.closest(".member-card, .member-feature");
  if (card && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    openProfile(card.dataset.profileId);
  }
});

window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", window.scrollY > 24);
}, { passive: true });

window.addEventListener("hashchange", () => {
  closeModal();
  closeMenu();
  render();
});

/* ---------- boot ---------- */
render();
header.classList.toggle("is-scrolled", window.scrollY > 24);
window.addEventListener("load", () => {
  document.body.classList.add("is-ready");
});
setTimeout(() => boot.classList.add("is-hidden"), 760);
