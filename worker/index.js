const scoreQuery = "SELECT name, score FROM runner_scores ORDER BY score DESC, achieved_at ASC, name_key ASC LIMIT 10";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/runner") {
      if (!env.DB) {
        console.error("Leaderboard: no D1 binding named DB on this Worker.");
        return json({ error: "Leaderboard temporarily unavailable.", code: "no_database_binding" }, 503);
      }
      try {
        return await leaderboard(request, url, env.DB);
      } catch (error) {
        console.error("Leaderboard query failed:", error);
        const code = /no such table/i.test(String(error?.message)) ? "missing_table" : "query_failed";
        return json({ error: "Leaderboard temporarily unavailable.", code }, 503);
      }
    }
    const asset = assets[url.pathname];
    if (!Object.hasOwn(assets, url.pathname)) return new Response("Not found", { status: 404 });
    if (!["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 405 });
    return new Response(request.method === "HEAD" ? null : asset.body, {
      headers: { "Content-Type": asset.type + "; charset=utf-8", "X-Content-Type-Options": "nosniff" },
    });
  },
};

async function leaderboard(request, url, db) {
  if (request.method === "GET") return json((await db.prepare(scoreQuery).all()).results);
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (request.headers.get("Origin") !== url.origin || !request.headers.get("Content-Type")?.startsWith("application/json")) {
    return json({ error: "Invalid request." }, 403);
  }
  let data;
  try {
    const reader = request.body.getReader();
    let total = 0;
    let body = "";
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 512) {
        await reader.cancel();
        return json({ error: "Request is too large." }, 413);
      }
      body += decoder.decode(value, { stream: true });
    }
    data = JSON.parse(body + decoder.decode());
  } catch {
    return json({ error: "Invalid score submission." }, 400);
  }
  const name = typeof data?.name === "string" ? data.name.normalize("NFKC").trim().replace(/ +/g, " ") : "";
  const score = data?.score;
  if (!/^[\p{L}\p{M}\p{N} ._'’-]{1,24}$/u.test(name) || !/[\p{L}\p{N}]/u.test(name) ||
      !Number.isInteger(score) || score < 1 || score > 3600) {
    return json({ error: "Use up to 24 letters, numbers, spaces or basic punctuation and finish a run before posting." }, 400);
  }
  await db.prepare(`INSERT INTO runner_scores (name_key, name, score, achieved_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(name_key) DO UPDATE SET name = excluded.name, score = excluded.score, achieved_at = excluded.achieved_at
    WHERE excluded.score > runner_scores.score`).bind(name.toLowerCase(), name, score, Date.now()).run();
  return json((await db.prepare(scoreQuery).all()).results);
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
