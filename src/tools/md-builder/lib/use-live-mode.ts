import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ClientMcpCallResult,
  ClientMcpConnection,
  ClientMcpImage,
  ClientMcpLocated,
  ClientMcpLocateRequest,
  ClientMcpSession,
} from "@/lib/client-mcp";
import { connectClientMcp, scanClientMcpSessions } from "@/lib/client-mcp";
import { useToolState } from "@/lib/use-tool-state";
import {
  LIVE_TOOLS,
  MD_BUILDER_CONFIG,
  MD_BUILDER_TEXT,
} from "@/tools/md-builder/lib/constants";

export type LiveCallHandler = (
  tool: string,
  args: Record<string, unknown>
) => Promise<ClientMcpCallResult>;

export interface LiveModeState {
  isEnabled: boolean;
  isPanelOpen: boolean;
  isScanning: boolean;
  sessions: ClientMcpSession[];
  scannedAt: number;
  connected: ClientMcpSession | null;
  connectingPort: number | null;
  message: string | null;
}

interface UseLiveModeOptions {
  hasDocument: boolean;
  onCall: LiveCallHandler;
  onConnected: () => void;
}

function serializeFlag(value: boolean) {
  return value ? "1" : "0";
}

function deserializeFlag(raw: string) {
  return raw === "1";
}

function keepText(value: string) {
  return value;
}

export function useLiveMode({ hasDocument, onCall, onConnected }: UseLiveModeOptions) {
  const { value: isEnabled, setValue: setIsEnabled } = useToolState<boolean>({
    tool: "md-builder:live",
    initialValue: false,
    serialize: serializeFlag,
    deserialize: deserializeFlag,
  });
  const { value: rememberedSessionId, setValue: setRememberedSessionId } = useToolState<string>({
    tool: "md-builder:live-session",
    initialValue: "",
    serialize: keepText,
    deserialize: keepText,
  });
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [sessions, setSessions] = useState<ClientMcpSession[]>([]);
  const [scannedAt, setScannedAt] = useState(0);
  const [connected, setConnected] = useState<ClientMcpSession | null>(null);
  const [connectingPort, setConnectingPort] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const connectionRef = useRef<ClientMcpConnection | null>(null);
  const onCallRef = useRef(onCall);
  const onConnectedRef = useRef(onConnected);

  useEffect(() => {
    onCallRef.current = onCall;
    onConnectedRef.current = onConnected;
  });

  const connect = useCallback(
    async (session: ClientMcpSession) => {
      if (connectionRef.current) return;
      setConnectingPort(session.port);
      setMessage(null);
      const connection = await connectClientMcp(session.port, {
        clientName: MD_BUILDER_TEXT.liveClientName,
        tools: LIVE_TOOLS,
        onCall: (tool, args) => onCallRef.current(tool, args),
        onSession: (updated) => setConnected({ ...updated, isTaken: true }),
        onClose: (reason) => {
          connectionRef.current = null;
          setConnected(null);
          if (reason === "replaced") {
            setIsEnabled(false);
            setMessage(MD_BUILDER_TEXT.liveReplaced);
          }
        },
      });
      setConnectingPort(null);
      if (!connection) {
        setMessage(MD_BUILDER_TEXT.liveConnectFailed);
        return;
      }
      connectionRef.current = connection;
      setConnected(connection.session);
      setIsEnabled(true);
      setRememberedSessionId(connection.session.id);
      onConnectedRef.current();
    },
    [setIsEnabled, setRememberedSessionId]
  );

  const shouldScan = connected === null && hasDocument && (isPanelOpen || isEnabled);

  useEffect(() => {
    if (!shouldScan) return;
    let isActive = true;

    async function scan() {
      setIsScanning(true);
      const found = await scanClientMcpSessions();
      if (!isActive) return;
      setIsScanning(false);
      setSessions(found);
      setScannedAt(Date.now());
      const free = found.filter((session) => !session.isTaken);
      const remembered = free.find((session) => session.id === rememberedSessionId);
      const ready = free.filter((session) => session.isAgentActive);
      const target = remembered ?? (ready.length === 1 ? ready[0] : undefined);
      if (isEnabled && !connectionRef.current && target) void connect(target);
    }

    void scan();
    const interval = window.setInterval(scan, MD_BUILDER_CONFIG.liveScanMs);
    return () => {
      isActive = false;
      window.clearInterval(interval);
      setIsScanning(false);
    };
  }, [shouldScan, isEnabled, rememberedSessionId, connect]);

  useEffect(
    () => () => {
      connectionRef.current?.close();
      connectionRef.current = null;
    },
    []
  );

  const locateDocument = useCallback(
    async (request: ClientMcpLocateRequest): Promise<ClientMcpLocated> =>
      (await connectionRef.current?.locateDocument(request)) ?? { path: null, candidates: [] },
    []
  );

  const readImage = useCallback(
    async (path: string, includeData: boolean): Promise<ClientMcpImage> =>
      connectionRef.current
        ? connectionRef.current.readImage(path, includeData)
        : { ok: false, reason: "not_connected" },
    []
  );

  function disconnect() {
    setIsEnabled(false);
    setRememberedSessionId("");
    connectionRef.current?.close();
    connectionRef.current = null;
    setConnected(null);
  }

  const state: LiveModeState = {
    isEnabled,
    isPanelOpen,
    isScanning,
    sessions,
    scannedAt,
    connected,
    connectingPort,
    message,
  };

  return {
    state,
    setIsPanelOpen,
    connect: (session: ClientMcpSession) => void connect(session),
    disconnect,
    locateDocument,
    readImage,
  };
}
