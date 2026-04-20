import NetInfo from "@react-native-community/netinfo";
import { create } from "zustand";

type NetworkState = {
  isConnected: boolean;
  startListening: () => () => void;
};

export const useNetworkStore = create<NetworkState>((set) => ({
  isConnected: true,

  startListening: () => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      set({ isConnected: state.isConnected ?? true });
    });
    return unsubscribe;
  },
}));
