// == IMPORTS & DEPENDENCIES ==
import { QueryClient, QueryFunction } from "@tanstack/react-query";

// == UTILITY FUNCTIONS ==
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// == API REQUEST FUNCTIONS ==
export async function apiRequest<T = any>(
  method: string,
  url: string, 
  data?: any,
  options?: RequestInit,
): Promise<T> {
  const token = localStorage.getItem('token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options?.headers || {})
  };

  try {
    const res = await fetch(url, {
      method,
      credentials: "include",
      headers,
      body: data ? JSON.stringify(data) : undefined,
      ...options
    });

    await throwIfResNotOk(res);
    return await res.json() as T;
  } catch (error) {
    console.error(`API Request Error (${method} ${url}):`, error);
    throw error;
  }
}

// == QUERY FUNCTIONS ==
type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem('token');
    
    const headers: HeadersInit = {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// == QUERY CLIENT CONFIGURATION ==
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});