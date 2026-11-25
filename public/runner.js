(() => {
  const panel = document.querySelector("#runner");
  const track = panel.querySelector(".track");
  const canvas = track.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const action = panel.querySelector("#run-action");
  const scoreLabel = panel.querySelector("#run-score");
  const status = panel.querySelector("#run-status");
  const form = panel.querySelector("#score-form");
  const name = panel.querySelector("#player");
  const submit = form.querySelector("button");
  const leaders = panel.querySelector("#runner-leaders");
  const leaderStatus = panel.querySelector("#leader-status");
  const endpoint = "/api/runner";
  const ground = 157;
  const obstacles = [];
  let state = "ready";
  let frame = 0;
  let lastTime = 0;
  let elapsed = 0;
  let score = 0;
  let height = 0;
  let velocity = 0;
  let nextCrate = 1.3;
  let leaderboardLoaded = false;

  function paint() {
    ctx.fillStyle = "#dbe8ee";
    ctx.fillRect(0, 0, 600, 200);
    ctx.fillStyle = "#bdcfd7";
    for (let i = 0; i < 8; i++) {
      const x = (i * 91 + 600 - (elapsed * 20) % 600) % 600;
      ctx.fillRect(x, 70 + i % 3 * 12, 56, 87 - i % 3 * 12);
      ctx.fillStyle = "#eff5f4";
      ctx.fillRect(x + 11, 93, 9, 12);
      ctx.fillRect(x + 32, 93, 9, 12);
      ctx.fillStyle = "#bdcfd7";
    }
    ctx.fillStyle = "#e8d9b9";
    ctx.fillRect(0, ground, 600, 43);
    ctx.fillStyle = "#526c78";
    ctx.fillRect(0, ground, 600, 2);
    const y = ground - height - 26;
    ctx.fillStyle = "#31576d";
    ctx.fillRect(57, y, 29, 22);
    ctx.fillStyle = "#fff3d9";
    ctx.fillRect(61, y + 4, 21, 13);
    ctx.strokeStyle = "#31576d";
    ctx.beginPath();
    ctx.moveTo(61, y + 4);
    ctx.lineTo(71.5, y + 12);
    ctx.lineTo(82, y + 4);
    ctx.stroke();
    ctx.fillStyle = "#31576d";
    ctx.fillRect(61, y + 22, 6, 4);
    ctx.fillRect(77, y + 22, 6, 4);
    for (const crate of obstacles) {
      ctx.fillStyle = "#915d35";
      ctx.fillRect(crate.x, ground - crate.height, crate.width, crate.height);
      ctx.fillStyle = "#edc68f";
      ctx.fillRect(crate.x + 3, ground - crate.height + 3, crate.width - 6, 4);
    }
  }

  function start() {
    obstacles.length = 0;
    elapsed = lastTime = score = height = velocity = 0;
    nextCrate = 1.3;
    state = "running";
    form.hidden = true;
    status.textContent = "";
    scoreLabel.textContent = "Score 0";
    action.textContent = "Jump";
    frame = requestAnimationFrame(tick);
  }

  function jump() {
    if (state === "ready" || state === "over") {
      start();
      return;
    }
    if (state === "paused") {
      state = "running";
      lastTime = 0;
      status.textContent = "";
      action.textContent = "Jump";
      frame = requestAnimationFrame(tick);
      return;
    }
    if (height === 0) velocity = 390;
  }

  function tick(time) {
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.035) : 0;
    lastTime = time;
    elapsed += dt;
    const newScore = Math.min(3600, Math.floor(elapsed * 10));
    if (newScore !== score) {
      score = newScore;
      scoreLabel.textContent = "Score " + score;
    }
    if (height > 0 || velocity > 0) {
      height = Math.max(0, height + velocity * dt);
      velocity = height > 0 ? velocity - 1120 * dt : 0;
    }
    const speed = 230 + Math.min(200, elapsed * 4);
    if (elapsed >= nextCrate) {
      obstacles.push({x: 600, width: 22 + Math.random() * 14, height: 22 + Math.random() * 13});
      nextCrate += 0.95 + Math.random() * 0.7;
    }
    for (const crate of obstacles) crate.x -= speed * dt;
    if (obstacles[0]?.x + obstacles[0]?.width < 0) obstacles.shift();
    paint();
    const hit = obstacles.some(crate => crate.x < 84 && crate.x + crate.width > 59 && height + 3 < crate.height);
    if (hit || score === 3600) {
      state = "over";
      action.textContent = "Play again";
      status.textContent = "Run finished. Your score was " + score + ".";
      form.hidden = false;
      return;
    }
    frame = requestAnimationFrame(tick);
  }

  function pause() {
    if (state !== "running") return;
    cancelAnimationFrame(frame);
    state = "paused";
    action.textContent = "Resume";
    status.textContent = "Run paused.";
  }

  function showLeaders(rows) {
    leaders.replaceChildren(...rows.map(row => {
      const item = document.createElement("li");
      item.textContent = row.name + " · " + row.score;
      return item;
    }));
    leaderStatus.textContent = rows.length ? "" : "No scores yet.";
    leaderboardLoaded = true;
  }

  async function loadLeaders() {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error();
      showLeaders(await response.json());
    } catch {
      leaderStatus.textContent = "Leaderboard temporarily unavailable.";
    }
  }

  track.addEventListener("keydown", event => {
    if (event.code !== "Space") return;
    event.preventDefault();
    if (!event.repeat) jump();
  });
  track.addEventListener("click", () => {
    track.focus({ preventScroll: true });
    jump();
  });
  action.addEventListener("click", () => {
    track.focus({ preventScroll: true });
    jump();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
  const updatePanel = () => {
    if (panel.hidden || !panel.classList.contains("active")) pause();
    else if (!leaderboardLoaded) loadLeaders();
  };
  new MutationObserver(updatePanel).observe(panel, { attributes: true, attributeFilter: ["hidden", "class"] });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (state !== "over" || submit.disabled) return;
    submit.disabled = true;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.value, score }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Score could not be posted.");
      showLeaders(data);
      form.hidden = true;
      status.textContent = "Score submitted. The leaderboard keeps your best run.";
    } catch (error) {
      status.textContent = error.message || "Score could not be posted.";
    } finally {
      submit.disabled = false;
    }
  });

  paint();
  updatePanel();
})();
