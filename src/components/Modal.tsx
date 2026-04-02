import { type ReactNode, useEffect, useRef } from "react";

interface ModalProps {
	title: string;
	onClose: () => void;
	children: ReactNode;
}

export function Modal({ title, onClose, children }: Readonly<ModalProps>) {
	const ref = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		ref.current?.showModal();
	}, []);

	return (
		<dialog
			ref={ref}
			className="note-modal bg-surface border border-border rounded-xl p-5 w-[min(480px,calc(100vw-40px))] max-h-[90vh] overflow-y-auto text-text outline-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0"
			onClose={onClose}
			onClick={(e) => {
				if (e.target === ref.current) onClose();
			}}
			onKeyDown={undefined}
		>
			<div className="font-serif text-xl text-accent mb-5">{title}</div>
			{children}
		</dialog>
	);
}
