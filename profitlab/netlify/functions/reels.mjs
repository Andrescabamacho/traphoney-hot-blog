export const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "INSTAGRAM_ACCESS_TOKEN not configured" }),
    };
  }
  try {
    const fields = [
      "id",
      "caption",
      "media_type",
      "timestamp",
      "like_count",
      "comments_count",
      "insights.metric(impressions,reach,saved,video_views)",
    ].join(",");
    const url = `https://graph.instagram.com/me/media?fields=${fields}&limit=20&access_token=${token}`;
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || `Instagram error ${r.status}`);
    const reels = (data.data || []).filter(
      (m) => m.media_type === "VIDEO" || m.media_type === "REELS"
    );
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: reels }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
