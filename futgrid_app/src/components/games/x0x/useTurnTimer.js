import { useEffect, useRef, useState } from "react";

export default function useTurnTimer(seconds, resetKey, running, onExpire) {
  const [left, setLeft] = useState(seconds);
  const deadline = useRef(0);
  const expire = useRef(onExpire);
  expire.current = onExpire;

  useEffect(() => {
    if (!seconds) return;
    deadline.current = Date.now() + seconds * 1000;
    setLeft(seconds);
  }, [seconds, resetKey]);

  useEffect(() => {
    if (!seconds || !running) return;
    const id = setInterval(() => {
      const ms = deadline.current - Date.now();
      if (ms <= 0) {
        clearInterval(id);
        setLeft(0);
        expire.current?.();
        return;
      }
      setLeft(Math.ceil(ms / 1000));
    }, 200);
    return () => clearInterval(id);
  }, [seconds, resetKey, running]);

  return seconds ? left : null;
}
