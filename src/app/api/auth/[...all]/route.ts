import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

// Built per request so the auth instance (and the database behind it) is only created when needed.
export const { GET, POST } = toNextJsHandler(async (request: Request) => (await getAuth()).handler(request));
