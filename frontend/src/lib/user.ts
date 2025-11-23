const AUTH_TOKEN_STORAGE_KEY = "VOID_AUTH_TOKEN";

const getAuthToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to read auth token:", error);
    return null;
  }
};

export type UserProfile = {
  address: string;
  required: string[];
  // Add other user fields as needed
};

/**
 * Fetches user profile from /me endpoint
 */
export async function fetchUserProfile(): Promise<UserProfile> {
  const token = getAuthToken();

  if (!token) {
    throw new Error("No authentication token found. Please sign in first.");
  }

  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const baseUrl = process.env.NEXT_PUBLIC_VOID_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_VOID_API_BASE_URL is not configured");
  }

  const response = await fetch(`${baseUrl}/api/auth/me`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorMessage =
      (await response.text()) || "Failed to fetch user profile";
    console.error("Backend error response:", errorMessage);
    throw new Error(errorMessage);
  }

  const data = await response.json();

  return data;
}
