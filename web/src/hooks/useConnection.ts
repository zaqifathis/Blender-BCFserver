import { useEffect, useState } from "preact/hooks";
import { onConnection } from "../api/ws";

export function useConnection() {
  const [connected, setConnected] = useState(false);
  useEffect(() => onConnection(setConnected), []);
  return connected;
}
