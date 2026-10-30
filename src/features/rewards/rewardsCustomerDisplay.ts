import {
  createCustomerDisplayChannel,
  type CustomerDisplayMessage,
  type RewardsDisplayView,
} from "@/lib/customerDisplay";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

// Rewards on the customer screen (web only; see src/lib/customerDisplay.ts).

/** How long to wait for a customer screen to answer before using this device's camera. */
const DISPLAY_ANSWER_MS = 800;

export type CustomerScanStatus =
  /** Asking whether a customer screen is open. */
  | "connecting"
  /** The customer is scanning on the customer screen. */
  | "customer"
  /** No customer screen: scan with this device's camera. */
  | "local";

/** True when this device can talk to a customer screen (web only). */
export const canUseCustomerScreen = () =>
  Platform.OS === "web" && typeof BroadcastChannel !== "undefined";

/**
 * While mounted, asks the customer screen to scan the rewards QR.
 * Calls `onScanned` with the member id when the customer scans it there.
 */
export function useCustomerScreenScan(onScanned: (memberId: string) => void): CustomerScanStatus {
  const [status, setStatus] = useState<CustomerScanStatus>(() =>
    canUseCustomerScreen() ? "connecting" : "local",
  );
  const onScannedRef = useRef(onScanned);
  useEffect(() => {
    onScannedRef.current = onScanned;
  }, [onScanned]);

  useEffect(() => {
    const channel = createCustomerDisplayChannel();
    if (!channel) return;
    let answered = false;
    let scanned = false;
    const timer = setTimeout(() => {
      if (!answered) setStatus("local");
    }, DISPLAY_ANSWER_MS);

    channel.onmessage = (event: MessageEvent<CustomerDisplayMessage>) => {
      const message = event.data;
      if (message?.type === "rewardsScanStarted") {
        answered = true;
        setStatus("customer");
      } else if (message?.type === "rewardsScanned" && !scanned) {
        scanned = true; // the camera can report the same code several times
        onScannedRef.current(message.memberId);
      }
    };
    const start: CustomerDisplayMessage = { type: "rewardsScan" };
    channel.postMessage(start);

    return () => {
      clearTimeout(timer);
      const end: CustomerDisplayMessage = { type: "rewardsScanEnd" };
      channel.postMessage(end);
      channel.close();
    };
  }, []);

  return status;
}

/** Shows the member's name and points on the customer screen while mounted. */
export function useRewardsCustomerDisplay(view: RewardsDisplayView | null) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastRef = useRef<CustomerDisplayMessage | null>(null);

  useEffect(() => {
    const channel = createCustomerDisplayChannel();
    if (!channel) return;
    channelRef.current = channel;
    // A reloaded customer screen asks for the current state.
    channel.onmessage = (event: MessageEvent<CustomerDisplayMessage>) => {
      if (event.data?.type === "hello" && lastRef.current) {
        channel.postMessage(lastRef.current);
      }
    };
    return () => {
      const end: CustomerDisplayMessage = { type: "rewardsEnd" };
      channel.postMessage(end);
      channel.close();
      channelRef.current = null;
    };
  }, []);

  const name = view?.name;
  const points = view?.points;
  const message = view?.message;
  useEffect(() => {
    const channel = channelRef.current;
    if (!channel || name === undefined || points === undefined) return;
    const msg: CustomerDisplayMessage = {
      type: "rewards",
      view: { name, points, message },
    };
    lastRef.current = msg;
    channel.postMessage(msg);
  }, [name, points, message]);
}
