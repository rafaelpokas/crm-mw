import { useEffect, useState, Dispatch, SetStateAction } from "react";
export function useQueryState<T extends string>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const read = () =>
    (new URLSearchParams(location.hash.split("?")[1]).get(key) as T) || initial;
  const [value, setValue] = useState<T>(read);
  useEffect(() => {
    const sync = () => setValue(read());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [key, initial]);
  const update: Dispatch<SetStateAction<T>> = (next) => {
    const resolved = typeof next === "function" ? next(value) : next;
    setValue(resolved);
    const [path] = location.hash.split("?");
    const params = new URLSearchParams(location.hash.split("?")[1]);
    if (resolved === initial) params.delete(key);
    else params.set(key, resolved);
    history.replaceState(
      null,
      "",
      path + (params.size ? "?" + params.toString() : ""),
    );
  };
  return [value, update];
}
