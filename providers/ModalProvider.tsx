import ItemSheetModal from "@/components/takeout/ItemSheetModal";
import { useModalStore } from "@/stores/useModalStore";
import React from "react";

export default function ModalProvider() {
  const { modalType, modalProps, closeModal } = useModalStore();

  if (!modalType) return null;

  switch (modalType) {
    case "itemSheet":
      return <ItemSheetModal {...modalProps} onClose={closeModal} />;
    default:
      return null;
  }
}
