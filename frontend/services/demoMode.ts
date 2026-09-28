export interface StoredAuthUser {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  adminCode?: string;
  isDemo?: boolean;
  dataScope?: "live" | "demo" | string;
}

export const getStoredUser = (): StoredAuthUser | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawUser = localStorage.getItem("user");

    if (!rawUser) {
      return null;
    }

    return JSON.parse(rawUser) as StoredAuthUser;
  } catch {
    return null;
  }
};

export const isDemoMode = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const storedFlag = localStorage.getItem("isDemo");

  if (storedFlag === "true") {
    return true;
  }

  const user = getStoredUser();

  return user?.isDemo === true || user?.dataScope === "demo";
};

export const assertWritable = (): void => {
  if (isDemoMode()) {
    const error = new Error(
      "Demo Mode is read-only. Changes are disabled for the Demo Admin."
    );

    Object.assign(error, {
      demoMode: true,
      status: 403,
    });

    throw error;
  }
};

export const saveAuthSession = (payload: any): void => {
  if (typeof window === "undefined") {
    return;
  }

  const token = payload?.token;
  const user = payload?.user;

  if (token) {
    localStorage.setItem("token", token);
  }

  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem(
      "isDemo",
      user?.isDemo === true || user?.dataScope === "demo"
        ? "true"
        : "false"
    );
  }
};

export const clearAuthSession = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("isDemo");
};
