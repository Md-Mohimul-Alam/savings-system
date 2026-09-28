"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  getMyNotifications,
} from "@/services/notificationApi";

import {
  NOTIFICATION_UPDATED_EVENT,
} from "@/services/notificationEvents";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  status: string;
}

interface MenuItem {
  name: string;
  href: string;
}

const adminMenu: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
  },
  {
    name: "Members",
    href: "/dashboard/members",
  },
  {
    name: "Contributions",
    href: "/dashboard/contributions",
  },
  {
    name: "Transactions",
    href: "/dashboard/transactions",
  },
  {
    name: "Investments",
    href: "/dashboard/investments",
  },
  {
    name: "Expenses",
    href: "/dashboard/expenses",
  },
  {
    name: "Ownership",
    href: "/dashboard/ownership",
  },
  {
    name: "Profit Distribution",
    href: "/dashboard/profits",
  },
  {
    name: "Join Requests",
    href: "/dashboard/join-requests",
  },
  {
    name: "Exit Requests",
    href: "/dashboard/exit-requests",
  },
  {
    name: "Reports",
    href: "/dashboard/reports",
  },
  {
    name: "Notifications",
    href: "/dashboard/notifications",
  },
  {
    name: "Audit Logs",
    href: "/dashboard/audit-logs",
  },
];

const memberMenu: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
  },
  {
    name: "My Profile",
    href: "/dashboard/profile",
  },
  {
    name: "My Contributions",
    href: "/dashboard/my-contributions",
  },
  {
    name: "My Ownership",
    href: "/dashboard/my-ownership",
  },
  {
    name: "Investments",
    href: "/dashboard/investments",
  },
  {
    name: "Exit Request",
    href: "/dashboard/my-exit-request",
  },
  {
    name: "Notifications",
    href: "/dashboard/notifications",
  },
];

export default function Sidebar({
  open,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] =
    useState<User | null>(null);

  const [unreadCount, setUnreadCount] =
    useState(0);

  useEffect(() => {
    const savedUser =
      localStorage.getItem("user");

    if (!savedUser) {
      return;
    }

    try {
      const parsedUser: User =
        JSON.parse(savedUser);

      setUser(parsedUser);
    } catch (error) {
      console.error(
        "Failed to parse saved user:",
        error
      );

      setUser(null);
    }
  }, []);

  useEffect(() => {
    const loadNotifications =
      async () => {
        try {
          const data =
            await getMyNotifications();

          setUnreadCount(
            data.unreadCount || 0
          );
        } catch (error) {
          console.error(
            "Failed to load notification count:",
            error
          );
        }
      };

    loadNotifications();

    window.addEventListener(
      NOTIFICATION_UPDATED_EVENT,
      loadNotifications
    );

    return () => {
      window.removeEventListener(
        NOTIFICATION_UPDATED_EVENT,
        loadNotifications
      );
    };
  }, [pathname]);

  const menuItems =
    user?.role === "admin"
      ? adminMenu
      : memberMenu;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    router.push("/login");
  };

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 text-white lg:hidden"
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 z-50
          flex h-screen w-64 flex-col
          border-r border-gray-200 bg-white
          transition-transform duration-300
          lg:translate-x-0
          ${
            open
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        <div className="shrink-0 border-b border-gray-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-gray-900">
                Group Savings
              </h1>

              <p className="mt-1 text-xs text-gray-500">
                {user?.role === "admin"
                  ? "Admin Portal"
                  : "Member Portal"}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 text-2xl leading-none text-gray-500 transition hover:text-black lg:hidden"
              aria-label="Close sidebar"
            >
              ×
            </button>
          </div>

          {user && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <p className="truncate text-sm font-medium text-gray-900">
                {user.name}
              </p>

              <p className="mt-1 truncate text-xs text-gray-500">
                {user.email}
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium capitalize text-gray-700">
                  {user.role}
                </span>

                <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium capitalize text-green-700">
                  {user.status}
                </span>
              </div>
            </div>
          )}
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
          {menuItems.map(
            (item) => {
              const active =
                pathname ===
                  item.href ||
                (item.href !==
                  "/dashboard" &&
                  pathname.startsWith(
                    `${item.href}/`
                  ));

              const isNotification =
                item.href ===
                "/dashboard/notifications";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-black text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span>
                    {item.name}
                  </span>

                  {isNotification &&
                    unreadCount > 0 && (
                      <span
                        className={`ml-3 flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          active
                            ? "bg-white text-black"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {unreadCount > 99
                          ? "99+"
                          : unreadCount}
                      </span>
                    )}
                </Link>
              );
            }
          )}
        </nav>

        <div className="shrink-0 border-t border-gray-200 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-100"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
