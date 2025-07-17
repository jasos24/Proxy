export default async (request, context) => {
  const UPSTREAM = "https://aiostreams.elfhosted.com/stremio/edbaf86a-b2ca-4b22-a30f-11c08fdf901b/eyJpdiI6Ik1uSzhGY1BxbkF4OTNCVGhubytmNGc9PSIsImVuY3J5cHRlZCI6InEwYytveEhtVGpsZkdrT3QvNk1GdjZQbVVUVE14Y3M0d09OSDhRTXBYZHlEVFFrOXJHRGd0QTZvK3hNWWhaMFd2bk1LZWhIZFpoL09uTkpjTU1LMTVRPT0iLCJ0eXBlIjoiYWlvRW5jcnlwdCJ9";

  function proxifyUrl(originalUrl, workerOrigin) {
    if (!/^https?:\/\//.test(originalUrl)) return originalUrl;
    return `${workerOrigin}/stremio/proxy?d=${encodeURIComponent(originalUrl)}`;
  }

  const url = new URL(request.url);
  const pathname = url.pathname.replace(/^\/stremio/, "");
  const workerOrigin = url.origin;

  if (pathname === "/manifest.json") {
    const resp = await fetch(`${UPSTREAM}/manifest.json`);
    const json = await resp.text();
    return new Response(json, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  if (pathname.startsWith("/stream/")) {
    const upstreamUrl = `${UPSTREAM}${pathname}${url.search}`;
    const resp = await fetch(upstreamUrl);
    const data = await resp.json();

    if (Array.isArray(data.streams)) {
      data.streams = data.streams.map(stream => ({
        ...stream,
        url: stream.url ? proxifyUrl(stream.url, workerOrigin) : stream.url
      }));
    }

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  if (pathname === "/proxy") {
    const dest = url.searchParams.get("d");
    if (!dest) {
      return new Response("Missing 'd' parameter", { status: 400 });
    }

    const resp = await fetch(dest, {
      headers: request.headers,
      redirect: "follow"
    });

    return new Response(resp.body, {
      status: resp.status,
      headers: {
        "Content-Type": resp.headers.get("Content-Type") || "application/octet-stream",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  return new Response("Not found", { status: 404 });
};
