import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

  export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'client' | 'linguist' | 'admin';
    subscriptionTier?: string;
    organizationId?: number;
    createdAt: string;
  }

  async function fetchUser(): Promise<User | null> {
    const response = await fetch("/api/user/profile", {
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new Error(`${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  async function handleLogout() {
    const response = await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  async function handleLogin() {
    window.location.href = "/api/login";
  }

  export function useAuth() {
    const queryClient = useQueryClient();
    
    const { data: user, isLoading, error } = useQuery<User | null>({
      queryKey: ["/api/user/profile"],
      queryFn: fetchUser,
    });

    const logoutMutation = useMutation({
      mutationFn: handleLogout,
      onSuccess: () => {
        queryClient.setQueryData(["/api/user/profile"], null);
        window.location.href = "/";
      },
    });

    return {
      user,
      isLoading,
      error,
      login: handleLogin,
      logout: () => logoutMutation.mutate(),
    };
  }
  