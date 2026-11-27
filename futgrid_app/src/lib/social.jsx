import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api";
import { useAuth } from "./auth";
import { socketBase } from "./games/duelStore";
import { DUEL_GAME_PATHS } from "./games/names";

const ProfileModal = lazy(() => import("../components/social/ProfileModal"));
const InviteToast = lazy(() => import("../components/social/InviteToast"));

const SocialContext = createContext({
  openProfile: () => {},
  friends: null,
  refreshFriends: async () => {},
  setFriend: async () => {},
});

/**
 * App-wide social layer for signed-in users:
 * - one light socket so friends see you online and can invite you from any page
 * - friend list cache
 * - a profile modal any component can open with `openProfile(username)`
 */
export function SocialProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState(null);
  const [invites, setInvites] = useState([]);
  const socketRef = useRef(null);

  const refreshFriends = useCallback(async () => {
    if (!user) {
      setFriends(null);
      return null;
    }
    try {
      const list = await api.get("/friends");
      setFriends(list);
      return list;
    } catch {
      return null;
    }
  }, [user]);

  useEffect(() => {
    void refreshFriends();
  }, [refreshFriends]);

  useEffect(() => {
    if (!user) return undefined;
    let socket = null;
    let cancelled = false;
    // socket.io is loaded lazily so visitors who never sign in don't download it.
    void import("socket.io-client").then(({ io }) => {
      if (cancelled) return;
      socket = io(socketBase(), {
      auth: (cb) => {
        api
          .get("/auth/socket-token")
          .then(({ token }) => cb({ token }))
          .catch(() => cb({}));
      },
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionDelayMax: 10_000,
      });
      socketRef.current = socket;
      socket.on("invite:received", (invite) => {
        if (!invite?.code || !DUEL_GAME_PATHS[invite.game]) return;
        setInvites((list) => [...list.filter((i) => i.code !== invite.code), invite].slice(-3));
        try {
          navigator.vibrate?.([60, 40, 60]);
        } catch {
          // vibration is optional
        }
      });
    });
    const refresh = setInterval(() => void refreshFriends(), 60_000);
    return () => {
      cancelled = true;
      clearInterval(refresh);
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [user, refreshFriends]);

  // Invites expire after a minute — the room may be gone by then.
  useEffect(() => {
    if (!invites.length) return undefined;
    const id = setTimeout(() => setInvites((list) => list.filter((i) => Date.now() - i.at < 60_000)), 5_000);
    return () => clearTimeout(id);
  }, [invites]);

  const setFriend = useCallback(
    async (username, action) => {
      const path = `/friends/${encodeURIComponent(username)}`;
      const result = action === "remove" ? await api.delete(path) : await api.post(path);
      void refreshFriends();
      return result;
    },
    [refreshFriends],
  );

  const acceptInvite = useCallback(
    (invite) => {
      setInvites((list) => list.filter((i) => i.code !== invite.code));
      navigate(`${DUEL_GAME_PATHS[invite.game]}?otaq=${invite.code}`);
    },
    [navigate],
  );

  const value = useMemo(
    () => ({ openProfile: setProfile, friends, refreshFriends, setFriend }),
    [friends, refreshFriends, setFriend],
  );

  return (
    <SocialContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        {profile ? <ProfileModal username={profile} onClose={() => setProfile(null)} /> : null}
        {invites.length ? (
          <InviteToast
            invites={invites}
            onAccept={acceptInvite}
            onDismiss={(code) => setInvites((list) => list.filter((i) => i.code !== code))}
          />
        ) : null}
      </Suspense>
    </SocialContext.Provider>
  );
}

export const useSocial = () => useContext(SocialContext);
