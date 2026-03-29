import { type ReactNode, useEffect, useRef } from "react";

interface ModalProps {
	title: string;
	onClose: () => void;
	children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
	const ref = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		ref.current?.showModal();
	}, []);

	return (
		<dialog
			ref={ref}
			className="note-modal"
			onClose={onClose}
			onClick={(e) => {
				if (e.target === ref.current) onClose();
			}}
			onKeyDown={undefined}
		>
			<div className="form-title">{title}</div>
			{children}
		</dialog>
	);
}
