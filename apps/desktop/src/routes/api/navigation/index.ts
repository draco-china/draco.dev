import type { RequestHandler } from "@qwik.dev/router";

export const onGet: RequestHandler = async ({ platform, request, send }) => {
  const navigation = platform.env?.NAVIGATION as
    | { fetch(request: Request): Promise<Response> }
    | undefined;
  let response: Response | undefined;
  if (navigation) {
    try {
      response = await navigation.fetch(request);
    } catch {}
  }
  if (response) {
    send(response);
    return;
  }
  send(
    new Response(JSON.stringify({ error: "目录暂时无法读取" }), {
      status: 503,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }),
  );
};
