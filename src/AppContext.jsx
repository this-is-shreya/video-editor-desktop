// AppContext.jsx
import axios from "axios";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

const AppContext = createContext(null);

const LOGGED_OUT = { isLoggedIn: false, isPaid: false, isAdmin: false };
const isDesktop = () => !!window.cursorStudio?.auth;
const toUser = (data) => ({
  isLoggedIn: !!data?.loggedIn,
  isPaid: !!data?.user?.isPaid,
  isAdmin: !!data?.user?.isAdmin,
  email: data?.user?.email,
});

// Desktop app: cookies for your API domain do not exist inside Electron, so every API call needs the Bearer token.
// (This is also why other calls to your server can fail with "could not reach the server" after logging in.)
const syncAuthHeader = async (loggedIn) => {
  if (!isDesktop()) return;
  const token = loggedIn ? await window.cursorStudio.auth.getToken() : null;
  if (token) axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete axios.defaults.headers.common.Authorization;
};

// Browser: cookie + your existing route.  Desktop app: the main process sends the Bearer token.
const fetchStatus = async () => {
  if (isDesktop()) return window.cursorStudio.auth.status();
  const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/auth/status-desktop`, { withCredentials: true });
  return res.data;
};

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const seq = useRef(0); // lets a newer result (e.g. the login event) win over a status check that started earlier

  const refreshUser = async () => {
    const mine = ++seq.current;
    let next = LOGGED_OUT;
    try {
      const data = await fetchStatus();
      if (mine !== seq.current) return;                     // something newer happened meanwhile: ignore this answer
      if (data?.offline || data?.error) return;             // server/network hiccup: keep whatever we know
      next = toUser(data);
      await syncAuthHeader(next.isLoggedIn);
    } catch {
      if (mine !== seq.current) return;
    }
    setUser(next);
  };

  const logout = async () => {
    seq.current++;
    try {
      console.log("isdesktop: ", isDesktop())
      await axios.post(`${import.meta.env.VITE_SERVER_URL}/auth/logout`, {}, { withCredentials: true });
      await window.cursorStudio.auth.logout();
    } catch(error) {
      console.log("error: ", error);
      console.log("isdesktop: ", isDesktop())

      /* log out locally regardless */
    }
    await syncAuthHeader(false);
    setUser(LOGGED_OUT);
  };

  useEffect(() => {
    refreshUser();
  }, []);

  // Desktop app only
  useEffect(() => {
    if (!isDesktop()) return;
    // The browser login finished (deep link handled in the main process) -> update the user right away.
    const off = window.cursorStudio.auth.onChange(async (d) => {
      console.info("[auth] event from main process:", d.loggedIn ? "loggedIn" : d.error);
      if (d.loggedIn) {
        seq.current++;                                      // invalidates any status check still in flight
        await syncAuthHeader(true);
        setUser(toUser(d));
      } else if (d.error) {
        toast.error(d.error);
      }
    });
    // Back from the browser (e.g. after paying) -> pick up the new plan.
    const onFocus = () => refreshUser();
    window.addEventListener("focus", onFocus);
    return () => {
      off?.();
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <AppContext.Provider value={{ user, setUser, refreshUser, logout }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);