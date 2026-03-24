interface ToastProps {
	message: string | null;
	color?: string;
}

export function Toast({ message, color }: ToastProps) {
	return (
		<div
			className={`toast${message ? " show" : ""}`}
			style={color ? { background: color } : undefined}
		>
			{message}
		</div>
	);
}
