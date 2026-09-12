import type { RequestHandler } from "@qwik.dev/router";
import navigation from "../../../server";
import type { NavigationEnv } from "../../../server/env";
export const onRequest: RequestHandler = async ({
  request,
  platform,
  send,
}) => {
  send(await navigation.fetch(request, platform.env as NavigationEnv));
};
