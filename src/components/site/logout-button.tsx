"use client";

import { useState, type ComponentProps } from "react";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

/**
 * Signs out from the browser, not a Server Action: the header reads the user
 * from Better Auth's client-side session cache, which only refreshes (and
 * tells other tabs) when the client itself calls /sign-out.
 */
export function LogoutButton(props: Omit<ComponentProps<"button">, "type" | "onClick" | "disabled">) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.replace("/");
          router.refresh();
        },
        onError: () => setPending(false),
      },
    });
  }

  return <button type="button" onClick={signOut} disabled={pending} {...props} />;
}
