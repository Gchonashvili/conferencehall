import { createAuthClient } from "better-auth/react";

/** Browser-side auth client: used for the session hook in the nav. */
export const authClient = createAuthClient();
