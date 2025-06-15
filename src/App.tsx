import React, { useState, useEffect } from "react";
import SidebarNav from "./components/SidebarNav";
import LoginPage from "./pages/LoginPage";
import AccessCodePage from './pages/AccessCodePage'; // Ensured import
import AddDevicePage from './pages/AddDevicePage';   // Ensured import
import { Magic } from "magic-sdk";

import HomePage from './pages/HomePage';
import BookmarksAllPage from './pages/BookmarksAllPage';
import BookmarksAddPage from './pages/BookmarksAddPage';
import BookmarksRemovePage from './pages/BookmarksRemovePage';
import CardSeasonPage from './pages/CardSeasonPage';
import CardSubscribedPage from './pages/CardSubscribedPage';
import CardTranslationsPage from './pages/CardTranslationsPage';
import CardUnsubscribePage from './pages/CardUnsubscribePage';
// import DeviceAddPage from './pages/DeviceAddPage'; // Removed wrapper
import NoticeAllPage from './pages/NoticeAllPage';
import NoticeClearPage from './pages/NoticeClearPage';
import NotificationsAllPage from './pages/NotificationsAllPage';
import NotificationsAddPage from './pages/NotificationsAddPage';
import NotificationsRemovePage from './pages/NotificationsRemovePage';
import NotificationsStatusPage from './pages/NotificationsStatusPage';
import TimelineAllPage from './pages/TimelineAllPage';
import ProfilesAllPage from './pages/ProfilesAllPage';
import ProfilesChangePage from './pages/ProfilesChangePage';
import ProfilesCreatePage from './pages/ProfilesCreatePage';
import ProfilesRemovePage from './pages/ProfilesRemovePage';
import ProfilesActivePage from './pages/ProfilesActivePage';
import ReactionsAddPage from './pages/ReactionsAddPage';
import ReactionsGetPage from './pages/ReactionsGetPage';
import UsersFindPage from './pages/UsersFindPage';
import UsersGetPage from './pages/UsersGetPage';
import UsersGivePage from './pages/UsersGivePage';
// import ClientAddDevicePage from "./pages/ClientAddDevicePage"; // Removed wrapper

// TODO: Replace with your actual Magic.link Publishable API Key
const magic = new Magic("pk_live_DF7C05FE3A4FD8A6");

function App() {
  const [currentPage, setCurrentPage] = useState<string>(
    window.location.hash || "#home",
  );
  const initialIsLargeScreen = window.innerWidth >= 1024;
  const [isSidebarOpen, setIsSidebarOpen] = useState(initialIsLargeScreen);
  const [isMobile, setIsMobile] = useState(!initialIsLargeScreen);
  const [token, setToken] = useState<string>("");
  const [profile, setProfile] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isMagicLoading, setIsMagicLoading] = useState<boolean>(true);

  const fetchAndSetUserProfile = async (token: string) => {
    try {
      const response = await fetch("/api/users/get", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Token: token,
        },
      });
      const data = await response.json();
      if (
        data &&
        data.secuses &&
        data.user &&
        data.user.profile !== undefined
      ) {
        setProfile(String(data.user.profile));
        localStorage.setItem("cub_api_profile", String(data.user.profile));
      }
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
    }
  };

  const generateAndSetCustomToken = async () => {
    try {
      const didToken = await magic.user.getIdToken();
      console.log("Sending DID token to /api/token/generate:", didToken);
      const resp = await fetch("http://localhost:3000/api/token/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: didToken,
        },
        credentials: "include",
      });
      const data = await resp.json();
      if (data && data.success && data.token && data.profile) {
        setTokenAndCookie(data.token);
        setProfile(String(data.profile.id));
        localStorage.setItem("cub_api_token", data.token);
        localStorage.setItem("cub_api_profile", String(data.profile.id));
      } else {
        console.error("Failed to generate custom token:", data);
      }
    } catch (err) {
      console.error("Error generating custom token:", err);
    }
  };

  React.useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(window.location.hash || "#home");
    };

    const handleResize = () => {
      const isLargeScreen = window.innerWidth >= 1024;
      setIsSidebarOpen(isLargeScreen);
      setIsMobile(!isLargeScreen);
    };

    const checkMagicLogin = async () => {
      try {
        const isLoggedIn = await magic.user.isLoggedIn();
        if (isLoggedIn) {
          const metadata = await magic.user.getInfo();
          if (metadata.email) {
            setUserEmail(metadata.email);
          }
          await generateAndSetCustomToken();
        }
      } catch (error) {
        console.error("Magic Link session check failed:", error);
      } finally {
        setIsMagicLoading(false);
      }
    };

    const storedToken = localStorage.getItem("cub_api_token");
    const storedProfile = localStorage.getItem("cub_api_profile");
    if (storedToken) {
      setToken(storedToken);
      fetchAndSetUserProfile(storedToken);
    }
    if (storedProfile) {
      setProfile(storedProfile);
    }

    handleResize();
    checkMagicLogin();

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const setTokenAndCookie: React.Dispatch<React.SetStateAction<string>> = (
    value,
  ) => {
    let newValue: string;
    if (typeof value === "function") {
      newValue = (value as (prev: string) => string)(token);
    } else {
      newValue = value;
    }
    setToken(newValue);
    if (newValue) {
      document.cookie = `token=${newValue}; path=/;`;
    } else {
      document.cookie =
        "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = async () => {
    try {
      await magic.user.logout();
      setUserEmail(null);
      setToken("");
      setProfile("");
      localStorage.removeItem("cub_api_token");
      localStorage.removeItem("cub_api_profile");
      setCurrentPage("#home");
    } catch (error) {
      console.error("Magic Link logout failed:", error);
    }
  };

  const handleLoginSuccess = async (email: string) => {
    setUserEmail(email);
    await generateAndSetCustomToken();
  };

  const commonPageProps = {
    token,
    profile,
    setToken: setTokenAndCookie,
    setProfile,
    generateAndSetCustomToken,
    setCurrentPage,
  };

  return (
    <div className="min-h-screen bg-[#fbfbfb] text-[#252425] font-sans">
      <header className="flex items-center border-b border-[#c8c9c8] px-8 py-6">
        <div className="w-8 h-8 mr-4 bg-transparent flex items-center justify-center">
          <span className="sr-only">CUB Logo</span>
        </div>
        <div className="text-2xl font-semibold tracking-tight">
          CUB / <span className="font-normal text-[#aa566f]">API</span>
        </div>
        <div className="ml-auto text-sm opacity-70">v1.29</div>
        {userEmail && (
          <div className="ml-4 text-sm font-semibold text-gray-800">
            Logged in as: {userEmail}
          </div>
        )}
        {userEmail && (
          <button
            onClick={handleLogout}
            className="ml-4 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Logout
          </button>
        )}
        {isMobile && (
          <button
            onClick={toggleSidebar}
            className="ml-4 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#aa566f]"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </button>
        )}
      </header>
      <div className="flex w-full h-[calc(100vh-60px)]">
        <div
          className={`transition-all duration-300 bg-[#fbfbfb] border-r border-[#c8c9c8] w-70
          ${
            isMobile
              ? `fixed inset-y-0 left-0 z-40 transform h-full overflow-y-auto flex flex-col ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`
              : "static block translate-x-0 opacity-100 pointer-events-auto"
          }
        `}
        >
          <div className="flex-1 overflow-y-auto">
            <SidebarNav
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          </div>
        </div>
        {isMobile && isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black opacity-50 z-30"
            onClick={toggleSidebar}
          ></div>
        )}
        <main className={`flex-1 px-8 py-10`}>
          {isMagicLoading ? (
            <div className="flex items-center justify-center min-h-screen">
              <p>Loading user session...</p>
            </div>
          ) : !userEmail ? (
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          ) : (
            <>
              {currentPage === "#home" && <HomePage />}
              {currentPage === "#bookmarks-all" && <BookmarksAllPage {...commonPageProps} />}
              {currentPage === "#bookmarks-add" && <BookmarksAddPage {...commonPageProps} />}
              {currentPage === "#bookmarks-remove" && <BookmarksRemovePage {...commonPageProps} />}
              {currentPage === "#card-season" && <CardSeasonPage {...commonPageProps} />}
              {currentPage === "#card-subscribed" && <CardSubscribedPage {...commonPageProps} />}
              {currentPage === "#card-translations" && <CardTranslationsPage {...commonPageProps} />}
              {currentPage === "#card-unsubscribe" && <CardUnsubscribePage {...commonPageProps} />}
              {currentPage === "#device-add" && <AccessCodePage userEmail={userEmail} setToken={setTokenAndCookie} setProfile={setProfile} token={token} />}
              {currentPage === "#notice-all" && <NoticeAllPage {...commonPageProps} />}
              {currentPage === "#notice-clear" && <NoticeClearPage {...commonPageProps} />}
              {currentPage === "#notifications-all" && <NotificationsAllPage {...commonPageProps} />}
              {currentPage === "#notifications-add" && <NotificationsAddPage {...commonPageProps} />}
              {currentPage === "#notifications-remove" && <NotificationsRemovePage {...commonPageProps} />}
              {currentPage === "#notifications-status" && <NotificationsStatusPage {...commonPageProps} />}
              {currentPage === "#timeline-all" && <TimelineAllPage {...commonPageProps} />}
              {currentPage === "#profiles-all" && <ProfilesAllPage {...commonPageProps} />}
              {currentPage === "#profiles-change" && <ProfilesChangePage {...commonPageProps} />}
              {currentPage === "#profiles-create" && <ProfilesCreatePage {...commonPageProps} />}
              {currentPage === "#profiles-remove" && <ProfilesRemovePage {...commonPageProps} />}
              {currentPage === "#profiles-active" && <ProfilesActivePage {...commonPageProps} />}
              {currentPage === "#reactions-add" && <ReactionsAddPage {...commonPageProps} />}
              {currentPage === "#reactions-get" && <ReactionsGetPage {...commonPageProps} />}
              {currentPage === "#users-find" && <UsersFindPage {...commonPageProps} userEmail={userEmail} />}
              {currentPage === "#users-get" && <UsersGetPage {...commonPageProps} />}
              {currentPage === "#users-give" && <UsersGivePage {...commonPageProps} />}
              {currentPage === "#add-device" && <AddDevicePage />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
