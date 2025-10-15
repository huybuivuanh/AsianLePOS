import { create } from "zustand";

type ModalType = "itemSheet" | null;

type ModalStore = {
  modalType: ModalType;
  modalProps: any;
  openModal: (type: ModalType, props?: any) => void;
  closeModal: () => void;
};

export const useModalStore = create<ModalStore>((set) => ({
  modalType: null,
  modalProps: null,
  openModal: (modalType, modalProps) => {
    set({ modalType, modalProps });
  },
  closeModal: () => set({ modalType: null, modalProps: null }),
}));
