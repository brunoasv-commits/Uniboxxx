import React from 'react';
import Modal from './Modal';
import Button from './ui/Button';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

const AlertModal: React.FC<AlertModalProps> = ({ isOpen, onClose, title, message }) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-sm text-gray-300">{message}</p>
      <div className="mt-6 flex justify-end">
        <Button variant="primary" onClick={onClose}>
          OK
        </Button>
      </div>
    </Modal>
  );
};

export default AlertModal;
