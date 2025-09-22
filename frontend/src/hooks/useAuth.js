import { useMemo, useContext, useEffect, useState } from "react";
import { Context } from "../js/store/appContext";

export function useAuth() {
  const { store, actions } = useContext(Context);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (!store.user_loaded) {
        await actions.getCurrentUser();
      }
      setLoading(false);
    };
    fetchUser();
  }, [store.user_loaded]);

  const auth = useMemo(() => {
    if (loading) return { isAuthenticated: false, role: null, userId: null, loading: true };

    if (!store.logged_user || Object.keys(store.logged_user).length === 0)
      return { isAuthenticated: false, role: null, userId: null, loading: false };

    return {
      isAuthenticated: true,
      role: null,
      userId: store.logged_user.user_id || null,
      loading: false
    };
  }, [store.logged_user, loading]);

  return auth;
}
